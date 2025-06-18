import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { taskScheduler, SchedulingConstraints, SchedulingResult } from '@/lib/tasks/task-scheduler'
import { priorityEngine, TaskPriorityFactors } from '@/lib/tasks/priority-engine'
import { taskService } from '@/lib/tasks/task-service'
import { z } from 'zod'

const ScheduleTasksSchema = z.object({
  taskIds: z.array(z.string().uuid()).optional(),
  constraints: z.object({
    mustScheduleBefore: z.string().datetime().optional(),
    cannotScheduleBefore: z.string().datetime().optional(),
    preferredTimeSlots: z.array(z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    })).optional(),
    avoidTimeSlots: z.array(z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    })).optional(),
    maxDurationPerDay: z.number().positive().optional(),
    requiresConsecutiveTime: z.boolean().optional(),
    bufferTime: z.number().min(0).optional()
  }).optional(),
  options: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    respectDependencies: z.boolean().default(true),
    optimizeForEnergy: z.boolean().default(true),
    allowOverlaps: z.boolean().default(false),
    recalculatePriorities: z.boolean().default(true)
  }).optional()
})

const RescheduleTaskSchema = z.object({
  taskId: z.string().uuid(),
  newStartTime: z.string().datetime(),
  newEndTime: z.string().datetime().optional(),
  reason: z.string().optional()
})

/**
 * POST /api/tasks/schedule - Schedule multiple tasks or reschedule individual task
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'schedule-batch'

    switch (action) {
      case 'schedule-batch':
        return await scheduleBatchTasks(request)
      case 'reschedule-single':
        return await rescheduleSingleTask(request)
      case 'optimize-schedule':
        return await optimizeExistingSchedule(request)
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

    console.error('Error in POST /api/tasks/schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Schedule multiple tasks in batch
 */
async function scheduleBatchTasks(request: NextRequest) {
  const body = await request.json()
  const validatedData = ScheduleTasksSchema.parse(body)
  const { taskIds, constraints = {}, options = {} } = validatedData

  try {
    const user = await getCurrentUser()
    const supabase = await createClient()

    // Get tasks to schedule
    let tasksQuery = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'pending')

    if (taskIds && taskIds.length > 0) {
      tasksQuery = tasksQuery.in('id', taskIds)
    } else {
      // If no specific tasks, get all unscheduled tasks
      tasksQuery = tasksQuery.is('scheduled_start', null)
    }

    const { data: tasks, error } = await tasksQuery.order('created_at', { ascending: false })

    if (error || !tasks || tasks.length === 0) {
      return NextResponse.json({ 
        message: 'No tasks found to schedule',
        error: error?.message 
      }, { status: 404 })
    }

    // Recalculate priorities if requested
    let prioritizedTasks = tasks
    if (options.recalculatePriorities) {
      prioritizedTasks = await recalculateTaskPriorities(tasks)
    }

    // Convert constraints
    const schedulingConstraints: SchedulingConstraints = {
      mustScheduleBefore: constraints.mustScheduleBefore ? new Date(constraints.mustScheduleBefore) : undefined,
      cannotScheduleBefore: constraints.cannotScheduleBefore ? new Date(constraints.cannotScheduleBefore) : undefined,
      preferredTimeSlots: constraints.preferredTimeSlots,
      avoidTimeSlots: constraints.avoidTimeSlots,
      maxDurationPerDay: constraints.maxDurationPerDay,
      requiresConsecutiveTime: constraints.requiresConsecutiveTime,
      bufferTime: constraints.bufferTime
    }

    // Schedule tasks
    const result = await taskScheduler.scheduleTasks(
      prioritizedTasks,
      schedulingConstraints,
      {
        startDate: options.startDate ? new Date(options.startDate) : undefined,
        endDate: options.endDate ? new Date(options.endDate) : undefined,
        respectDependencies: options.respectDependencies,
        optimizeForEnergy: options.optimizeForEnergy,
        allowOverlaps: options.allowOverlaps
      }
    )

    // Log scheduling activity
    await supabase.from('task_comments').insert(
      result.scheduledTasks.map(({ task }) => ({
        task_id: task.id,
        user_id: user?.id,
        comment: `Task scheduled via batch scheduling (${result.scheduledTasks.length}/${tasks.length} tasks scheduled)`,
        is_system_comment: true
      }))
    )

    return NextResponse.json({
      message: `Scheduled ${result.scheduledTasks.length} of ${tasks.length} tasks`,
      result,
      statistics: {
        total_tasks: tasks.length,
        scheduled_count: result.scheduledTasks.length,
        unscheduled_count: result.unscheduledTasks.length,
        total_scheduled_time: result.optimizationInsights.totalDuration,
        energy_optimization: Math.round(result.optimizationInsights.energyOptimization * 100),
        priority_optimization: Math.round(result.optimizationInsights.priorityOptimization * 100)
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error scheduling batch tasks:', error)
    return NextResponse.json({ 
      error: 'Failed to schedule tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Reschedule a single task
 */
async function rescheduleSingleTask(request: NextRequest) {
  const body = await request.json()
  const validatedData = RescheduleTaskSchema.parse(body)
  const { taskId, newStartTime, newEndTime, reason } = validatedData

  try {
    const user = await getCurrentUser()
    const supabase = await createClient()

    // Get the task
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user?.id)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const startTime = new Date(newStartTime)
    const endTime = newEndTime ? new Date(newEndTime) : 
      new Date(startTime.getTime() + task.estimated_duration * 60 * 1000)

    // Check for conflicts
    const { data: conflicts } = await supabase
      .from('events')
      .select('title, start_time, end_time')
      .eq('user_id', user?.id)
      .lt('start_time', endTime.toISOString())
      .gt('end_time', startTime.toISOString())

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({
        error: 'Scheduling conflict detected',
        conflicts: conflicts.map(c => ({
          title: c.title,
          start: c.start_time,
          end: c.end_time
        }))
      }, { status: 409 })
    }

    // Update task schedule
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        scheduled_start: startTime.toISOString(),
        scheduled_end: endTime.toISOString()
      })
      .eq('id', taskId)
      .eq('user_id', user?.id)
      .select('*')
      .single()

    if (updateError) {
      throw new Error(`Failed to update task: ${updateError.message}`)
    }

    // Log the reschedule
    await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: user?.id,
      comment: `Task rescheduled to ${startTime.toLocaleString()}-${endTime.toLocaleString()}${reason ? ` (${reason})` : ''}`,
      is_system_comment: true
    })

    return NextResponse.json({
      message: 'Task rescheduled successfully',
      task: updatedTask,
      previousSchedule: {
        start: task.scheduled_start,
        end: task.scheduled_end
      },
      newSchedule: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      }
    })

  } catch (error) {
    console.error('Error rescheduling task:', error)
    return NextResponse.json({ 
      error: 'Failed to reschedule task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Optimize existing schedule
 */
async function optimizeExistingSchedule(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const supabase = await createClient()

    // Get all scheduled tasks for the next 14 days
    const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    
    const { data: scheduledTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user?.id)
      .not('scheduled_start', 'is', null)
      .lte('scheduled_start', endDate.toISOString())
      .eq('status', 'pending')

    if (error || !scheduledTasks || scheduledTasks.length === 0) {
      return NextResponse.json({ 
        message: 'No scheduled tasks to optimize' 
      })
    }

    // Clear existing schedules temporarily
    await supabase
      .from('tasks')
      .update({
        scheduled_start: null,
        scheduled_end: null
      })
      .in('id', scheduledTasks.map(t => t.id))

    // Reschedule with optimization
    const result = await taskScheduler.scheduleTasks(
      scheduledTasks,
      {},
      {
        respectDependencies: true,
        optimizeForEnergy: true,
        allowOverlaps: false
      }
    )

    // Calculate improvement metrics
    const improvement = calculateScheduleImprovement(scheduledTasks, result)

    // Log optimization
    await supabase.from('task_comments').insert(
      result.scheduledTasks.map(({ task }) => ({
        task_id: task.id,
        user_id: user?.id,
        comment: 'Task schedule optimized for better energy and priority alignment',
        is_system_comment: true
      }))
    )

    return NextResponse.json({
      message: `Schedule optimized for ${result.scheduledTasks.length} tasks`,
      result,
      improvement,
      statistics: {
        energy_optimization_improvement: improvement.energyOptimizationDelta,
        priority_optimization_improvement: improvement.priorityOptimizationDelta,
        time_savings: improvement.timeSavings,
        conflict_reduction: improvement.conflictReduction
      }
    })

  } catch (error) {
    console.error('Error optimizing schedule:', error)
    return NextResponse.json({ 
      error: 'Failed to optimize schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/tasks/schedule - Get scheduling statistics and insights
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const startDate = new Date()
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    // Get scheduling statistics
    const [
      { data: scheduledTasks, count: scheduledCount },
      { data: unscheduledTasks, count: unscheduledCount },
      { data: overdueTasks, count: overdueCount }
    ] = await Promise.all([
      supabase
        .from('task_overview')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .not('scheduled_start', 'is', null)
        .gte('scheduled_start', startDate.toISOString())
        .lte('scheduled_start', endDate.toISOString()),
      
      supabase
        .from('task_overview')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .is('scheduled_start', null)
        .eq('status', 'pending'),
      
      supabase
        .from('task_overview')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_overdue', true)
        .eq('status', 'pending')
    ])

    // Calculate schedule density by day
    const scheduleDensity = calculateScheduleDensity(scheduledTasks || [], days)

    // Generate recommendations
    const recommendations = generateSchedulingRecommendations({
      scheduledCount: scheduledCount || 0,
      unscheduledCount: unscheduledCount || 0,
      overdueCount: overdueCount || 0,
      scheduleDensity
    })

    return NextResponse.json({
      statistics: {
        scheduled_tasks: scheduledCount || 0,
        unscheduled_tasks: unscheduledCount || 0,
        overdue_tasks: overdueCount || 0,
        schedule_density: scheduleDensity,
        avg_daily_tasks: scheduledTasks ? Math.round((scheduledTasks.length / days) * 10) / 10 : 0
      },
      recommendations,
      upcoming_schedule: scheduledTasks?.slice(0, 10).map(task => ({
        id: task.id,
        title: task.title,
        scheduled_start: task.scheduled_start,
        scheduled_end: task.scheduled_end,
        priority: task.priority,
        category: task.category
      })) || []
    })

  } catch (error) {
    console.error('Error in GET /api/tasks/schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Recalculate task priorities using the priority engine
 */
async function recalculateTaskPriorities(tasks: any[]): Promise<any[]> {
  const taskFactors: TaskPriorityFactors[] = tasks.map(task => ({
    dueDate: task.due_date ? new Date(task.due_date) : undefined,
    createdDate: new Date(task.created_at),
    estimatedDuration: task.estimated_duration || 30,
    urgentKeywords: extractKeywords(task.title + ' ' + (task.description || '')),
    importantKeywords: extractKeywords(task.title + ' ' + (task.description || '')),
    category: task.category,
    aiConfidence: task.confidence_score || 0.5,
    aiUrgency: task.priority as any
  }))

  const priorityResults = await priorityEngine.calculateBatchPriorities(taskFactors)

  return tasks.map((task, index) => ({
    ...task,
    priority: priorityResults[index].finalPriority,
    priority_score: priorityResults[index].priorityScore,
    priority_reasoning: priorityResults[index].reasoning
  }))
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(word => word.length > 2)
}

/**
 * Calculate schedule density by day
 */
function calculateScheduleDensity(tasks: any[], days: number): Array<{ date: string; task_count: number; total_duration: number }> {
  const density = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayTasks = tasks.filter(task => {
      const taskDate = new Date(task.scheduled_start).toISOString().split('T')[0]
      return taskDate === dateStr
    })
    
    density.push({
      date: dateStr,
      task_count: dayTasks.length,
      total_duration: dayTasks.reduce((sum, task) => sum + (task.estimated_duration || 0), 0)
    })
  }
  
  return density
}

/**
 * Generate scheduling recommendations
 */
function generateSchedulingRecommendations(stats: {
  scheduledCount: number
  unscheduledCount: number
  overdueCount: number
  scheduleDensity: Array<{ date: string; task_count: number; total_duration: number }>
}): string[] {
  const recommendations = []

  if (stats.unscheduledCount > 0) {
    recommendations.push(`You have ${stats.unscheduledCount} unscheduled tasks. Consider using batch scheduling to optimize your calendar.`)
  }

  if (stats.overdueCount > 0) {
    recommendations.push(`${stats.overdueCount} tasks are overdue. Prioritize these for immediate scheduling.`)
  }

  const heavyDays = stats.scheduleDensity.filter(day => day.total_duration > 480) // > 8 hours
  if (heavyDays.length > 0) {
    recommendations.push(`${heavyDays.length} days have heavy task loads (>8 hours). Consider redistributing tasks.`)
  }

  const lightDays = stats.scheduleDensity.filter(day => day.task_count === 0)
  if (lightDays.length > 0 && stats.unscheduledCount > 0) {
    recommendations.push(`${lightDays.length} days have no scheduled tasks. Consider moving some tasks to these days.`)
  }

  return recommendations
}

/**
 * Calculate schedule improvement metrics
 */
function calculateScheduleImprovement(originalTasks: any[], result: SchedulingResult) {
  // This would compare original vs optimized schedule
  return {
    energyOptimizationDelta: 15, // Placeholder - would calculate actual improvement
    priorityOptimizationDelta: 10,
    timeSavings: 45, // minutes saved through better organization
    conflictReduction: 2 // number of conflicts resolved
  }
}