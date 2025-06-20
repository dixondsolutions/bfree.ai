import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { gmail_v1, google } from 'googleapis'
import { EmailClassificationService } from '@/lib/email/classification-service'

const MAX_CONTENT_LENGTH = 5000 // Reduced from 10000
const BATCH_SIZE = 10 // Reduced from 20 for better memory management
const MAX_SYNC_LIMIT = 50 // Limit maximum sync to prevent memory issues

export async function POST(request: NextRequest) {
  let gmail: gmail_v1.Gmail | null = null
  let processedEmails: any[] = []
  
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { maxResults = 50 } = await request.json()
    
    // Enforce maximum limit to prevent memory issues
    const effectiveLimit = Math.min(maxResults, MAX_SYNC_LIMIT)
    
    const supabase = await createClient()

    // Get user's Gmail access token
    const { data: tokens, error: tokenError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .single()

    if (tokenError || !tokens) {
      return NextResponse.json({ 
        error: 'Gmail not connected',
        message: 'Please connect your Gmail account first'
      }, { status: 400 })
    }

    // Initialize Gmail client with decrypted tokens
    const { decrypt } = await import('@/lib/utils/encryption')
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
    
    oauth2Client.setCredentials({
      access_token: decrypt(tokens.access_token),
      refresh_token: tokens.refresh_token ? decrypt(tokens.refresh_token) : null,
      expiry_date: tokens.expires_at ? new Date(tokens.expires_at).getTime() : undefined
    })

    gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Optimized duplicate checking - only check recent emails to reduce memory
    const { data: recentEmails } = await supabase
      .from('emails')
      .select('gmail_id')
      .eq('user_id', user.id)
      .order('received_at', { ascending: false })
      .limit(effectiveLimit * 2) // Check 2x the sync limit

    const existingGmailIds = new Set((recentEmails || []).map(e => e.gmail_id))

    // Fetch messages from Gmail with improved query
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: effectiveLimit,
      q: 'in:inbox -is:chat', // Exclude chat messages to reduce noise
      includeSpamTrash: false
    })

    const messages = messagesResponse.data.messages || []
    let processedCount = 0
    let skippedCount = 0
    let errorCount = 0
    let batchErrors: string[] = []

    console.log(`Processing ${messages.length} messages from Gmail (limit: ${effectiveLimit})...`)

    // Process messages in smaller chunks to manage memory
    const processingChunks = []
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      processingChunks.push(messages.slice(i, i + BATCH_SIZE))
    }

    for (const chunk of processingChunks) {
      const chunkEmails = []
      
      // Process each message in the chunk
      for (const message of chunk) {
        if (!message.id) continue

        // Skip if already exists
        if (existingGmailIds.has(message.id)) {
          skippedCount++
          continue
        }

        try {
          // Get message with optimized format - minimal for performance
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'To', 'Date', 'Message-ID']
          })

          const messageData = messageResponse.data
          const headers = messageData.payload?.headers || []

          // Extract email details
          const getHeader = (name: string) => 
            headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

          const subject = getHeader('Subject')
          const from = getHeader('From')
          const to = getHeader('To')
          const date = getHeader('Date')
          const messageId = getHeader('Message-ID')

          // For better performance, we'll get content separately only for important emails
          const fromAddress = extractEmailAddress(from)
          const toAddress = extractEmailAddress(to)
          const userEmail = tokens.email || user.email
          
          // Determine if this is an important email worth full content extraction
          const isImportant = isImportantEmail(subject, fromAddress, userEmail)

          let contentText = ''
          let contentHtml = ''
          let snippet = messageData.snippet || ''

          // Only fetch full content for important emails to save memory and API calls
          if (isImportant) {
            try {
              const fullMessageResponse = await gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'full'
              })
              
              const contentResult = extractEmailContent(fullMessageResponse.data)
              contentText = contentResult.text
              contentHtml = contentResult.html
            } catch (contentError) {
              console.warn(`Failed to extract content for ${message.id}:`, contentError)
              // Continue with just the snippet
            }
          }

          // Use unified classification service
          const emailData = {
            subject: truncateString(subject, 500),
            from_address: fromAddress,
            from_name: extractNameFromAddress(from),
            to_address: toAddress,
            content_text: truncateString(contentText, MAX_CONTENT_LENGTH),
            content_html: truncateString(contentHtml, MAX_CONTENT_LENGTH),
            snippet: truncateString(snippet, 200),
            labels: messageData.labelIds || [],
            received_at: parseEmailDate(date)
          }

          // Get classification from unified service
          const classification = EmailClassificationService.classifyEmail(emailData, userEmail)

          // Create optimized email record with unified classification
          const emailRecord = {
            user_id: user.id,
            gmail_id: message.id,
            thread_id: messageData.threadId || null,
            message_id: messageId || null,
            ...emailData,
            has_scheduling_content: classification.has_scheduling_content,
            scheduling_keywords: classification.scheduling_keywords,
            importance_level: classification.importance_level,
            ai_analyzed: false,
            is_unread: messageData.labelIds?.includes('UNREAD') || false,
            is_starred: messageData.labelIds?.includes('STARRED') || false
          }

          chunkEmails.push(emailRecord)
          processedCount++

        } catch (messageError) {
          console.error(`Error processing message ${message.id}:`, messageError)
          errorCount++
          batchErrors.push(`Message ${message.id}: ${messageError instanceof Error ? messageError.message : 'Unknown error'}`)
          continue
        }
      }

      // Insert chunk batch with error handling
      if (chunkEmails.length > 0) {
        try {
          const { error: insertError } = await supabase
            .from('emails')
            .upsert(chunkEmails, { 
              onConflict: 'user_id,gmail_id',
              ignoreDuplicates: false 
            })

          if (insertError) {
            console.error('Error inserting email chunk:', insertError)
            batchErrors.push(`Batch insert error: ${insertError.message}`)
          } else {
            processedEmails.push(...chunkEmails)
          }
        } catch (dbError) {
          console.error('Database error during batch insert:', dbError)
          batchErrors.push(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
        }
      }

      // Small delay between chunks to prevent API rate limiting
      if (processingChunks.indexOf(chunk) < processingChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Update last sync time
    await supabase
      .from('email_accounts')
      .update({ 
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('provider', 'gmail')

    const response = {
      success: true,
      message: 'Email sync completed successfully',
      stats: {
        totalMessages: messages.length,
        newEmails: processedCount,
        skippedDuplicates: skippedCount,
        errors: errorCount,
        effectiveLimit,
        timestamp: new Date().toISOString()
      }
    }

    // Include errors in response if any occurred
    if (batchErrors.length > 0) {
      response.warnings = batchErrors.slice(0, 10) // Limit error messages
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in manual Gmail sync:', error)
    
    // Clean up any processed emails on error
    if (processedEmails.length > 0) {
      console.log(`Processed ${processedEmails.length} emails before error occurred`)
    }
    
    return NextResponse.json({ 
      error: 'Email sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      partialSuccess: processedEmails.length > 0 ? {
        processedCount: processedEmails.length
      } : undefined
    }, { status: 500 })
  }
}

// Helper functions for optimized processing

function extractEmailAddress(emailStr: string): string {
  if (!emailStr) return ''
  const match = emailStr.match(/<(.+?)>/)
  return match ? match[1] : emailStr.trim()
}

function extractNameFromAddress(emailStr: string): string {
  if (!emailStr) return ''
  const parts = emailStr.split('<')
  return parts.length > 1 ? parts[0].trim().replace(/"/g, '') : ''
}

function truncateString(str: string, maxLength: number): string {
  if (!str) return ''
  return str.length > maxLength ? str.substring(0, maxLength) : str
}

function parseEmailDate(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// Classification functions removed - now using EmailClassificationService

function extractEmailContent(messageData: any): { text: string, html: string } {
  let contentText = ''
  let contentHtml = ''

  const decodeBase64Url = (str: string): string => {
    try {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
      const padding = base64.length % 4
      const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64
      return Buffer.from(paddedBase64, 'base64').toString('utf-8')
    } catch {
      return ''
    }
  }

  if (messageData.payload) {
    // Handle simple single-part messages
    if (messageData.payload.mimeType === 'text/plain' && messageData.payload.body?.data) {
      contentText = decodeBase64Url(messageData.payload.body.data)
    } else if (messageData.payload.mimeType === 'text/html' && messageData.payload.body?.data) {
      contentHtml = decodeBase64Url(messageData.payload.body.data)
    }
    // Handle multipart messages
    else if (messageData.payload.parts) {
      const textPart = messageData.payload.parts.find(p => p.mimeType === 'text/plain')
      const htmlPart = messageData.payload.parts.find(p => p.mimeType === 'text/html')
      
      if (textPart?.body?.data) {
        contentText = decodeBase64Url(textPart.body.data)
      }
      if (htmlPart?.body?.data) {
        contentHtml = decodeBase64Url(htmlPart.body.data)
      }
    }
  }

  return { text: contentText, html: contentHtml }
} 