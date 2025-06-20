import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { emailService, EmailFilters } from '@/lib/email/email-service'
import { emailCache, EmailCacheHooks } from '@/lib/email/email-cache'
import { z } from 'zod'
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  handleSupabaseError,
  handleZodError,
  internalErrorResponse,
  extractPaginationFromSearchParams,
  validatePaginationParams,
  calculateHasMore,
  withAsyncTiming
} from '@/lib/api/response-utils'

const EmailFiltersSchema = z.object({
  unread_only: z.boolean().optional(),
  scheduling_only: z.boolean().optional(),
  importance_level: z.enum(['low', 'normal', 'high']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  from_address: z.string().optional(),
  search_query: z.string().optional(),
  labels: z.array(z.string()).optional(),
  has_attachments: z.boolean().optional(),
  limit: z.number().min(1).max(200).optional(),
  offset: z.number().min(0).optional()
})

const EmailUpdateSchema = z.object({
  emailIds: z.array(z.string().uuid()),
  updates: z.object({
    is_unread: z.boolean().optional(),
    is_starred: z.boolean().optional(),
    importance_level: z.enum(['low', 'normal', 'high']).optional()
  })
})

/**
 * Simple fallback email fetch when database functions aren't available
 */
async function getEmailsFallback(supabase: any, userId: string, filters: any) {
  const limit = filters.limit || 50
  const offset = filters.offset || 0

  let query = supabase
    .from('emails')
    .select(`
      id as email_id,
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
    .order('received_at', { ascending: false })
    .range(offset, offset + limit)

  // Apply basic filters
  if (filters.unread_only) {
    query = query.eq('is_unread', true)
  }
  if (filters.scheduling_only) {
    query = query.eq('has_scheduling_content', true)
  }
  if (filters.from_address) {
    query = query.eq('from_address', filters.from_address)
  }
  if (filters.has_attachments) {
    query = query.gt('attachment_count', 0)
  }

  const { data: emails, error } = await query

  if (error) throw error

  // Add dummy counts for task and suggestion relationships
  const emailsWithCounts = (emails || []).map(email => ({
    ...email,
    task_count: 0,
    suggestion_count: 0,
    attachment_count: email.attachment_count || 0
  }))

  return {
    emails: emailsWithCounts,
    total: emailsWithCounts.length,
    hasMore: emailsWithCounts.length === limit + 1
  }
}

/**
 * GET /api/emails - Get user's emails with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const { result, processingTime } = await withAsyncTiming(async () => {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    
    // Extract and validate pagination
    const basePagination = extractPaginationFromSearchParams(searchParams)
    const pagination = validatePaginationParams(basePagination)
    
    // Parse filter parameters
    const rawFilters = {
      unread_only: searchParams.get('unread_only') === 'true',
      scheduling_only: searchParams.get('scheduling_only') === 'true',
      importance_level: searchParams.get('importance_level'),
      date_from: searchParams.get('date_from'),
      date_to: searchParams.get('date_to'),
      from_address: searchParams.get('from_address'),
      search_query: searchParams.get('search_query'),
      labels: searchParams.get('labels')?.split(','),
      has_attachments: searchParams.get('has_attachments') === 'true',
      ...pagination
    }

    // Only include non-empty filter values
    const filters: any = {}
    Object.entries(rawFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        filters[key] = value
      }
    })

    // Validate filters with Zod
    try {
      EmailFiltersSchema.parse(filters)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleZodError(error)
      }
      throw error
    }

    const supabase = await createClient()

    // Check cache first
    const cachedResult = emailCache.getCachedEmailList(user.id, filters, pagination.page, filters.limit)
    if (cachedResult) {
      console.log('Returning cached email list result')
      return successResponse(
        { emails: cachedResult.emails },
        'Emails retrieved successfully (cached)',
        {
          ...cachedResult.pagination,
          cached: true
        },
        200,
        1 // Very fast cache response
      )
    }

    try {
      // Try using the advanced optimized database function first
      console.log('Attempting to use optimized database function get_emails_with_advanced_filtering...')
      const { data: emails, error } = await supabase.rpc('get_emails_with_advanced_filtering', {
        p_user_id: user.id,
        p_limit: filters.limit + 1, // Get one extra to check hasMore
        p_offset: filters.offset,
        p_unread_only: filters.unread_only || false,
        p_scheduling_only: filters.scheduling_only || false,
        p_importance_level: filters.importance_level || null,
        p_has_attachments: filters.has_attachments || null,
        p_from_address: filters.from_address || null,
        p_search_query: filters.search_query || null,
        p_date_from: filters.date_from ? new Date(filters.date_from).toISOString() : null,
        p_date_to: filters.date_to ? new Date(filters.date_to).toISOString() : null
      })

      if (error) {
        console.log('Advanced database function error, falling back to basic function:', error)
        // Fallback to basic function
        const { data: basicEmails, error: basicError } = await supabase.rpc('get_emails_with_counts', {
          p_user_id: user.id,
          p_limit: filters.limit + 1,
          p_offset: filters.offset,
          p_unread_only: filters.unread_only || false,
          p_scheduling_only: filters.scheduling_only || false
        })

        if (basicError) {
          console.log('Basic database function error:', basicError)
          return handleSupabaseError(basicError, 'Email fetch via database function')
        }

        const hasMore = calculateHasMore(basicEmails?.length || 0, filters.limit)
        const emailsToReturn = hasMore ? basicEmails.slice(0, -1) : basicEmails

        return successResponse(
          { emails: emailsToReturn },
          'Emails retrieved successfully (basic)',
          {
            page: pagination.page,
            limit: filters.limit,
            offset: filters.offset,
            total: emailsToReturn.length,
            hasMore
          },
          200,
          processingTime
        )
      }

      console.log('Advanced database function succeeded. Retrieved', emails?.length || 0, 'emails')
      
      const hasMore = calculateHasMore(emails?.length || 0, filters.limit)
      const emailsToReturn = hasMore ? emails.slice(0, -1) : emails

      // Get total count for better pagination info (optional, cached)
      let totalCount: number | undefined
      try {
        const { data: count } = await supabase.rpc('get_email_count_with_filters', {
          p_user_id: user.id,
          p_unread_only: filters.unread_only || false,
          p_scheduling_only: filters.scheduling_only || false,
          p_importance_level: filters.importance_level || null,
          p_has_attachments: filters.has_attachments || null,
          p_from_address: filters.from_address || null,
          p_search_query: filters.search_query || null,
          p_date_from: filters.date_from ? new Date(filters.date_from).toISOString() : null,
          p_date_to: filters.date_to ? new Date(filters.date_to).toISOString() : null
        })
        totalCount = count
      } catch (countError) {
        console.log('Count function failed, skipping total count:', countError)
      }

      const result = {
        emails: emailsToReturn,
        pagination: {
          page: pagination.page,
          limit: filters.limit,
          offset: filters.offset,
          total: totalCount || emailsToReturn.length,
          hasMore,
          actualCount: emailsToReturn.length
        }
      }

      // Cache the result
      emailCache.cacheEmailList(user.id, filters, pagination.page, filters.limit, result)

      return successResponse(
        { emails: emailsToReturn },
        'Emails retrieved successfully',
        result.pagination,
        200,
        processingTime
      )

    } catch (dbFunctionError) {
      console.warn('Database function not available, using fallback query')
      
      try {
        // Fallback to basic query
        const result = await getEmailsFallback(supabase, user.id, filters)
        console.log('Fallback query succeeded. Retrieved', result.emails?.length || 0, 'emails')
        
        return successResponse(
          { emails: result.emails },
          'Emails retrieved successfully (fallback)',
          {
            page: pagination.page,
            limit: filters.limit,
            offset: filters.offset,
            total: result.total,
            hasMore: result.hasMore
          },
          200,
          processingTime
        )
      } catch (fallbackError) {
        return handleSupabaseError(fallbackError, 'Email fetch via fallback query')
      }
    }
  })

  return result
}

/**
 * POST /api/emails - Store emails from Gmail (used internally)
 */
export async function POST(request: NextRequest) {
  const { result, processingTime } = await withAsyncTiming(async () => {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    try {
      const body = await request.json()
      const { emails, linkToQueue = false } = body

      if (!Array.isArray(emails) || emails.length === 0) {
        return validationErrorResponse(
          { field: 'emails', message: 'emails array is required and must not be empty' },
          'Invalid request data'
        )
      }

      const supabase = await createClient()

      // Prepare email data for insertion
      const emailsData = emails.map(email => ({
        ...email,
        user_id: user.id,
        received_at: new Date(email.received_at).toISOString(),
        processed_at: new Date().toISOString()
      }))

      const { data: storedEmails, error } = await supabase
        .from('emails')
        .upsert(emailsData, { 
          onConflict: 'user_id,gmail_id',
          ignoreDuplicates: false 
        })
        .select('id, gmail_id, subject, from_address, received_at')

      if (error) {
        return handleSupabaseError(error, 'Email storage')
      }

      return successResponse(
        { 
          emails: storedEmails || [],
          count: storedEmails?.length || 0
        },
        `Successfully stored ${storedEmails?.length || 0} emails`,
        undefined,
        201,
        processingTime
      )

    } catch (parseError) {
      return validationErrorResponse(
        { error: 'Invalid JSON in request body' },
        'Request parsing failed'
      )
    }
  })

  return result
}

/**
 * PUT /api/emails - Update multiple emails (mark as read, star, etc.)
 */
export async function PUT(request: NextRequest) {
  const { result, processingTime } = await withAsyncTiming(async () => {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    try {
      const body = await request.json()
      const { emailIds, updates } = EmailUpdateSchema.parse(body)

      const supabase = await createClient()

      // Bulk update with better error handling
      const { data, error } = await supabase
        .from('emails')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', emailIds)
        .eq('user_id', user.id)
        .select('id, subject, is_unread, is_starred, importance_level')

      if (error) {
        return handleSupabaseError(error, 'Email update')
      }

      // Invalidate cache for updated emails
      if (data && data.length > 0) {
        EmailCacheHooks.onEmailsModified(user.id, emailIds)
      }

      return successResponse(
        { 
          updated_emails: data || [],
          count: data?.length || 0
        },
        `Successfully updated ${data?.length || 0} emails`,
        undefined,
        200,
        processingTime
      )

    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleZodError(error)
      }

      return internalErrorResponse(
        'Failed to update emails',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  })

  return result
}

/**
 * DELETE /api/emails - Delete emails
 */
export async function DELETE(request: NextRequest) {
  const { result, processingTime } = await withAsyncTiming(async () => {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    try {
      const body = await request.json()
      const { emailIds } = body

      if (!Array.isArray(emailIds) || emailIds.length === 0) {
        return validationErrorResponse(
          { field: 'emailIds', message: 'emailIds array is required and must not be empty' },
          'Invalid request data'
        )
      }

      const supabase = await createClient()

      const { data, error } = await supabase
        .from('emails')
        .delete()
        .in('id', emailIds)
        .eq('user_id', user.id)
        .select('id, subject')

      if (error) {
        return handleSupabaseError(error, 'Email deletion')
      }

      // Invalidate cache for deleted emails
      if (data && data.length > 0) {
        EmailCacheHooks.onEmailDeleted(user.id, emailIds)
      }

      return successResponse(
        { 
          deleted_emails: data || [],
          count: data?.length || 0
        },
        `Successfully deleted ${data?.length || 0} emails`,
        undefined,
        200,
        processingTime
      )

    } catch (parseError) {
      return validationErrorResponse(
        { error: 'Invalid JSON in request body' },
        'Request parsing failed'
      )
    }
  })

  return result
}