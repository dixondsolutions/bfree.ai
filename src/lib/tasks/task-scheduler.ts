import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { getUserSchedulingPreferences, SchedulingPreferences, SuggestedSlot } from '@/lib/calendar/scheduling-engine'
import { checkFreeBusy } from '@/lib/calendar/google-calendar'

export interface Task {
  id: string
  title: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_duration: number // minutes
  due_date?: Date
  energy_level?: number // 1-5
  dependencies?: string[] // task IDs this depends on
  scheduled_start?: Date
  scheduled_end?: Date
  status: string
}

export interface SchedulingConstraints {
  mustScheduleBefore?: Date // Hard deadline
  cannotScheduleBefore?: Date // Earliest possible start
  preferredTimeSlots?: Array<{ start: string; end: string }> // "09:00"-"11:00"
  avoidTimeSlots?: Array<{ start: string; end: string }>
  maxDurationPerDay?: number // Max minutes per day for this task type
  requiresConsecutiveTime?: boolean // Cannot be broken into chunks
  bufferTime?: number // Minutes before/after this task
}

export interface SchedulingResult {
  scheduledTasks: Array<{
    task: Task
    scheduledSlot: {
      start: Date
      end: Date
      confidence: number
      reasoning: string
    }
    conflicts?: string[]
    adjustments?: string[]
  }>
  unscheduledTasks: Array<{
    task: Task
    reason: string
    suggestions?: string[]
  }>
  optimizationInsights: {
    totalScheduled: number
    totalDuration: number // minutes
    energyOptimization: number // 0-1 score
    priorityOptimization: number // 0-1 score
    recommendations: string[]
  }
}

export class TaskScheduler {
  private supabase: any
  private preferences: SchedulingPreferences | null = null

  constructor() {
    this.supabase = null
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  private async getPreferences(): Promise<SchedulingPreferences> {
    if (!this.preferences) {
      this.preferences = await getUserSchedulingPreferences()
    }
    return this.preferences
  }

  /**
   * Schedule multiple tasks automatically
   */
  async scheduleTasks(
    tasks: Task[],
    constraints: SchedulingConstraints = {},
    options: {
      startDate?: Date
      endDate?: Date
      respectDependencies?: boolean
      optimizeForEnergy?: boolean
      allowOverlaps?: boolean
    } = {}
  ): Promise<SchedulingResult> {
    try {
      const preferences = await this.getPreferences()
      const startDate = options.startDate || new Date()
      const endDate = options.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

      // Filter and sort tasks
      const pendingTasks = tasks.filter(task => !task.scheduled_start && task.status === 'pending')
      const sortedTasks = this.sortTasksByPriority(pendingTasks, options.respectDependencies)

      // Get existing calendar events for conflict detection
      const existingEvents = await this.getExistingEvents(startDate, endDate)

      const scheduledTasks: SchedulingResult['scheduledTasks'] = []
      const unscheduledTasks: SchedulingResult['unscheduledTasks'] = []
      const occupiedSlots: Array<{ start: Date; end: Date }> = [...existingEvents]

      // Schedule each task
      for (const task of sortedTasks) {
        try {
          const scheduledSlot = await this.findOptimalTimeSlot(
            task,
            occupiedSlots,
            preferences,
            constraints,
            options
          )

          if (scheduledSlot) {
            scheduledTasks.push({
              task,
              scheduledSlot
            })

            // Add to occupied slots for future conflict detection
            occupiedSlots.push({
              start: scheduledSlot.start,
              end: scheduledSlot.end
            })

            // Update task in database
            await this.updateTaskSchedule(task.id, scheduledSlot.start, scheduledSlot.end)

          } else {
            unscheduledTasks.push({
              task,
              reason: 'No suitable time slot found',
              suggestions: await this.generateSchedulingSuggestions(task, preferences)
            })
          }
        } catch (error) {
          unscheduledTasks.push({
            task,
            reason: `Scheduling error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            suggestions: []
          })
        }
      }

      // Generate optimization insights
      const optimizationInsights = this.calculateOptimizationInsights(
        scheduledTasks,
        unscheduledTasks,
        preferences
      )

      return {
        scheduledTasks,
        unscheduledTasks,
        optimizationInsights
      }

    } catch (error) {
      throw new Error(`Task scheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Find optimal time slot for a single task
   */
  private async findOptimalTimeSlot(
    task: Task,
    occupiedSlots: Array<{ start: Date; end: Date }>,
    preferences: SchedulingPreferences,
    constraints: SchedulingConstraints,
    options: any
  ): Promise<{ start: Date; end: Date; confidence: number; reasoning: string } | null> {
    
    const duration = task.estimated_duration
    const daysToSearch = 14 // Search up to 2 weeks ahead
    const now = new Date()
    
    const candidates: Array<{
      start: Date
      end: Date
      score: number
      reasoning: string[]
    }> = []

    // Generate time slot candidates
    for (let day = 0; day < daysToSearch; day++) {
      const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000)
      
      // Skip weekends if this is a work task
      if (task.category === 'work' && !preferences.workingDays.includes(date.getDay())) {
        continue
      }

      // Skip if past due date constraint
      if (constraints.mustScheduleBefore && date > constraints.mustScheduleBefore) {
        break
      }

      // Generate time slots for this day
      const daySlots = this.generateDayTimeSlots(date, duration, preferences, constraints)

      for (const slot of daySlots) {
        // Check for conflicts
        if (this.hasConflict(slot, occupiedSlots)) {
          continue
        }

        // Calculate score for this slot
        const score = this.calculateSlotScore(slot, task, preferences, constraints)
        const reasoning = this.generateSlotReasoning(slot, task, score, preferences)

        candidates.push({
          ...slot,
          score,
          reasoning
        })
      }
    }

    // Sort by score and return best candidate
    candidates.sort((a, b) => b.score - a.score)
    
    if (candidates.length === 0) {
      return null
    }

    const best = candidates[0]
    return {
      start: best.start,
      end: best.end,
      confidence: Math.min(best.score / 100, 1), // Normalize to 0-1
      reasoning: best.reasoning.join('; ')
    }
  }

  /**
   * Generate possible time slots for a day
   */
  private generateDayTimeSlots(
    date: Date,
    duration: number,
    preferences: SchedulingPreferences,
    constraints: SchedulingConstraints
  ): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = []
    
    // Parse working hours
    const [startHour, startMin] = preferences.workingHours.start.split(':').map(Number)
    const [endHour, endMin] = preferences.workingHours.end.split(':').map(Number)
    
    const workStart = new Date(date)
    workStart.setHours(startHour, startMin, 0, 0)
    
    const workEnd = new Date(date)
    workEnd.setHours(endHour, endMin, 0, 0)

    // Generate slots every 15 minutes within working hours
    const slotInterval = 15 // minutes
    let currentTime = new Date(workStart)

    while (currentTime.getTime() + duration * 60 * 1000 <= workEnd.getTime()) {
      const slotStart = new Date(currentTime)
      const slotEnd = new Date(currentTime.getTime() + duration * 60 * 1000)

      // Check constraint compliance
      if (constraints.cannotScheduleBefore && slotStart < constraints.cannotScheduleBefore) {
        currentTime = new Date(currentTime.getTime() + slotInterval * 60 * 1000)
        continue
      }

      slots.push({ start: slotStart, end: slotEnd })
      currentTime = new Date(currentTime.getTime() + slotInterval * 60 * 1000)
    }

    return slots
  }

  /**
   * Check if a time slot conflicts with existing events
   */
  private hasConflict(
    slot: { start: Date; end: Date },
    occupiedSlots: Array<{ start: Date; end: Date }>
  ): boolean {
    return occupiedSlots.some(occupied => 
      slot.start < occupied.end && slot.end > occupied.start
    )
  }

  /**
   * Calculate score for a time slot
   */
  private calculateSlotScore(
    slot: { start: Date; end: Date },
    task: Task,
    preferences: SchedulingPreferences,
    constraints: SchedulingConstraints
  ): number {
    let score = 50 // Base score

    // Priority bonus
    const priorityMultipliers = { urgent: 40, high: 30, medium: 20, low: 10 }
    score += priorityMultipliers[task.priority] || 10

    // Energy level matching
    if (task.energy_level) {
      const hour = slot.start.getHours()
      
      // High energy tasks prefer morning (9-11) and early afternoon (2-4)
      if (task.energy_level >= 4) {
        if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
          score += 20
        }
      }
      // Low energy tasks prefer late morning (11-12) and late afternoon (4-6)
      else if (task.energy_level <= 2) {
        if ((hour >= 11 && hour <= 12) || (hour >= 16 && hour <= 18)) {
          score += 15
        }
      }
    }

    // Due date proximity
    if (task.due_date) {
      const daysUntilDue = (task.due_date.getTime() - slot.start.getTime()) / (24 * 60 * 60 * 1000)
      if (daysUntilDue <= 1) score += 30 // Due soon
      else if (daysUntilDue <= 3) score += 20
      else if (daysUntilDue <= 7) score += 10
    }

    // Preferred time slots
    if (constraints.preferredTimeSlots) {
      const slotHour = slot.start.getHours()
      const slotMinute = slot.start.getMinutes()
      const slotTimeStr = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`
      
      for (const preferred of constraints.preferredTimeSlots) {
        if (slotTimeStr >= preferred.start && slotTimeStr <= preferred.end) {
          score += 25
          break
        }
      }
    }

    // Category-specific bonuses
    if (task.category === 'work' && slot.start.getHours() >= 9 && slot.start.getHours() <= 17) {
      score += 15
    }
    if (task.category === 'personal' && (slot.start.getHours() <= 9 || slot.start.getHours() >= 17)) {
      score += 10
    }

    return score
  }

  /**
   * Generate reasoning for slot selection
   */
  private generateSlotReasoning(
    slot: { start: Date; end: Date },
    task: Task,
    score: number,
    preferences: SchedulingPreferences
  ): string[] {
    const reasoning: string[] = []
    const hour = slot.start.getHours()

    // Time of day reasoning
    if (hour >= 9 && hour <= 11) {
      reasoning.push('Morning slot for high focus')
    } else if (hour >= 14 && hour <= 16) {
      reasoning.push('Afternoon slot for sustained work')
    }

    // Priority reasoning
    if (task.priority === 'urgent' || task.priority === 'high') {
      reasoning.push(`${task.priority} priority task`)
    }

    // Energy matching
    if (task.energy_level && task.energy_level >= 4) {
      reasoning.push('High-energy task scheduled during peak hours')
    }

    // Due date reasoning
    if (task.due_date) {
      const daysUntilDue = Math.ceil((task.due_date.getTime() - slot.start.getTime()) / (24 * 60 * 60 * 1000))
      if (daysUntilDue <= 1) {
        reasoning.push('Due soon - prioritized scheduling')
      }
    }

    return reasoning
  }

  /**
   * Sort tasks by priority and dependencies
   */
  private sortTasksByPriority(tasks: Task[], respectDependencies: boolean = true): Task[] {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    
    if (!respectDependencies) {
      return tasks.sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        
        // Due date as tiebreaker
        if (a.due_date && b.due_date) {
          return a.due_date.getTime() - b.due_date.getTime()
        }
        return a.due_date ? -1 : (b.due_date ? 1 : 0)
      })
    }

    // Topological sort considering dependencies
    const sorted: Task[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (task: Task) => {
      if (visiting.has(task.id)) {
        // Circular dependency detected, ignore this dependency
        return
      }
      if (visited.has(task.id)) {
        return
      }

      visiting.add(task.id)

      // Visit dependencies first
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          const depTask = tasks.find(t => t.id === depId)
          if (depTask) {
            visit(depTask)
          }
        }
      }

      visiting.delete(task.id)
      visited.add(task.id)
      sorted.push(task)
    }

    // Sort by priority first, then apply dependency ordering
    const prioritySorted = tasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
    
    for (const task of prioritySorted) {
      visit(task)
    }

    return sorted
  }

  /**
   * Get existing calendar events for conflict detection
   */
  private async getExistingEvents(startDate: Date, endDate: Date): Promise<Array<{ start: Date; end: Date }>> {
    try {
      const user = await getCurrentUser()
      if (!user) return []

      const supabase = await this.getSupabase()
      
      const { data: events } = await supabase
        .from('events')
        .select('start_time, end_time')
        .eq('user_id', user.id)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())

      return (events || []).map((event: any) => ({
        start: new Date(event.start_time),
        end: new Date(event.end_time)
      }))
    } catch (error) {
      console.error('Error fetching existing events:', error)
      return []
    }
  }

  /**
   * Update task schedule in database
   */
  private async updateTaskSchedule(taskId: string, start: Date, end: Date) {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const supabase = await this.getSupabase()
      
      await supabase
        .from('tasks')
        .update({
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          status: 'pending' // Keep as pending, user can start when ready
        })
        .eq('id', taskId)
        .eq('user_id', user.id)

      // Log the scheduling
      await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: user.id,
        comment: `Task automatically scheduled from ${start.toLocaleString()} to ${end.toLocaleString()}`,
        is_system_comment: true
      })

    } catch (error) {
      console.error('Error updating task schedule:', error)
      throw error
    }
  }

  /**
   * Generate scheduling suggestions for unscheduled tasks
   */
  private async generateSchedulingSuggestions(task: Task, preferences: SchedulingPreferences): Promise<string[]> {
    const suggestions: string[] = []

    if (task.due_date) {
      const daysUntilDue = Math.ceil((task.due_date.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      if (daysUntilDue <= 1) {
        suggestions.push('Consider scheduling immediately due to approaching deadline')
      } else if (daysUntilDue <= 3) {
        suggestions.push('Schedule within the next 2 days')
      }
    }

    if (task.estimated_duration > 120) {
      suggestions.push('Consider breaking this task into smaller chunks')
    }

    if (task.energy_level && task.energy_level >= 4) {
      suggestions.push('Schedule during morning hours (9-11 AM) for optimal energy')
    }

    if (task.priority === 'urgent' || task.priority === 'high') {
      suggestions.push('High priority - consider adjusting other scheduled tasks')
    }

    return suggestions
  }

  /**
   * Calculate optimization insights
   */
  private calculateOptimizationInsights(
    scheduledTasks: SchedulingResult['scheduledTasks'],
    unscheduledTasks: SchedulingResult['unscheduledTasks'],
    preferences: SchedulingPreferences
  ): SchedulingResult['optimizationInsights'] {
    
    const totalTasks = scheduledTasks.length + unscheduledTasks.length
    const totalDuration = scheduledTasks.reduce((sum, { task }) => sum + task.estimated_duration, 0)

    // Calculate energy optimization score
    let energyOptimization = 0
    if (scheduledTasks.length > 0) {
      const energyMatches = scheduledTasks.filter(({ task, scheduledSlot }) => {
        const hour = scheduledSlot.start.getHours()
        if (task.energy_level && task.energy_level >= 4) {
          return (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)
        }
        return true
      }).length
      energyOptimization = energyMatches / scheduledTasks.length
    }

    // Calculate priority optimization score
    let priorityOptimization = 0
    if (scheduledTasks.length > 0) {
      const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 }
      const totalPriorityWeight = scheduledTasks.reduce((sum, { task }) => 
        sum + priorityWeights[task.priority], 0)
      const maxPossibleWeight = scheduledTasks.length * 4
      priorityOptimization = totalPriorityWeight / maxPossibleWeight
    }

    const recommendations: string[] = []
    
    if (unscheduledTasks.length > 0) {
      recommendations.push(`${unscheduledTasks.length} tasks could not be scheduled - consider extending working hours or reducing task scope`)
    }
    
    if (energyOptimization < 0.7) {
      recommendations.push('Consider rescheduling high-energy tasks to morning or early afternoon slots')
    }
    
    if (totalDuration > preferences.maxMeetingsPerDay * 60) {
      recommendations.push('Daily task load exceeds recommended limits - consider spreading tasks across more days')
    }

    return {
      totalScheduled: scheduledTasks.length,
      totalDuration,
      energyOptimization,
      priorityOptimization,
      recommendations
    }
  }
}

// Export singleton instance
export const taskScheduler = new TaskScheduler()