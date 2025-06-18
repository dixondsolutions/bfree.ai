import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/database/utils'
import { emailService } from '@/lib/email/email-service'
import { z } from 'zod'

const EmailUpdateSchema = z.object({
  is_unread: z.boolean().optional(),
  is_starred: z.boolean().optional(),
  ai_analyzed: z.boolean().optional(),
  has_scheduling_content: z.boolean().optional(),
  scheduling_keywords: z.array(z.string()).optional()
})

/**
 * GET /api/emails/[id] - Get a specific email with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailId = params.id
    console.log('Email detail endpoint called with ID:', emailId)
    console.log('ID type:', typeof emailId, 'Length:', emailId.length)

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 })
    }

    const email = await emailService.getEmailById(emailId)

    return NextResponse.json({
      success: true,
      email
    })

  } catch (error) {
    if (error instanceof Error && error.message === 'Email not found') {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    console.error('Error in GET /api/emails/[id]:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/emails/[id] - Update a specific email
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailId = params.id
    const body = await request.json()
    const updates = EmailUpdateSchema.parse(body)

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 })
    }

    const updatedEmail = await emailService.updateEmailStatus(emailId, updates)

    return NextResponse.json({
      success: true,
      message: 'Email updated successfully',
      email: updatedEmail
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid update parameters', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PUT /api/emails/[id]:', error)
    return NextResponse.json({ 
      error: 'Failed to update email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/emails/[id] - Delete a specific email
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailId = params.id

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 })
    }

    const deletedCount = await emailService.deleteEmails([emailId])

    if (deletedCount === 0) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Email deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/emails/[id]:', error)
    return NextResponse.json({ 
      error: 'Failed to delete email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}