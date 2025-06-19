import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'

export interface CreateTaskInput {
  title: string
  description?: string
  category?: 'work' | 'personal' | 'health' | 'finance' | 'education' | 'social' | 'household' | 'travel' | 'project' | 'other'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  estimated_duration?: number
  due_date?: Date
  scheduled_start?: Date
  scheduled_end?: Date
  location?: string
  tags?: string[]
  notes?: string
  energy_level?: number
  parent_task_id?: string
  ai_generated?: boolean
  source_email_id?: string
  source_email_record_id?: string
  source_suggestion_id?: string
  confidence_score?: number
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  category?: 'work' | 'personal' | 'health' | 'finance' | 'education' | 'social' | 'household' | 'travel' | 'project' | 'other'
  status?: 'pending' | 'pending_schedule' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' | 'deferred'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  estimated_duration?: number
  due_date?: Date | null
  scheduled_start?: Date | null
  scheduled_end?: Date | null
  location?: string | null
  tags?: string[]
  notes?: string
  energy_level?: number | null
}

export interface TaskFilters {
  status?: string
  category?: string
  priority?: string
  parent_only?: boolean
  include_subtasks?: boolean
  overdue_only?: boolean
  due_soon?: boolean
  ai_generated?: boolean
  limit?: number
  offset?: number
}

export class TaskService {
  private supabase: any

  constructor() {
    this.supabase = null
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  private async getUserId() {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    return user.id
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput) {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const taskData = {
      ...input,
      user_id: userId,
      due_date: input.due_date?.toISOString() || null,
      scheduled_start: input.scheduled_start?.toISOString() || null,
      scheduled_end: input.scheduled_end?.toISOString() || null,
      category: input.category || 'other',
      priority: input.priority || 'medium',
      ai_generated: input.ai_generated || false
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`)
    }

    // Log task creation
    await this.addTaskComment(task.id, 'Task created', true)

    return task
  }

  /**
   * Get tasks with filtering and pagination
   */
  async getTasks(filters: TaskFilters = {}) {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    let query = supabase
      .from('task_overview')
      .select('*')
      .eq('user_id', userId)

    // Apply filters
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.parent_only) query = query.is('parent_task_id', null)
    if (filters.ai_generated !== undefined) query = query.eq('ai_generated', filters.ai_generated)
    if (filters.overdue_only) query = query.eq('is_overdue', true)
    if (filters.due_soon) query = query.eq('is_due_soon', true)

    // Pagination
    const limit = filters.limit || 50
    const offset = filters.offset || 0
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data: tasks, error } = await query

    if (error) {
      throw new Error(`Failed to get tasks: ${error.message}`)
    }

    // Fetch subtasks if requested
    if (filters.include_subtasks && tasks) {
      const taskIds = tasks.map(task => task.id)
      const { data: subtasks } = await supabase
        .from('task_overview')
        .select('*')
        .in('parent_task_id', taskIds)
        .order('created_at', { ascending: false })

      // Group subtasks by parent task
      const subtasksByParent = subtasks?.reduce((acc: any, subtask: any) => {
        if (!acc[subtask.parent_task_id]) acc[subtask.parent_task_id] = []
        acc[subtask.parent_task_id].push(subtask)
        return acc
      }, {}) || {}

      // Add subtasks to parent tasks
      tasks.forEach((task: any) => {
        task.subtasks = subtasksByParent[task.id] || []
      })
    }

    return {
      tasks,
      pagination: {
        offset,
        limit,
        count: tasks?.length || 0
      }
    }
  }

  /**
   * Get a specific task with full details
   */
  async getTaskById(taskId: string) {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    // Get task details
    const { data: task, error } = await supabase
      .from('task_overview')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()

    if (error || !task) {
      throw new Error('Task not found')
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
        .from('task_overview')
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

    return {
      ...task,
      subtasks: subtasks || [],
      dependencies: dependencies || [],
      comments: comments || [],
      attachments: attachments || [],
      timeEntries: timeEntries || []
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, input: UpdateTaskInput) {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    // Check if task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingTask) {
      throw new Error('Task not found')
    }

    // Prepare update data
    const updateData: any = { ...input }
    
    // Convert dates
    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date?.toISOString() || null
    }
    if (input.scheduled_start !== undefined) {
      updateData.scheduled_start = input.scheduled_start?.toISOString() || null
    }
    if (input.scheduled_end !== undefined) {
      updateData.scheduled_end = input.scheduled_end?.toISOString() || null
    }

    // Set completed_at if status is being changed to completed
    if (input.status === 'completed' && existingTask.status !== 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else if (input.status && input.status !== 'completed') {
      updateData.completed_at = null
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`)
    }

    // Log significant changes
    await this.logTaskChanges(taskId, existingTask, input)

    return task
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string) {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    // Check if task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingTask) {
      throw new Error('Task not found')
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`)
    }

    return { message: `Task "${existingTask.title}" deleted successfully` }
  }

  /**
   * Create multiple tasks from AI suggestions
   */
  async createTasksFromSuggestions(suggestions: any[]) {
    const userId = await this.getUserId()
    const tasks = []

    for (const suggestion of suggestions) {
      const taskInput: CreateTaskInput = {
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.task_category || 'other',
        priority: suggestion.priority || 'medium',
        estimated_duration: suggestion.estimated_duration,
        due_date: suggestion.suggested_due_date ? new Date(suggestion.suggested_due_date) : undefined,
        energy_level: suggestion.energy_level,
        tags: suggestion.suggested_tags,
        ai_generated: true,
        source_email_id: suggestion.source_email_id,
        source_suggestion_id: suggestion.id,
        confidence_score: suggestion.confidence_score
      }

      const task = await this.createTask(taskInput)
      tasks.push(task)
    }

    return tasks
  }

  /**
   * Get task statistics for analytics
   */
  async getTaskStats(days: number = 30) {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    const { data, error } = await supabase.rpc('get_task_completion_stats', {
      p_user_id: userId,
      p_days: days
    })

    if (error) {
      throw new Error(`Failed to get task stats: ${error.message}`)
    }

    return data?.[0] || {}
  }

  /**
   * Add a comment to a task
   */
  private async addTaskComment(taskId: string, comment: string, isSystemComment: boolean = false) {
    const userId = await this.getUserId()
    const supabase = await this.getSupabase()

    await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: userId,
      comment,
      is_system_comment: isSystemComment
    })
  }

  /**
   * Log significant task changes
   */
  private async logTaskChanges(taskId: string, existingTask: any, input: UpdateTaskInput) {
    const changes = []

    if (input.status && input.status !== existingTask.status) {
      changes.push(`Status changed from ${existingTask.status} to ${input.status}`)
    }
    if (input.priority && input.priority !== existingTask.priority) {
      changes.push(`Priority changed from ${existingTask.priority} to ${input.priority}`)
    }
    if (input.due_date !== undefined && input.due_date !== existingTask.due_date) {
      changes.push(`Due date ${input.due_date ? 'set to ' + input.due_date.toISOString() : 'removed'}`)
    }
    if (input.scheduled_start !== undefined && input.scheduled_start !== existingTask.scheduled_start) {
      changes.push(`Scheduled start ${input.scheduled_start ? 'set to ' + input.scheduled_start.toISOString() : 'removed'}`)
    }

    if (changes.length > 0) {
      await this.addTaskComment(taskId, changes.join('; '), true)
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks() {
    return this.getTasks({ overdue_only: true })
  }

  /**
   * Get tasks due soon (within 24 hours)
   */
  async getTasksDueSoon() {
    return this.getTasks({ due_soon: true })
  }

  /**
   * Get AI-generated tasks
   */
  async getAIGeneratedTasks() {
    return this.getTasks({ ai_generated: true })
  }
}

// Export singleton instance
export const taskService = new TaskService()