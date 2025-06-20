/**
 * Calendar Sync Service
 * Enhanced bidirectional synchronization between Google Calendar and database
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { CalendarErrorHandler } from './calendar-error-handler'
import { fetchUserCalendars, fetchCalendarEvents, createCalendarEvent } from './google-calendar'

export interface SyncResult {
  success: boolean
  calendarsProcessed: number
  eventsProcessed: number
  errors: string[]
  lastSyncTime: string
  stats: {
    created: number
    updated: number
    deleted: number
    skipped: number
  }
}

export interface SyncOptions {
  calendarId?: string
  forceFullSync?: boolean
  syncDirection?: 'bidirectional' | 'from_google' | 'to_google'
  daysBack?: number
  daysAhead?: number
  batchSize?: number
}

export class CalendarSyncService {
  private static readonly DEFAULT_OPTIONS: Required<SyncOptions> = {
    calendarId: '',
    forceFullSync: false,
    syncDirection: 'bidirectional',
    daysBack: 7,
    daysAhead: 60,
    batchSize: 50
  }

  /**
   * Main sync orchestrator
   */
  static async syncCalendars(options: SyncOptions = {}): Promise<SyncResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }
    const result: SyncResult = {
      success: false,
      calendarsProcessed: 0,
      eventsProcessed: 0,
      errors: [],
      lastSyncTime: new Date().toISOString(),
      stats: { created: 0, updated: 0, deleted: 0, skipped: 0 }
    }

    try {
      const user = await getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      console.log(`Starting calendar sync for user ${user.id}`)

      // Step 1: Sync calendar list from Google
      if (opts.syncDirection === 'bidirectional' || opts.syncDirection === 'from_google') {
        await this.syncCalendarList(user.id, result)
      }

      // Step 2: Sync events
      await this.syncEvents(user.id, opts, result)

      // Step 3: Clean up orphaned events if full sync
      if (opts.forceFullSync) {
        await this.cleanupOrphanedEvents(user.id, opts, result)
      }

      result.success = result.errors.length === 0
      console.log(`Calendar sync completed:`, result.stats)

      return result
    } catch (error) {
      console.error('Calendar sync failed:', error)
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error')
      return result
    }
  }

  /**
   * Sync calendar list from Google to database
   */
  private static async syncCalendarList(userId: string, result: SyncResult): Promise<void> {
    try {
      const googleCalendars = await fetchUserCalendars()
      const supabase = await createClient()

      for (const gcal of googleCalendars) {
        try {
          const { error } = await supabase
            .from('calendars')
            .upsert({
              user_id: userId,
              name: gcal.name,
              provider: 'google',
              provider_calendar_id: gcal.id,
              is_primary: gcal.primary,
              sync_enabled: gcal.selected !== false, // Default to enabled
              settings: {
                backgroundColor: gcal.backgroundColor,
                foregroundColor: gcal.foregroundColor,
                timeZone: gcal.timeZone,
                accessRole: gcal.accessRole
              },
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,provider_calendar_id,provider'
            })

          if (error) {
            result.errors.push(`Failed to sync calendar ${gcal.name}: ${error.message}`)
          } else {
            result.calendarsProcessed++
          }
        } catch (calError) {
          result.errors.push(`Calendar sync error for ${gcal.name}: ${calError}`)
        }
      }
    } catch (error) {
      result.errors.push(`Failed to fetch calendars from Google: ${error}`)
    }
  }

  /**
   * Sync events between Google Calendar and database
   */
  private static async syncEvents(userId: string, options: Required<SyncOptions>, result: SyncResult): Promise<void> {
    const supabase = await createClient()

    // Get user's calendars that have sync enabled
    const { data: calendars, error: calError } = await supabase
      .from('calendars')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_enabled', true)

    if (calError) {
      result.errors.push(`Failed to fetch user calendars: ${calError.message}`)
      return
    }

    if (!calendars?.length) {
      console.log('No calendars enabled for sync')
      return
    }

    const calendarsToSync = options.calendarId 
      ? calendars.filter(cal => cal.provider_calendar_id === options.calendarId)
      : calendars

    // Calculate sync time range
    const now = new Date()
    const timeMin = new Date(now.getTime() - options.daysBack * 24 * 60 * 60 * 1000).toISOString()
    const timeMax = new Date(now.getTime() + options.daysAhead * 24 * 60 * 60 * 1000).toISOString()

    for (const calendar of calendarsToSync) {
      try {
        await this.syncCalendarEvents(calendar, timeMin, timeMax, options, result)
      } catch (error) {
        result.errors.push(`Failed to sync events for calendar ${calendar.name}: ${error}`)
      }
    }
  }

  /**
   * Sync events for a specific calendar
   */
  private static async syncCalendarEvents(
    calendar: any,
    timeMin: string,
    timeMax: string,
    options: Required<SyncOptions>,
    result: SyncResult
  ): Promise<void> {
    const supabase = await createClient()

    // Fetch events from Google Calendar
    const googleEvents = await fetchCalendarEvents(
      calendar.provider_calendar_id,
      timeMin,
      timeMax,
      options.batchSize * 5 // Fetch more than batch size to handle deletions
    )

    // Get existing events from database for this calendar and time range
    const { data: dbEvents, error: dbError } = await supabase
      .from('events')
      .select('*')
      .eq('calendar_id', calendar.id)
      .gte('start_time', timeMin)
      .lte('end_time', timeMax)

    if (dbError) {
      result.errors.push(`Failed to fetch database events: ${dbError.message}`)
      return
    }

    // Create lookup maps
    const googleEventMap = new Map(googleEvents.map(e => [e.id, e]))
    const dbEventMap = new Map((dbEvents || []).map(e => [e.google_event_id || e.id, e]))

    // Process Google events
    for (const gEvent of googleEvents) {
      try {
        const dbEvent = dbEventMap.get(gEvent.id)
        
        if (!dbEvent) {
          // Create new event in database
          await this.createEventInDatabase(calendar, gEvent, supabase)
          result.stats.created++
        } else {
          // Update existing event if needed
          const needsUpdate = this.shouldUpdateEvent(dbEvent, gEvent)
          if (needsUpdate) {
            await this.updateEventInDatabase(dbEvent.id, gEvent, supabase)
            result.stats.updated++
          } else {
            result.stats.skipped++
          }
        }
        result.eventsProcessed++
      } catch (error) {
        result.errors.push(`Failed to process event ${gEvent.summary}: ${error}`)
      }
    }

    // Handle deleted events (events in DB but not in Google)
    if (options.syncDirection === 'bidirectional' || options.syncDirection === 'from_google') {
      for (const [googleEventId, dbEvent] of dbEventMap) {
        if (!googleEventMap.has(googleEventId) && dbEvent.google_event_id) {
          try {
            await supabase
              .from('events')
              .delete()
              .eq('id', dbEvent.id)
            result.stats.deleted++
          } catch (error) {
            result.errors.push(`Failed to delete event ${dbEvent.title}: ${error}`)
          }
        }
      }
    }
  }

  /**
   * Create event in database from Google Calendar event
   */
  private static async createEventInDatabase(calendar: any, gEvent: any, supabase: any): Promise<void> {
    const eventData = {
      user_id: calendar.user_id,
      calendar_id: calendar.id,
      google_event_id: gEvent.id,
      title: gEvent.summary,
      description: gEvent.description,
      start_time: new Date(gEvent.start).toISOString(),
      end_time: new Date(gEvent.end).toISOString(),
      location: gEvent.location,
      attendees: gEvent.attendees || [],
      ai_generated: false,
      status: this.mapGoogleEventStatus(gEvent.status),
      google_data: {
        created: gEvent.created,
        updated: gEvent.updated,
        htmlLink: gEvent.htmlLink,
        organizer: gEvent.organizer,
        transparency: gEvent.transparency
      }
    }

    const { error } = await supabase
      .from('events')
      .insert(eventData)

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`)
    }
  }

  /**
   * Update event in database
   */
  private static async updateEventInDatabase(eventId: string, gEvent: any, supabase: any): Promise<void> {
    const updateData = {
      title: gEvent.summary,
      description: gEvent.description,
      start_time: new Date(gEvent.start).toISOString(),
      end_time: new Date(gEvent.end).toISOString(),
      location: gEvent.location,
      attendees: gEvent.attendees || [],
      status: this.mapGoogleEventStatus(gEvent.status),
      google_data: {
        created: gEvent.created,
        updated: gEvent.updated,
        htmlLink: gEvent.htmlLink,
        organizer: gEvent.organizer,
        transparency: gEvent.transparency
      },
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)

    if (error) {
      throw new Error(`Database update failed: ${error.message}`)
    }
  }

  /**
   * Check if database event needs updating based on Google event
   */
  private static shouldUpdateEvent(dbEvent: any, gEvent: any): boolean {
    // Compare key fields to determine if update is needed
    const dbUpdated = new Date(dbEvent.updated_at || dbEvent.created_at)
    const googleUpdated = new Date(gEvent.updated)
    
    // If Google event is newer, or if key fields differ
    return googleUpdated > dbUpdated ||
           dbEvent.title !== gEvent.summary ||
           dbEvent.description !== gEvent.description ||
           new Date(dbEvent.start_time).getTime() !== new Date(gEvent.start).getTime() ||
           new Date(dbEvent.end_time).getTime() !== new Date(gEvent.end).getTime() ||
           dbEvent.location !== gEvent.location
  }

  /**
   * Map Google Calendar event status to our system
   */
  private static mapGoogleEventStatus(googleStatus: string): string {
    switch (googleStatus?.toLowerCase()) {
      case 'confirmed': return 'confirmed'
      case 'tentative': return 'pending'
      case 'cancelled': return 'cancelled'
      default: return 'pending'
    }
  }

  /**
   * Clean up orphaned events (events in DB without corresponding Google events)
   */
  private static async cleanupOrphanedEvents(
    userId: string, 
    options: Required<SyncOptions>, 
    result: SyncResult
  ): Promise<void> {
    const supabase = await createClient()

    // Get events that haven't been synced recently
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours ago

    const { data: orphanedEvents, error } = await supabase
      .from('events')
      .select('id, title, google_event_id')
      .eq('user_id', userId)
      .lt('updated_at', cutoffTime)
      .not('google_event_id', 'is', null)

    if (error) {
      result.errors.push(`Failed to fetch orphaned events: ${error.message}`)
      return
    }

    if (orphanedEvents?.length) {
      console.log(`Found ${orphanedEvents.length} potentially orphaned events`)
      
      // For safety, just mark these as needing review rather than auto-deleting
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          status: 'review_needed',
          notes: 'Event may have been deleted from Google Calendar' 
        })
        .in('id', orphanedEvents.map(e => e.id))

      if (updateError) {
        result.errors.push(`Failed to mark orphaned events: ${updateError.message}`)
      } else {
        result.stats.updated += orphanedEvents.length
      }
    }
  }

  /**
   * Get sync status and metrics
   */
  static async getSyncStatus(userId: string): Promise<{
    lastSync: string | null
    totalCalendars: number
    enabledCalendars: number
    totalEvents: number
    recentEvents: number
    pendingActions: number
  }> {
    const supabase = await createClient()

    const [
      { data: calendars },
      { data: events },
      { data: recentEvents },
      { data: pendingEvents }
    ] = await Promise.all([
      supabase.from('calendars').select('*').eq('user_id', userId),
      supabase.from('events').select('id').eq('user_id', userId),
      supabase.from('events').select('id').eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('events').select('id').eq('user_id', userId)
        .in('status', ['pending', 'review_needed'])
    ])

    // Get last sync time from the most recent event
    const { data: lastSyncData } = await supabase
      .from('events')
      .select('updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)

    return {
      lastSync: lastSyncData?.[0]?.updated_at || null,
      totalCalendars: calendars?.length || 0,
      enabledCalendars: calendars?.filter(c => c.sync_enabled).length || 0,
      totalEvents: events?.length || 0,
      recentEvents: recentEvents?.length || 0,
      pendingActions: pendingEvents?.length || 0
    }
  }

  /**
   * Sync a single event to Google Calendar
   */
  static async syncEventToGoogle(eventId: string): Promise<{ success: boolean; googleEventId?: string; error?: string }> {
    try {
      const supabase = await createClient()
      const user = await getCurrentUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get the event and its calendar
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          calendars (
            provider_calendar_id,
            provider
          )
        `)
        .eq('id', eventId)
        .eq('user_id', user.id)
        .single()

      if (eventError || !event) {
        throw new Error('Event not found')
      }

      const calendar = event.calendars
      if (!calendar || calendar.provider !== 'google') {
        throw new Error('Calendar not configured for Google sync')
      }

      // Create event in Google Calendar
      const googleEvent = await createCalendarEvent(calendar.provider_calendar_id, {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start_time,
          timeZone: 'UTC'
        },
        end: {
          dateTime: event.end_time,
          timeZone: 'UTC'
        },
        location: event.location,
        attendees: event.attendees?.map((email: string) => ({ email }))
      })

      // Update the event with Google Calendar ID
      await supabase
        .from('events')
        .update({
          google_event_id: googleEvent.id,
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)

      return { success: true, googleEventId: googleEvent.id }
    } catch (error) {
      console.error('Failed to sync event to Google:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}