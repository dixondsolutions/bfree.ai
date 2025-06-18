import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { taskService } from '@/lib/tasks/task-service'
import { extractTasksFromEmail } from '@/lib/openai/task-extraction'
import { getUserAutomationSettings, calculateTaskPriority, getSchedulingWindow } from '@/lib/automation/settings'

export interface EmailProcessingResult {
  emailId: string
  emailRecordId?: string
  processed: boolean
  tasksCreated: number
  suggestionsCreated: number
  errors: string[]
  processingSteps: {
    emailStored: boolean
    aiAnalyzed: boolean
    suggestionsGenerated: boolean
    tasksAutoCreated: boolean
  }
}

/**
 * Enhanced bulletproof email processor with proper task creation and linking
 */
export class EnhancedEmailProcessor {
  private supabase: any
  private userId: string | null = null

  constructor() {
    this.supabase = null
  }

  private async initialize() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    if (!this.userId) {
      const user = await getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }
      this.userId = user.id
    }
  }

  /**
   * Process a single email with bulletproof task creation
   */
  async processEmailWithTaskCreation(emailData: {
    gmail_id: string
    thread_id?: string
    subject: string
    from_address: string
    from_name?: string
    to_address: string
    content_text?: string
    content_html?: string
    snippet?: string
    received_at: Date
    labels?: string[]
    has_attachments?: boolean
    attachment_count?: number
  }): Promise<EmailProcessingResult> {
    await this.initialize()
    
    const result: EmailProcessingResult = {
      emailId: emailData.gmail_id,
      processed: false,
      tasksCreated: 0,
      suggestionsCreated: 0,
      errors: [],
      processingSteps: {
        emailStored: false,
        aiAnalyzed: false,
        suggestionsGenerated: false,
        tasksAutoCreated: false
      }
    }

    try {
      // Step 1: Store/Update email record
      const emailRecord = await this.storeEmailRecord(emailData)
      result.emailRecordId = emailRecord.id
      result.processingSteps.emailStored = true

      // Step 2: Analyze email content with AI
      const analysis = await this.analyzeEmailContent(emailData, emailRecord.id)
      result.processingSteps.aiAnalyzed = true

      // Step 3: Create AI suggestions if content is actionable
      if (analysis.hasTaskContent && analysis.taskExtractions.length > 0) {
        const suggestions = await this.createAISuggestions(analysis.taskExtractions, emailRecord.id)
        result.suggestionsCreated = suggestions.length
        result.processingSteps.suggestionsGenerated = true

        // Step 4: Auto-create tasks based on automation settings
        const automationSettings = await getUserAutomationSettings()
        if (automationSettings.enabled && automationSettings.autoCreateTasks) {
          const tasks = await this.autoCreateTasks(suggestions, emailRecord.id, automationSettings)
          result.tasksCreated = tasks.length
          result.processingSteps.tasksAutoCreated = true
        }
      }

      // Step 5: Update email processing status
      await this.markEmailProcessed(emailRecord.id, analysis.hasTaskContent)

      result.processed = true
      console.log(`✅ Successfully processed email ${emailData.gmail_id}: ${result.tasksCreated} tasks created`)

    } catch (error) {
      console.error(`❌ Error processing email ${emailData.gmail_id}:`, error)
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Store email record with proper timestamp handling
   */
  private async storeEmailRecord(emailData: any) {
    // Ensure received_at is properly converted to ISO string
    const receivedAtString = emailData.received_at instanceof Date 
      ? emailData.received_at.toISOString()
      : new Date(emailData.received_at).toISOString()

    const { data: existingEmail } = await this.supabase
      .from('emails')
      .select('id')
      .eq('user_id', this.userId)
      .eq('gmail_id', emailData.gmail_id)
      .single()

    if (existingEmail) {
      // Update existing email
      const { data: updatedEmail, error } = await this.supabase
        .from('emails')
        .update({
          ...emailData,
          user_id: this.userId,
          received_at: receivedAtString,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEmail.id)
        .select()
        .single()

      if (error) throw new Error(`Failed to update email: ${error.message}`)
      return updatedEmail
    } else {
      // Create new email record
      const { data: newEmail, error } = await this.supabase
        .from('emails')
        .insert({
          ...emailData,
          user_id: this.userId,
          received_at: receivedAtString
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to store email: ${error.message}`)
      return newEmail
    }
  }

  /**
   * Analyze email content using AI task extraction
   */
  private async analyzeEmailContent(emailData: any, emailRecordId: string) {
    try {
      const analysis = await extractTasksFromEmail({
        subject: emailData.subject,
        from: emailData.from_address,
        to: emailData.to_address,
        body: emailData.content_text || emailData.snippet || '',
        date: emailData.received_at
      })

      // Update email with analysis results
      await this.supabase
        .from('emails')
        .update({
          ai_analyzed: true,
          ai_analysis_at: new Date().toISOString(),
          has_scheduling_content: analysis.hasTaskContent,
          scheduling_keywords: analysis.taskExtractions.map(t => t.title.toLowerCase().split(' ')).flat()
        })
        .eq('id', emailRecordId)

      return analysis
    } catch (error) {
      console.error('AI analysis failed:', error)
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create AI suggestions with proper linking
   */
  private async createAISuggestions(taskExtractions: any[], emailRecordId: string) {
    const suggestions = []

    for (const extraction of taskExtractions) {
      try {
        const { data: suggestion, error } = await this.supabase
          .from('ai_suggestions')
          .insert({
            user_id: this.userId,
            source_email_id: null, // We'll use the email_record_id for linking
            email_record_id: emailRecordId, // This is the proper FK relationship
            suggestion_type: extraction.type || 'task',
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
          console.error('Failed to create suggestion:', error)
          throw new Error(`Failed to create suggestion: ${error.message}`)
        }

        suggestions.push(suggestion)
        console.log(`✅ Created AI suggestion: ${extraction.title} (confidence: ${extraction.confidence})`)

      } catch (error) {
        console.error('Error creating suggestion:', error)
        throw error
      }
    }

    return suggestions
  }

  /**
   * Auto-create tasks with bulletproof email linking
   */
  private async autoCreateTasks(suggestions: any[], emailRecordId: string, automationSettings: any) {
    const tasks = []

    for (const suggestion of suggestions) {
      try {
        // Check if task should be auto-created based on confidence
        const confidenceThreshold = automationSettings.confidenceThreshold || 0.4
        if (suggestion.confidence_score < confidenceThreshold) {
          console.log(`⏭️ Skipping task creation for low confidence suggestion: ${suggestion.title} (${suggestion.confidence_score} < ${confidenceThreshold})`)
          continue
        }

        // Get email record for context
        const { data: emailRecord } = await this.supabase
          .from('emails')
          .select('gmail_id, subject, from_address')
          .eq('id', emailRecordId)
          .single()

        // Create task with CRITICAL email linking - both IDs for bulletproof relationship
        const taskInput = {
          title: suggestion.title,
          description: suggestion.description || `${suggestion.feedback?.reasoning || ''}\n\nGenerated from email: ${emailRecord?.subject || 'Unknown'}`,
          category: automationSettings.taskDefaults?.defaultCategory || 'work',
          priority: suggestion.feedback?.priority || automationSettings.taskDefaults?.defaultPriority || 'medium',
          estimated_duration: suggestion.feedback?.duration || automationSettings.taskDefaults?.defaultDuration || 30,
          due_date: suggestion.suggested_time ? new Date(suggestion.suggested_time) : undefined,
          location: suggestion.feedback?.location,
          tags: ['ai-generated', 'email'],
          notes: `Confidence: ${Math.round(suggestion.confidence_score * 100)}%\nReasoning: ${suggestion.feedback?.reasoning || ''}`,
          ai_generated: true,
          source_email_id: emailRecord?.gmail_id, // Gmail ID for backward compatibility
          source_email_record_id: emailRecordId, // CRITICAL: Proper FK relationship
          source_suggestion_id: suggestion.id,
          confidence_score: suggestion.confidence_score
        }

        const task = await taskService.createTask(taskInput)
        tasks.push(task)
        
        console.log(`✅ Auto-created task: ${suggestion.title} (confidence: ${suggestion.confidence_score} >= ${confidenceThreshold}) with email link: ${emailRecordId}`)
        
        // Update suggestion status to indicate task was created
        await this.supabase
          .from('ai_suggestions')
          .update({ 
            status: 'converted',
            feedback: {
              ...suggestion.feedback,
              converted_to_task: true,
              task_id: task.id,
              auto_created: true,
              created_at: new Date().toISOString()
            }
          })
          .eq('id', suggestion.id)
          
      } catch (error) {
        console.error('Error in task auto-creation:', error)
        
        // Update suggestion with error status
        await this.supabase
          .from('ai_suggestions')
          .update({ 
            feedback: {
              ...suggestion.feedback,
              auto_creation_failed: true,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          })
          .eq('id', suggestion.id)
      }
    }

    return tasks
  }

  /**
   * Mark email as processed
   */
  private async markEmailProcessed(emailRecordId: string, hasTaskContent: boolean) {
    await this.supabase
      .from('emails')
      .update({
        processed_at: new Date().toISOString(),
        has_scheduling_content: hasTaskContent
      })
      .eq('id', emailRecordId)
  }

  /**
   * Process multiple emails in batch
   */
  async processBatchEmails(emails: any[]): Promise<EmailProcessingResult[]> {
    const results = []
    
    for (const email of emails) {
      const result = await this.processEmailWithTaskCreation(email)
      results.push(result)
    }

    return results
  }

  /**
   * Get processing statistics with bulletproof metrics
   */
  async getProcessingStats(days: number = 7) {
    await this.initialize()

    const { data: stats, error } = await this.supabase
      .rpc('get_processing_statistics', {
        p_user_id: this.userId,
        p_days: days
      })

    if (error) {
      // Fallback manual calculation with enhanced metrics
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: emails } = await this.supabase
        .from('emails')
        .select('id, ai_analyzed, processed_at')
        .eq('user_id', this.userId)
        .gte('created_at', startDate.toISOString())

      const { data: tasks } = await this.supabase
        .from('tasks')
        .select('id, ai_generated, source_email_record_id, source_email_id, confidence_score')
        .eq('user_id', this.userId)
        .eq('ai_generated', true)
        .gte('created_at', startDate.toISOString())

      const { data: suggestions } = await this.supabase
        .from('ai_suggestions')
        .select('id, status, email_record_id')
        .eq('user_id', this.userId)
        .gte('created_at', startDate.toISOString())

      return {
        totalEmails: emails?.length || 0,
        analyzedEmails: emails?.filter(e => e.ai_analyzed).length || 0,
        processedEmails: emails?.filter(e => e.processed_at).length || 0,
        tasksCreated: tasks?.length || 0,
        tasksWithEmailLink: tasks?.filter(t => t.source_email_record_id).length || 0,
        suggestionsCreated: suggestions?.length || 0,
        suggestionsConverted: suggestions?.filter(s => s.status === 'converted').length || 0,
        linkageHealth: tasks?.length > 0 ? (tasks.filter(t => t.source_email_record_id).length / tasks.length) * 100 : 100
      }
    }

    return stats[0] || {}
  }
}

// Export singleton instance for use across the application
export const enhancedEmailProcessor = new EnhancedEmailProcessor() 