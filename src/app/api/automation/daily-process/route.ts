import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchRecentEmails, processEmailsWithAIAnalysis } from '@/lib/gmail/processor'
import { taskScheduler } from '@/lib/tasks/task-scheduler'
import { taskService } from '@/lib/tasks/task-service'

/**
 * POST /api/automation/daily-process - Daily automated email processing and task scheduling
 * This endpoint should be called by a cron job or webhook daily to process emails and create tasks
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Verify cron job authorization (for production security)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Get all users with active email accounts
    const { data: activeUsers } = await supabase
      .from('email_accounts')
      .select(`
        user_id,
        users!inner(id, email, full_name)
      `)
      .eq('is_active', true)

    if (!activeUsers || activeUsers.length === 0) {
      return NextResponse.json({ 
        message: 'No active users with email accounts found',
        processed: 0
      })
    }

    const results = []
    let totalEmailsProcessed = 0
    let totalTasksCreated = 0
    let totalUsersProcessed = 0

    // Process each user's emails
    for (const userAccount of activeUsers) {
      try {
        const userId = userAccount.user_id
        console.log(`Processing daily automation for user: ${userId}`)

        // Set user context for the processing functions
        // Note: In a real implementation, you'd need to handle user context properly
        // For now, we'll process each user's data sequentially

        // Get recent emails from the last 24 hours
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const messages = await fetchRecentEmails(20, `newer_than:1d`)

        if (messages.length === 0) {
          console.log(`No new emails for user ${userId}`)
          continue
        }

        // Process emails with AI analysis and auto-task creation
        const result = await processEmailsWithAIAnalysis(messages)
        
        // Get all pending tasks for scheduling
        const { tasks: pendingTasks } = await taskService.getTasks({
          status: 'pending',
          include_subtasks: false,
          limit: 50
        })

        const unscheduledTasks = pendingTasks.filter(task => !task.scheduled_start)

        // Auto-schedule tasks if there are any
        let schedulingResult = null
        if (unscheduledTasks.length > 0) {
          schedulingResult = await taskScheduler.scheduleTasks(
            unscheduledTasks,
            {}, // Default constraints
            {
              respectDependencies: true,
              optimizeForEnergy: true,
              allowOverlaps: false
            }
          )
        }

        const userResult = {
          userId,
          userEmail: userAccount.users.email,
          emailsProcessed: result.processedEmails.length,
          tasksCreated: result.tasksCreated.length,
          tasksScheduled: schedulingResult?.scheduledTasks.length || 0,
          aiSuggestions: result.aiAnalysisResults.reduce((sum, r) => sum + (r.suggestions || 0), 0),
          timestamp: new Date().toISOString()
        }

        results.push(userResult)
        totalEmailsProcessed += userResult.emailsProcessed
        totalTasksCreated += userResult.tasksCreated
        totalUsersProcessed++

        // Log automation activity
        await supabase.from('task_comments').insert({
          task_id: null, // System-level comment
          user_id: userId,
          comment: `Daily automation processed ${userResult.emailsProcessed} emails, created ${userResult.tasksCreated} tasks, scheduled ${userResult.tasksScheduled} tasks`,
          is_system_comment: true
        })

        console.log(`Completed processing for user ${userId}:`, userResult)

      } catch (userError) {
        console.error(`Error processing user ${userAccount.user_id}:`, userError)
        results.push({
          userId: userAccount.user_id,
          userEmail: userAccount.users.email,
          error: userError instanceof Error ? userError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })
      }
    }

    // Log overall automation results
    console.log('Daily automation completed:', {
      totalUsersProcessed,
      totalEmailsProcessed,
      totalTasksCreated,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Daily automation completed for ${totalUsersProcessed} users`,
      summary: {
        usersProcessed: totalUsersProcessed,
        totalEmailsProcessed,
        totalTasksCreated,
        timestamp: new Date().toISOString()
      },
      details: results
    })

  } catch (error) {
    console.error('Error in daily automation:', error)
    return NextResponse.json(
      { 
        error: 'Daily automation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/automation/daily-process - Get automation status and logs
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    // Get recent automation logs from task comments
    const { data: automationLogs } = await supabase
      .from('task_comments')
      .select(`
        id,
        comment,
        created_at,
        user_id,
        users!inner(email, full_name)
      `)
      .eq('is_system_comment', true)
      .ilike('comment', '%Daily automation%')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    // Get automation statistics
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, created_at, ai_generated')
      .eq('ai_generated', true)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

    const { data: recentSuggestions } = await supabase
      .from('ai_suggestions')
      .select('id, created_at, status')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

    const statistics = {
      aiTasksCreated: recentTasks?.length || 0,
      aiSuggestionsGenerated: recentSuggestions?.length || 0,
      autoConversions: recentSuggestions?.filter(s => s.status === 'auto_converted').length || 0,
      automationRuns: automationLogs?.length || 0,
      lastRunTime: automationLogs?.[0]?.created_at || null
    }

    return NextResponse.json({
      statistics,
      recentLogs: automationLogs?.slice(0, 20) || [],
      systemStatus: 'operational'
    })

  } catch (error) {
    console.error('Error getting automation status:', error)
    return NextResponse.json(
      { error: 'Failed to get automation status' },
      { status: 500 }
    )
  }
}