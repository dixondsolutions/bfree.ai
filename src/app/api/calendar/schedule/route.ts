import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  findOptimalMeetingTimes, 
  autoScheduleMeeting, 
  detectConflicts,
  MeetingRequest 
} from '@/lib/calendar/scheduling-engine'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { scheduleActionSchema, validateRequestBody } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const body = await request.json()
      const validatedData = validateRequestBody(scheduleActionSchema, body)
      const { action, ...requestData } = validatedData

    switch (action) {
      case 'suggest': {
        if (!validatedData.title) {
          return NextResponse.json({ error: 'Title is required for suggestions' }, { status: 400 })
        }
        
        // Find optimal meeting times
        const meetingRequest: MeetingRequest = {
          title: validatedData.title,
          description: validatedData.description,
          duration: validatedData.duration ?? 30,
          attendees: validatedData.attendees,
          preferredTimes: validatedData.preferredTimes?.map((time: string) => new Date(time)),
          deadline: validatedData.deadline ? new Date(validatedData.deadline) : undefined,
          priority: validatedData.priority ?? 'medium',
          location: validatedData.location,
          isRecurring: validatedData.isRecurring ?? false,
          requiresPrep: validatedData.requiresPrep ?? false,
          prepTime: validatedData.prepTime ?? 0
        }

        const suggestions = await findOptimalMeetingTimes(
          meetingRequest, 
          validatedData.searchDays ?? 14
        )

        return NextResponse.json({
          success: true,
          suggestions,
          count: suggestions.length
        })
      }

      case 'auto-schedule': {
        if (!validatedData.title) {
          return NextResponse.json({ error: 'Title is required for auto-scheduling' }, { status: 400 })
        }
        
        // Automatically schedule the best time
        const meetingRequest: MeetingRequest = {
          title: validatedData.title,
          description: validatedData.description,
          duration: validatedData.duration ?? 30,
          attendees: validatedData.attendees,
          preferredTimes: validatedData.preferredTimes?.map((time: string) => new Date(time)),
          deadline: validatedData.deadline ? new Date(validatedData.deadline) : undefined,
          priority: validatedData.priority ?? 'medium',
          location: validatedData.location,
          isRecurring: validatedData.isRecurring ?? false,
          requiresPrep: validatedData.requiresPrep ?? false,
          prepTime: validatedData.prepTime ?? 0
        }

        const result = await autoScheduleMeeting(meetingRequest)

        return NextResponse.json(result)
      }

      case 'check-conflicts': {
        if (!validatedData.start || !validatedData.end) {
          return NextResponse.json({ error: 'Start and end times are required for conflict checking' }, { status: 400 })
        }
        
        // Check for conflicts at a specific time
        const proposedStart = new Date(validatedData.start)
        const proposedEnd = new Date(validatedData.end)
        
        const conflicts = await detectConflicts(
          proposedStart, 
          proposedEnd, 
          validatedData.excludeEventId
        )

        return NextResponse.json({
          success: true,
          ...conflicts
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: suggest, auto-schedule, or check-conflicts' },
          { status: 400 }
        )
    }
    } catch (error) {
      console.error('Error in scheduling API:', error)
      
      if (error instanceof Error && error.message.startsWith('Validation error:')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to process scheduling request' },
        { status: 500 }
      )
    }
  })
}