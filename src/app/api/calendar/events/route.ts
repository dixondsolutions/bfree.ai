import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/calendar/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const calendarId = searchParams.get('calendarId')

    let query = supabase
      .from('events')
      .select(`
        *,
        calendars (name, provider_calendar_id)
      `)
      .eq('user_id', user.id)
      .order('start_time')

    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('end_time', endDate)
    }
    if (calendarId) {
      query = query.eq('calendar_id', calendarId)
    }

    const { data: events, error: eventsError } = await query

    if (eventsError) {
      throw eventsError
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      count: events?.length || 0
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
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