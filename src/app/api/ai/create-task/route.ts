import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { taskService } from '@/lib/tasks/task-service'
import { extractTasksFromEmail } from '@/lib/openai/task-extraction'
import { z } from 'zod'

// Helper function to estimate task duration based on content analysis
function enhancedDurationEstimation(task: any, taskExtraction?: any): number {
  // Use AI-extracted duration if available and reasonable
  if (taskExtraction?.estimatedDuration && taskExtraction.estimatedDuration > 0) {
    return Math.min(Math.max(taskExtraction.estimatedDuration, 5), 480) // 5 min to 8 hours
  }
  
  // Use task's estimated duration if set
  if (task.estimated_duration && task.estimated_duration > 0) {
    return task.estimated_duration
  }
  
  // Intelligent estimation based on task characteristics
  const title = (task.title || '').toLowerCase()
  const description = (task.description || '').toLowerCase()
  const content = `${title} ${description}`
  
  // Keywords that suggest different durations
  const quickKeywords = ['quick', 'brief', 'short', 'call', 'email', 'review', 'check', 'update']
  const longKeywords = ['meeting', 'workshop', 'presentation', 'training', 'planning', 'analysis', 'research']
  const projectKeywords = ['project', 'develop', 'create', 'build', 'design', 'implement']
  
  // Check for time mentions in content
  const timeMatches = content.match(/(\d+)\s*(min|minute|hour|hr)/gi)
  if (timeMatches) {
    const match = timeMatches[0]
    const number = parseInt(match)
    if (match.includes('hour') || match.includes('hr')) {
      return Math.min(number * 60, 480) // Convert hours to minutes, max 8 hours
    } else {
      return Math.min(number, 480) // Already in minutes
    }
  }
  
  // Keyword-based estimation
  if (quickKeywords.some(keyword => content.includes(keyword))) {
    return 15 // 15 minutes for quick tasks
  }
  
  if (projectKeywords.some(keyword => content.includes(keyword))) {
    return 120 // 2 hours for project work
  }
  
  if (longKeywords.some(keyword => content.includes(keyword))) {
    return 90 // 1.5 hours for longer tasks
  }
  
  // Priority-based fallback
  switch (task.priority) {
    case 'urgent':
      return 30 // Urgent tasks are often quick
    case 'high':
      return 60 // Standard high priority
    case 'medium':
      return 45 // Medium tasks
    case 'low':
      return 30 // Low priority often simple
    default:
      return 45 // Default reasonable duration
  }
}

// Helper function to suggest schedule for task without auto-updating
async function suggestTaskSchedule(task: any, taskExtraction?: any) {
  try {
    // Use enhanced duration estimation
    const duration = enhancedDurationEstimation(task, taskExtraction)
    
    // Simple scheduling suggestion based on priority and current time
    const now = new Date()
    const startOfTomorrow = new Date(now)
    startOfTomorrow.setDate(now.getDate() + 1)
    startOfTomorrow.setHours(9, 0, 0, 0) // Default to 9 AM tomorrow
    
    // Adjust based on priority
    let suggestedStart = new Date(startOfTomorrow)
    if (task.priority === 'urgent') {
      // Schedule urgent tasks for today if it's still business hours
      if (now.getHours() < 17) {
        suggestedStart = new Date(now.getTime() + 30 * 60000) // 30 minutes from now
      }
    } else if (task.priority === 'high') {
      // Schedule high priority for tomorrow morning
      suggestedStart = startOfTomorrow
    } else {
      // Schedule medium/low priority for later in the week
      suggestedStart.setDate(suggestedStart.getDate() + 1)
    }
    
    const suggestedEnd = new Date(suggestedStart.getTime() + duration * 60000)
    
    return {
      suggested: true,
      message: `Schedule suggested for ${suggestedStart.toLocaleDateString()} at ${suggestedStart.toLocaleTimeString()} (${duration}m)`,
      suggested_start: suggestedStart.toISOString(),
      suggested_end: suggestedEnd.toISOString(),
      priority: task.priority,
      estimated_duration: duration,
      needs_approval: true
    }
  } catch (error) {
    console.error('Schedule suggestion failed for task:', task.id, error)
    return {
      suggested: false,
      message: 'Schedule suggestion failed',
      error: error instanceof Error ? error.message : 'Unknown error'
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
      const enhancedDuration = enhancedDurationEstimation({
        title: taskExtraction.title,
        description: taskExtraction.description,
        priority: taskExtraction.priority,
        estimated_duration: taskExtraction.estimatedDuration
      }, taskExtraction)

      const task = await taskService.createTask({
        title: taskExtraction.title,
        description: taskExtraction.description,
        category: taskExtraction.category,
        priority: taskExtraction.priority as any,
        estimated_duration: enhancedDuration,
        due_date: taskExtraction.suggestedDueDate ? new Date(taskExtraction.suggestedDueDate) : undefined,
        energy_level: taskExtraction.energyLevel,
        tags: taskExtraction.suggestedTags,
        notes: taskExtraction.context,
        ai_generated: true,
        source_email_id: emailId,
        confidence_score: taskExtraction.confidence
      })

      // Suggest schedule for all tasks
      const scheduleResult = await suggestTaskSchedule(task, taskExtraction)

      createdTasks.push({
        ...task,
        extraction_details: taskExtraction,
        schedule_suggested: scheduleResult.suggested,
        schedule_result: scheduleResult
      })
    }

    const scheduleSuggestedCount = createdTasks.filter(t => t.schedule_suggested).length

    return NextResponse.json({
      message: `Created ${createdTasks.length} task(s) from email`,
      tasks: createdTasks,
      analysis: taskAnalysis,
      scheduling: {
        schedule_suggested: scheduleSuggestedCount,
        needs_manual_scheduling: createdTasks.length - scheduleSuggestedCount
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

    // Suggest schedule for the task
    const scheduleResult = await suggestTaskSchedule(task)

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
        schedule_suggested: scheduleResult.suggested,
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