/**
 * Calendar Error Handler
 * Provides robust error handling for calendar operations with retry logic and graceful degradation
 */

import { createClient } from '@/lib/supabase/server'

export interface CalendarError {
  code: number
  message: string
  operation: string
  retryable: boolean
  retryAfter?: number
  details?: any
}

export interface CalendarRetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export class CalendarErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: CalendarRetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2
  }

  /**
   * Handle Google Calendar API errors
   */
  static async handleCalendarError(
    error: any,
    operation: string,
    context: any = {}
  ): Promise<CalendarError> {
    const calendarError = this.classifyCalendarError(error)
    calendarError.operation = operation

    console.error(`Calendar API error in ${operation}:`, {
      code: calendarError.code,
      message: calendarError.message,
      retryable: calendarError.retryable,
      context
    })

    // Log error for monitoring
    await this.logCalendarError(operation, calendarError, context)

    return calendarError
  }

  /**
   * Classify calendar-related errors
   */
  private static classifyCalendarError(error: any): Omit<CalendarError, 'operation'> {
    // Google Calendar API specific errors
    if (error?.response?.status) {
      return this.classifyGoogleCalendarError(error)
    }

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        code: 503,
        message: 'Calendar service unavailable',
        retryable: true,
        retryAfter: 5000
      }
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        code: 408,
        message: 'Calendar request timeout',
        retryable: true,
        retryAfter: 3000
      }
    }

    // Authentication errors
    if (error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
      return {
        code: 401,
        message: 'Calendar authentication failed',
        retryable: false
      }
    }

    // Supabase/Database errors
    if (error.code && error.message) {
      return {
        code: 500,
        message: `Database error: ${error.message}`,
        retryable: error.code !== 'PGRST116', // PGRST116 is "not found" - not retryable
        details: error
      }
    }

    // Default classification
    return {
      code: 500,
      message: error.message || 'Unknown calendar error',
      details: error,
      retryable: false
    }
  }

  /**
   * Classify Google Calendar API specific errors
   */
  private static classifyGoogleCalendarError(error: any): Omit<CalendarError, 'operation'> {
    const status = error.response.status
    const data = error.response.data
    
    switch (status) {
      case 400:
        return {
          code: 400,
          message: data?.error?.message || 'Invalid calendar request',
          details: data?.error,
          retryable: false
        }

      case 401:
        return {
          code: 401,
          message: 'Calendar authentication required',
          details: data?.error,
          retryable: true // Can retry after token refresh
        }

      case 403:
        const errorMessage = data?.error?.message?.toLowerCase() || ''
        if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
          return {
            code: 429,
            message: 'Calendar API rate limit exceeded',
            details: data?.error,
            retryable: true,
            retryAfter: this.extractRetryAfter(error.response.headers) || 60000 // 1 minute default
          }
        }
        return {
          code: 403,
          message: 'Insufficient calendar permissions',
          details: data?.error,
          retryable: false
        }

      case 404:
        return {
          code: 404,
          message: 'Calendar or event not found',
          details: data?.error,
          retryable: false
        }

      case 409:
        return {
          code: 409,
          message: 'Calendar conflict detected',
          details: data?.error,
          retryable: true,
          retryAfter: 5000
        }

      case 429:
        return {
          code: 429,
          message: 'Calendar API rate limit exceeded',
          details: data?.error,
          retryable: true,
          retryAfter: this.extractRetryAfter(error.response.headers) || 60000
        }

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          code: status,
          message: 'Calendar service temporarily unavailable',
          details: data?.error,
          retryable: true,
          retryAfter: 10000 // 10 seconds for server errors
        }

      default:
        return {
          code: status,
          message: data?.error?.message || `Calendar API error ${status}`,
          details: data?.error,
          retryable: status >= 500
        }
    }
  }

  /**
   * Extract retry-after header value
   */
  private static extractRetryAfter(headers: any): number | undefined {
    const retryAfter = headers?.['retry-after']
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10)
      return isNaN(seconds) ? undefined : seconds * 1000
    }
    return undefined
  }

  /**
   * Execute calendar operation with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: any = {},
    retryConfig: Partial<CalendarRetryConfig> = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig }
    let lastError: any

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation()
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 0) {
          console.log(`Calendar operation ${operationName} succeeded on attempt ${attempt + 1}`)
        }
        
        return result
      } catch (error) {
        lastError = error
        const calendarError = await this.handleCalendarError(error, operationName, { ...context, attempt })

        // Don't retry if error is not retryable or we've exhausted retries
        if (!calendarError.retryable || attempt >= config.maxRetries) {
          break
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, config, calendarError.retryAfter)
        console.log(`Retrying calendar operation ${operationName} in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`)
        
        await this.sleep(delay)
      }
    }

    // All retries exhausted, throw the last error
    throw lastError
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private static calculateDelay(attempt: number, config: CalendarRetryConfig, retryAfter?: number): number {
    // Use retry-after if provided
    if (retryAfter) {
      return Math.min(retryAfter, config.maxDelay)
    }

    // Exponential backoff with jitter
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt)
    
    // Add jitter to prevent thundering herd
    delay = delay * (0.5 + Math.random() * 0.5)
    
    return Math.min(delay, config.maxDelay)
  }

  /**
   * Sleep utility for delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Log calendar error for monitoring
   */
  private static async logCalendarError(operation: string, error: CalendarError, context: any): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('audit_logs')
        .insert({
          user_id: context.userId || null,
          action: 'calendar_api_error',
          resource_type: 'calendar_integration',
          resource_id: context.calendarId || context.eventId || null,
          details: {
            operation,
            error_code: error.code,
            error_message: error.message,
            retryable: error.retryable,
            retry_after: error.retryAfter,
            context: {
              ...context,
              timestamp: new Date().toISOString()
            }
          }
        })
    } catch (logError) {
      console.error('Failed to log calendar error:', logError)
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Check if error indicates a connection health issue
   */
  static isConnectionHealthIssue(error: CalendarError): boolean {
    return [401, 403, 429, 503, 504].includes(error.code)
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: CalendarError): string {
    switch (error.code) {
      case 401:
        return 'Calendar connection needs to be refreshed. Please reconnect your Google account.'
      case 403:
        return 'Calendar permissions are insufficient. Please check your Google Calendar access.'
      case 404:
        return 'Calendar or event not found. It may have been deleted.'
      case 409:
        return 'Calendar conflict detected. Please choose a different time.'
      case 429:
        return 'Calendar API rate limit reached. Please try again in a few minutes.'
      case 503:
      case 504:
        return 'Calendar service is temporarily unavailable. Please try again later.'
      default:
        return 'Calendar operation failed. Please try again.'
    }
  }

  /**
   * Determine if the application should attempt automatic recovery
   */
  static shouldAttemptAutoRecovery(error: CalendarError): boolean {
    // Auto-recover for temporary issues but not for authentication/permission problems
    return error.retryable && ![401, 403, 404].includes(error.code)
  }

  /**
   * Create a fallback response for failed calendar operations
   */
  static createFallbackResponse(operation: string): any {
    switch (operation) {
      case 'fetch_calendars':
        return []
      case 'fetch_events':
        return []
      case 'get_availability':
        return { available: false, reason: 'Calendar service unavailable' }
      case 'detect_conflicts':
        return { hasConflicts: false, conflicts: [], warning: 'Conflict detection unavailable' }
      default:
        return { success: false, error: 'Calendar service unavailable' }
    }
  }
}