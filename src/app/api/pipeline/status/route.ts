import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'

interface PipelineHealth {
  status: 'healthy' | 'warning' | 'error'
  message: string
  components: {
    email_sync: ComponentStatus
    ai_processing: ComponentStatus
    task_creation: ComponentStatus
    calendar_integration: ComponentStatus
  }
  statistics: {
    total_emails: number
    analyzed_emails: number
    created_tasks: number
    scheduled_tasks: number
    pending_queue: number
    failed_queue: number
    last_24h: {
      emails_processed: number
      tasks_created: number
      success_rate: number
    }
  }
  recommendations: string[]
}

interface ComponentStatus {
  status: 'healthy' | 'warning' | 'error'
  message: string
  last_activity?: string
  metrics?: Record<string, any>
}

/**
 * GET /api/pipeline/status - Get comprehensive pipeline health status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'

    // Get pipeline health assessment
    const health = await assessPipelineHealth(user.id, detailed)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      health
    })

  } catch (error) {
    console.error('Error in GET /api/pipeline/status:', error)
    return NextResponse.json({ 
      error: 'Failed to get pipeline status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/pipeline/status - Trigger pipeline health checks and repairs
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, component } = body

    switch (action) {
      case 'repair':
        return await repairPipelineComponent(user.id, component)
      
      case 'retry-failed':
        return await retryFailedItems(user.id)
      
      case 'clear-queue':
        return await clearProcessingQueue(user.id)
      
      case 'sync-emails':
        return await triggerEmailSync(user.id)
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          available_actions: ['repair', 'retry-failed', 'clear-queue', 'sync-emails']
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in POST /api/pipeline/status:', error)
    return NextResponse.json({ 
      error: 'Failed to execute pipeline action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Assess overall pipeline health
 */
async function assessPipelineHealth(userId: string, detailed: boolean = false): Promise<PipelineHealth> {
  const supabase = await createClient()
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Get component statuses in parallel
  const [
    emailSyncStatus,
    aiProcessingStatus,
    taskCreationStatus,
    calendarStatus,
    statistics
  ] = await Promise.all([
    assessEmailSync(supabase, userId),
    assessAIProcessing(supabase, userId),
    assessTaskCreation(supabase, userId),
    assessCalendarIntegration(supabase, userId),
    getComprehensiveStatistics(supabase, userId, yesterday)
  ])

  // Determine overall health
  const components = {
    email_sync: emailSyncStatus,
    ai_processing: aiProcessingStatus,
    task_creation: taskCreationStatus,
    calendar_integration: calendarStatus
  }

  const componentStatuses = Object.values(components).map(c => c.status)
  const hasError = componentStatuses.includes('error')
  const hasWarning = componentStatuses.includes('warning')

  let overallStatus: 'healthy' | 'warning' | 'error'
  let overallMessage: string

  if (hasError) {
    overallStatus = 'error'
    overallMessage = 'Pipeline has critical issues requiring attention'
  } else if (hasWarning) {
    overallStatus = 'warning'
    overallMessage = 'Pipeline is operational but has some issues'
  } else {
    overallStatus = 'healthy'
    overallMessage = 'Pipeline is operating normally'
  }

  // Generate recommendations
  const recommendations = generateRecommendations(components, statistics)

  return {
    status: overallStatus,
    message: overallMessage,
    components,
    statistics,
    recommendations
  }
}

/**
 * Assess email sync component
 */
async function assessEmailSync(supabase: any, userId: string): Promise<ComponentStatus> {
  try {
    // Check for recent email activity
    const { data: recentEmails, error } = await supabase
      .from('emails')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return {
        status: 'error',
        message: `Email sync error: ${error.message}`
      }
    }

    const emailCount = recentEmails?.length || 0
    const lastActivity = recentEmails?.[0]?.created_at

    if (emailCount === 0) {
      return {
        status: 'warning',
        message: 'No emails synced in the last 24 hours',
        last_activity: lastActivity,
        metrics: { emails_last_24h: emailCount }
      }
    }

    return {
      status: 'healthy',
      message: `${emailCount} emails synced in the last 24 hours`,
      last_activity: lastActivity,
      metrics: { emails_last_24h: emailCount }
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Email sync assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Assess AI processing component
 */
async function assessAIProcessing(supabase: any, userId: string): Promise<ComponentStatus> {
  try {
    // Check processing queue status
    const { data: queueStats, error } = await supabase
      .from('processing_queue')
      .select('status')
      .eq('user_id', userId)

    if (error) {
      return {
        status: 'error',
        message: `AI processing error: ${error.message}`
      }
    }

    const queueCounts = (queueStats || []).reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})

    const pending = queueCounts.pending || 0
    const failed = queueCounts.failed || 0
    const completed = queueCounts.completed || 0

    if (failed > pending + completed) {
      return {
        status: 'error',
        message: `High failure rate: ${failed} failed, ${completed} completed`,
        metrics: queueCounts
      }
    }

    if (pending > 50) {
      return {
        status: 'warning',
        message: `Large queue backlog: ${pending} pending items`,
        metrics: queueCounts
      }
    }

    return {
      status: 'healthy',
      message: `Processing normally: ${pending} pending, ${completed} completed`,
      metrics: queueCounts
    }
  } catch (error) {
    return {
      status: 'error',
      message: `AI processing assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Assess task creation component
 */
async function assessTaskCreation(supabase: any, userId: string): Promise<ComponentStatus> {
  try {
    // Check recent task creation activity
    const { data: recentTasks, error } = await supabase
      .from('tasks')
      .select('id, ai_generated, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      return {
        status: 'error',
        message: `Task creation error: ${error.message}`
      }
    }

    const taskCount = recentTasks?.length || 0
    const aiGeneratedCount = recentTasks?.filter(t => t.ai_generated).length || 0
    const lastActivity = recentTasks?.[0]?.created_at

    return {
      status: 'healthy',
      message: `${taskCount} tasks created (${aiGeneratedCount} AI-generated) in the last 24 hours`,
      last_activity: lastActivity,
      metrics: { 
        tasks_last_24h: taskCount,
        ai_generated_last_24h: aiGeneratedCount
      }
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Task creation assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Assess calendar integration component
 */
async function assessCalendarIntegration(supabase: any, userId: string): Promise<ComponentStatus> {
  try {
    // Check for scheduled tasks and calendar events
    const [
      { data: scheduledTasks, error: tasksError },
      { data: recentEvents, error: eventsError }
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, scheduled_start, scheduled_end')
        .eq('user_id', userId)
        .not('scheduled_start', 'is', null)
        .gte('scheduled_start', new Date().toISOString()),
      
      supabase
        .from('events')
        .select('id, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ])

    if (tasksError || eventsError) {
      return {
        status: 'error',
        message: `Calendar integration error: ${tasksError?.message || eventsError?.message}`
      }
    }

    const scheduledCount = scheduledTasks?.length || 0
    const eventsCount = recentEvents?.length || 0

    return {
      status: 'healthy',
      message: `${scheduledCount} tasks scheduled, ${eventsCount} events created in the last 24 hours`,
      metrics: { 
        scheduled_tasks: scheduledCount,
        events_last_24h: eventsCount
      }
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Calendar integration assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get comprehensive statistics
 */
async function getComprehensiveStatistics(supabase: any, userId: string, yesterday: Date) {
  const [
    { count: totalEmails },
    { count: analyzedEmails },
    { count: createdTasks },
    { count: scheduledTasks },
    { count: pendingQueue },
    { count: failedQueue },
    { count: emailsLast24h },
    { count: tasksLast24h }
  ] = await Promise.all([
    supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('ai_analyzed', true),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).not('scheduled_start', 'is', null),
    supabase.from('processing_queue').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending'),
    supabase.from('processing_queue').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'failed'),
    supabase.from('emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', yesterday.toISOString()),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', yesterday.toISOString())
  ])

  const successRate = emailsLast24h > 0 ? Math.round((tasksLast24h / emailsLast24h) * 100) : 0

  return {
    total_emails: totalEmails || 0,
    analyzed_emails: analyzedEmails || 0,
    created_tasks: createdTasks || 0,
    scheduled_tasks: scheduledTasks || 0,
    pending_queue: pendingQueue || 0,
    failed_queue: failedQueue || 0,
    last_24h: {
      emails_processed: emailsLast24h || 0,
      tasks_created: tasksLast24h || 0,
      success_rate: successRate
    }
  }
}

/**
 * Generate recommendations based on pipeline status
 */
function generateRecommendations(components: any, statistics: any): string[] {
  const recommendations: string[] = []

  // Email sync recommendations
  if (components.email_sync.status === 'warning') {
    recommendations.push('Consider running manual email sync to fetch recent emails')
  }

  // AI processing recommendations
  if (statistics.failed_queue > 0) {
    recommendations.push(`Retry ${statistics.failed_queue} failed processing items`)
  }

  if (statistics.pending_queue > 20) {
    recommendations.push('Large processing queue detected - consider running batch processing')
  }

  // Task creation recommendations
  if (statistics.last_24h.success_rate < 50) {
    recommendations.push('Low task creation rate - check AI confidence thresholds in automation settings')
  }

  // Calendar integration recommendations
  if (statistics.scheduled_tasks < statistics.created_tasks * 0.3) {
    recommendations.push('Many tasks are unscheduled - consider enabling auto-scheduling for high priority tasks')
  }

  if (recommendations.length === 0) {
    recommendations.push('Pipeline is operating optimally - no immediate actions needed')
  }

  return recommendations
}

/**
 * Repair a specific pipeline component
 */
async function repairPipelineComponent(userId: string, component: string) {
  const supabase = await createClient()

  switch (component) {
    case 'email_sync':
      // Clear stuck processing items and refresh email sync
      await supabase
        .from('processing_queue')
        .update({ status: 'failed', error_message: 'Cleared by repair action' })
        .eq('user_id', userId)
        .eq('status', 'processing')
        .lt('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Older than 1 hour

      return NextResponse.json({
        success: true,
        message: 'Email sync repaired - cleared stuck processing items'
      })

    case 'ai_processing':
      // Reset failed queue items for retry
      const { count } = await supabase
        .from('processing_queue')
        .update({ 
          status: 'pending', 
          error_message: null, 
          retry_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'failed')
        .select('*', { count: 'exact', head: true })

      return NextResponse.json({
        success: true,
        message: `Reset ${count || 0} failed items for retry`
      })

    default:
      return NextResponse.json({ 
        error: 'Unknown component',
        available_components: ['email_sync', 'ai_processing']
      }, { status: 400 })
  }
}

/**
 * Retry failed processing items
 */
async function retryFailedItems(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('processing_queue')
    .update({ 
      status: 'pending', 
      error_message: null,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('status', 'failed')
    .select('id')

  if (error) {
    throw new Error(`Failed to retry items: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    message: `Queued ${data?.length || 0} items for retry`
  })
}

/**
 * Clear processing queue
 */
async function clearProcessingQueue(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('processing_queue')
    .delete()
    .eq('user_id', userId)
    .in('status', ['completed', 'failed'])
    .select('id')

  if (error) {
    throw new Error(`Failed to clear queue: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    message: `Cleared ${data?.length || 0} completed/failed items from queue`
  })
}

/**
 * Trigger email sync
 */
async function triggerEmailSync(userId: string) {
  // This would typically trigger your email sync process
  // For now, return a placeholder response
  return NextResponse.json({
    success: true,
    message: 'Email sync triggered - check back in a few minutes',
    note: 'This would integrate with your Gmail sync process'
  })
}