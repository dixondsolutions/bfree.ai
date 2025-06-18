import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { taskService } from '@/lib/tasks/task-service'
import { extractTasksFromEmail } from '@/lib/openai/task-extraction'
import { z } from 'zod'

// Helper function to auto-schedule task using automation settings
async function autoScheduleTaskIfPossible(task: any) {
  try {
    // Get user automation settings
    const { getUserAutomationSettings, getSchedulingWindow } = await import('@/lib/automation/settings')
    const automationSettings = await getUserAutomationSettings()
    
    // Check if auto-scheduling is enabled
    if (!automationSettings.autoScheduleTasks) {
      return {
        scheduled: false,
        message: 'Auto-scheduling disabled in settings',
        reason: 'automation_disabled'
      }
    }

    // Get scheduling window based on priority and settings
    const schedulingInfo = await getSchedulingWindow(task.priority)
    
    if (!schedulingInfo.autoSchedule) {
      return {
        scheduled: false,
        message: `Auto-scheduling not configured for ${task.priority} priority tasks`,
        reason: 'priority_not_configured',
        suggested_start: schedulingInfo.suggestedStart.toISOString(),
        suggested_end: schedulingInfo.suggestedEnd.toISOString()
      }
    }

    // Update the task with scheduling information
    const { taskService } = await import('@/lib/tasks/task-service')
    
    const updateResult = await taskService.updateTask(task.id, {
      scheduled_start: schedulingInfo.suggestedStart,
      scheduled_end: schedulingInfo.suggestedEnd,
      notes: task.notes ? 
        `${task.notes}\n\nAuto-scheduled for ${schedulingInfo.suggestedStart.toLocaleString()} (${task.priority} priority)` : 
        `Auto-scheduled for ${schedulingInfo.suggestedStart.toLocaleString()} (${task.priority} priority)`
    })

    // Check for potential calendar conflicts (basic check)
    const supabase = await createClient()
    const user = await getCurrentUser()
    
    if (user) {
      const { data: conflictingEvents } = await supabase
        .from('events')
        .select('id, title, start_time, end_time')
        .eq('user_id', user.id)
        .gte('start_time', schedulingInfo.suggestedStart.toISOString())
        .lte('start_time', schedulingInfo.suggestedEnd.toISOString())

      const hasConflicts = conflictingEvents && conflictingEvents.length > 0

      return {
        scheduled: true,
        message: `Task auto-scheduled for ${schedulingInfo.suggestedStart.toLocaleString()}`,
        scheduled_start: schedulingInfo.suggestedStart.toISOString(),
        scheduled_end: schedulingInfo.suggestedEnd.toISOString(),
        priority: task.priority,
        estimated_duration: task.estimated_duration,
        conflicts_detected: hasConflicts,
        conflicting_events: hasConflicts ? conflictingEvents : undefined,
        scheduling_window_hours: task.priority === 'urgent' ? 
          automationSettings.taskDefaults.schedulingWindow.urgentHours :
          automationSettings.taskDefaults.schedulingWindow.hours
      }
    }

    return {
      scheduled: true,
      message: `Task auto-scheduled for ${schedulingInfo.suggestedStart.toLocaleString()}`,
      scheduled_start: schedulingInfo.suggestedStart.toISOString(),
      scheduled_end: schedulingInfo.suggestedEnd.toISOString(),
      priority: task.priority,
      estimated_duration: task.estimated_duration
    }
  } catch (error) {
    console.error('Auto-scheduling failed for task:', task.id, error)
    return {
      scheduled: false,
      message: 'Auto-scheduling failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      reason: 'scheduling_error'
    }
  }
}

const CreateTaskFromEmailSchema = z.object({
  emailId: z.string(),
  emailContent: z.object({
    subject: z.string(),
    from: z.string(),
    to: z.string(),
    body: z.string(),
    date: z.string().datetime()
  })
})

const CreateTaskFromSuggestionSchema = z.object({
  suggestionId: z.string().uuid(),
  customizations: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.enum(['work', 'personal', 'health', 'finance', 'education', 'social', 'household', 'travel', 'project', 'other']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    due_date: z.string().datetime().optional(),
    estimated_duration: z.number().positive().optional(),
    energy_level: z.number().min(1).max(5).optional(),
    tags: z.array(z.string()).optional()
  }).optional()
})

const BatchCreateTasksSchema = z.object({
  suggestionIds: z.array(z.string().uuid()),
  bulkCustomizations: z.object({
    category: z.enum(['work', 'personal', 'health', 'finance', 'education', 'social', 'household', 'travel', 'project', 'other']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    due_date: z.string().datetime().optional(),
    tags: z.array(z.string()).optional()
  }).optional()
})

/**
 * POST /api/ai/create-task - Create tasks from AI analysis
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'from-email'

    switch (action) {
      case 'from-email':
        return await createTaskFromEmail(body)
      case 'from-suggestion':
        return await createTaskFromSuggestion(body)
      case 'batch-from-suggestions':
        return await batchCreateTasksFromSuggestions(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/ai/create-task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Create task directly from email content
 */
async function createTaskFromEmail(body: any) {
  const validatedData = CreateTaskFromEmailSchema.parse(body)
  const { emailId, emailContent } = validatedData

  try {
    // Extract tasks from email using AI
    const taskAnalysis = await extractTasksFromEmail({
      ...emailContent,
      date: new Date(emailContent.date)
    })

    if (!taskAnalysis.hasTaskContent || taskAnalysis.taskExtractions.length === 0) {
      return NextResponse.json({
        message: 'No actionable tasks found in email',
        analysis: taskAnalysis
      })
    }

    // Create tasks from extractions
    const createdTasks = []
    for (const taskExtraction of taskAnalysis.taskExtractions) {
      const task = await taskService.createTask({
        title: taskExtraction.title,
        description: taskExtraction.description,
        category: taskExtraction.category,
        priority: taskExtraction.priority as any,
        estimated_duration: taskExtraction.estimatedDuration,
        due_date: taskExtraction.suggestedDueDate ? new Date(taskExtraction.suggestedDueDate) : undefined,
        energy_level: taskExtraction.energyLevel,
        tags: taskExtraction.suggestedTags,
        notes: taskExtraction.context,
        ai_generated: true,
        source_email_id: emailId,
        confidence_score: taskExtraction.confidence
      })

      // Try to auto-schedule high priority tasks
      const scheduleResult = await autoScheduleTaskIfPossible(task)

      createdTasks.push({
        ...task,
        extraction_details: taskExtraction,
        auto_scheduled: !!scheduleResult,
        schedule_result: scheduleResult
      })
    }

    const autoScheduledCount = createdTasks.filter(t => t.auto_scheduled).length

    return NextResponse.json({
      message: `Created ${createdTasks.length} task(s) from email`,
      tasks: createdTasks,
      analysis: taskAnalysis,
      scheduling: {
        auto_scheduled: autoScheduledCount,
        manual_scheduling_needed: createdTasks.length - autoScheduledCount
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating task from email:', error)
    return NextResponse.json({ 
      error: 'Failed to create task from email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Create task from existing AI suggestion
 */
async function createTaskFromSuggestion(body: any) {
  const validatedData = CreateTaskFromSuggestionSchema.parse(body)
  const { suggestionId, customizations = {} } = validatedData

  try {
    const user = await getCurrentUser()
    const supabase = await createClient()

    // Get the AI suggestion
    const { data: suggestion, error } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('user_id', user?.id)
      .single()

    if (error || !suggestion) {
      return NextResponse.json({ error: 'AI suggestion not found' }, { status: 404 })
    }

    // Create task with suggestion data and customizations
    const task = await taskService.createTask({
      title: customizations.title || suggestion.title,
      description: customizations.description || suggestion.description,
      category: customizations.category || suggestion.task_category || 'other',
      priority: customizations.priority || suggestion.priority || 'medium',
      estimated_duration: customizations.estimated_duration || suggestion.estimated_duration,
      due_date: customizations.due_date ? new Date(customizations.due_date) : 
                (suggestion.suggested_due_date ? new Date(suggestion.suggested_due_date) : undefined),
      energy_level: customizations.energy_level || suggestion.energy_level,
      tags: customizations.tags || suggestion.suggested_tags,
      location: suggestion.location,
      ai_generated: true,
      source_email_id: suggestion.source_email_id,
      source_suggestion_id: suggestionId,
      confidence_score: suggestion.confidence_score
    })

    // Try to auto-schedule the task
    const scheduleResult = await autoScheduleTaskIfPossible(task)

    // Mark suggestion as converted to task
    await supabase
      .from('ai_suggestions')
      .update({ 
        status: 'converted',
        converted_to_task_id: task.id,
        converted_at: new Date().toISOString()
      })
      .eq('id', suggestionId)

    return NextResponse.json({
      message: 'Task created from AI suggestion',
      task: {
        ...task,
        auto_scheduled: !!scheduleResult,
        schedule_result: scheduleResult
      },
      suggestion
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating task from suggestion:', error)
    return NextResponse.json({ 
      error: 'Failed to create task from suggestion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Batch create tasks from multiple AI suggestions
 */
async function batchCreateTasksFromSuggestions(body: any) {
  const validatedData = BatchCreateTasksSchema.parse(body)
  const { suggestionIds, bulkCustomizations = {} } = validatedData

  try {
    const user = await getCurrentUser()
    const supabase = await createClient()

    // Get all AI suggestions
    const { data: suggestions, error } = await supabase
      .from('ai_suggestions')
      .select('*')
      .in('id', suggestionIds)
      .eq('user_id', user?.id)

    if (error || !suggestions || suggestions.length === 0) {
      return NextResponse.json({ error: 'No valid AI suggestions found' }, { status: 404 })
    }

    const createdTasks = []
    const errors = []

    // Create tasks from each suggestion
    for (const suggestion of suggestions) {
      try {
        const task = await taskService.createTask({
          title: suggestion.title,
          description: suggestion.description,
          category: bulkCustomizations.category || suggestion.task_category || 'other',
          priority: bulkCustomizations.priority || suggestion.priority || 'medium',
          estimated_duration: suggestion.estimated_duration,
          due_date: bulkCustomizations.due_date ? new Date(bulkCustomizations.due_date) : 
                    (suggestion.suggested_due_date ? new Date(suggestion.suggested_due_date) : undefined),
          energy_level: suggestion.energy_level,
          tags: bulkCustomizations.tags || suggestion.suggested_tags,
          location: suggestion.location,
          ai_generated: true,
          source_email_id: suggestion.source_email_id,
          source_suggestion_id: suggestion.id,
          confidence_score: suggestion.confidence_score
        })

        // Mark suggestion as converted
        await supabase
          .from('ai_suggestions')
          .update({ 
            status: 'converted',
            converted_to_task_id: task.id,
            converted_at: new Date().toISOString()
          })
          .eq('id', suggestion.id)

        createdTasks.push({
          ...task,
          source_suggestion: suggestion
        })

      } catch (error) {
        errors.push({
          suggestion_id: suggestion.id,
          title: suggestion.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: `Created ${createdTasks.length} task(s) from ${suggestions.length} suggestion(s)`,
      tasks: createdTasks,
      errors: errors.length > 0 ? errors : undefined,
      statistics: {
        total_suggestions: suggestions.length,
        successful_conversions: createdTasks.length,
        failed_conversions: errors.length
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error batch creating tasks from suggestions:', error)
    return NextResponse.json({ 
      error: 'Failed to batch create tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/ai/create-task - Get conversion statistics and pending suggestions
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const include_suggestions = searchParams.get('include_suggestions') === 'true'

    // Get conversion statistics
    const [
      { data: pendingSuggestions, count: pendingCount },
      { data: convertedSuggestions, count: convertedCount },
      { data: aiGeneratedTasks, count: taskCount }
    ] = await Promise.all([
      supabase
        .from('ai_suggestions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('confidence_score', { ascending: false }),
      
      supabase
        .from('ai_suggestions')
        .select('id, title, converted_at', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'converted'),
      
      supabase
        .from('tasks')
        .select('id, title, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('ai_generated', true)
    ])

    const stats = {
      pending_suggestions: pendingCount || 0,
      converted_suggestions: convertedCount || 0,
      ai_generated_tasks: taskCount || 0,
      conversion_rate: convertedCount && pendingCount ? 
        Math.round((convertedCount / (convertedCount + pendingCount)) * 100) : 0
    }

    const response: any = { statistics: stats }

    if (include_suggestions) {
      response.pending_suggestions = pendingSuggestions || []
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/ai/create-task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}