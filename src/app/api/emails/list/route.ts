import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createGmailClient, extractMessageContent } from '@/lib/gmail/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const filter = searchParams.get('filter') || 'all'
    const query = searchParams.get('query') || ''
    const offset = (page - 1) * limit

    // Check if user has connected Gmail
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)

    if (!emailAccounts?.length) {
      return NextResponse.json({ 
        emails: [],
        total: 0,
        page,
        limit,
        hasNextPage: false,
        message: 'No Gmail account connected. Please connect your Gmail account to view emails.',
        fallbackMode: true
      })
    }

    try {
      // Try to get emails from Gmail API first
      const gmail = await createGmailClient(emailAccounts[0])
      
      // Build Gmail query based on filters
      let gmailQuery = 'is:unread OR is:read' // Get all emails
      if (filter === 'ai-priority') {
        gmailQuery += ' (important OR from:no-reply OR from:notification OR subject:"urgent" OR subject:"important")'
      } else if (filter === 'needs-scheduling') {
        gmailQuery += ' (subject:"meeting" OR subject:"schedule" OR subject:"call" OR subject:"appointment")'
      }
      
      if (query) {
        gmailQuery += ` (subject:"${query}" OR from:"${query}" OR "${query}")`
      }

      // Fetch emails from Gmail
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: gmailQuery,
        maxResults: limit + 1, // Get one extra to check hasNextPage
      })

      const messages = response.data.messages || []
      const hasNextPage = messages.length > limit
      const messagesToProcess = messages.slice(0, limit)

      // Get full message details for each email
      const emailPromises = messagesToProcess.map(async (msg) => {
        try {
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full'
          })

          const messageData = messageResponse.data
          const content = extractMessageContent(messageData as any)
          
          // Auto-sync email to database if it doesn't exist
          let databaseId = msg.id! // Default to Gmail ID
          try {
            // Check if email already exists in database
            const { data: existingEmail } = await supabase
              .from('emails')
              .select('id, gmail_id')
              .eq('gmail_id', msg.id!)
              .eq('user_id', user.id)
              .single()
            
            if (existingEmail) {
              // Use database ID instead of Gmail ID
              databaseId = existingEmail.id
            } else {
              // Auto-sync email to database
              const headers = messageData.payload?.headers || []
              const getHeader = (name: string) => 
                headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

              const subject = getHeader('Subject')
              const from = getHeader('From')
              const to = getHeader('To')
              const date = getHeader('Date')
              const messageId = getHeader('Message-ID')
              const threadId = messageData.threadId

              // Parse email addresses
              const parseEmailAddress = (emailStr: string) => {
                const match = emailStr.match(/<(.+?)>/)
                return match ? match[1] : emailStr.trim()
              }

              const fromAddress = parseEmailAddress(from)
              const toAddress = parseEmailAddress(to)

              // Determine if sent by user
              const userEmail = user.email
              const isSent = from.toLowerCase().includes(userEmail?.toLowerCase() || '')

              const emailRecord = {
                user_id: user.id,
                gmail_id: msg.id!,
                thread_id: threadId,
                message_id: messageId,
                subject: subject.substring(0, 500),
                from_address: fromAddress,
                from_name: from.split('<')[0].trim(),
                to_address: toAddress,
                content_text: content.body.substring(0, 10000),
                content_html: '', // We'd need to extract HTML separately
                snippet: messageData.snippet?.substring(0, 200) || '',
                received_at: new Date(date).toISOString(),
                sent_at: isSent ? new Date(date).toISOString() : null,
                ai_analyzed: false
              }

              const { data: insertedEmail, error: insertError } = await supabase
                .from('emails')
                .insert(emailRecord)
                .select('id')
                .single()

              if (!insertError && insertedEmail) {
                databaseId = insertedEmail.id
              }
            }
          } catch (syncError) {
            console.error('Error auto-syncing email:', syncError)
            // Continue with Gmail ID if database sync fails
          }
          
          // Check if we have AI analysis for this email in processing_queue
          const { data: aiSuggestion } = await supabase
            .from('ai_suggestions')
            .select('*')
            .eq('user_id', user.id)
            .ilike('content', `%${content.subject}%`)
            .order('created_at', { ascending: false })
            .limit(1)
          
          // Parse sender information
          const fromMatch = content.from.match(/([^<]+)<([^>]+)>/) || content.from.match(/([^@]+@[^@]+)/)
          const fromName = fromMatch ? (fromMatch[1] || fromMatch[0]).trim() : content.from
          const fromEmail = fromMatch ? (fromMatch[2] || fromMatch[1] || fromMatch[0]).trim() : content.from

          // Generate time ago string
          const timeAgo = getTimeAgo(content.date)

          // Determine if email has attachments (simplified check)
          const hasAttachment = messageData.payload?.parts?.some(part => 
            part.filename && part.filename.length > 0
          ) || false

          // AI Analysis (mock for now, could be enhanced with real AI processing)
          let priority: 'high' | 'medium' | 'low' = 'medium'
          let needsScheduling = false
          let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
          
          if (content.subject.toLowerCase().includes('urgent') || content.subject.toLowerCase().includes('important')) {
            priority = 'high'
          }
          if (content.subject.toLowerCase().includes('meeting') || content.subject.toLowerCase().includes('schedule')) {
            needsScheduling = true
            priority = 'high'
          }
          if (content.body.toLowerCase().includes('thank') || content.body.toLowerCase().includes('great')) {
            sentiment = 'positive'
          }

          return {
            id: databaseId, // Now using database ID instead of Gmail ID
            from: {
              name: fromName,
              email: fromEmail,
              avatar: null
            },
            subject: content.subject,
            preview: content.body.substring(0, 120) + (content.body.length > 120 ? '...' : ''),
            time: timeAgo,
            isRead: !messageData.labelIds?.includes('UNREAD'),
            isStarred: messageData.labelIds?.includes('STARRED') || false,
            hasAttachment,
            aiAnalysis: {
              priority,
              needsScheduling,
              sentiment,
              suggestedActions: needsScheduling 
                ? ['Schedule meeting', 'Check availability'] 
                : priority === 'high' 
                ? ['Reply urgently', 'Review details']
                : ['Draft response', 'Archive']
            }
          }
        } catch (error) {
          console.error('Error processing message:', error)
          return null
        }
      })

      const emails = (await Promise.all(emailPromises)).filter(Boolean)

      // Get AI suggestions count for additional context
      const { count: aiSuggestionsCount } = await supabase
        .from('ai_suggestions')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'pending')

      return NextResponse.json({
        emails,
        total: response.data.resultSizeEstimate || emails.length,
        page,
        limit,
        hasNextPage,
        totalFetched: emails.length,
        aiSuggestionsCount: aiSuggestionsCount || 0,
        fallbackMode: false
      })

    } catch (gmailError) {
      console.error('Gmail API error:', gmailError)
      
      // Fallback to processing queue data
      const { data: queueEmails, error: queueError } = await supabase
        .from('processing_queue')
        .select(`
          id, 
          content, 
          metadata, 
          status, 
          created_at,
          ai_suggestions (
            id,
            type,
            content,
            confidence_score,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('data_type', 'email')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (queueError) {
        throw queueError
      }

      // Transform queue data to email format
      const fallbackEmails = (queueEmails || []).map(item => {
        const metadata = item.metadata as any || {}
        const content = item.content || {}
        
        return {
          id: item.id,
          from: {
            name: metadata.from_name || 'Unknown Sender',
            email: metadata.from_email || 'unknown@example.com',
            avatar: null
          },
          subject: metadata.subject || 'No Subject',
          preview: content.preview || content.body?.substring(0, 120) || 'No preview available',
          time: getTimeAgo(new Date(item.created_at)),
          isRead: item.status === 'processed',
          isStarred: false,
          hasAttachment: metadata.has_attachment || false,
          aiAnalysis: {
            priority: metadata.priority || 'medium',
            needsScheduling: metadata.needs_scheduling || false,
            sentiment: metadata.sentiment || 'neutral',
            suggestedActions: ['Process email', 'Review content']
          }
        }
      })

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('processing_queue')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('data_type', 'email')

      return NextResponse.json({
        emails: fallbackEmails,
        total: totalCount || 0,
        page,
        limit,
        hasNextPage: (totalCount || 0) > offset + limit,
        totalFetched: fallbackEmails.length,
        fallbackMode: true,
        error: 'Using fallback data due to Gmail API issue'
      })
    }

  } catch (error) {
    console.error('Email list API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    )
  }
}

// Helper function to generate "time ago" strings
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return diffMins <= 1 ? '1 min ago' : `${diffMins} min ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
} 