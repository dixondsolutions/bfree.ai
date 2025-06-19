import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { z } from 'zod'

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(['work', 'personal', 'health', 'finance', 'education', 'social', 'household', 'travel', 'project', 'other']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked', 'deferred', 'pending_schedule', 'scheduled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  estimated_duration: z.number().positive().optional(),
  due_date: z.string().datetime().optional().nullable(),
  scheduled_start: z.string().datetime().optional().nullable(),
  scheduled_end: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  energy_level: z.number().min(1).max(5).optional().nullable()
})

/**
 * GET /api/tasks/[id] - Get a specific task with details
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

    const supabase = await createClient()
    const taskId = params.id

    // Get task details
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get additional task data
    const [
      { data: subtasks },
      { data: dependencies },
      { data: comments },
      { data: attachments },
      { data: timeEntries }
    ] = await Promise.all([
      // Subtasks
      supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', taskId)
        .order('created_at', { ascending: false }),
      
      // Dependencies
      supabase
        .from('task_dependencies')
        .select(`
          id,
          dependency_type,
          depends_on_task:depends_on_task_id(id, title, status)
        `)
        .eq('task_id', taskId),
      
      // Comments
      supabase
        .from('task_comments')
        .select(`
          id,
          comment,
          is_system_comment,
          created_at,
          user:user_id(id, full_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false }),
      
      // Attachments
      supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId),
      
      // Time entries
      supabase
        .from('task_time_entries')
        .select('*')
        .eq('task_id', taskId)
        .order('start_time', { ascending: false })
    ])

    const taskWithDetails = {
      ...task,
      subtasks: subtasks || [],
      dependencies: dependencies || [],
      comments: comments || [],
      attachments: attachments || [],
      timeEntries: timeEntries || []
    }

    return NextResponse.json({ 
      success: true,
      task: taskWithDetails 
    })

  } catch (error) {
    console.error('Error in GET /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/tasks/[id] - Update a task
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

    const body = await request.json()
    const validatedData = UpdateTaskSchema.parse(body)
    const taskId = params.id

    const supabase = await createClient()

    // Check if task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = { ...validatedData }
    
    // Convert datetime strings to proper format
    if (validatedData.due_date !== undefined) {
      updateData.due_date = validatedData.due_date ? new Date(validatedData.due_date).toISOString() : null
    }
    if (validatedData.scheduled_start !== undefined) {
      updateData.scheduled_start = validatedData.scheduled_start ? new Date(validatedData.scheduled_start).toISOString() : null
    }
    if (validatedData.scheduled_end !== undefined) {
      updateData.scheduled_end = validatedData.scheduled_end ? new Date(validatedData.scheduled_end).toISOString() : null
    }

    // Set completed_at if status is being changed to completed
    if (validatedData.status === 'completed' && existingTask.status !== 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else if (validatedData.status && validatedData.status !== 'completed') {
      updateData.completed_at = null
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    // Log significant changes
    const significantChanges = []
    if (validatedData.status && validatedData.status !== existingTask.status) {
      significantChanges.push(`Status changed from ${existingTask.status} to ${validatedData.status}`)
    }
    if (validatedData.priority && validatedData.priority !== existingTask.priority) {
      significantChanges.push(`Priority changed from ${existingTask.priority} to ${validatedData.priority}`)
    }
    if (validatedData.due_date !== undefined && validatedData.due_date !== existingTask.due_date) {
      significantChanges.push(`Due date ${validatedData.due_date ? 'set to ' + validatedData.due_date : 'removed'}`)
    }

    if (significantChanges.length > 0) {
      await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: user.id,
        comment: significantChanges.join('; '),
        is_system_comment: true
      })
    }

    return NextResponse.json({ 
      success: true,
      task 
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PUT /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/tasks/[id] - Partially update a task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateTaskSchema.parse(body)
    const taskId = params.id

    const supabase = await createClient()

    // Check if task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = { ...validatedData }
    
    // Convert datetime strings to proper format
    if (validatedData.due_date !== undefined) {
      updateData.due_date = validatedData.due_date ? new Date(validatedData.due_date).toISOString() : null
    }
    if (validatedData.scheduled_start !== undefined) {
      updateData.scheduled_start = validatedData.scheduled_start ? new Date(validatedData.scheduled_start).toISOString() : null
    }
    if (validatedData.scheduled_end !== undefined) {
      updateData.scheduled_end = validatedData.scheduled_end ? new Date(validatedData.scheduled_end).toISOString() : null
    }

    // Set completed_at if status is being changed to completed
    if (validatedData.status === 'completed' && existingTask.status !== 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else if (validatedData.status && validatedData.status !== 'completed') {
      updateData.completed_at = null
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    // Log significant changes
    const significantChanges = []
    if (validatedData.status && validatedData.status !== existingTask.status) {
      significantChanges.push(`Status changed from ${existingTask.status} to ${validatedData.status}`)
    }
    if (validatedData.priority && validatedData.priority !== existingTask.priority) {
      significantChanges.push(`Priority changed from ${existingTask.priority} to ${validatedData.priority}`)
    }

    if (significantChanges.length > 0) {
      await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: user.id,
        comment: significantChanges.join('; '),
        is_system_comment: true
      })
    }

    return NextResponse.json({ 
      success: true,
      task,
      message: 'Task updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PATCH /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/tasks/[id] - Delete a task
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

    const supabase = await createClient()
    const taskId = params.id

    // Check if task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting task:', error)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Task "${existingTask.title}" deleted successfully` 
    })

  } catch (error) {
    console.error('Error in DELETE /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}