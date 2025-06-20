/**
 * Unified Email Processor
 * Consolidates all email processing paths into a single, efficient workflow
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { EmailClassificationService, type EmailData, type EmailClassification } from './classification-service'
import { analyzeEmailContent, type EmailAnalysisResult } from '@/lib/openai/client'

export interface ProcessingOptions {
  maxBatchSize?: number
  enableAIAnalysis?: boolean
  autoCreateTasks?: boolean
  confidenceThreshold?: number
  priority?: 'high' | 'normal' | 'low'
}

export interface ProcessingResult {
  processed: number
  skipped: number
  errors: number
  ai_analyzed: number
  suggestions_created: number
  tasks_created: number
  processing_time_ms: number
  error_details: string[]
}

export interface EmailProcessingItem {
  email_record_id: string
  gmail_id: string
  subject: string
  from_address: string
  classification: EmailClassification
  priority_score: number
}

/**
 * Unified email processor that handles all email processing workflows
 */
export class UnifiedEmailProcessor {
  private supabase: any
  private user: any
  private processingOptions: ProcessingOptions
  private aiAnalysisCache: Map<string, EmailAnalysisResult> = new Map()

  constructor(supabase: any, user: any, options: ProcessingOptions = {}) {
    this.supabase = supabase
    this.user = user
    this.processingOptions = {
      maxBatchSize: 10,
      enableAIAnalysis: true,
      autoCreateTasks: true,
      confidenceThreshold: 0.7,
      priority: 'normal',
      ...options
    }
  }

  /**
   * Main processing method - handles emails from queue or direct input
   */
  async processEmails(emailSource: 'queue' | 'direct', emails?: EmailData[]): Promise<ProcessingResult> {
    const startTime = Date.now()
    const result: ProcessingResult = {
      processed: 0,
      skipped: 0,
      errors: 0,
      ai_analyzed: 0,
      suggestions_created: 0,
      tasks_created: 0,
      processing_time_ms: 0,
      error_details: []
    }

    try {
      let emailsToProcess: EmailProcessingItem[]

      if (emailSource === 'queue') {
        emailsToProcess = await this.getEmailsFromQueue()
      } else if (emails) {
        emailsToProcess = await this.prepareDirectEmails(emails)
      } else {
        throw new Error('No emails provided for direct processing')
      }

      if (emailsToProcess.length === 0) {
        result.processing_time_ms = Date.now() - startTime
        return result
      }

      console.log(`Processing ${emailsToProcess.length} emails via unified processor`)

      // Sort by priority for optimal processing order
      emailsToProcess.sort((a, b) => b.priority_score - a.priority_score)

      // Process in batches for better performance
      const batches = this.createBatches(emailsToProcess, this.processingOptions.maxBatchSize!)
      
      for (const batch of batches) {
        const batchResult = await this.processBatch(batch)
        this.mergeBatchResult(result, batchResult)
      }

      result.processing_time_ms = Date.now() - startTime
      console.log(`Unified processing completed in ${result.processing_time_ms}ms:`, {
        processed: result.processed,
        ai_analyzed: result.ai_analyzed,
        suggestions_created: result.suggestions_created,
        tasks_created: result.tasks_created,
        errors: result.errors
      })

      return result

    } catch (error) {
      console.error('Error in unified email processing:', error)
      result.errors++
      result.error_details.push(`Global error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.processing_time_ms = Date.now() - startTime
      return result
    }
  }

  /**
   * Get emails from processing queue
   */
  private async getEmailsFromQueue(): Promise<EmailProcessingItem[]> {
    const { data: queueItems, error } = await this.supabase
      .from('processing_queue')
      .select(`
        id,
        email_record_id,
        email_id,
        retry_count,
        emails!inner(
          id,
          gmail_id,
          subject,
          from_address,
          from_name,
          content_text,
          content_html,
          snippet,
          labels,
          received_at,
          ai_analyzed
        )
      `)
      .eq('user_id', this.user.id)
      .eq('status', 'pending')
      .lt('retry_count', 3) // Skip items that have failed too many times
      .order('created_at', { ascending: true })
      .limit(this.processingOptions.maxBatchSize! * 2) // Get more items to allow for filtering

    if (error) {
      throw new Error(`Failed to fetch queue items: ${error.message}`)
    }

    const emailItems: EmailProcessingItem[] = []

    for (const item of queueItems || []) {
      const email = item.emails
      if (!email || email.ai_analyzed) {
        continue // Skip already analyzed emails
      }

      // Validate email has sufficient content
      if (!EmailClassificationService.hasValidContent(email)) {
        continue
      }

      // Classify email
      const classification = EmailClassificationService.classifyEmail(email, this.user.email)
      
      emailItems.push({
        email_record_id: email.id,
        gmail_id: email.gmail_id,
        subject: email.subject,
        from_address: email.from_address,
        classification,
        priority_score: classification.priority_score
      })
    }

    return emailItems
  }

  /**
   * Prepare direct emails for processing
   */
  private async prepareDirectEmails(emails: EmailData[]): Promise<EmailProcessingItem[]> {
    const emailItems: EmailProcessingItem[] = []

    for (const email of emails) {
      if (!EmailClassificationService.hasValidContent(email)) {
        continue
      }

      const classification = EmailClassificationService.classifyEmail(email, this.user.email)
      
      emailItems.push({
        email_record_id: '', // Will be set during processing
        gmail_id: email.subject, // Temporary ID for direct emails
        subject: email.subject,
        from_address: email.from_address,
        classification,
        priority_score: classification.priority_score
      })
    }

    return emailItems
  }

  /**
   * Create processing batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Process a batch of emails
   */
  private async processBatch(batch: EmailProcessingItem[]): Promise<ProcessingResult> {
    const batchResult: ProcessingResult = {
      processed: 0,
      skipped: 0,
      errors: 0,
      ai_analyzed: 0,
      suggestions_created: 0,
      tasks_created: 0,
      processing_time_ms: 0,
      error_details: []
    }

    // Mark batch items as processing
    await this.markBatchAsProcessing(batch)

    // Process each item in the batch
    for (const item of batch) {
      try {
        const itemResult = await this.processEmailItem(item)
        this.mergeBatchResult(batchResult, itemResult)
      } catch (error) {
        console.error(`Error processing email ${item.gmail_id}:`, error)
        batchResult.errors++
        batchResult.error_details.push(`Email ${item.gmail_id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        
        // Mark item as failed
        await this.markEmailProcessingFailed(item.email_record_id, error instanceof Error ? error.message : 'Unknown error')
      }
    }

    return batchResult
  }

  /**
   * Process individual email item
   */
  private async processEmailItem(item: EmailProcessingItem): Promise<ProcessingResult> {
    const itemResult: ProcessingResult = {
      processed: 1,
      skipped: 0,
      errors: 0,
      ai_analyzed: 0,
      suggestions_created: 0,
      tasks_created: 0,
      processing_time_ms: 0,
      error_details: []
    }

    // Skip if not marked for AI analysis
    if (!item.classification.should_analyze_with_ai) {
      console.log(`Skipping AI analysis for email: ${item.subject} (classification score too low)`)
      await this.markEmailAsAnalyzed(item.email_record_id, item.classification, null)
      itemResult.skipped = 1
      itemResult.processed = 0
      return itemResult
    }

    // Get full email content for AI analysis
    const emailContent = await this.getFullEmailContent(item.email_record_id)
    if (!emailContent) {
      throw new Error(`Failed to get email content for ${item.email_record_id}`)
    }

    // Perform AI analysis with caching
    const cacheKey = this.generateCacheKey(emailContent)
    let analysis = this.aiAnalysisCache.get(cacheKey)

    if (!analysis) {
      analysis = await this.performAIAnalysis(emailContent)
      if (analysis) {
        this.aiAnalysisCache.set(cacheKey, analysis)
        // Limit cache size
        if (this.aiAnalysisCache.size > 100) {
          const firstKey = this.aiAnalysisCache.keys().next().value
          this.aiAnalysisCache.delete(firstKey)
        }
      }
    } else {
      console.log(`Using cached AI analysis for email: ${item.subject}`)
    }

    if (!analysis) {
      throw new Error('AI analysis failed')
    }

    itemResult.ai_analyzed = 1

    // Create suggestions from AI analysis
    if (analysis.hasSchedulingContent && analysis.extractions?.length > 0) {
      const suggestionResults = await this.createSuggestionsFromAnalysis(
        item.email_record_id,
        analysis,
        emailContent
      )
      itemResult.suggestions_created = suggestionResults.created
      itemResult.tasks_created = suggestionResults.tasks_created
    }

    // Mark email as analyzed
    await this.markEmailAsAnalyzed(item.email_record_id, item.classification, analysis)

    return itemResult
  }

  /**
   * Get full email content for AI analysis
   */
  private async getFullEmailContent(emailRecordId: string): Promise<any> {
    const { data: email, error } = await this.supabase
      .from('emails')
      .select('subject, from_address, from_name, to_address, content_text, content_html, snippet, received_at')
      .eq('id', emailRecordId)
      .single()

    if (error) {
      throw new Error(`Failed to get email content: ${error.message}`)
    }

    return email
  }

  /**
   * Perform AI analysis with timeout and error handling
   */
  private async performAIAnalysis(emailContent: any): Promise<EmailAnalysisResult | null> {
    try {
      const analysisPromise = analyzeEmailContent({
        subject: emailContent.subject || 'No Subject',
        from: emailContent.from_address || 'Unknown Sender',
        to: emailContent.to_address || this.user.email || '',
        body: EmailClassificationService['extractContent'](emailContent),
        date: new Date(emailContent.received_at)
      })

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('AI analysis timeout')), 30000)
      )

      return await Promise.race([analysisPromise, timeoutPromise])
    } catch (error) {
      console.error('AI analysis failed:', error)
      return null
    }
  }

  /**
   * Generate cache key for AI analysis
   */
  private generateCacheKey(emailContent: any): string {
    const content = `${emailContent.subject}-${emailContent.from_address}-${EmailClassificationService['extractContent'](emailContent)}`
    // Simple hash function
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `email-analysis-${Math.abs(hash)}`
  }

  /**
   * Create suggestions from AI analysis results
   */
  private async createSuggestionsFromAnalysis(
    emailRecordId: string,
    analysis: EmailAnalysisResult,
    emailContent: any
  ): Promise<{ created: number; tasks_created: number }> {
    let created = 0
    let tasks_created = 0

    for (const extraction of analysis.extractions || []) {
      try {
        // Validate extraction quality
        if (!extraction.title || extraction.confidence < 0.1) {
          continue
        }

        // Create AI suggestion
        const { data: suggestion, error: suggestionError } = await this.supabase
          .from('ai_suggestions')
          .insert({
            user_id: this.user.id,
            email_record_id: emailRecordId,
            suggestion_type: extraction.type || 'task',
            title: extraction.title.substring(0, 255),
            description: extraction.description?.substring(0, 1000) || '',
            suggested_due_date: extraction.suggestedDateTime || null,
            confidence_score: Math.min(Math.max(extraction.confidence, 0), 1),
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
          console.error('Failed to create suggestion:', suggestionError)
          continue
        }

        created++

        // Auto-create task if confidence is high enough
        if (this.processingOptions.autoCreateTasks && 
            extraction.confidence >= (this.processingOptions.confidenceThreshold || 0.7)) {
          
          const taskCreated = await this.createTaskFromSuggestion(suggestion, emailContent)
          if (taskCreated) {
            tasks_created++
          }
        }

      } catch (error) {
        console.error('Error creating suggestion:', error)
      }
    }

    return { created, tasks_created }
  }

  /**
   * Create task from high-confidence suggestion
   */
  private async createTaskFromSuggestion(suggestion: any, emailContent: any): Promise<boolean> {
    try {
      const taskData = {
        user_id: this.user.id,
        title: suggestion.title,
        description: suggestion.description || `Generated from email: ${emailContent.subject}`,
        category: suggestion.task_category || 'task',
        priority: suggestion.priority || 'medium',
        estimated_duration: suggestion.estimated_duration || 30,
        due_date: suggestion.suggested_due_date || null,
        ai_generated: true,
        source_email_record_id: suggestion.email_record_id,
        source_suggestion_id: suggestion.id,
        confidence_score: suggestion.confidence_score,
        location: suggestion.location,
        notes: `Auto-created from AI analysis (${Math.round(suggestion.confidence_score * 100)}% confidence)`
      }

      const { data: task, error: taskError } = await this.supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

      if (!taskError) {
        // Update suggestion status
        await this.supabase
          .from('ai_suggestions')
          .update({ 
            status: 'auto_converted',
            converted_to_task_id: task.id,
            converted_at: new Date().toISOString()
          })
          .eq('id', suggestion.id)

        return true
      }

      return false
    } catch (error) {
      console.error('Task creation failed:', error)
      return false
    }
  }

  /**
   * Mark batch items as processing
   */
  private async markBatchAsProcessing(batch: EmailProcessingItem[]): Promise<void> {
    const emailRecordIds = batch.map(item => item.email_record_id).filter(id => id)
    
    if (emailRecordIds.length > 0) {
      await this.supabase
        .from('processing_queue')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .in('email_record_id', emailRecordIds)
        .eq('user_id', this.user.id)
    }
  }

  /**
   * Mark email as analyzed with classification results
   */
  private async markEmailAsAnalyzed(
    emailRecordId: string, 
    classification: EmailClassification, 
    analysis: EmailAnalysisResult | null
  ): Promise<void> {
    try {
      // Update email record
      await this.supabase
        .from('emails')
        .update({
          ai_analyzed: true,
          ai_analysis_at: new Date().toISOString(),
          has_scheduling_content: classification.has_scheduling_content,
          scheduling_keywords: classification.scheduling_keywords,
          importance_level: classification.importance_level
        })
        .eq('id', emailRecordId)

      // Mark queue item as completed
      await this.supabase
        .from('processing_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email_record_id', emailRecordId)
        .eq('user_id', this.user.id)

    } catch (error) {
      console.error('Failed to mark email as analyzed:', error)
    }
  }

  /**
   * Mark email processing as failed
   */
  private async markEmailProcessingFailed(emailRecordId: string, errorMessage: string): Promise<void> {
    try {
      await this.supabase
        .from('processing_queue')
        .update({
          status: 'failed',
          error_message: errorMessage,
          retry_count: this.supabase.raw('retry_count + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('email_record_id', emailRecordId)
        .eq('user_id', this.user.id)
    } catch (error) {
      console.error('Failed to mark processing as failed:', error)
    }
  }

  /**
   * Merge batch results
   */
  private mergeBatchResult(target: ProcessingResult, source: ProcessingResult): void {
    target.processed += source.processed
    target.skipped += source.skipped
    target.errors += source.errors
    target.ai_analyzed += source.ai_analyzed
    target.suggestions_created += source.suggestions_created
    target.tasks_created += source.tasks_created
    target.error_details.push(...source.error_details)
  }

  /**
   * Static factory method for easy instantiation
   */
  static async create(options: ProcessingOptions = {}): Promise<UnifiedEmailProcessor> {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const supabase = await createClient()
    return new UnifiedEmailProcessor(supabase, user, options)
  }
}