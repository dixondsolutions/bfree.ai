interface LogContext {
  userId?: string
  requestId?: string
  method?: string
  url?: string
  userAgent?: string
  ip?: string
  duration?: number
  statusCode?: number
  errorCode?: string
  [key: string]: any
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context: LogContext
  environment: string
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development'
  private environment = process.env.NODE_ENV || 'development'

  private formatLogEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      environment: this.environment
    }
  }

  private writeLog(entry: LogEntry): void {
    if (this.isDev) {
      // In development, use console with colors
      const colors = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
        fatal: '\x1b[35m'  // magenta
      }
      const reset = '\x1b[0m'
      const color = colors[entry.level] || reset
      
      console.log(
        `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}`,
        entry.context.userId ? `(User: ${entry.context.userId})` : '',
        Object.keys(entry.context).length > 0 ? entry.context : ''
      )
    } else {
      // In production, use structured JSON logging
      console.log(JSON.stringify(entry))
    }
  }

  debug(message: string, context: LogContext = {}): void {
    this.writeLog(this.formatLogEntry('debug', message, context))
  }

  info(message: string, context: LogContext = {}): void {
    this.writeLog(this.formatLogEntry('info', message, context))
  }

  warn(message: string, context: LogContext = {}): void {
    this.writeLog(this.formatLogEntry('warn', message, context))
  }

  error(message: string, error?: Error, context: LogContext = {}): void {
    const errorContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    }
    this.writeLog(this.formatLogEntry('error', message, errorContext))
  }

  fatal(message: string, error?: Error, context: LogContext = {}): void {
    const errorContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    }
    this.writeLog(this.formatLogEntry('fatal', message, errorContext))
  }

  // API request logging
  apiRequest(method: string, url: string, context: LogContext = {}): void {
    this.info(`API Request: ${method} ${url}`, {
      ...context,
      method,
      url,
      type: 'api_request'
    })
  }

  apiResponse(method: string, url: string, statusCode: number, duration: number, context: LogContext = {}): void {
    const message = `API Response: ${method} ${url} - ${statusCode} (${duration}ms)`
    const logContext = {
      ...context,
      method,
      url,
      statusCode,
      duration,
      type: 'api_response'
    }
    
    if (statusCode >= 500) {
      this.error(message, undefined, logContext)
    } else if (statusCode >= 400) {
      this.warn(message, logContext)
    } else {
      this.info(message, logContext)
    }
  }

  // Security logging
  securityEvent(event: string, context: LogContext = {}): void {
    this.warn(`Security Event: ${event}`, {
      ...context,
      type: 'security_event'
    })
  }

  // Authentication logging
  authSuccess(userId: string, method: string, context: LogContext = {}): void {
    this.info(`Authentication successful: ${method}`, {
      ...context,
      userId,
      method,
      type: 'auth_success'
    })
  }

  authFailure(reason: string, context: LogContext = {}): void {
    this.warn(`Authentication failed: ${reason}`, {
      ...context,
      reason,
      type: 'auth_failure'
    })
  }

  // Database logging
  dbQuery(query: string, duration: number, context: LogContext = {}): void {
    this.debug(`Database query completed (${duration}ms)`, {
      ...context,
      query: query.substring(0, 200), // Truncate long queries
      duration,
      type: 'db_query'
    })
  }

  dbError(query: string, error: Error, context: LogContext = {}): void {
    this.error(`Database query failed: ${query.substring(0, 200)}`, error, {
      ...context,
      query,
      type: 'db_error'
    })
  }

  // External API logging
  externalApiCall(service: string, endpoint: string, context: LogContext = {}): void {
    this.info(`External API call: ${service} ${endpoint}`, {
      ...context,
      service,
      endpoint,
      type: 'external_api_call'
    })
  }

  externalApiError(service: string, endpoint: string, error: Error, context: LogContext = {}): void {
    this.error(`External API error: ${service} ${endpoint}`, error, {
      ...context,
      service,
      endpoint,
      type: 'external_api_error'
    })
  }

  // Performance logging
  performance(operation: string, duration: number, context: LogContext = {}): void {
    const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug'
    this[level](`Performance: ${operation} completed in ${duration}ms`, {
      ...context,
      operation,
      duration,
      type: 'performance'
    })
  }
}

// Export singleton instance
export const logger = new Logger()

// Request context helpers
export function getRequestContext(request: Request): LogContext {
  const url = new URL(request.url)
  return {
    method: request.method,
    url: url.pathname + url.search,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
    requestId: request.headers.get('x-request-id') || undefined
  }
}

export function getUserContext(userId?: string): LogContext {
  return userId ? { userId } : {}
}