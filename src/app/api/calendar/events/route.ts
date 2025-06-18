import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/calendar/google-calendar'
import { getCurrentUser } from '@/lib/database/utils'
import { startOfDay, endOfDay } from 'date-fns'

// Cache control headers for better performance
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
}

/**
 * GET /api/calendar/events - Get calendar events and tasks for a date range
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')
    const includeCompleted = searchParams.get('include_completed') === 'true'
    
    if (!startDateParam) {
      return NextResponse.json({ error: 'start_date parameter is required' }, { status: 400 })
    }

    const startDate = startOfDay(new Date(startDateParam)).toISOString()
    const endDate = endDateParam 
      ? endOfDay(new Date(endDateParam)).toISOString()
      : endOfDay(new Date(startDateParam)).toISOString()

    // Fetch tasks for the date range
    let taskQuery = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)

    if (!includeCompleted) {
      taskQuery = taskQuery.neq('status', 'completed')
    }

    // Apply date filtering - get tasks with any date field in the range
    // Check if scheduled_start, scheduled_end, or due_date falls within our date range
    taskQuery = taskQuery.or(`and(scheduled_start.gte.${startDate},scheduled_start.lte.${endDate}),and(scheduled_end.gte.${startDate},scheduled_end.lte.${endDate}),and(due_date.gte.${startDate},due_date.lte.${endDate})`)
    
    taskQuery = taskQuery.order('created_at', { ascending: false })

    const { data: tasks, error: tasksError } = await taskQuery

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json({ 
        error: 'Failed to fetch tasks',
        details: tasksError.message,
        success: false
      }, { status: 500 })
    }

    // Fetch calendar events for the date range (if events table exists)
    let events = []
    try {
      const { data: calendarEvents, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', startDate)
        .lte('end_time', endDate)
        .order('start_time', { ascending: true })

      if (!eventsError) {
        events = calendarEvents || []
      }
    } catch (error) {
      // Events table might not exist yet - this is OK
      console.log('Events table not found or accessible')
    }

    // Transform tasks into calendar-compatible format
    const taskEvents = (tasks || []).map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      start: task.scheduled_start || task.due_date || task.created_at,
      end: task.scheduled_end || (task.scheduled_start 
        ? new Date(new Date(task.scheduled_start).getTime() + (task.estimated_duration || 60) * 60000).toISOString()
        : null),
      type: 'task',
      status: task.status,
      priority: task.priority,
      category: task.category,
      ai_generated: task.ai_generated,
      confidence_score: task.confidence_score,
      estimated_duration: task.estimated_duration,
      source: 'tasks'
    }))

    // Transform calendar events
    const calendarEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.start_time,
      end: event.end_time,
      type: 'event',
      location: event.location,
      attendees: event.attendees,
      source: 'calendar'
    }))

    // Combine and sort all events
    const allEvents = [...taskEvents, ...calendarEvents].sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    )

    // Group events by date for easier frontend handling
    const eventsByDate = allEvents.reduce((acc, event) => {
      const dateKey = new Date(event.start).toISOString().split('T')[0]
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(event)
      return acc
    }, {} as Record<string, any[]>)

    const response = NextResponse.json({
      success: true,
      events: allEvents,
      eventsByDate,
      summary: {
        totalEvents: allEvents.length,
        tasks: taskEvents.length,
        calendarEvents: calendarEvents.length,
        dateRange: { start: startDate, end: endDate }
      }
    })

    // Add cache headers for better performance
    Object.entries(CACHE_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response

  } catch (error) {
    console.error('Error in GET /api/calendar/events:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventData = await request.json()

    // Create event in Google Calendar
    const googleEvent = await createCalendarEvent(eventData.calendarId || 'primary', {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: new Date(eventData.start_time).toISOString(),
        timeZone: eventData.timeZone || 'UTC'
      },
      end: {
        dateTime: new Date(eventData.end_time).toISOString(),
        timeZone: eventData.timeZone || 'UTC'
      },
      location: eventData.location,
      attendees: eventData.attendees?.map((email: string) => ({ email }))
    })

    // Save to database
    const { data: dbEvent, error: dbError } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        calendar_id: eventData.calendar_id,
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        location: eventData.location,
        ai_generated: eventData.ai_generated || false,
        confidence_score: eventData.confidence_score,
        status: 'confirmed'
      })
      .select()
      .single()

    if (dbError) {
      throw dbError
    }

    return NextResponse.json({
      success: true,
      event: dbEvent,
      googleEventId: googleEvent.id
    })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    const eventData = await request.json()

    // Update in database
    const { data: dbEvent, error: dbError } = await supabase
      .from('events')
      .update({
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        location: eventData.location,
        status: eventData.status
      })
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (dbError) {
      throw dbError
    }

    // Update in Google Calendar if needed
    if (eventData.updateGoogle && eventData.googleEventId) {
      await updateCalendarEvent(eventData.calendarId || 'primary', eventData.googleEventId, {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: new Date(eventData.start_time).toISOString(),
          timeZone: eventData.timeZone || 'UTC'
        },
        end: {
          dateTime: new Date(eventData.end_time).toISOString(),
          timeZone: eventData.timeZone || 'UTC'
        },
        location: eventData.location
      })
    }

    return NextResponse.json({
      success: true,
      event: dbEvent
    })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')
    const googleEventId = searchParams.get('googleEventId')
    const calendarId = searchParams.get('calendarId')
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    // Delete from Google Calendar if specified
    if (googleEventId && calendarId) {
      await deleteCalendarEvent(calendarId, googleEventId)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)

    if (dbError) {
      throw dbError
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}