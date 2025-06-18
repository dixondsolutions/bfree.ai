import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { z } from 'zod'

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.enum(['work', 'personal', 'health', 'finance', 'education', 'social', 'household', 'travel', 'project', 'other']).default('other'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  estimated_duration: z.number().positive().optional(),
  due_date: z.string().datetime().optional(),
  scheduled_start: z.string().datetime().optional(),
  scheduled_end: z.string().datetime().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  energy_level: z.number().min(1).max(5).optional(),
  parent_task_id: z.string().uuid().optional(),
  ai_generated: z.boolean().default(false),
  source_email_id: z.string().optional(),
  source_suggestion_id: z.string().uuid().optional(),
  confidence_score: z.number().min(0).max(1).optional()
})

const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked', 'deferred', 'pending_schedule', 'scheduled']).optional()
})

/**
 * GET /api/tasks - List user's tasks with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Query parameters for filtering
    const statusParam = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const include_subtasks = searchParams.get('include_subtasks') === 'true'
    const parent_only = searchParams.get('parent_only') === 'true'

    // Parse multiple status values
    const statusValues = statusParam ? statusParam.split(',').map(s => s.trim()) : null

    // Use the main tasks table instead of task_overview
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (statusValues && statusValues.length > 0) {
      query = query.in('status', statusValues)
    }
    if (category) query = query.eq('category', category)
    if (priority) query = query.eq('priority', priority)
    if (parent_only) query = query.is('parent_task_id', null)

    // Apply date range filters
    if (startDate) {
      // Include tasks that have any date field within our range
      query = query.or(`and(scheduled_start.gte.${startDate},scheduled_start.lte.${endDate || startDate}),and(scheduled_end.gte.${startDate},scheduled_end.lte.${endDate || startDate}),and(due_date.gte.${startDate},due_date.lte.${endDate || startDate}),created_at.gte.${startDate}`)
    }
    if (endDate && !startDate) {
      query = query.or(`scheduled_start.lte.${endDate},scheduled_end.lte.${endDate},due_date.lte.${endDate}`)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch tasks',
        details: error.message 
      }, { status: 500 })
    }

    // Fetch subtasks if requested
    if (include_subtasks && tasks && tasks.length > 0) {
      const taskIds = tasks.map(task => task.id)
      const { data: subtasks } = await supabase
        .from('tasks')
        .select('*')
        .in('parent_task_id', taskIds)
        .order('created_at', { ascending: false })

      // Group subtasks by parent task
      const subtasksByParent = subtasks?.reduce((acc, subtask) => {
        if (!acc[subtask.parent_task_id]) acc[subtask.parent_task_id] = []
        acc[subtask.parent_task_id].push(subtask)
        return acc
      }, {} as Record<string, any[]>) || {}

      // Add subtasks to parent tasks
      tasks.forEach(task => {
        task.subtasks = subtasksByParent[task.id] || []
      })
    }

    return NextResponse.json({ 
      tasks: tasks || [],
      pagination: {
        offset,
        limit,
        count: tasks?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/tasks:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/tasks - Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateTaskSchema.parse(body)

    const supabase = await createClient()

    // Convert datetime strings to proper format
    const taskData = {
      ...validatedData,
      user_id: user.id,
      due_date: validatedData.due_date ? new Date(validatedData.due_date).toISOString() : null,
      scheduled_start: validatedData.scheduled_start ? new Date(validatedData.scheduled_start).toISOString() : null,
      scheduled_end: validatedData.scheduled_end ? new Date(validatedData.scheduled_end).toISOString() : null
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ 
        error: 'Failed to create task',
        details: error.message 
      }, { status: 500 })
    }

    // Log task creation if task_comments table exists
    try {
      await supabase.from('task_comments').insert({
        task_id: task.id,
        user_id: user.id,
        comment: 'Task created',
        is_system_comment: true
      })
    } catch (commentError) {
      // Don't fail task creation if comment logging fails
      console.warn('Failed to log task creation comment:', commentError)
    }

    return NextResponse.json({ task }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/tasks:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}