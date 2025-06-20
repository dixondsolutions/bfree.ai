/**
 * Gmail API Error Handler
 * Provides robust error handling, retry logic, and graceful degradation for Gmail integration
 */

import { createClient } from '@/lib/supabase/server'

export interface GmailError {
  code: number
  message: string
  details?: any
  retryable: boolean
  retryAfter?: number
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
}

export class GmailErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitter: true
  }

  /**
   * Main error handling method
   */
  static async handleGmailError(
    error: any, 
    operation: string, 
    context: any = {},
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<GmailError> {
    const config = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig }
    const gmailError = this.classifyError(error)
    
    console.log(`Gmail API error in ${operation}:`, {
      code: gmailError.code,
      message: gmailError.message,
      retryable: gmailError.retryable,
      context
    })

    // Log error for monitoring
    await this.logError(operation, gmailError, context)

    return gmailError
  }

  /**
   * Classify Gmail API errors
   */
  private static classifyError(error: any): GmailError {
    // Handle Google API specific errors
    if (error?.response?.status) {
      return this.classifyHttpError(error)
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        code: 503,
        message: 'Network connectivity issue',
        retryable: true,
        retryAfter: 5000
      }
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        code: 408,
        message: 'Request timeout',
        retryable: true,
        retryAfter: 2000
      }
    }

    // Handle token refresh errors
    if (error.message?.includes('invalid_grant') || error.message?.includes('refresh_token')) {
      return {
        code: 401,
        message: 'Token refresh failed',
        retryable: false
      }
    }

    // Default classification
    return {
      code: 500,
      message: error.message || 'Unknown Gmail API error',
      details: error,
      retryable: false
    }
  }

  /**
   * Classify HTTP errors from Gmail API
   */
  private static classifyHttpError(error: any): GmailError {
    const status = error.response.status
    const data = error.response.data
    
    switch (status) {
      case 400:
        return {
          code: 400,
          message: data?.error?.message || 'Invalid request parameters',
          details: data?.error,
          retryable: false
        }

      case 401:
        return {
          code: 401,
          message: 'Authentication failed - token may be expired',
          details: data?.error,
          retryable: true, // Can retry after token refresh
        }

      case 403:
        // Check if it's a rate limit or quota error
        const errorMessage = data?.error?.message?.toLowerCase() || ''
        if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
          return {
            code: 429,
            message: 'Rate limit exceeded',
            details: data?.error,
            retryable: true,
            retryAfter: this.extractRetryAfter(error.response.headers)
          }
        }
        return {
          code: 403,
          message: 'Insufficient permissions',
          details: data?.error,
          retryable: false
        }

      case 404:
        return {
          code: 404,
          message: 'Resource not found',
          details: data?.error,
          retryable: false
        }

      case 429:
        return {
          code: 429,
          message: 'Rate limit exceeded',
          details: data?.error,
          retryable: true,
          retryAfter: this.extractRetryAfter(error.response.headers)
        }

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          code: status,
          message: 'Gmail API server error',
          details: data?.error,
          retryable: true,
          retryAfter: 5000
        }

      default:
        return {
          code: status,
          message: data?.error?.message || `HTTP ${status} error`,
          details: data?.error,
          retryable: status >= 500
        }
    }
  }

  /**
   * Extract retry-after header value
   */
  private static extractRetryAfter(headers: any): number {
    const retryAfter = headers?.['retry-after']
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10)
      return isNaN(seconds) ? 5000 : seconds * 1000
    }
    return 5000 // Default 5 seconds
  }

  /**
   * Execute operation with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: any = {},
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig }
    let lastError: any

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation()
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 0) {
          console.log(`Gmail operation ${operationName} succeeded on attempt ${attempt + 1}`)
        }
        
        return result
      } catch (error) {
        lastError = error
        const gmailError = await this.handleGmailError(error, operationName, { ...context, attempt })

        // Don't retry if error is not retryable or we've exhausted retries
        if (!gmailError.retryable || attempt >= config.maxRetries) {
          break
        }

        // Special handling for authentication errors
        if (gmailError.code === 401) {
          try {
            await this.attemptTokenRefresh(context.userId)
            console.log(`Token refresh attempted for ${operationName}, retrying...`)
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
            // Don't retry if token refresh fails
            break
          }
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config, gmailError.retryAfter)
        console.log(`Retrying ${operationName} in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`)
        
        await this.sleep(delay)
      }
    }

    // All retries exhausted, throw the last error
    throw lastError
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private static calculateDelay(attempt: number, config: RetryConfig, retryAfter?: number): number {
    // Use retry-after if provided
    if (retryAfter) {
      return Math.min(retryAfter, config.maxDelay)
    }

    // Exponential backoff
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt)
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }
    
    return Math.min(delay, config.maxDelay)
  }

  /**
   * Attempt to refresh OAuth tokens
   */
  private static async attemptTokenRefresh(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID required for token refresh')
    }

    try {
      const supabase = await createClient()
      
      // Get current tokens
      const { data: emailAccount, error } = await supabase
        .from('email_accounts')
        .select('id, refresh_token')
        .eq('user_id', userId)
        .eq('provider', 'gmail')
        .eq('is_active', true)
        .single()

      if (error || !emailAccount?.refresh_token) {
        throw new Error('No valid refresh token found')
      }

      // Trigger token refresh via OAuth flow
      // This would typically involve calling the OAuth provider's refresh endpoint
      // For now, we log the attempt and mark for manual refresh
      console.log(`Token refresh needed for email account ${emailAccount.id}`)
      
      // Update account status to indicate refresh needed
      await supabase
        .from('email_accounts')
        .update({ 
          status: 'refresh_needed',
          updated_at: new Date().toISOString()
        })
        .eq('id', emailAccount.id)

    } catch (error) {
      console.error('Token refresh attempt failed:', error)
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Sleep utility for delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Log error for monitoring and analytics
   */
  private static async logError(operation: string, error: GmailError, context: any): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('audit_logs')
        .insert({
          user_id: context.userId || null,
          action: 'gmail_api_error',
          resource_type: 'gmail_integration',
          resource_id: context.emailAccountId || null,
          details: {
            operation,
            error_code: error.code,
            error_message: error.message,
            retryable: error.retryable,
            context: {
              ...context,
              timestamp: new Date().toISOString()
            }
          }
        })
    } catch (logError) {
      console.error('Failed to log Gmail error:', logError)
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Check if an error indicates a connection health issue
   */
  static isConnectionHealthIssue(error: GmailError): boolean {
    return [401, 403, 429, 503, 504].includes(error.code)
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: GmailError): string {
    switch (error.code) {
      case 401:
        return 'Gmail connection needs to be refreshed. Please reconnect your account.'
      case 403:
        return 'Gmail permissions are insufficient. Please check your account settings.'
      case 429:
        return 'Gmail API rate limit reached. Please try again in a few minutes.'
      case 503:
      case 504:
        return 'Gmail service is temporarily unavailable. Please try again later.'
      case 404:
        return 'Requested Gmail resource was not found.'
      default:
        return 'Gmail integration encountered an error. Please try again.'
    }
  }

  /**
   * Determine if the application should attempt automatic recovery
   */
  static shouldAttemptAutoRecovery(error: GmailError): boolean {
    // Auto-recover for temporary issues but not for authentication/permission problems
    return error.retryable && ![401, 403].includes(error.code)
  }
}