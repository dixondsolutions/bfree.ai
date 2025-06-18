import { createGmailClient, extractMessageContent, type GmailMessage } from './client'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { emailService } from '@/lib/email/email-service'

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

      // Check if email contains scheduling-relevant keywords
      const schedulingKeywords = [
        'meeting', 'schedule', 'appointment', 'call', 'conference',
        'zoom', 'teams', 'calendar', 'available', 'book', 'reschedule',
        'cancel', 'confirm', 'deadline', 'due', 'reminder', 'follow up',
        'task', 'todo', 'action item', 'deliverable', 'assign'
      ]

      const emailText = `${content.subject} ${content.body}`.toLowerCase()
      const hasSchedulingContent = schedulingKeywords.some(keyword => 
        emailText.includes(keyword)
      )

      // Store email in the emails table first
      const emailData = {
        gmail_id: message.id,
        thread_id: message.threadId,
        message_id: message.id,
        subject: content.subject,
        from_address: content.from,
        to_address: content.to,
        content_text: content.body,
        snippet: content.body.substring(0, 200) + (content.body.length > 200 ? '...' : ''),
        received_at: content.date,
        sent_at: content.date,
        has_scheduling_content: hasSchedulingContent,
        scheduling_keywords: hasSchedulingContent ? schedulingKeywords : [],
        labels: [],
        is_unread: true
      }

      try {
        const storedEmail = await emailService.storeEmail(emailData)

        if (hasSchedulingContent) {
          // Add to processing queue with email record reference
          const { data: queueItem, error: queueError } = await supabase
            .from('processing_queue')
            .insert({
              user_id: user.id,
              email_id: message.id,
              email_record_id: storedEmail.id,
              status: 'pending'
            })
            .select()
            .single()

          if (queueError) {
            console.error('Error adding to processing queue:', queueError)
            continue
          }

          processedEmails.push({
            id: message.id,
            threadId: message.threadId,
            subject: content.subject,
            from: content.from,
            to: content.to,
            body: content.body,
            date: content.date,
            queueId: queueItem.id,
            emailRecordId: storedEmail.id
          })
        } else {
          // Still store email but mark as processed (no scheduling content)
          await supabase
            .from('processing_queue')
            .insert({
              user_id: user.id,
              email_id: message.id,
              email_record_id: storedEmail.id,
              status: 'completed',
              processed_at: new Date().toISOString()
            })
        }
      } catch (emailError) {
        console.error('Error storing email:', emailError)
        // Continue with original logic as fallback
        if (hasSchedulingContent) {
          const { data: queueItem, error: queueError } = await supabase
            .from('processing_queue')
            .insert({
              user_id: user.id,
              email_id: message.id,
              status: 'pending'
            })
            .select()
            .single()

          if (!queueError) {
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
          }
        }
      }
    } catch (error) {
      console.error(`Error processing email ${message.id}:`, error)
      
      // Mark as failed in queue
      await supabase
        .from('processing_queue')
        .insert({
          user_id: user.id,
          email_id: message.id,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processed_at: new Date().toISOString()
        })
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

/**
 * Process emails and automatically trigger AI analysis
 */
export async function processEmailsWithAIAnalysis(messages: GmailMessage[]): Promise<{
  processedEmails: any[]
  aiAnalysisResults: any[]
  tasksCreated: any[]
}> {
  const processedEmails = await processEmails(messages)
  const aiAnalysisResults = []
  const tasksCreated = []

  if (processedEmails.length === 0) {
    return { processedEmails, aiAnalysisResults, tasksCreated }
  }

  try {
    // Import AI processing functions
    const { processQueuedEmails } = await import('@/lib/openai/processor')
    const { extractTasksFromEmail } = await import('@/lib/openai/task-extraction')
    const { taskService } = await import('@/lib/tasks/task-service')

    // Process emails with AI
    const aiResult = await processQueuedEmails(processedEmails.length)
    aiAnalysisResults.push(aiResult)

    // For high-confidence suggestions, automatically create tasks
    const { getUserAISuggestions } = await import('@/lib/openai/processor')
    const suggestions = await getUserAISuggestions('pending')
    
    const highConfidenceSuggestions = suggestions.filter(s => s.confidence_score > 0.7)
    
    for (const suggestion of highConfidenceSuggestions) {
      try {
        // Create task from high-confidence suggestion
        const task = await taskService.createTask({
          title: suggestion.title,
          description: suggestion.description,
          category: suggestion.task_category || 'other',
          priority: suggestion.priority || 'medium',
          estimated_duration: suggestion.estimated_duration,
          due_date: suggestion.suggested_due_date ? new Date(suggestion.suggested_due_date) : undefined,
          energy_level: suggestion.energy_level,
          tags: suggestion.suggested_tags,
          ai_generated: true,
          source_email_id: suggestion.source_email_id,
          source_suggestion_id: suggestion.id,
          confidence_score: suggestion.confidence_score
        })

        // Mark suggestion as auto-converted
        const supabase = await createClient()
        await supabase
          .from('ai_suggestions')
          .update({ 
            status: 'auto_converted',
            converted_to_task_id: task.id,
            converted_at: new Date().toISOString()
          })
          .eq('id', suggestion.id)

        tasksCreated.push({
          task,
          source_suggestion: suggestion,
          auto_created: true
        })

        console.log(`Auto-created task "${task.title}" from high-confidence suggestion`)
      } catch (error) {
        console.error(`Error auto-creating task from suggestion ${suggestion.id}:`, error)
      }
    }

    return { processedEmails, aiAnalysisResults, tasksCreated }
  } catch (error) {
    console.error('Error in AI analysis pipeline:', error)
    return { processedEmails, aiAnalysisResults: [], tasksCreated: [] }
  }
}

/**
 * Get pending processing queue items that need AI analysis
 */
export async function getPendingAIAnalysis() {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  const supabase = await createClient()
  
  const { data: pendingItems } = await supabase
    .from('processing_queue')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .not('content', 'is', null)
    .order('created_at', { ascending: true })
    .limit(10)

  return pendingItems || []
}