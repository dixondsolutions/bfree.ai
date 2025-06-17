import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface TransactionContext {
  userId?: string
  operation: string
  startTime: number
}

/**
 * Execute multiple database operations in a transaction-like manner
 * Note: Supabase doesn't support traditional transactions in client libraries,
 * so we implement a compensation pattern for rollback scenarios
 */
export async function withTransaction<T>(
  operation: string,
  operations: (supabase: any) => Promise<T>,
  compensations?: (supabase: any) => Promise<void>
): Promise<T> {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    logger.debug(`Starting transaction: ${operation}`, { operation, startTime })
    
    const result = await operations(supabase)
    
    const duration = Date.now() - startTime
    logger.performance(`Transaction completed: ${operation}`, duration, { operation })
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`Transaction failed: ${operation}`, error instanceof Error ? error : new Error(String(error)), {
      operation,
      duration
    })
    
    // Attempt compensation if provided
    if (compensations) {
      try {
        logger.info(`Running compensation for failed transaction: ${operation}`)
        await compensations(supabase)
        logger.info(`Compensation completed for: ${operation}`)
      } catch (compensationError) {
        logger.error(`Compensation failed for: ${operation}`, 
          compensationError instanceof Error ? compensationError : new Error(String(compensationError)),
          { operation }
        )
      }
    }
    
    throw error
  }
}

/**
 * Create a new event with calendar sync
 */
export async function createEventTransaction(eventData: {
  user_id: string
  calendar_id?: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  ai_generated?: boolean
  confidence_score?: number
}) {
  return withTransaction(
    'create_event',
    async (supabase) => {
      // 1. Create event in database
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single()
      
      if (eventError) {
        throw new Error(`Failed to create event: ${eventError.message}`)
      }
      
      // 2. Log the creation
      await supabase
        .from('audit_logs')
        .insert({
          user_id: eventData.user_id,
          action: 'create_event',
          resource_type: 'event',
          resource_id: event.id,
          metadata: { title: eventData.title, ai_generated: eventData.ai_generated }
        })
      
      return event
    },
    async (supabase) => {
      // Compensation: We can't easily rollback the event creation
      // without the event ID, so we'll log the failure
      logger.warn('Event creation failed, manual cleanup may be required', {
        eventTitle: eventData.title,
        userId: eventData.user_id
      })
    }
  )
}

/**
 * Update email account tokens
 */
export async function updateEmailTokensTransaction(
  accountId: string,
  tokens: {
    access_token: string
    refresh_token?: string
    expires_at?: string
  }
) {
  return withTransaction(
    'update_email_tokens',
    async (supabase) => {
      // 1. Get current tokens for backup
      const { data: currentAccount } = await supabase
        .from('email_accounts')
        .select('access_token, refresh_token, expires_at')
        .eq('id', accountId)
        .single()
      
      // 2. Update tokens
      const { data: updatedAccount, error } = await supabase
        .from('email_accounts')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          expires_at: tokens.expires_at || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update email tokens: ${error.message}`)
      }
      
      return { updatedAccount, previousTokens: currentAccount }
    },
    async (supabase) => {
      // Compensation: Restore previous tokens
      logger.info('Restoring previous email tokens due to transaction failure', { accountId })
      // Note: In a real implementation, we'd need to store the previous tokens
      // and restore them here
    }
  )
}

/**
 * Process AI suggestion with approval
 */
export async function processAISuggestionTransaction(
  suggestionId: string,
  userId: string,
  action: 'approve' | 'reject',
  eventData?: any
) {
  return withTransaction(
    'process_ai_suggestion',
    async (supabase) => {
      // 1. Update suggestion status
      const { data: suggestion, error: suggestionError } = await supabase
        .from('ai_suggestions')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          processed_at: new Date().toISOString()
        })
        .eq('id', suggestionId)
        .eq('user_id', userId)
        .select()
        .single()
      
      if (suggestionError) {
        throw new Error(`Failed to update suggestion: ${suggestionError.message}`)
      }
      
      let createdEvent = null
      
      // 2. Create event if approved
      if (action === 'approve' && eventData) {
        const { data: event, error: eventError } = await supabase
          .from('events')
          .insert({
            ...eventData,
            user_id: userId,
            ai_generated: true,
            status: 'confirmed'
          })
          .select()
          .single()
        
        if (eventError) {
          throw new Error(`Failed to create event from suggestion: ${eventError.message}`)
        }
        
        createdEvent = event
      }
      
      // 3. Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: `suggestion_${action}`,
          resource_type: 'ai_suggestion',
          resource_id: suggestionId,
          metadata: { 
            suggestion_type: suggestion.suggestion_type,
            created_event_id: createdEvent?.id 
          }
        })
      
      return { suggestion, createdEvent }
    },
    async (supabase) => {
      // Compensation: Revert suggestion status
      logger.warn('Reverting AI suggestion processing due to failure', { suggestionId })
      await supabase
        .from('ai_suggestions')
        .update({
          status: 'pending',
          processed_at: null
        })
        .eq('id', suggestionId)
    }
  )
}

/**
 * Batch update calendar events
 */
export async function batchUpdateEventsTransaction(
  events: Array<{
    id: string
    updates: Record<string, any>
  }>,
  userId: string
) {
  return withTransaction(
    'batch_update_events',
    async (supabase) => {
      const results = []
      
      for (const eventUpdate of events) {
        const { data: updatedEvent, error } = await supabase
          .from('events')
          .update(eventUpdate.updates)
          .eq('id', eventUpdate.id)
          .eq('user_id', userId)
          .select()
          .single()
        
        if (error) {
          throw new Error(`Failed to update event ${eventUpdate.id}: ${error.message}`)
        }
        
        results.push(updatedEvent)
      }
      
      // Log batch operation
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: 'batch_update_events',
          resource_type: 'event',
          metadata: { 
            updated_count: results.length,
            event_ids: results.map(e => e.id)
          }
        })
      
      return results
    },
    async (supabase) => {
      // Compensation: This would require storing original values
      logger.warn('Batch event update failed, manual data verification may be required', {
        userId,
        eventCount: events.length
      })
    }
  )
}