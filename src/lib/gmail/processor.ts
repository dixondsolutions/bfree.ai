import { createGmailClient, extractMessageContent, type GmailMessage } from './client'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'

/**
 * Fetch recent emails from Gmail
 */
export async function fetchRecentEmails(maxResults: number = 50, query?: string) {
  try {
    const gmail = await createGmailClient()
    const user = await getCurrentUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Build Gmail search query
    const searchQuery = query || 'is:unread OR (newer_than:7d AND (meeting OR schedule OR appointment OR call OR conference OR zoom OR teams))'
    
    // List messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults,
    })

    if (!response.data.messages) {
      return []
    }

    // Get full message details
    const messages = await Promise.all(
      response.data.messages.map(async (message) => {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
        })
        return fullMessage.data as GmailMessage
      })
    )

    return messages
  } catch (error) {
    console.error('Error fetching emails:', error)
    throw error
  }
}

/**
 * Process emails and extract scheduling-relevant content
 */
export async function processEmails(messages: GmailMessage[]) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = await createClient()
  const processedEmails = []

  for (const message of messages) {
    try {
      const content = extractMessageContent(message)
      
      // Check if we've already processed this email
      const { data: existingQueue } = await supabase
        .from('processing_queue')
        .select('id')
        .eq('email_id', message.id)
        .eq('user_id', user.id)
        .single()

      if (existingQueue) {
        continue // Skip already processed emails
      }

      // Add to processing queue
      const { data: queueItem, error: queueError } = await supabase
        .from('processing_queue')
        .insert({
          user_id: user.id,
          email_id: message.id,
          status: 'pending'
        })
        .select()
        .single()

      if (queueError) {
        console.error('Error adding to processing queue:', queueError)
        continue
      }

      // Check if email contains scheduling-relevant keywords
      const schedulingKeywords = [
        'meeting', 'schedule', 'appointment', 'call', 'conference',
        'zoom', 'teams', 'calendar', 'available', 'book', 'reschedule',
        'cancel', 'confirm', 'deadline', 'due', 'reminder', 'follow up'
      ]

      const emailText = `${content.subject} ${content.body}`.toLowerCase()
      const hasSchedulingContent = schedulingKeywords.some(keyword => 
        emailText.includes(keyword)
      )

      if (hasSchedulingContent) {
        processedEmails.push({
          id: message.id,
          threadId: message.threadId,
          subject: content.subject,
          from: content.from,
          to: content.to,
          body: content.body,
          date: content.date,
          queueId: queueItem.id
        })
      } else {
        // Mark as completed if no scheduling content
        await supabase
          .from('processing_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', queueItem.id)
      }
    } catch (error) {
      console.error(`Error processing email ${message.id}:`, error)
      
      // Mark as failed in queue
      await supabase
        .from('processing_queue')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processed_at: new Date().toISOString()
        })
        .eq('email_id', message.id)
        .eq('user_id', user.id)
    }
  }

  return processedEmails
}

/**
 * Get processing queue status for user
 */
export async function getProcessingStatus() {
  const user = await getCurrentUser()
  if (!user) {
    return { pending: 0, processing: 0, completed: 0, failed: 0 }
  }

  const supabase = await createClient()
  
  const { data: queue } = await supabase
    .from('processing_queue')
    .select('status')
    .eq('user_id', user.id)

  if (!queue) {
    return { pending: 0, processing: 0, completed: 0, failed: 0 }
  }

  const status = queue.reduce((acc, item) => {
    acc[item.status as keyof typeof acc] = (acc[item.status as keyof typeof acc] || 0) + 1
    return acc
  }, { pending: 0, processing: 0, completed: 0, failed: 0 })

  return status
}

/**
 * Mark processing queue item as completed
 */
export async function markProcessingComplete(queueId: string, success: boolean = true, errorMessage?: string) {
  const supabase = await createClient()
  
  await supabase
    .from('processing_queue')
    .update({
      status: success ? 'completed' : 'failed',
      error_message: errorMessage || null,
      processed_at: new Date().toISOString()
    })
    .eq('id', queueId)
}