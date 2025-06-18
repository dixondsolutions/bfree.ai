import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { z } from 'zod'

// Sample test data
const SAMPLE_EMAIL_DATA = {
  subject: 'Weekly Team Meeting - Friday 2pm',
  from: 'manager@company.com',
  to: 'user@company.com',
  body: `Hi team,

We have our weekly team meeting scheduled for Friday at 2:00 PM in Conference Room A. 

Agenda:
- Project status updates
- Q4 planning discussion
- New hire introductions

Please confirm your attendance and prepare your project updates.

Best regards,
Sarah`,
  date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
}

const URGENT_EMAIL_DATA = {
  subject: 'URGENT: Client presentation needs immediate review',
  from: 'client-manager@company.com',
  to: 'user@company.com',
  body: `Hi,

The client presentation for tomorrow's meeting needs your immediate review. Please review the slides and provide feedback by 5 PM today.

The presentation covers:
- Q3 results summary
- Product roadmap updates
- Budget allocation for next quarter

This is critical for tomorrow's board meeting.

Thanks,
Mike`,
  date: new Date().toISOString()
}

const TASK_EMAIL_DATA = {
  subject: 'Action items from Monday\'s strategy meeting',
  from: 'project-lead@company.com',
  to: 'user@company.com',
  body: `Following up on our strategy meeting, here are the action items:

1. Research competitor pricing models (due: Wednesday)
2. Draft proposal for new feature set (due: Friday)
3. Schedule follow-up meetings with key stakeholders
4. Update project timeline based on new requirements

Please confirm you can handle these deliverables and let me know if you need any resources.

Best,
Jennifer`,
  date: new Date().toISOString()
}

const TestPipelineSchema = z.object({
  action: z.enum(['full-pipeline', 'email-only', 'ai-only', 'task-only', 'cleanup']),
  testType: z.enum(['sample-data', 'custom-data', 'stress-test']).optional(),
  customData: z.object({
    subject: z.string(),
    from: z.string(),
    to: z.string(),
    body: z.string(),
    date: z.string().datetime()
  }).optional(),
  options: z.object({
    cleanup: z.boolean().default(true),
    skipAI: z.boolean().default(false),
    includeDetails: z.boolean().default(true)
  }).optional()
})

/**
 * POST /api/test/pipeline - Test the email processing pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = TestPipelineSchema.parse(body)
    const { action, testType = 'sample-data', customData, options = {} } = validatedData

    switch (action) {
      case 'full-pipeline':
        return await testFullPipeline(user.id, testType, customData, options)
      
      case 'email-only':
        return await testEmailProcessing(user.id, testType, customData, options)
      
      case 'ai-only':
        return await testAIProcessing(user.id, testType, customData, options)
      
      case 'task-only':
        return await testTaskCreation(user.id, testType, customData, options)
      
      case 'cleanup':
        return await cleanupTestData(user.id)
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          available_actions: ['full-pipeline', 'email-only', 'ai-only', 'task-only', 'cleanup']
        }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/test/pipeline:', error)
    return NextResponse.json({ 
      error: 'Failed to run pipeline test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/test/pipeline - Get test results and sample data
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'

    switch (action) {
      case 'status':
        return await getTestStatus(user.id)
      
      case 'sample-data':
        return NextResponse.json({
          success: true,
          sampleData: {
            meeting_email: SAMPLE_EMAIL_DATA,
            urgent_email: URGENT_EMAIL_DATA,
            task_email: TASK_EMAIL_DATA
          }
        })
      
      case 'history':
        return await getTestHistory(user.id)
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          available_actions: ['status', 'sample-data', 'history']
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in GET /api/test/pipeline:', error)
    return NextResponse.json({ 
      error: 'Failed to get test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Test the full email→AI→task→calendar pipeline
 */
async function testFullPipeline(userId: string, testType: string, customData?: any, options: any = {}) {
  const startTime = Date.now()
  const testResults: any = {
    pipeline: 'full',
    testType,
    startTime: new Date().toISOString(),
    steps: {},
    summary: {},
    success: false
  }

  try {
    // Step 1: Email Processing
    console.log('Testing email processing...')
    const emailResult = await testEmailProcessing(userId, testType, customData, { ...options, cleanup: false })
    testResults.steps.email_processing = emailResult.body ? JSON.parse(emailResult.body) : emailResult

    if (!testResults.steps.email_processing.success) {
      throw new Error('Email processing failed')
    }

    const emailId = testResults.steps.email_processing.email?.id

    // Step 2: AI Analysis (if not skipped)
    if (!options.skipAI) {
      console.log('Testing AI analysis...')
      const aiResult = await testAIProcessing(userId, 'sample-data', { emailId }, { ...options, cleanup: false })
      testResults.steps.ai_processing = aiResult.body ? JSON.parse(aiResult.body) : aiResult

      if (!testResults.steps.ai_processing.success) {
        console.warn('AI processing failed, continuing without AI suggestions')
      }
    }

    // Step 3: Task Creation
    console.log('Testing task creation...')
    const taskResult = await testTaskCreation(userId, 'sample-data', { emailId }, { ...options, cleanup: false })
    testResults.steps.task_creation = taskResult.body ? JSON.parse(taskResult.body) : taskResult

    // Step 4: Calendar Integration (check for auto-scheduling)
    console.log('Checking calendar integration...')
    const supabase = await createClient()
    
    const { data: scheduledTasks, error } = await supabase
      .from('tasks')
      .select('id, title, scheduled_start, scheduled_end, priority')
      .eq('user_id', userId)
      .eq('source_email_record_id', emailId)
      .not('scheduled_start', 'is', null)

    testResults.steps.calendar_integration = {
      success: !error,
      message: error ? `Calendar check failed: ${error.message}` : 'Calendar integration checked',
      scheduled_tasks: scheduledTasks?.length || 0,
      tasks: scheduledTasks || []
    }

    // Calculate summary
    const duration = Date.now() - startTime
    const totalSteps = Object.keys(testResults.steps).length
    const successfulSteps = Object.values(testResults.steps).filter((step: any) => step.success).length

    testResults.summary = {
      duration_ms: duration,
      total_steps: totalSteps,
      successful_steps: successfulSteps,
      success_rate: Math.round((successfulSteps / totalSteps) * 100),
      email_created: !!emailId,
      ai_suggestions: testResults.steps.ai_processing?.suggestions?.length || 0,
      tasks_created: testResults.steps.task_creation?.tasks?.length || 0,
      tasks_scheduled: testResults.steps.calendar_integration?.scheduled_tasks || 0
    }

    testResults.success = successfulSteps >= totalSteps - 1 // Allow one failure
    testResults.endTime = new Date().toISOString()

    // Cleanup if requested
    if (options.cleanup && emailId) {
      await cleanupTestData(userId, emailId)
      testResults.cleanup_performed = true
    }

    return NextResponse.json(testResults, { status: 201 })

  } catch (error) {
    testResults.error = error instanceof Error ? error.message : 'Unknown error'
    testResults.endTime = new Date().toISOString()
    testResults.summary.duration_ms = Date.now() - startTime

    console.error('Full pipeline test failed:', error)
    return NextResponse.json(testResults, { status: 500 })
  }
}

/**
 * Test email processing only
 */
async function testEmailProcessing(userId: string, testType: string, customData?: any, options: any = {}) {
  try {
    const emailData = customData || getTestEmailData(testType)
    const { emailService } = await import('@/lib/email/email-service')

    // Create test email record
    const storedEmail = await emailService.storeEmail({
      gmail_id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      subject: emailData.subject,
      from_address: emailData.from,
      to_address: emailData.to,
      content_text: emailData.body,
      snippet: emailData.body.substring(0, 200),
      received_at: new Date(emailData.date),
      has_scheduling_content: true,
      scheduling_keywords: ['meeting', 'schedule', 'urgent'],
      labels: ['test'],
      is_unread: true
    })

    return NextResponse.json({
      success: true,
      message: 'Email processing test completed',
      email: storedEmail,
      testData: emailData
    }, { status: 201 })

  } catch (error) {
    console.error('Email processing test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'email_processing'
    }, { status: 500 })
  }
}

/**
 * Test AI processing
 */
async function testAIProcessing(userId: string, testType: string, customData?: any, options: any = {}) {
  try {
    const emailId = customData?.emailId
    if (!emailId) {
      throw new Error('Email ID required for AI processing test')
    }

    // Get the email data
    const { emailService } = await import('@/lib/email/email-service')
    const email = await emailService.getEmailById(emailId)

    // Process with AI
    const { processEmailWithAI } = await import('@/lib/openai/processor')
    const aiResult = await processEmailWithAI({
      id: email.gmail_id,
      subject: email.subject,
      from: email.from_address,
      to: email.to_address,
      body: email.content_text || 'No content available',
      date: new Date(email.received_at)
    })

    return NextResponse.json({
      success: true,
      message: 'AI processing test completed',
      analysis: aiResult.analysis,
      suggestions: aiResult.suggestions,
      email_id: emailId
    }, { status: 201 })

  } catch (error) {
    console.error('AI processing test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'ai_processing'
    }, { status: 500 })
  }
}

/**
 * Test task creation
 */
async function testTaskCreation(userId: string, testType: string, customData?: any, options: any = {}) {
  try {
    const emailId = customData?.emailId
    if (!emailId) {
      throw new Error('Email ID required for task creation test')
    }

    // Create task from email using AI
    const emailData = customData || getTestEmailData(testType)
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/create-task?action=from-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailId,
        emailContent: emailData
      })
    })

    const result = await response.json()

    return NextResponse.json({
      success: response.ok,
      message: result.message || 'Task creation test completed',
      tasks: result.tasks || [],
      analysis: result.analysis,
      scheduling: result.scheduling,
      email_id: emailId
    }, { status: response.ok ? 201 : 500 })

  } catch (error) {
    console.error('Task creation test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'task_creation'
    }, { status: 500 })
  }
}

/**
 * Get test status and recent test data
 */
async function getTestStatus(userId: string) {
  try {
    const supabase = await createClient()

    // Get test emails (emails with test labels)
    const { data: testEmails, error: emailError } = await supabase
      .from('emails')
      .select('id, subject, created_at, ai_analyzed')
      .eq('user_id', userId)
      .contains('labels', ['test'])
      .order('created_at', { ascending: false })
      .limit(10)

    // Get test tasks (AI-generated tasks from last hour)
    const { data: testTasks, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, created_at, ai_generated, scheduled_start')
      .eq('user_id', userId)
      .eq('ai_generated', true)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    // Get test suggestions
    const { data: testSuggestions, error: suggestionError } = await supabase
      .from('ai_suggestions')
      .select('id, title, confidence_score, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (emailError || taskError || suggestionError) {
      throw new Error('Failed to get test status')
    }

    return NextResponse.json({
      success: true,
      test_status: {
        test_emails: testEmails?.length || 0,
        test_tasks: testTasks?.length || 0,
        test_suggestions: testSuggestions?.length || 0,
        recent_activity: {
          emails: testEmails || [],
          tasks: testTasks || [],
          suggestions: testSuggestions || []
        }
      },
      cleanup_available: (testEmails?.length || 0) > 0
    })

  } catch (error) {
    console.error('Failed to get test status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Get test history
 */
async function getTestHistory(userId: string) {
  // This would typically store test run history in a separate table
  // For now, return placeholder data
  return NextResponse.json({
    success: true,
    message: 'Test history feature coming soon',
    placeholder_data: {
      recent_tests: [
        {
          id: 'test-1',
          type: 'full-pipeline',
          timestamp: new Date().toISOString(),
          success: true,
          duration_ms: 2500
        }
      ]
    }
  })
}

/**
 * Clean up test data
 */
async function cleanupTestData(userId: string, specificEmailId?: string) {
  try {
    const supabase = await createClient()

    if (specificEmailId) {
      // Clean up specific test email and related data
      const { error } = await supabase
        .from('emails')
        .delete()
        .eq('user_id', userId)
        .eq('id', specificEmailId)

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: 'Specific test data cleaned up',
        email_id: specificEmailId
      })
    }

    // Clean up all test data (emails with test labels)
    const cleanupResults = await Promise.allSettled([
      // Delete test emails
      supabase
        .from('emails')
        .delete()
        .eq('user_id', userId)
        .contains('labels', ['test']),
      
      // Delete test processing queue items
      supabase
        .from('processing_queue')
        .delete()
        .eq('user_id', userId)
        .like('email_id', 'test-%'),
      
      // Delete recent AI-generated tasks (last hour)
      supabase
        .from('tasks')
        .delete()
        .eq('user_id', userId)
        .eq('ai_generated', true)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    ])

    const successCount = cleanupResults.filter(r => r.status === 'fulfilled').length

    return NextResponse.json({
      success: true,
      message: `Cleanup completed - ${successCount}/3 operations successful`,
      details: cleanupResults.map((result, index) => ({
        operation: ['emails', 'queue', 'tasks'][index],
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? result.reason?.message : null
      }))
    })

  } catch (error) {
    console.error('Cleanup failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Get test email data based on type
 */
function getTestEmailData(testType: string) {
  switch (testType) {
    case 'urgent':
      return URGENT_EMAIL_DATA
    case 'task':
      return TASK_EMAIL_DATA
    case 'sample-data':
    default:
      return SAMPLE_EMAIL_DATA
  }
}