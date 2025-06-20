/**
 * Advanced Calendar Conflict Detector
 * Comprehensive conflict detection with intelligent scheduling suggestions
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { CalendarErrorHandler } from './calendar-error-handler'

export interface TimeSlot {
  start: Date
  end: Date
  title?: string
  type: 'event' | 'task' | 'buffer' | 'blocked'
  eventId?: string
  calendar?: string
}

export interface ConflictInfo {
  type: 'direct' | 'buffer' | 'travel' | 'preparation' | 'overlap'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggestedAction?: string
  conflictingEvent: {
    id: string
    title: string
    start: Date
    end: Date
    type: 'event' | 'task'
    calendar?: string
  }
  timeOverlap?: {
    start: Date
    end: Date
    durationMinutes: number
  }
}

export interface AvailabilityWindow {
  start: Date
  end: Date
  durationMinutes: number
  quality: 'optimal' | 'good' | 'acceptable' | 'poor'
  reasoning: string[]
  conflicts: ConflictInfo[]
}

export interface ConflictCheckResult {
  hasConflicts: boolean
  conflicts: ConflictInfo[]
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
  canProceed: boolean
  alternatives?: AvailabilityWindow[]
  recommendations: string[]
}

export interface ConflictDetectorConfig {
  bufferTimeMinutes: number
  travelTimeMinutes: number
  workingHours: {
    start: string // "09:00"
    end: string   // "17:00"
  }
  workingDays: number[] // [1,2,3,4,5] for Mon-Fri
  includeTaskConflicts: boolean
  includeTravelTime: boolean
  maxAlternatives: number
  lookAheadDays: number
}

export class ConflictDetector {
  private static readonly DEFAULT_CONFIG: ConflictDetectorConfig = {
    bufferTimeMinutes: 15,
    travelTimeMinutes: 30,
    workingHours: { start: '09:00', end: '17:00' },
    workingDays: [1, 2, 3, 4, 5],
    includeTaskConflicts: true,
    includeTravelTime: true,
    maxAlternatives: 5,
    lookAheadDays: 14
  }

  /**
   * Check for conflicts at a specific time
   */
  static async checkConflicts(
    proposedStart: Date,
    proposedEnd: Date,
    options: {
      excludeEventId?: string
      title?: string
      includeAlternatives?: boolean
      config?: Partial<ConflictDetectorConfig>
    } = {}
  ): Promise<ConflictCheckResult> {
    const config = { ...this.DEFAULT_CONFIG, ...options.config }
    
    try {
      const user = await getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get all potentially conflicting events and tasks
      const conflicts = await this.findConflicts(
        user.id,
        proposedStart,
        proposedEnd,
        config,
        options.excludeEventId
      )

      // Analyze conflict severity
      const severity = this.calculateSeverity(conflicts)
      const canProceed = severity !== 'critical'

      // Generate recommendations
      const recommendations = this.generateRecommendations(conflicts, config)

      // Find alternatives if requested and conflicts exist
      let alternatives: AvailabilityWindow[] = []
      if (options.includeAlternatives && conflicts.length > 0) {
        alternatives = await this.findAlternativeTimeSlots(
          proposedStart,
          proposedEnd,
          config,
          options.excludeEventId
        )
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        severity,
        canProceed,
        alternatives,
        recommendations
      }
    } catch (error) {
      console.error('Conflict detection failed:', error)
      // Return safe fallback
      return {
        hasConflicts: false,
        conflicts: [],
        severity: 'none',
        canProceed: true,
        recommendations: ['Conflict detection temporarily unavailable']
      }
    }
  }

  /**
   * Find all conflicts for a proposed time slot
   */
  private static async findConflicts(
    userId: string,
    proposedStart: Date,
    proposedEnd: Date,
    config: ConflictDetectorConfig,
    excludeEventId?: string
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = []
    const supabase = await createClient()

    // Extend search range to include buffer and travel time
    const bufferMs = config.bufferTimeMinutes * 60 * 1000
    const travelMs = config.travelTimeMinutes * 60 * 1000
    const searchStart = new Date(proposedStart.getTime() - Math.max(bufferMs, travelMs))
    const searchEnd = new Date(proposedEnd.getTime() + Math.max(bufferMs, travelMs))

    // Get conflicting events
    const { data: events } = await supabase
      .from('events')
      .select(`
        id, title, start_time, end_time, location, status,
        calendars (name, provider)
      `)
      .eq('user_id', userId)
      .gte('start_time', searchStart.toISOString())
      .lte('end_time', searchEnd.toISOString())
      .neq('status', 'cancelled')
      .neq('id', excludeEventId || '')

    // Check event conflicts
    for (const event of events || []) {
      const eventStart = new Date(event.start_time)
      const eventEnd = new Date(event.end_time)

      const conflict = this.analyzeEventConflict(
        proposedStart,
        proposedEnd,
        eventStart,
        eventEnd,
        event,
        config
      )

      if (conflict) {
        conflicts.push(conflict)
      }
    }

    // Get conflicting tasks if enabled
    if (config.includeTaskConflicts) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, scheduled_start, scheduled_end, due_date, status, priority')
        .eq('user_id', userId)
        .or(`scheduled_start.gte.${searchStart.toISOString()},scheduled_end.lte.${searchEnd.toISOString()},due_date.gte.${searchStart.toISOString().split('T')[0]}`)
        .neq('status', 'completed')
        .neq('id', excludeEventId || '')

      // Check task conflicts
      for (const task of tasks || []) {
        const taskConflict = this.analyzeTaskConflict(
          proposedStart,
          proposedEnd,
          task,
          config
        )

        if (taskConflict) {
          conflicts.push(taskConflict)
        }
      }
    }

    return conflicts
  }

  /**
   * Analyze conflict between proposed time and existing event
   */
  private static analyzeEventConflict(
    proposedStart: Date,
    proposedEnd: Date,
    eventStart: Date,
    eventEnd: Date,
    event: any,
    config: ConflictDetectorConfig
  ): ConflictInfo | null {
    // Direct overlap
    if (proposedStart < eventEnd && proposedEnd > eventStart) {
      const overlapStart = new Date(Math.max(proposedStart.getTime(), eventStart.getTime()))
      const overlapEnd = new Date(Math.min(proposedEnd.getTime(), eventEnd.getTime()))
      const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)

      return {
        type: 'direct',
        severity: 'critical',
        description: `Direct time conflict with "${event.title}"`,
        suggestedAction: 'Choose a different time',
        conflictingEvent: {
          id: event.id,
          title: event.title,
          start: eventStart,
          end: eventEnd,
          type: 'event',
          calendar: event.calendars?.name
        },
        timeOverlap: {
          start: overlapStart,
          end: overlapEnd,
          durationMinutes: overlapMinutes
        }
      }
    }

    // Buffer time conflicts
    const bufferMs = config.bufferTimeMinutes * 60 * 1000
    const proposedBufferStart = new Date(proposedStart.getTime() - bufferMs)
    const proposedBufferEnd = new Date(proposedEnd.getTime() + bufferMs)
    const eventBufferStart = new Date(eventStart.getTime() - bufferMs)
    const eventBufferEnd = new Date(eventEnd.getTime() + bufferMs)

    if (proposedBufferStart < eventBufferEnd && proposedBufferEnd > eventBufferStart) {
      return {
        type: 'buffer',
        severity: 'medium',
        description: `Insufficient buffer time with "${event.title}"`,
        suggestedAction: `Add ${config.bufferTimeMinutes} minutes buffer`,
        conflictingEvent: {
          id: event.id,
          title: event.title,
          start: eventStart,
          end: eventEnd,
          type: 'event',
          calendar: event.calendars?.name
        }
      }
    }

    // Travel time conflicts (if both events have locations)
    if (config.includeTravelTime && event.location) {
      const travelMs = config.travelTimeMinutes * 60 * 1000
      
      // Check if events are too close considering travel time
      if (Math.abs(proposedStart.getTime() - eventEnd.getTime()) < travelMs ||
          Math.abs(eventStart.getTime() - proposedEnd.getTime()) < travelMs) {
        return {
          type: 'travel',
          severity: 'medium',
          description: `Insufficient travel time to/from "${event.title}"`,
          suggestedAction: `Allow ${config.travelTimeMinutes} minutes for travel`,
          conflictingEvent: {
            id: event.id,
            title: event.title,
            start: eventStart,
            end: eventEnd,
            type: 'event',
            calendar: event.calendars?.name
          }
        }
      }
    }

    return null
  }

  /**
   * Analyze conflict between proposed time and task
   */
  private static analyzeTaskConflict(
    proposedStart: Date,
    proposedEnd: Date,
    task: any,
    config: ConflictDetectorConfig
  ): ConflictInfo | null {
    let taskStart: Date | null = null
    let taskEnd: Date | null = null

    // Handle scheduled tasks
    if (task.scheduled_start && task.scheduled_end) {
      taskStart = new Date(task.scheduled_start)
      taskEnd = new Date(task.scheduled_end)
    } else if (task.due_date) {
      // For due date tasks, assume they need time before the due date
      const dueDate = new Date(task.due_date)
      taskEnd = dueDate
      taskStart = new Date(dueDate.getTime() - 60 * 60 * 1000) // Assume 1 hour duration
    }

    if (taskStart && taskEnd) {
      // Check for direct overlap
      if (proposedStart < taskEnd && proposedEnd > taskStart) {
        const severity = task.priority === 'high' ? 'high' : 'medium'
        
        return {
          type: 'overlap',
          severity,
          description: `Overlaps with task "${task.title}"`,
          suggestedAction: 'Reschedule task or choose different time',
          conflictingEvent: {
            id: task.id,
            title: task.title,
            start: taskStart,
            end: taskEnd,
            type: 'task'
          }
        }
      }
    }

    return null
  }

  /**
   * Calculate overall severity from all conflicts
   */
  private static calculateSeverity(conflicts: ConflictInfo[]): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (conflicts.length === 0) return 'none'

    const severityScores = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    }

    const maxSeverity = Math.max(...conflicts.map(c => severityScores[c.severity]))
    
    if (maxSeverity >= 4) return 'critical'
    if (maxSeverity >= 3) return 'high'
    if (maxSeverity >= 2) return 'medium'
    return 'low'
  }

  /**
   * Generate recommendations based on conflicts
   */
  private static generateRecommendations(conflicts: ConflictInfo[], config: ConflictDetectorConfig): string[] {
    const recommendations: string[] = []

    const directConflicts = conflicts.filter(c => c.type === 'direct')
    const bufferConflicts = conflicts.filter(c => c.type === 'buffer')
    const travelConflicts = conflicts.filter(c => c.type === 'travel')

    if (directConflicts.length > 0) {
      recommendations.push('Choose a completely different time slot - direct conflicts detected')
    }

    if (bufferConflicts.length > 0) {
      recommendations.push(`Add ${config.bufferTimeMinutes} minutes buffer between meetings`)
    }

    if (travelConflicts.length > 0) {
      recommendations.push(`Allow ${config.travelTimeMinutes} minutes for travel time`)
    }

    const taskConflicts = conflicts.filter(c => c.conflictingEvent.type === 'task')
    if (taskConflicts.length > 0) {
      recommendations.push('Consider rescheduling conflicting tasks')
    }

    if (recommendations.length === 0) {
      recommendations.push('No conflicts detected - time slot looks good!')
    }

    return recommendations
  }

  /**
   * Find alternative time slots
   */
  private static async findAlternativeTimeSlots(
    originalStart: Date,
    originalEnd: Date,
    config: ConflictDetectorConfig,
    excludeEventId?: string
  ): Promise<AvailabilityWindow[]> {
    const duration = originalEnd.getTime() - originalStart.getTime()
    const alternatives: AvailabilityWindow[] = []
    const user = await getCurrentUser()
    
    if (!user) return alternatives

    // Search for alternatives within the next few days
    const searchStart = new Date(originalStart)
    searchStart.setHours(0, 0, 0, 0)
    
    for (let dayOffset = 0; dayOffset < config.lookAheadDays && alternatives.length < config.maxAlternatives; dayOffset++) {
      const currentDay = new Date(searchStart.getTime() + dayOffset * 24 * 60 * 60 * 1000)
      const dayOfWeek = currentDay.getDay()
      
      // Skip non-working days
      if (!config.workingDays.includes(dayOfWeek)) {
        continue
      }

      // Find available slots in this day
      const dayAlternatives = await this.findDayAlternatives(
        currentDay,
        duration,
        config,
        excludeEventId
      )

      alternatives.push(...dayAlternatives)
    }

    return alternatives
      .sort((a, b) => this.scoreAvailabilityWindow(b) - this.scoreAvailabilityWindow(a))
      .slice(0, config.maxAlternatives)
  }

  /**
   * Find alternatives for a specific day
   */
  private static async findDayAlternatives(
    day: Date,
    duration: number,
    config: ConflictDetectorConfig,
    excludeEventId?: string
  ): Promise<AvailabilityWindow[]> {
    const alternatives: AvailabilityWindow[] = []
    const user = await getCurrentUser()
    
    if (!user) return alternatives

    // Set up working hours for the day
    const [startHour, startMinute] = config.workingHours.start.split(':').map(Number)
    const [endHour, endMinute] = config.workingHours.end.split(':').map(Number)
    
    const dayStart = new Date(day)
    dayStart.setHours(startHour, startMinute, 0, 0)
    
    const dayEnd = new Date(day)
    dayEnd.setHours(endHour, endMinute, 0, 0)

    // Get existing events for this day
    const supabase = await createClient()
    const { data: existingEvents } = await supabase
      .from('events')
      .select('start_time, end_time, title')
      .eq('user_id', user.id)
      .gte('start_time', dayStart.toISOString())
      .lte('end_time', dayEnd.toISOString())
      .neq('status', 'cancelled')
      .neq('id', excludeEventId || '')
      .order('start_time')

    // Create time slots and check availability
    const slotDuration = 30 * 60 * 1000 // 30-minute slots
    let currentSlot = new Date(dayStart)

    while (currentSlot.getTime() + duration <= dayEnd.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + duration)
      
      // Check if this slot conflicts with existing events
      const hasConflict = (existingEvents || []).some(event => {
        const eventStart = new Date(event.start_time)
        const eventEnd = new Date(event.end_time)
        return currentSlot < eventEnd && slotEnd > eventStart
      })

      if (!hasConflict) {
        const window: AvailabilityWindow = {
          start: new Date(currentSlot),
          end: new Date(slotEnd),
          durationMinutes: duration / (1000 * 60),
          quality: this.assessTimeQuality(currentSlot, config),
          reasoning: this.getTimeQualityReasoning(currentSlot, config),
          conflicts: []
        }

        alternatives.push(window)
      }

      currentSlot.setTime(currentSlot.getTime() + slotDuration)
    }

    return alternatives
  }

  /**
   * Assess the quality of a time slot
   */
  private static assessTimeQuality(time: Date, config: ConflictDetectorConfig): 'optimal' | 'good' | 'acceptable' | 'poor' {
    const hour = time.getHours()
    const dayOfWeek = time.getDay()

    // Optimal: Mid-morning (9-11 AM) on Tuesday-Thursday
    if (hour >= 9 && hour <= 11 && [2, 3, 4].includes(dayOfWeek)) {
      return 'optimal'
    }

    // Good: Morning or early afternoon on weekdays
    if ((hour >= 9 && hour <= 12) || (hour >= 13 && hour <= 15)) {
      if ([1, 2, 3, 4, 5].includes(dayOfWeek)) {
        return 'good'
      }
    }

    // Acceptable: Other working hours
    if (hour >= 8 && hour <= 17 && [1, 2, 3, 4, 5].includes(dayOfWeek)) {
      return 'acceptable'
    }

    return 'poor'
  }

  /**
   * Get reasoning for time quality assessment
   */
  private static getTimeQualityReasoning(time: Date, config: ConflictDetectorConfig): string[] {
    const reasoning: string[] = []
    const hour = time.getHours()
    const dayOfWeek = time.getDay()

    if (hour >= 9 && hour <= 11) {
      reasoning.push('optimal morning time')
    } else if (hour >= 13 && hour <= 15) {
      reasoning.push('good afternoon time')
    } else if (hour < 9) {
      reasoning.push('early morning')
    } else if (hour > 16) {
      reasoning.push('late afternoon')
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    reasoning.push(`${dayNames[dayOfWeek]} scheduling`)

    return reasoning
  }

  /**
   * Score availability window for sorting
   */
  private static scoreAvailabilityWindow(window: AvailabilityWindow): number {
    const qualityScores = {
      'optimal': 4,
      'good': 3,
      'acceptable': 2,
      'poor': 1
    }

    return qualityScores[window.quality] - window.conflicts.length * 0.5
  }
}