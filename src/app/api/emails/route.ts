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
 * GET /api/emails - Get user's emails with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const filters = EmailFiltersSchema.parse({
      unread_only: searchParams.get('unread_only') === 'true',
      scheduling_only: searchParams.get('scheduling_only') === 'true',
      importance_level: searchParams.get('importance_level') as any,
      date_from: searchParams.get('date_from'),
      date_to: searchParams.get('date_to'),
      from_address: searchParams.get('from_address'),
      search_query: searchParams.get('search_query'),
      labels: searchParams.get('labels')?.split(','),
      has_attachments: searchParams.get('has_attachments') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    })

    // Convert date strings to Date objects
    const emailFilters: EmailFilters = {
      ...filters,
      date_from: filters.date_from ? new Date(filters.date_from) : undefined,
      date_to: filters.date_to ? new Date(filters.date_to) : undefined
    }

    const result = await emailService.getEmails(emailFilters)

    return NextResponse.json({
      success: true,
      ...result
    })

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

    // Store emails in batch
    const storedEmails = await emailService.storeEmailsBatch(emails)

    // Link to processing queue if requested
    if (linkToQueue && body.queueIds) {
      for (let i = 0; i < storedEmails.length && i < body.queueIds.length; i++) {
        try {
          await emailService.linkEmailToProcessingQueue(storedEmails[i].id, body.queueIds[i])
        } catch (error) {
          console.error(`Failed to link email ${storedEmails[i].id} to queue ${body.queueIds[i]}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Stored ${storedEmails.length} emails`,
      emails: storedEmails.map(email => ({
        id: email.id,
        gmail_id: email.gmail_id,
        subject: email.subject,
        from_address: email.from_address,
        received_at: email.received_at
      }))
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

    const results = []

    // Handle bulk read/unread updates
    if (updates.is_unread !== undefined) {
      const updatedCount = await emailService.markEmailsAsRead(emailIds, !updates.is_unread)
      results.push(`Marked ${updatedCount} emails as ${updates.is_unread ? 'unread' : 'read'}`)
    }

    // Handle individual updates for other fields
    if (updates.is_starred !== undefined || updates.importance_level !== undefined) {
      for (const emailId of emailIds) {
        try {
          await emailService.updateEmailStatus(emailId, {
            is_starred: updates.is_starred,
            // Note: importance_level would need to be added to updateEmailStatus method
          })
        } catch (error) {
          console.error(`Failed to update email ${emailId}:`, error)
        }
      }
      results.push(`Updated ${emailIds.length} emails`)
    }

    return NextResponse.json({
      success: true,
      message: results.join('; '),
      updated_count: emailIds.length
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

    const deletedCount = await emailService.deleteEmails(emailIds)

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} emails`,
      deleted_count: deletedCount
    })

  } catch (error) {
    console.error('Error in DELETE /api/emails:', error)
    return NextResponse.json({ 
      error: 'Failed to delete emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}