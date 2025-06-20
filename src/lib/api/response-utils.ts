/**
 * Standardized API Response Utilities
 * Provides consistent response formats across all API routes
 */

import { NextResponse } from 'next/server'

// Standard response interface
export interface StandardApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      hasMore: boolean
      offset?: number
    }
    timestamp: string
    processingTime?: number
    version?: string
  }
}

// Standard error codes
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMS: 'INVALID_PARAMS',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // External Services
  GMAIL_ERROR: 'GMAIL_ERROR',
  AI_PROCESSING_ERROR: 'AI_PROCESSING_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

// Pagination interface
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
  total?: number
  hasMore?: boolean
}

// Success response utility
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  pagination?: PaginationParams,
  processingTime?: number
): StandardApiResponse<T> {
  const response: StandardApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(processingTime && { processingTime }),
      ...(pagination && {
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 50,
          total: pagination.total || 0,
          hasMore: pagination.hasMore || false,
          ...(pagination.offset !== undefined && { offset: pagination.offset })
        }
      })
    }
  }

  if (message) {
    response.message = message
  }

  return response
}

// Error response utility
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: any,
  processingTime?: number
): StandardApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(processingTime && { processingTime })
    }
  }
}

// HTTP Response utilities with standardized format
export function successResponse<T>(
  data: T,
  message?: string,
  pagination?: PaginationParams,
  status: number = 200,
  processingTime?: number
): NextResponse {
  return NextResponse.json(
    createSuccessResponse(data, message, pagination, processingTime),
    { status }
  )
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: any,
  status: number = 500,
  processingTime?: number
): NextResponse {
  return NextResponse.json(
    createErrorResponse(code, message, details, processingTime),
    { status }
  )
}

// Specific error response shortcuts
export function unauthorizedResponse(message: string = 'Authentication required'): NextResponse {
  return errorResponse(ErrorCodes.UNAUTHORIZED, message, undefined, 401)
}

export function validationErrorResponse(details: any, message: string = 'Validation failed'): NextResponse {
  return errorResponse(ErrorCodes.VALIDATION_ERROR, message, details, 400)
}

export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return errorResponse(ErrorCodes.NOT_FOUND, `${resource} not found`, undefined, 404)
}

export function forbiddenResponse(message: string = 'Access denied'): NextResponse {
  return errorResponse(ErrorCodes.FORBIDDEN, message, undefined, 403)
}

export function internalErrorResponse(message: string = 'Internal server error', details?: any): NextResponse {
  return errorResponse(ErrorCodes.INTERNAL_ERROR, message, details, 500)
}

export function databaseErrorResponse(message: string = 'Database operation failed', details?: any): NextResponse {
  return errorResponse(ErrorCodes.DATABASE_ERROR, message, details, 500)
}

export function gmailErrorResponse(message: string = 'Gmail integration error', details?: any): NextResponse {
  return errorResponse(ErrorCodes.GMAIL_ERROR, message, details, 503)
}

export function aiProcessingErrorResponse(message: string = 'AI processing failed', details?: any): NextResponse {
  return errorResponse(ErrorCodes.AI_PROCESSING_ERROR, message, details, 503)
}

// Response timing utility
export function withTiming<T>(fn: () => T): { result: T; processingTime: number } {
  const startTime = Date.now()
  const result = fn()
  const processingTime = Date.now() - startTime
  return { result, processingTime }
}

// Async response timing utility
export async function withAsyncTiming<T>(fn: () => Promise<T>): Promise<{ result: T; processingTime: number }> {
  const startTime = Date.now()
  const result = await fn()
  const processingTime = Date.now() - startTime
  return { result, processingTime }
}

// Helper to extract pagination from URL params
export function extractPaginationFromSearchParams(searchParams: URLSearchParams): PaginationParams {
  return {
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
  }
}

// Helper to validate pagination params
export function validatePaginationParams(params: PaginationParams): PaginationParams {
  return {
    page: Math.max(params.page || 1, 1),
    limit: Math.min(Math.max(params.limit || 50, 1), 200), // Max 200 items per page
    offset: Math.max(params.offset || 0, 0)
  }
}

// Helper to calculate hasMore flag
export function calculateHasMore(currentCount: number, limit: number, total?: number): boolean {
  if (total !== undefined) {
    return currentCount < total
  }
  // If we got exactly the limit + 1, there are more items
  return currentCount > limit
}

// Supabase error handler
export function handleSupabaseError(error: any, operation: string = 'Database operation'): NextResponse {
  console.error(`${operation} failed:`, error)
  
  // Handle specific Supabase error codes
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116': // Row not found
        return notFoundResponse('Resource')
      case 'PGRST301': // RLS violation
        return forbiddenResponse('Access denied')
      case '23505': // Unique violation
        return errorResponse(ErrorCodes.ALREADY_EXISTS, 'Resource already exists', error.details, 409)
      case '23502': // Not null violation
        return validationErrorResponse(error.details, 'Required field missing')
      default:
        return databaseErrorResponse(`${operation} failed`, {
          code: error.code,
          message: error.message,
          details: error.details
        })
    }
  }
  
  return databaseErrorResponse(`${operation} failed`, error.message)
}

// Zod validation error handler
export function handleZodError(error: any): NextResponse {
  const details = error.errors?.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }))
  
  return validationErrorResponse(details, 'Request validation failed')
}

// Generic error handler
export function handleGenericError(error: any, operation: string = 'Operation'): NextResponse {
  console.error(`${operation} error:`, error)
  
  if (error.name === 'ZodError') {
    return handleZodError(error)
  }
  
  return internalErrorResponse(
    `${operation} failed`,
    error instanceof Error ? error.message : 'Unknown error'
  )
}