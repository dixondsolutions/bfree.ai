import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncCalendarsToDatabase, syncEventsToDatabase } from '@/lib/calendar/google-calendar'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sync status from database
    const { data: calendars } = await supabase
      .from('calendars')
      .select('*')
      .eq('user_id', user.id)

    const { data: lastSync } = await supabase
      .from('events')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({
      calendars: calendars?.length || 0,
      lastSync: lastSync?.[0]?.created_at || null,
      status: 'ready'
    })
  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
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

    const { type, calendarId } = await request.json()

    let result
    if (type === 'calendars') {
      // Sync calendar list
      result = await syncCalendarsToDatabase()
    } else if (type === 'events') {
      // Sync events from specific calendar or all calendars
      result = await syncEventsToDatabase(calendarId)
    } else {
      // Full sync - both calendars and events
      await syncCalendarsToDatabase()
      result = await syncEventsToDatabase()
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error syncing calendars:', error)
    return NextResponse.json(
      { error: 'Failed to sync calendars' },
      { status: 500 }
    )
  }
}