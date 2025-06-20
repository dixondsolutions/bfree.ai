import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncCalendarsToDatabase, syncEventsToDatabase } from '@/lib/calendar/google-calendar'
import { CalendarSyncService } from '@/lib/calendar/sync-service'
import { CalendarErrorHandler } from '@/lib/calendar/calendar-error-handler'
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  withAsyncTiming
} from '@/lib/api/response-utils'

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
  const { result, processingTime } = await withAsyncTiming(async () => {
    return await CalendarErrorHandler.executeWithRetry(
      async () => {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          return unauthorizedResponse()
        }

        const requestBody = await request.json().catch(() => ({}))
        const { 
          type = 'full', 
          calendarId,
          forceFullSync = false,
          syncDirection = 'bidirectional'
        } = requestBody

        // Use the enhanced sync service
        const syncResult = await CalendarSyncService.syncCalendars({
          calendarId,
          forceFullSync,
          syncDirection
        })

        if (!syncResult.success && syncResult.errors.length > 0) {
          return internalErrorResponse(
            'Calendar sync completed with errors',
            syncResult.errors.join('; ')
          )
        }

        return successResponse(
          {
            ...syncResult,
            timestamp: new Date().toISOString()
          },
          `Calendar sync completed successfully. Processed ${syncResult.calendarsProcessed} calendars and ${syncResult.eventsProcessed} events.`,
          undefined,
          200,
          processingTime
        )
      },
      'calendar_sync',
      {}
    )
  })

  return result
}