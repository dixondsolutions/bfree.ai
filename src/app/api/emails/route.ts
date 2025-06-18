import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { emailService, EmailFilters } from '@/lib/email/email-service'
import { z } from 'zod'

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
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters with more lenient validation
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
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    }

    // Only validate fields that are present
    const filters: any = {}
    Object.keys(rawFilters).forEach(key => {
      const value = rawFilters[key as keyof typeof rawFilters]
      if (value !== null && value !== undefined && value !== '') {
        filters[key] = value
      }
    })

    const supabase = await createClient()

    try {
      // Try using the optimized database function first
      const { data: emails, error } = await supabase.rpc('get_emails_with_counts', {
        p_user_id: user.id,
        p_limit: (filters.limit || 50) + 1,
        p_offset: filters.offset || 0,
        p_unread_only: filters.unread_only || false,
        p_scheduling_only: filters.scheduling_only || false
      })

      if (error) throw error

      const hasMore = emails.length > (filters.limit || 50)
      const emailsToReturn = hasMore ? emails.slice(0, -1) : emails

      return NextResponse.json({
        success: true,
        emails: emailsToReturn,
        total: emailsToReturn.length,
        pagination: {
          limit: filters.limit || 50,
          offset: filters.offset || 0,
          hasMore
        }
      })

    } catch (dbFunctionError) {
      console.warn('Database function get_emails_with_counts not available, using fallback:', dbFunctionError)
      
      // Fallback to basic query
      const result = await getEmailsFallback(supabase, user.id, filters)
      
      return NextResponse.json({
        success: true,
        emails: result.emails,
        total: result.total,
        pagination: {
          limit: filters.limit || 50,
          offset: filters.offset || 0,
          hasMore: result.hasMore
        }
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid filter parameters', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in GET /api/emails:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/emails - Store emails from Gmail (used internally)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { emails, linkToQueue = false } = body

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid request - emails array is required' 
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Simple batch insert with basic error handling
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
      console.error('Error storing emails:', error)
      return NextResponse.json({ 
        error: 'Failed to store emails',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Stored ${storedEmails?.length || 0} emails`,
      emails: storedEmails || []
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/emails:', error)
    return NextResponse.json({ 
      error: 'Failed to store emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/emails - Update multiple emails (mark as read, star, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { emailIds, updates } = EmailUpdateSchema.parse(body)

    const supabase = await createClient()

    // Simple bulk update
    const { data, error } = await supabase
      .from('emails')
      .update(updates)
      .in('id', emailIds)
      .eq('user_id', user.id)
      .select('id')

    if (error) {
      console.error('Error updating emails:', error)
      return NextResponse.json({ 
        error: 'Failed to update emails',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${data?.length || 0} emails`,
      updated_count: data?.length || 0
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid update parameters', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PUT /api/emails:', error)
    return NextResponse.json({ 
      error: 'Failed to update emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/emails - Delete emails
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { emailIds } = body

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid request - emailIds array is required' 
      }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('emails')
      .delete()
      .in('id', emailIds)
      .eq('user_id', user.id)
      .select('id')

    if (error) {
      console.error('Error deleting emails:', error)
      return NextResponse.json({ 
        error: 'Failed to delete emails',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${data?.length || 0} emails`,
      deleted_count: data?.length || 0
    })

  } catch (error) {
    console.error('Error in DELETE /api/emails:', error)
    return NextResponse.json({ 
      error: 'Failed to delete emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}