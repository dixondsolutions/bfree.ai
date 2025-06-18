import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'

export interface EmailData {
  id?: string
  gmail_id: string
  thread_id?: string
  message_id?: string
  subject: string
  from_address: string
  from_name?: string
  to_address: string
  cc_addresses?: string[]
  bcc_addresses?: string[]
  content_text?: string
  content_html?: string
  snippet?: string
  labels?: string[]
  received_at: Date
  sent_at?: Date
  has_attachments?: boolean
  attachment_count?: number
  attachment_info?: any
  has_scheduling_content?: boolean
  scheduling_keywords?: string[]
  is_unread?: boolean
  is_starred?: boolean
}

export interface EmailFilters {
  unread_only?: boolean
  scheduling_only?: boolean
  importance_level?: 'low' | 'normal' | 'high'
  date_from?: Date
  date_to?: Date
  from_address?: string
  search_query?: string
  labels?: string[]
  has_attachments?: boolean
  limit?: number
  offset?: number
}

export interface EmailWithCounts {
  id: string
  subject: string
  from_address: string
  from_name: string
  received_at: Date
  snippet: string
  is_unread: boolean
  importance_level: string
  has_scheduling_content: boolean
  ai_analyzed: boolean
  task_count: number
  suggestion_count: number
  attachment_count: number
}

export class EmailService {
  private supabase: any

  constructor() {
    this.supabase = null
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  private async getUserId() {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    return user.id
  }

  /**
   * Store email in the database
   */
  async storeEmail(emailData: EmailData): Promise<any> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const data = {
      ...emailData,
      user_id: userId,
      received_at: emailData.received_at.toISOString(),
      sent_at: emailData.sent_at?.toISOString() || null,
      processed_at: new Date().toISOString()
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('emails')
      .select('id')
      .eq('user_id', userId)
      .eq('gmail_id', emailData.gmail_id)
      .single()

    if (existingEmail) {
      // Update existing email
      const { data: updatedEmail, error } = await supabase
        .from('emails')
        .update(data)
        .eq('id', existingEmail.id)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to update email: ${error.message}`)
      }

      return updatedEmail
    } else {
      // Insert new email
      const { data: newEmail, error } = await supabase
        .from('emails')
        .insert(data)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to store email: ${error.message}`)
      }

      return newEmail
    }
  }

  /**
   * Store multiple emails in batch
   */
  async storeEmailsBatch(emails: EmailData[]): Promise<any[]> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const emailsData = emails.map(email => ({
      ...email,
      user_id: userId,
      received_at: email.received_at.toISOString(),
      sent_at: email.sent_at?.toISOString() || null,
      processed_at: new Date().toISOString()
    }))

    // Use upsert to handle duplicates
    const { data, error } = await supabase
      .from('emails')
      .upsert(emailsData, { 
        onConflict: 'user_id,gmail_id',
        ignoreDuplicates: false 
      })
      .select('*')

    if (error) {
      throw new Error(`Failed to store emails batch: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get emails with filtering and pagination
   */
  async getEmails(filters: EmailFilters = {}): Promise<{
    emails: EmailWithCounts[]
    total: number
    pagination: {
      limit: number
      offset: number
      hasMore: boolean
    }
  }> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const limit = filters.limit || 50
    const offset = filters.offset || 0

    // Use the database function for efficient querying
    const { data: emails, error } = await supabase.rpc('get_emails_with_counts', {
      p_user_id: userId,
      p_limit: limit + 1, // Get one extra to check if there are more
      p_offset: offset,
      p_unread_only: filters.unread_only || false,
      p_scheduling_only: filters.scheduling_only || false
    })

    if (error) {
      throw new Error(`Failed to get emails: ${error.message}`)
    }

    const hasMore = emails.length > limit
    const emailsToReturn = hasMore ? emails.slice(0, -1) : emails

    // Apply additional filters if needed
    let filteredEmails = emailsToReturn

    if (filters.importance_level) {
      filteredEmails = filteredEmails.filter(email => 
        email.importance_level === filters.importance_level
      )
    }

    if (filters.date_from) {
      filteredEmails = filteredEmails.filter(email => 
        new Date(email.received_at) >= filters.date_from!
      )
    }

    if (filters.date_to) {
      filteredEmails = filteredEmails.filter(email => 
        new Date(email.received_at) <= filters.date_to!
      )
    }

    if (filters.from_address) {
      filteredEmails = filteredEmails.filter(email => 
        email.from_address.toLowerCase().includes(filters.from_address!.toLowerCase())
      )
    }

    if (filters.search_query) {
      const query = filters.search_query.toLowerCase()
      filteredEmails = filteredEmails.filter(email => 
        email.subject.toLowerCase().includes(query) ||
        email.from_address.toLowerCase().includes(query) ||
        email.snippet.toLowerCase().includes(query)
      )
    }

    return {
      emails: filteredEmails,
      total: filteredEmails.length,
      pagination: {
        limit,
        offset,
        hasMore
      }
    }
  }

  /**
   * Get a specific email by ID with full details
   */
  async getEmailById(emailId: string): Promise<any> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    console.log('EmailService.getEmailById called with:', emailId)
    
    // Check if the provided ID is a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(emailId)
    console.log('ID format check - is UUID:', isUUID)

    // Build query based on ID format
    const queryField = isUUID ? 'id' : 'gmail_id'
    console.log('Querying by field:', queryField)

    const { data: email, error } = await supabase
      .from('emails')
      .select(`
        *,
        email_attachments(*),
        tasks:tasks!source_email_record_id(
          id, title, status, priority, created_at, ai_generated, confidence_score
        ),
        ai_suggestions:ai_suggestions!email_record_id(
          id, title, description, confidence_score, status, created_at
        )
      `)
      .eq(queryField, emailId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.log('Database error in getEmailById:', error)
      
      // If no email found and we're looking by gmail_id, let's see what gmail_ids exist
      if (!isUUID && error.code === 'PGRST116') {
        console.log('No email found with gmail_id:', emailId)
        console.log('Checking available gmail_ids for user...')
        
        try {
          const { data: availableEmails } = await supabase
            .from('emails')
            .select('gmail_id, subject')
            .eq('user_id', userId)
            .limit(5)
          
          console.log('Sample gmail_ids in database:', availableEmails?.map(e => ({ gmail_id: e.gmail_id, subject: e.subject })))
        } catch (debugError) {
          console.log('Debug query failed:', debugError)
        }
      }
      
      throw new Error(`Failed to get email: ${error.message}`)
    }

    if (!email) {
      throw new Error('Email not found')
    }

    return email
  }

  /**
   * Update email status (read/unread, starred, etc.)
   */
  async updateEmailStatus(emailId: string, updates: {
    is_unread?: boolean
    is_starred?: boolean
    ai_analyzed?: boolean
    has_scheduling_content?: boolean
    scheduling_keywords?: string[]
  }): Promise<any> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    if (updates.ai_analyzed) {
      updateData.ai_analysis_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('emails')
      .update(updateData)
      .eq('id', emailId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to update email: ${error.message}`)
    }

    return data
  }

  /**
   * Mark multiple emails as read/unread
   */
  async markEmailsAsRead(emailIds: string[], isRead: boolean = true): Promise<number> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('emails')
      .update({ 
        is_unread: !isRead,
        updated_at: new Date().toISOString()
      })
      .in('id', emailIds)
      .eq('user_id', userId)
      .select('id')

    if (error) {
      throw new Error(`Failed to mark emails as read: ${error.message}`)
    }

    return data?.length || 0
  }

  /**
   * Delete emails from storage
   */
  async deleteEmails(emailIds: string[]): Promise<number> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('emails')
      .delete()
      .in('id', emailIds)
      .eq('user_id', userId)
      .select('id')

    if (error) {
      throw new Error(`Failed to delete emails: ${error.message}`)
    }

    return data?.length || 0
  }

  /**
   * Search emails with advanced filters
   */
  async searchEmails(searchParams: {
    query?: string
    from?: string
    subject?: string
    dateRange?: { start: Date; end: Date }
    labels?: string[]
    hasAttachments?: boolean
    importance?: 'low' | 'normal' | 'high'
    aiAnalyzed?: boolean
    limit?: number
    offset?: number
  }): Promise<EmailWithCounts[]> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    let query = supabase
      .from('emails')
      .select(`
        id,
        subject,
        from_address,
        from_name,
        received_at,
        snippet,
        is_unread,
        importance_level,
        has_scheduling_content,
        ai_analyzed,
        attachment_count
      `)
      .eq('user_id', userId)

    // Apply filters
    if (searchParams.query) {
      query = query.or(`subject.ilike.%${searchParams.query}%,content_text.ilike.%${searchParams.query}%,from_address.ilike.%${searchParams.query}%`)
    }

    if (searchParams.from) {
      query = query.ilike('from_address', `%${searchParams.from}%`)
    }

    if (searchParams.subject) {
      query = query.ilike('subject', `%${searchParams.subject}%`)
    }

    if (searchParams.dateRange) {
      query = query
        .gte('received_at', searchParams.dateRange.start.toISOString())
        .lte('received_at', searchParams.dateRange.end.toISOString())
    }

    if (searchParams.hasAttachments !== undefined) {
      query = query.eq('has_attachments', searchParams.hasAttachments)
    }

    if (searchParams.importance) {
      query = query.eq('importance_level', searchParams.importance)
    }

    if (searchParams.aiAnalyzed !== undefined) {
      query = query.eq('ai_analyzed', searchParams.aiAnalyzed)
    }

    // Pagination
    const limit = searchParams.limit || 50
    const offset = searchParams.offset || 0
    query = query.order('received_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to search emails: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get email statistics for user
   */
  async getEmailStatistics(): Promise<any> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('email_statistics')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error getting email statistics:', error)
      return {
        total_emails: 0,
        analyzed_emails: 0,
        scheduling_emails: 0,
        unread_emails: 0,
        high_importance_emails: 0,
        emails_with_attachments: 0,
        emails_last_7_days: 0,
        analyzed_last_7_days: 0,
        processing_efficiency: 0,
        latest_email_time: null,
        latest_analysis_time: null
      }
    }

    return data
  }

  /**
   * Store email attachments
   */
  async storeEmailAttachments(emailId: string, attachments: Array<{
    filename: string
    mime_type?: string
    size_bytes?: number
    attachment_id?: string
    download_url?: string
  }>): Promise<any[]> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const attachmentData = attachments.map(attachment => ({
      ...attachment,
      email_id: emailId,
      user_id: userId
    }))

    const { data, error } = await supabase
      .from('email_attachments')
      .insert(attachmentData)
      .select('*')

    if (error) {
      throw new Error(`Failed to store attachments: ${error.message}`)
    }

    return data || []
  }

  /**
   * Link email to processing queue
   */
  async linkEmailToProcessingQueue(emailId: string, queueId: string): Promise<void> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const { error } = await supabase
      .from('processing_queue')
      .update({ email_record_id: emailId })
      .eq('id', queueId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to link email to queue: ${error.message}`)
    }
  }

  /**
   * Link email to AI suggestions
   */
  async linkEmailToSuggestions(emailId: string, suggestionIds: string[]): Promise<void> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const { error } = await supabase
      .from('ai_suggestions')
      .update({ email_record_id: emailId })
      .in('id', suggestionIds)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to link email to suggestions: ${error.message}`)
    }
  }

  /**
   * Link email to tasks
   */
  async linkEmailToTasks(emailId: string, taskIds: string[]): Promise<void> {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const { error } = await supabase
      .from('tasks')
      .update({ source_email_record_id: emailId })
      .in('id', taskIds)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to link email to tasks: ${error.message}`)
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()