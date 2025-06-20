import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { analyzeEmailContent, type EmailAnalysisResult, type SchedulingExtraction } from './client'
import { markProcessingComplete } from '@/lib/gmail/processor'

/**
 * Process emails in the queue using AI analysis
 */
export async function processQueuedEmails(maxItems: number = 10) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = await createClient()

  // Get pending items from processing queue
  const { data: queueItems, error: queueError } = await supabase
    .from('processing_queue')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(maxItems)

  if (queueError) {
    throw new Error(`Failed to fetch queue items: ${queueError.message}`)
  }

  if (!queueItems || queueItems.length === 0) {
    return { processed: 0, suggestions: 0, errors: 0 }
  }

  let processedCount = 0
  let suggestionsCount = 0
  let errorsCount = 0

  for (const queueItem of queueItems) {
    try {
      // Mark as processing
      await supabase
        .from('processing_queue')
        .update({ status: 'processing' })
        .eq('id', queueItem.id)

      // Get the email content from the emails table
      const { data: emailRecord, error: emailError } = await supabase
        .from('emails')
        .select('subject, from_address, to_address, content_text, content_html, received_at')
        .eq('id', queueItem.email_record_id)
        .single()

      if (emailError || !emailRecord) {
        console.error(`Failed to get email content for ${queueItem.email_record_id}:`, emailError)
        throw new Error(`Email record not found: ${queueItem.email_record_id}`)
      }

      // Use text content, or convert HTML to text if text is empty
      let bodyContent = emailRecord.content_text
      if (!bodyContent && emailRecord.content_html) {
        bodyContent = emailRecord.content_html
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim()
      }

      const emailContent = {
        subject: emailRecord.subject || 'No Subject',
        from: emailRecord.from_address || 'Unknown Sender',
        to: emailRecord.to_address || user.email || '',
        body: bodyContent || 'No content available',
        date: emailRecord.received_at ? new Date(emailRecord.received_at) : new Date(queueItem.created_at)
      }

      console.log(`Processing email: ${emailContent.subject}`)

      // Analyze with AI
      const analysis = await analyzeEmailContent(emailContent)
      console.log(`AI Analysis result: hasSchedulingContent=${analysis.hasSchedulingContent}, extractions=${analysis.extractions.length}`)

      if (analysis.hasSchedulingContent && analysis.extractions.length > 0) {
        // Store AI suggestions in the database AND create tasks for high-confidence items
        for (const extraction of analysis.extractions) {
          const { data: suggestion, error: suggestionError } = await supabase
            .from('ai_suggestions')
            .insert({
              user_id: user.id,
              source_email_id: queueItem.email_id,
              email_record_id: queueItem.email_record_id,
              suggestion_type: extraction.type,
              title: extraction.title,
              description: extraction.description,
              suggested_time: extraction.suggestedDateTime,
              confidence_score: extraction.confidence,
              status: 'pending',
              feedback: {
                reasoning: extraction.reasoning,
                priority: extraction.priority,
                participants: extraction.participants,
                location: extraction.location,
                duration: extraction.duration
              }
            })
            .select()
            .single()

          if (!suggestionError) {
            suggestionsCount++
            console.log(`Created AI suggestion: ${extraction.title} (confidence: ${extraction.confidence})`)
            
            // Check user automation settings for auto-creation
            const { getUserAutomationSettings } = await import('@/lib/automation/settings')
            const automationSettings = await getUserAutomationSettings()
            
            const shouldAutoCreate = automationSettings.enabled && 
                                   automationSettings.autoCreateTasks && 
                                   extraction.confidence >= automationSettings.confidenceThreshold
            
            if (shouldAutoCreate) {
              try {
                // Use the TaskService for better task creation
                const { taskService } = await import('@/lib/tasks/task-service')
                
                // Calculate priority using automation settings
                const { calculateTaskPriority, getSchedulingWindow } = await import('@/lib/automation/settings')
                const priorityInfo = await calculateTaskPriority({
                  from: emailContent.from,
                  subject: emailContent.subject,
                  body: emailContent.body
                })

                // Use automation settings for task defaults
                const taskCategory = extraction.type === 'meeting' ? 'work' : automationSettings.taskDefaults.defaultCategory
                const taskPriority = priorityInfo.priority
                const taskDuration = extraction.duration || automationSettings.taskDefaults.defaultDuration

                // Get scheduling suggestions
                const schedulingInfo = await getSchedulingWindow(taskPriority)

                const taskInput = {
                  title: extraction.title,
                  description: extraction.description || `${extraction.reasoning}\n\nGenerated from email: ${emailContent.subject}\n\nPriority factors: ${priorityInfo.factors.join(', ')}`,
                  category: taskCategory,
                  priority: taskPriority,
                  estimated_duration: taskDuration,
                  due_date: extraction.suggestedDateTime ? new Date(extraction.suggestedDateTime) : undefined,
                  scheduled_start: schedulingInfo.autoSchedule ? schedulingInfo.suggestedStart : undefined,
                  scheduled_end: schedulingInfo.autoSchedule ? schedulingInfo.suggestedEnd : undefined,
                  location: extraction.location,
                  tags: extraction.participants ? ['ai-generated', 'meeting', ...extraction.participants.slice(0, 3)] : ['ai-generated', 'email'],
                  notes: `Confidence: ${Math.round(extraction.confidence * 100)}%\nReasoning: ${extraction.reasoning}\nPriority factors: ${priorityInfo.factors.join(', ')}`,
                  ai_generated: true,
                  source_email_id: queueItem.email_id,
                  source_email_record_id: queueItem.email_record_id,
                  source_suggestion_id: suggestion.id,
                  confidence_score: extraction.confidence
                }

                const task = await taskService.createTask(taskInput)
                
                console.log(`Auto-created task: ${extraction.title} (confidence: ${extraction.confidence})`)
                
                // Update suggestion status to indicate task was created
                await supabase
                  .from('ai_suggestions')
                  .update({ 
                    status: 'processed',
                    feedback: {
                      ...suggestion.feedback,
                      converted_to_task: true,
                      task_id: task.id,
                      auto_created: true,
                      created_at: new Date().toISOString()
                    }
                  })
                  .eq('id', suggestion.id)
                  
              } catch (taskCreationError) {
                console.error('Error in task auto-creation:', taskCreationError)
                
                // Update suggestion with error status
                await supabase
                  .from('ai_suggestions')
                  .update({ 
                    feedback: {
                      ...suggestion.feedback,
                      auto_creation_failed: true,
                      error: taskCreationError instanceof Error ? taskCreationError.message : 'Unknown error'
                    }
                  })
                  .eq('id', suggestion.id)
              }
            }
          } else {
            console.error('Error storing AI suggestion:', suggestionError)
          }
        }
      }

      // **CRITICAL FIX**: Update email record to mark as AI analyzed properly
      if (queueItem.email_record_id) {
        const { error: updateError } = await supabase
          .from('emails')
          .update({
            ai_analyzed: true,
            ai_analysis_at: new Date().toISOString(),
            has_scheduling_content: analysis.hasSchedulingContent,
            scheduling_keywords: analysis.extractions.map(e => e.title.toLowerCase().split(' ')).flat()
          })
          .eq('id', queueItem.email_record_id)

        if (updateError) {
          console.error('Failed to update email record:', updateError)
        } else {
          console.log(`Marked email ${queueItem.email_record_id} as AI analyzed`)
        }
      }

      // Mark as completed
      await markProcessingComplete(queueItem.id, true)
      processedCount++

    } catch (error) {
      console.error(`Error processing queue item ${queueItem.id}:`, error)
      await markProcessingComplete(
        queueItem.id, 
        false, 
        error instanceof Error ? error.message : 'Unknown error'
      )
      errorsCount++
    }
  }

  console.log(`AI Processing completed: ${processedCount} processed, ${suggestionsCount} suggestions, ${errorsCount} errors`)
  return { processed: processedCount, suggestions: suggestionsCount, errors: errorsCount }
}

/**
 * Process a specific email and return AI suggestions
 */
export async function processEmailWithAI(emailData: {
  id: string
  subject: string
  from: string
  to: string
  body: string
  date: Date
}): Promise<{
  analysis: EmailAnalysisResult
  suggestions: string[]
}> {
  try {
    const analysis = await analyzeEmailContent(emailData)
    const user = await getCurrentUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    const suggestions: string[] = []

    if (analysis.hasSchedulingContent && analysis.extractions.length > 0) {
      const supabase = await createClient()

      // Store suggestions in database
      for (const extraction of analysis.extractions) {
        const { data, error } = await supabase
          .from('ai_suggestions')
          .insert({
            user_id: user.id,
            source_email_id: emailData.id,
            suggestion_type: extraction.type,
            title: extraction.title,
            description: extraction.description,
            suggested_time: extraction.suggestedDateTime,
            confidence_score: extraction.confidence,
            status: 'pending',
            feedback: {
              reasoning: extraction.reasoning,
              priority: extraction.priority,
              participants: extraction.participants,
              location: extraction.location,
              duration: extraction.duration
            }
          })
          .select()
          .single()

        if (error) {
          console.error('Error storing AI suggestion:', error)
        } else {
          suggestions.push(`Created ${extraction.type}: ${extraction.title} (${Math.round(extraction.confidence * 100)}% confidence)`)
        }
      }
    }

    return { analysis, suggestions }
  } catch (error) {
    console.error('Error processing email with AI:', error)
    throw error
  }
}

/**
 * Get AI suggestions for a user
 */
export async function getUserAISuggestions(status?: string, email_id?: string) {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  const supabase = await createClient()
  
  let query = supabase
    .from('ai_suggestions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (email_id) {
    query = query.eq('source_email_id', email_id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching AI suggestions:', error)
    return []
  }

  return data || []
}

/**
 * Update suggestion status
 */
export async function updateSuggestionStatus(suggestionId: string, status: 'approved' | 'rejected' | 'processed', feedback?: any) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ai_suggestions')
    .update({
      status,
      feedback: feedback ? { ...feedback } : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', suggestionId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating suggestion status:', error)
    throw error
  }

  return data
}

/**
 * Get AI processing statistics
 */
export async function getAIProcessingStats() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const supabase = await createClient()
  
  const [suggestionsResult, queueResult] = await Promise.all([
    supabase
      .from('ai_suggestions')
      .select('status')
      .eq('user_id', user.id),
    supabase
      .from('processing_queue')
      .select('status')
      .eq('user_id', user.id)
  ])

  const suggestions = suggestionsResult.data || []
  const queue = queueResult.data || []

  return {
    totalSuggestions: suggestions.length,
    pendingSuggestions: suggestions.filter(s => s.status === 'pending').length,
    approvedSuggestions: suggestions.filter(s => s.status === 'approved').length,
    queuePending: queue.filter(q => q.status === 'pending').length,
    queueCompleted: queue.filter(q => q.status === 'completed').length,
    queueFailed: queue.filter(q => q.status === 'failed').length
  }
}