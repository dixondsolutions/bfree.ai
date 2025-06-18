import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { gmail_v1, google } from 'googleapis'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { maxResults = 100 } = await request.json()
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

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Get existing email IDs to avoid duplicates
    const { data: existingEmails } = await supabase
      .from('emails')
      .select('gmail_id')
      .eq('user_id', user.id)

    const existingGmailIds = new Set((existingEmails || []).map(e => e.gmail_id))

    // Fetch messages from Gmail
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: maxResults,
      q: 'in:inbox OR in:sent' // Get both inbox and sent emails
    })

    const messages = messagesResponse.data.messages || []
    let processedCount = 0
    let skippedCount = 0
    let newEmails = []

    console.log(`Processing ${messages.length} messages from Gmail...`)

    // Process each message
    for (const message of messages) {
      if (!message.id) continue

      // Skip if already exists
      if (existingGmailIds.has(message.id)) {
        skippedCount++
        continue
      }

      try {
        // Get full message details
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
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

        // Extract email body
        let body = ''
        let contentText = ''
        let contentHtml = ''

        const extractTextFromPart = (part: any): string => {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8')
          }
          if (part.mimeType === 'text/html' && part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8')
          }
          if (part.parts) {
            return part.parts.map(extractTextFromPart).join('')
          }
          return ''
        }

        if (messageData.payload) {
          if (messageData.payload.mimeType === 'text/plain' && messageData.payload.body?.data) {
            contentText = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8')
          } else if (messageData.payload.mimeType === 'text/html' && messageData.payload.body?.data) {
            contentHtml = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8')
          } else if (messageData.payload.parts) {
            const textPart = messageData.payload.parts.find(p => p.mimeType === 'text/plain')
            const htmlPart = messageData.payload.parts.find(p => p.mimeType === 'text/html')
            
            if (textPart?.body?.data) {
              contentText = Buffer.from(textPart.body.data, 'base64').toString('utf-8')
            }
            if (htmlPart?.body?.data) {
              contentHtml = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8')
            }
            
            // If no direct text/html parts, try to extract from nested parts
            if (!contentText && !contentHtml) {
              contentText = extractTextFromPart(messageData.payload)
            }
          }
        }

        // Use text content primarily, fall back to HTML
        body = contentText || contentHtml

        // Extract thread ID
        const threadId = messageData.threadId

        // Determine email direction
        const userEmail = tokens.email || user.email
        const isSent = from.toLowerCase().includes(userEmail?.toLowerCase() || '')

        // Parse email addresses
        const parseEmailAddress = (emailStr: string) => {
          const match = emailStr.match(/<(.+?)>/)
          return match ? match[1] : emailStr.trim()
        }

        const fromAddress = parseEmailAddress(from)
        const toAddress = parseEmailAddress(to)

        // Create email record
        const emailRecord = {
          user_id: user.id,
          gmail_id: message.id,
          thread_id: threadId,
          message_id: messageId,
          subject: subject.substring(0, 500), // Limit length
          from_address: fromAddress,
          from_name: from.split('<')[0].trim(),
          to_address: toAddress,
          content_text: contentText.substring(0, 10000), // Limit content length
          content_html: contentHtml.substring(0, 10000),
          snippet: messageData.snippet?.substring(0, 200) || '',
          received_at: new Date(date).toISOString(),
          sent_at: isSent ? new Date(date).toISOString() : null,
          ai_analyzed: false
        }

        newEmails.push(emailRecord)
        processedCount++

        // Process in batches to avoid memory issues
        if (newEmails.length >= 20) {
          const { error: insertError } = await supabase
            .from('emails')
            .insert(newEmails)

          if (insertError) {
            console.error('Error inserting email batch:', insertError)
          }

          newEmails = [] // Reset batch
        }

      } catch (messageError) {
        console.error(`Error processing message ${message.id}:`, messageError)
        continue
      }
    }

    // Insert remaining emails
    if (newEmails.length > 0) {
      const { error: insertError } = await supabase
        .from('emails')
        .insert(newEmails)

      if (insertError) {
        console.error('Error inserting final email batch:', insertError)
      }
    }

    // Update last sync time
    await supabase
      .from('email_accounts')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('provider', 'gmail')

    return NextResponse.json({
      success: true,
      message: 'Email sync completed successfully',
      stats: {
        totalMessages: messages.length,
        newEmails: processedCount,
        skippedDuplicates: skippedCount,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in manual Gmail sync:', error)
    return NextResponse.json({ 
      error: 'Email sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 