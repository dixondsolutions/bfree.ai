import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { checkFreeBusy } from './google-calendar'

/**
 * Time slot interface
 */
export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  calendar?: string
}

/**
 * Scheduling preferences
 */
export interface SchedulingPreferences {
  workingHours: {
    start: string // "09:00"
    end: string   // "17:00"
  }
  workingDays: number[] // [1,2,3,4,5] for Mon-Fri
  timeZone: string
  bufferTime: number // minutes between meetings
  preferredMeetingLength: number // default meeting length in minutes
  avoidBackToBack: boolean
  maxMeetingsPerDay: number
}

/**
 * Meeting request interface
 */
export interface MeetingRequest {
  title: string
  description?: string
  duration: number // minutes
  attendees?: string[]
  preferredTimes?: Date[]
  deadline?: Date
  priority: 'low' | 'medium' | 'high'
  location?: string
  isRecurring?: boolean
  requiresPrep?: boolean
  prepTime?: number // minutes
}

/**
 * Suggested time slot
 */
export interface SuggestedSlot {
  start: Date
  end: Date
  confidence: number // 0-1
  reasoning: string
  conflicts: string[]
  prepTime?: {
    start: Date
    end: Date
  }
}

/**
 * Get user's scheduling preferences
 */
export async function getUserSchedulingPreferences(): Promise<SchedulingPreferences> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = await createClient()
  
  // Get user profile and preferences
  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('user_preferences').select('*').eq('user_id', user.id)
  ])

  const prefs: SchedulingPreferences = {
    workingHours: {
      start: profile?.working_hours_start || '09:00',
      end: profile?.working_hours_end || '17:00'
    },
    workingDays: [1, 2, 3, 4, 5], // Mon-Fri default
    timeZone: profile?.timezone || 'UTC',
    bufferTime: 15, // 15 minutes default
    preferredMeetingLength: 30, // 30 minutes default
    avoidBackToBack: true,
    maxMeetingsPerDay: 8
  }

  // Override with user preferences
  preferences?.forEach(pref => {
    if (pref.preference_key === 'scheduling_preferences') {
      Object.assign(prefs, pref.preference_value)
    }
  })

  return prefs
}

/**
 * Get user's existing events for a time range
 */
export async function getUserEvents(startDate: Date, endDate: Date) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = await createClient()
  
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      calendars (name, provider_calendar_id)
    `)
    .eq('user_id', user.id)
    .gte('start_time', startDate.toISOString())
    .lte('end_time', endDate.toISOString())
    .order('start_time')

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`)
  }

  return events || []
}

/**
 * Generate available time slots
 */
export async function generateAvailableSlots(
  startDate: Date,
  endDate: Date,
  slotDuration: number = 30 // minutes
): Promise<TimeSlot[]> {
  const preferences = await getUserSchedulingPreferences()
  const existingEvents = await getUserEvents(startDate, endDate)
  
  const slots: TimeSlot[] = []
  const currentDate = new Date(startDate)

  while (currentDate < endDate) {
    const dayOfWeek = currentDate.getDay()
    
    // Check if it's a working day
    if (preferences.workingDays.includes(dayOfWeek)) {
      // Parse working hours
      const [startHour, startMinute] = preferences.workingHours.start.split(':').map(Number)
      const [endHour, endMinute] = preferences.workingHours.end.split(':').map(Number)
      
      const dayStart = new Date(currentDate)
      dayStart.setHours(startHour, startMinute, 0, 0)
      
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(endHour, endMinute, 0, 0)
      
      // Generate slots for this day
      const slotStart = new Date(dayStart)
      
      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000)
        
        if (slotEnd <= dayEnd) {
          // Check if this slot conflicts with existing events
          const hasConflict = existingEvents.some(event => {
            const eventStart = new Date(event.start_time)
            const eventEnd = new Date(event.end_time)
            
            return (slotStart < eventEnd && slotEnd > eventStart)
          })
          
          slots.push({
            start: new Date(slotStart),
            end: new Date(slotEnd),
            available: !hasConflict
          })
        }
        
        slotStart.setTime(slotStart.getTime() + slotDuration * 60000)
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
    currentDate.setHours(0, 0, 0, 0)
  }

  return slots
}

/**
 * Score a time slot for meeting scheduling
 */
function scoreTimeSlot(
  slot: TimeSlot,
  request: MeetingRequest,
  preferences: SchedulingPreferences,
  existingEvents: any[]
): number {
  let score = 1.0

  // Time of day preferences
  const hour = slot.start.getHours()
  
  // Prefer mid-morning and early afternoon
  if (hour >= 9 && hour <= 11) {
    score += 0.3 // Morning preference
  } else if (hour >= 13 && hour <= 15) {
    score += 0.2 // Early afternoon
  } else if (hour >= 16) {
    score -= 0.2 // Late afternoon penalty
  }

  // Buffer time considerations
  const bufferStart = new Date(slot.start.getTime() - preferences.bufferTime * 60000)
  const bufferEnd = new Date(slot.end.getTime() + preferences.bufferTime * 60000)
  
  const hasBufferConflict = existingEvents.some(event => {
    const eventStart = new Date(event.start_time)
    const eventEnd = new Date(event.end_time)
    
    return (bufferStart < eventEnd && bufferEnd > eventStart)
  })

  if (hasBufferConflict && preferences.avoidBackToBack) {
    score -= 0.4
  }

  // Day of week preferences
  const dayOfWeek = slot.start.getDay()
  if (dayOfWeek === 1 || dayOfWeek === 2) { // Monday/Tuesday
    score += 0.1
  } else if (dayOfWeek === 5) { // Friday
    score -= 0.1
  }

  // Priority adjustments
  if (request.priority === 'high') {
    score += 0.2
  } else if (request.priority === 'low') {
    score -= 0.1
  }

  // Preferred times bonus
  if (request.preferredTimes?.length) {
    const hasPreferredTime = request.preferredTimes.some(preferredTime => {
      const timeDiff = Math.abs(slot.start.getTime() - preferredTime.getTime())
      return timeDiff < 2 * 60 * 60 * 1000 // Within 2 hours
    })
    
    if (hasPreferredTime) {
      score += 0.5
    }
  }

  // Meeting length matching
  const slotDuration = (slot.end.getTime() - slot.start.getTime()) / 60000
  if (slotDuration === request.duration) {
    score += 0.2
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * Find optimal meeting times
 */
export async function findOptimalMeetingTimes(
  request: MeetingRequest,
  searchDays: number = 14
): Promise<SuggestedSlot[]> {
  const preferences = await getUserSchedulingPreferences()
  const startDate = new Date()
  const endDate = new Date(Date.now() + searchDays * 24 * 60 * 60 * 1000)
  
  // Get available slots
  const availableSlots = await generateAvailableSlots(startDate, endDate, request.duration)
  const existingEvents = await getUserEvents(startDate, endDate)
  
  // Filter only available slots
  const freeSlots = availableSlots.filter(slot => slot.available)
  
  // Score and sort slots
  const scoredSlots = freeSlots.map(slot => {
    const score = scoreTimeSlot(slot, request, preferences, existingEvents)
    
    return {
      start: slot.start,
      end: slot.end,
      confidence: score,
      reasoning: generateSlotReasoning(slot, request, preferences, score),
      conflicts: [] as string[],
      prepTime: request.requiresPrep && request.prepTime ? {
        start: new Date(slot.start.getTime() - request.prepTime * 60000),
        end: slot.start
      } : undefined
    }
  })

  // Sort by confidence score and return top suggestions
  return scoredSlots
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10) // Return top 10 suggestions
}

/**
 * Generate reasoning for slot suggestion
 */
function generateSlotReasoning(
  slot: TimeSlot,
  request: MeetingRequest,
  preferences: SchedulingPreferences,
  score: number
): string {
  const reasons: string[] = []
  const hour = slot.start.getHours()
  
  if (hour >= 9 && hour <= 11) {
    reasons.push('optimal morning time')
  } else if (hour >= 13 && hour <= 15) {
    reasons.push('good afternoon slot')
  }
  
  if (score > 0.8) {
    reasons.push('high availability')
  } else if (score > 0.6) {
    reasons.push('good availability')
  }
  
  if (request.priority === 'high') {
    reasons.push('priority meeting accommodation')
  }
  
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.start.getDay()]
  reasons.push(`${dayName} scheduling`)
  
  return reasons.join(', ')
}

/**
 * Detect scheduling conflicts
 */
export async function detectConflicts(
  proposedStart: Date,
  proposedEnd: Date,
  excludeEventId?: string
): Promise<{
  hasConflicts: boolean
  conflicts: Array<{
    eventId: string
    title: string
    start: Date
    end: Date
    type: 'direct' | 'buffer' | 'prep'
  }>
}> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const preferences = await getUserSchedulingPreferences()
  const supabase = await createClient()
  
  // Extend search range to include buffer time
  const searchStart = new Date(proposedStart.getTime() - preferences.bufferTime * 60000)
  const searchEnd = new Date(proposedEnd.getTime() + preferences.bufferTime * 60000)
  
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', searchStart.toISOString())
    .lte('end_time', searchEnd.toISOString())
    .neq('id', excludeEventId || '')

  const conflicts = []
  
  for (const event of events || []) {
    const eventStart = new Date(event.start_time)
    const eventEnd = new Date(event.end_time)
    
    // Direct conflict
    if (proposedStart < eventEnd && proposedEnd > eventStart) {
      conflicts.push({
        eventId: event.id,
        title: event.title,
        start: eventStart,
        end: eventEnd,
        type: 'direct' as const
      })
    }
    // Buffer conflict
    else if (preferences.avoidBackToBack) {
      const bufferStart = new Date(eventStart.getTime() - preferences.bufferTime * 60000)
      const bufferEnd = new Date(eventEnd.getTime() + preferences.bufferTime * 60000)
      
      if (proposedStart < bufferEnd && proposedEnd > bufferStart) {
        conflicts.push({
          eventId: event.id,
          title: event.title,
          start: eventStart,
          end: eventEnd,
          type: 'buffer' as const
        })
      }
    }
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  }
}

/**
 * Auto-schedule a meeting request
 */
export async function autoScheduleMeeting(request: MeetingRequest): Promise<{
  success: boolean
  suggestedSlot?: SuggestedSlot
  eventId?: string
  conflicts?: any[]
}> {
  try {
    const optimalTimes = await findOptimalMeetingTimes(request)
    
    if (optimalTimes.length === 0) {
      return { success: false }
    }
    
    const bestSlot = optimalTimes[0]
    
    // Check for final conflicts
    const conflictCheck = await detectConflicts(bestSlot.start, bestSlot.end)
    
    if (conflictCheck.hasConflicts) {
      return {
        success: false,
        suggestedSlot: bestSlot,
        conflicts: conflictCheck.conflicts
      }
    }
    
    // Create the event in database
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const supabase = await createClient()
    
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        title: request.title,
        description: request.description,
        start_time: bestSlot.start.toISOString(),
        end_time: bestSlot.end.toISOString(),
        location: request.location,
        ai_generated: true,
        confidence_score: bestSlot.confidence,
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return {
      success: true,
      suggestedSlot: bestSlot,
      eventId: event.id
    }
  } catch (error) {
    console.error('Error auto-scheduling meeting:', error)
    return { success: false }
  }
}