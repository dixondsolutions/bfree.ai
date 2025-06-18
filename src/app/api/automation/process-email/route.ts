import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { enhancedEmailProcessor } from '@/lib/automation/enhanced-processor'
import { z } from 'zod'

const ProcessEmailSchema = z.object({
  gmail_id: z.string(),
  thread_id: z.string().optional(),
  subject: z.string(),
  from_address: z.string(),
  from_name: z.string().optional(),
  to_address: z.string(),
  content_text: z.string().optional(),
  content_html: z.string().optional(),
  snippet: z.string().optional(),
  received_at: z.string().transform(str => new Date(str)),
  labels: z.array(z.string()).optional(),
  has_attachments: z.boolean().optional().default(false),
  attachment_count: z.number().optional().default(0)
})

const BatchProcessSchema = z.object({
  emails: z.array(ProcessEmailSchema),
  options: z.object({
    forceReprocess: z.boolean().optional().default(false),
    skipExisting: z.boolean().optional().default(true)
  }).optional()
})

/**
 * POST /api/automation/process-email - Enhanced email processing with bulletproof task creation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const action = request.nextUrl.searchParams.get('action') || 'single'

    if (action === 'batch') {
      return await processBatchEmails(body)
    } else if (action === 'stats') {
      return await getProcessingStats(body)
    } else {
      return await processSingleEmail(body)
    }

  } catch (error) {
    console.error('Email processing error:', error)
    return NextResponse.json({
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Process a single email
 */
async function processSingleEmail(body: any) {
  try {
    const emailData = ProcessEmailSchema.parse(body)
    const result = await enhancedEmailProcessor.processEmailWithTaskCreation(emailData)

    return NextResponse.json({
      success: true,
      message: `Processed email: ${result.tasksCreated} tasks created, ${result.suggestionsCreated} suggestions generated`,
      result,
      automation: {
        emailStored: result.processingSteps.emailStored,
        aiAnalyzed: result.processingSteps.aiAnalyzed,
        tasksCreated: result.tasksCreated > 0,
        fullyAutomated: result.tasksCreated > 0 && result.errors.length === 0
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid email data',
        details: error.errors
      }, { status: 400 })
    }
    throw error
  }
}

/**
 * Process multiple emails in batch
 */
async function processBatchEmails(body: any) {
  try {
    const { emails, options } = BatchProcessSchema.parse(body)
    const results = await enhancedEmailProcessor.processBatchEmails(emails)

    const summary = {
      totalEmails: emails.length,
      successfullyProcessed: results.filter(r => r.processed).length,
      tasksCreated: results.reduce((sum, r) => sum + r.tasksCreated, 0),
      suggestionsCreated: results.reduce((sum, r) => sum + r.suggestionsCreated, 0),
      errors: results.reduce((sum, r) => sum + r.errors.length, 0),
      automationRate: 0
    }

    summary.automationRate = summary.totalEmails > 0 
      ? Math.round((summary.tasksCreated / summary.totalEmails) * 100) 
      : 0

    return NextResponse.json({
      success: true,
      message: `Batch processed ${summary.totalEmails} emails: ${summary.tasksCreated} tasks created`,
      summary,
      results,
      options
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid batch data',
        details: error.errors
      }, { status: 400 })
    }
    throw error
  }
}

/**
 * Get processing statistics
 */
async function getProcessingStats(body: any) {
  try {
    const days = body.days || 7
    const stats = await enhancedEmailProcessor.getProcessingStats(days)

    return NextResponse.json({
      success: true,
      stats,
      message: `Processing statistics for the last ${days} days`
    })

  } catch (error) {
    throw error
  }
}

/**
 * GET /api/automation/process-email - Get processing status and stats
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const days = parseInt(request.nextUrl.searchParams.get('days') || '7')
    const stats = await enhancedEmailProcessor.getProcessingStats(days)

    return NextResponse.json({
      success: true,
      stats,
      endpoints: {
        processSingle: '/api/automation/process-email',
        processBatch: '/api/automation/process-email?action=batch',
        getStats: '/api/automation/process-email?action=stats'
      }
    })

  } catch (error) {
    console.error('Stats retrieval error:', error)
    return NextResponse.json({
      error: 'Failed to get stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 