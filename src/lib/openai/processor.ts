import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { analyzeEmailContent, type EmailAnalysisResult, type SchedulingExtraction } from './client'
import { markProcessingComplete } from '@/lib/gmail/processor'
import { UnifiedEmailProcessor } from '@/lib/email/unified-processor'

/**
 * Process emails in the queue using AI analysis
 * UPDATED: Now uses UnifiedEmailProcessor for better performance and consistency
 */
export async function processQueuedEmails(maxItems: number = 10) {
  try {
    // Use the new unified processor for better performance
    const processor = await UnifiedEmailProcessor.create({
      maxBatchSize: maxItems,
      enableAIAnalysis: true,
      autoCreateTasks: true,
      confidenceThreshold: 0.7
    })

    const result = await processor.processEmails('queue')
    
    console.log('Unified processor results:', result)
    
    return {
      processed: result.processed + result.skipped,
      suggestions: result.suggestions_created,
      errors: result.errors,
      errorDetails: result.error_details
    }

  } catch (error) {
    console.error('Error in processQueuedEmails:', error)
    return {
      processed: 0,
      suggestions: 0,
      errors: 1,
      errorDetails: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * LEGACY FUNCTION - Kept for backward compatibility
 * Use UnifiedEmailProcessor.processEmails() for new implementations
 */
export async function processQueuedEmailsLegacy(maxItems: number = 10) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = await createClient()
  let processedCount = 0
  let suggestionsCount = 0
  let errorsCount = 0
  let errorDetails: string[] = []

  try {
    // Get pending items from processing queue with error recovery
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
      return { processed: 0, suggestions: 0, errors: 0, errorDetails: [] }
    }

    console.log(`Processing ${queueItems.length} queued emails for AI analysis...`)

    for (const queueItem of queueItems) {
      let itemProcessingError: string | null = null

      try {
        // Mark as processing with retry count increment
        const { error: updateError } = await supabase
          .from('processing_queue')
          .update({ 
            status: 'processing',
            retry_count: (queueItem.retry_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', queueItem.id)

        if (updateError) {
          throw new Error(`Failed to update queue status: ${updateError.message}`)
        }

        // Get the email content with better error handling
        const { data: emailRecord, error: emailError } = await supabase
          .from('emails')
          .select('subject, from_address, to_address, content_text, content_html, received_at, snippet')
          .eq('id', queueItem.email_record_id)
          .single()

        if (emailError) {
          throw new Error(`Email fetch error: ${emailError.message}`)
        }

        if (!emailRecord) {
          throw new Error(`Email record not found: ${queueItem.email_record_id}`)
        }

        // Prepare email content with fallbacks
        let bodyContent = emailRecord.content_text || ''
        
        // Use HTML content as fallback if text is empty/short
        if ((!bodyContent || bodyContent.length < 50) && emailRecord.content_html) {
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

        // Use snippet as final fallback
        if (!bodyContent && emailRecord.snippet) {
          bodyContent = emailRecord.snippet
        }

        const emailContent = {
          subject: emailRecord.subject || 'No Subject',
          from: emailRecord.from_address || 'Unknown Sender',
          to: emailRecord.to_address || user.email || '',
          body: bodyContent || 'No content available',
          date: emailRecord.received_at ? new Date(emailRecord.received_at) : new Date(queueItem.created_at)
        }

        // Skip processing if email has insufficient content
        if (!emailContent.subject && !emailContent.body) {
          throw new Error('Email has insufficient content for AI analysis')
        }

        console.log(`Processing email: ${emailContent.subject}`)

        // Analyze with AI (with timeout and retry logic)
        let analysis: any = null
        let aiAnalysisAttempts = 0
        const maxAIAttempts = 2

        while (aiAnalysisAttempts < maxAIAttempts) {
          try {
            analysis = await Promise.race([
              analyzeEmailContent(emailContent),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('AI analysis timeout')), 30000)
              )
            ])
            break
          } catch (aiError) {
            aiAnalysisAttempts++
            console.warn(`AI analysis attempt ${aiAnalysisAttempts} failed:`, aiError)
            
            if (aiAnalysisAttempts >= maxAIAttempts) {
              throw new Error(`AI analysis failed after ${maxAIAttempts} attempts: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`)
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        console.log(`AI Analysis result: hasSchedulingContent=${analysis.hasSchedulingContent}, extractions=${analysis.extractions?.length || 0}`)

        // Process AI suggestions with improved error handling
        if (analysis?.hasSchedulingContent && analysis.extractions?.length > 0) {
          for (const extraction of analysis.extractions) {
            try {
              // Validate extraction data
              if (!extraction.title || extraction.confidence < 0.1) {
                console.warn('Skipping low-quality extraction:', extraction)
                continue
              }

              const { data: suggestion, error: suggestionError } = await supabase
                .from('ai_suggestions')
                .insert({
                  user_id: user.id,
                  source_email_id: queueItem.email_id,
                  email_record_id: queueItem.email_record_id,
                  suggestion_type: extraction.type || 'task',
                  title: extraction.title.substring(0, 255), // Ensure title length
                  description: extraction.description?.substring(0, 1000) || '', // Limit description length
                  suggested_due_date: extraction.suggestedDateTime || null,
                  confidence_score: Math.min(Math.max(extraction.confidence, 0), 1), // Clamp confidence
                  status: 'pending',
                  task_category: extraction.type === 'meeting' ? 'work' : 'task',
                  estimated_duration: extraction.duration || 30,
                  priority: extraction.priority || 'medium',
                  location: extraction.location?.substring(0, 255) || null,
                  suggested_tags: extraction.participants?.slice(0, 5) || []
                })
                .select()
                .single()

              if (suggestionError) {
                console.error('Error storing AI suggestion:', suggestionError)
                errorDetails.push(`Suggestion storage failed: ${suggestionError.message}`)
                continue
              }

              suggestionsCount++
              console.log(`Created AI suggestion: ${extraction.title} (confidence: ${extraction.confidence})`)
              
              // Simplified auto-task creation (removed complex dependency chains)
              if (extraction.confidence >= 0.7) { // High confidence threshold
                try {
                  const taskData = {
                    user_id: user.id,
                    title: extraction.title,
                    description: extraction.description || `Generated from email: ${emailContent.subject}`,
                    category: extraction.type === 'meeting' ? 'work' : 'task',
                    priority: extraction.priority || 'medium',
                    estimated_duration: extraction.duration || 30,
                    due_date: extraction.suggestedDateTime || null,
                    ai_generated: true,
                    source_email_id: queueItem.email_id,
                    source_email_record_id: queueItem.email_record_id,
                    source_suggestion_id: suggestion.id,
                    confidence_score: extraction.confidence,
                    location: extraction.location,
                    notes: `Auto-created from AI analysis (${Math.round(extraction.confidence * 100)}% confidence)`
                  }

                  const { data: task, error: taskError } = await supabase
                    .from('tasks')
                    .insert(taskData)
                    .select()
                    .single()

                  if (!taskError) {
                    console.log(`Auto-created task: ${extraction.title}`)
                    
                    // Update suggestion status
                    await supabase
                      .from('ai_suggestions')
                      .update({ 
                        status: 'auto_converted',
                        converted_to_task_id: task.id,
                        converted_at: new Date().toISOString()
                      })
                      .eq('id', suggestion.id)
                  }
                } catch (taskCreationError) {
                  console.warn('Auto-task creation failed:', taskCreationError)
                  // Continue processing - don't fail the entire item
                }
              }
            } catch (extractionError) {
              console.error('Error processing extraction:', extractionError)
              errorDetails.push(`Extraction processing failed: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`)
            }
          }
        }

        // Update email record with comprehensive error handling
        try {
          const { error: updateError } = await supabase
            .from('emails')
            .update({
              ai_analyzed: true,
              ai_analysis_at: new Date().toISOString(),
              has_scheduling_content: analysis?.hasSchedulingContent || false,
              scheduling_keywords: analysis?.extractions?.map((e: any) => e.title.toLowerCase().split(' ')).flat().slice(0, 10) || []
            })
            .eq('id', queueItem.email_record_id)

          if (updateError) {
            console.error('Failed to update email record:', updateError)
            errorDetails.push(`Email update failed: ${updateError.message}`)
          } else {
            console.log(`Marked email ${queueItem.email_record_id} as AI analyzed`)
          }
        } catch (emailUpdateError) {
          console.error('Email update error:', emailUpdateError)
          errorDetails.push(`Email update error: ${emailUpdateError instanceof Error ? emailUpdateError.message : 'Unknown error'}`)
        }

        // Mark as completed with success
        await markProcessingComplete(queueItem.id, true)
        processedCount++

      } catch (error) {
        itemProcessingError = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error processing queue item ${queueItem.id}:`, error)
        
        // Check retry count before marking as failed
        const maxRetries = 3
        const currentRetries = queueItem.retry_count || 0
        
        if (currentRetries >= maxRetries) {
          // Mark as permanently failed
          await markProcessingComplete(queueItem.id, false, itemProcessingError)
          console.log(`Queue item ${queueItem.id} permanently failed after ${maxRetries} retries`)
        } else {
          // Reset to pending for retry
          await supabase
            .from('processing_queue')
            .update({ 
              status: 'pending',
              error_message: itemProcessingError,
              updated_at: new Date().toISOString()
            })
            .eq('id', queueItem.id)
          console.log(`Queue item ${queueItem.id} reset for retry (attempt ${currentRetries + 1}/${maxRetries})`)
        }
        
        errorsCount++
        errorDetails.push(`Item ${queueItem.id}: ${itemProcessingError}`)
      }
    }

  } catch (globalError) {
    console.error('Global error in processQueuedEmails:', globalError)
    errorDetails.push(`Global processing error: ${globalError instanceof Error ? globalError.message : 'Unknown error'}`)
    errorsCount++
  }

  console.log(`AI Processing completed: ${processedCount} processed, ${suggestionsCount} suggestions, ${errorsCount} errors`)
  
  return { 
    processed: processedCount, 
    suggestions: suggestionsCount, 
    errors: errorsCount,
    errorDetails: errorDetails.slice(0, 10) // Limit error details
  }
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