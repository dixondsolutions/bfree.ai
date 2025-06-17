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

      // We need to fetch the email content from Gmail or stored data
      // For now, we'll simulate this with the stored email_id
      // In a real implementation, you'd fetch the full email content here
      
      // Simulate email content for demonstration
      const emailContent = {
        subject: `Email ${queueItem.email_id}`,
        from: 'sender@example.com',
        to: user.email || '',
        body: 'Sample email content for processing',
        date: new Date(queueItem.created_at)
      }

      // Analyze with AI
      const analysis = await analyzeEmailContent(emailContent)

      if (analysis.hasSchedulingContent && analysis.extractions.length > 0) {
        // Store AI suggestions in the database
        for (const extraction of analysis.extractions) {
          const { error: suggestionError } = await supabase
            .from('ai_suggestions')
            .insert({
              user_id: user.id,
              source_email_id: queueItem.email_id,
              suggestion_type: extraction.type,
              title: extraction.title,
              description: extraction.description,
              suggested_time: extraction.suggestedDateTime,
              confidence_score: extraction.confidence,
              status: 'pending'
            })

          if (!suggestionError) {
            suggestionsCount++
          }
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
export async function getUserAISuggestions(status?: string) {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  const supabase = await createClient()
  
  let query = supabase
    .from('ai_suggestions')
    .select('*')
    .eq('user_id', user.id)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
    .order('confidence_score', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching AI suggestions:', error)
    return []
  }

  return data || []
}

/**
 * Update AI suggestion status
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
      feedback: feedback || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', suggestionId)
    .eq('user_id', user.id) // Ensure user can only update their own suggestions
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update suggestion: ${error.message}`)
  }

  return data
}

/**
 * Get AI processing statistics
 */
export async function getAIProcessingStats() {
  const user = await getCurrentUser()
  if (!user) {
    return {
      totalSuggestions: 0,
      pendingSuggestions: 0,
      approvedSuggestions: 0,
      averageConfidence: 0
    }
  }

  const supabase = await createClient()
  
  const { data: suggestions } = await supabase
    .from('ai_suggestions')
    .select('status, confidence_score')
    .eq('user_id', user.id)

  if (!suggestions) {
    return {
      totalSuggestions: 0,
      pendingSuggestions: 0,
      approvedSuggestions: 0,
      averageConfidence: 0
    }
  }

  const totalSuggestions = suggestions.length
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length
  const approvedSuggestions = suggestions.filter(s => s.status === 'approved').length
  const averageConfidence = totalSuggestions > 0 
    ? suggestions.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / totalSuggestions 
    : 0

  return {
    totalSuggestions,
    pendingSuggestions,
    approvedSuggestions,
    averageConfidence: Math.round(averageConfidence * 100) / 100
  }
}