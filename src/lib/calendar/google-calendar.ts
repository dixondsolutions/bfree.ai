import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { CalendarErrorHandler } from './calendar-error-handler'

/**
 * Create an authenticated Google Calendar client
 */
export async function createCalendarClient(userEmailAccount?: any) {
  return await CalendarErrorHandler.executeWithRetry(
    async () => {
      if (!userEmailAccount) {
        const supabase = await createClient()
        const user = await getCurrentUser()
        
        if (!user) {
          throw new Error('User not authenticated')
        }

        const { data: emailAccounts, error } = await supabase
          .from('email_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'gmail')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error || !emailAccounts?.length) {
          throw new Error('No Gmail account connected')
        }

        userEmailAccount = emailAccounts[0]
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      )

      // Decrypt tokens before use
      const { decrypt } = await import('@/lib/utils/encryption')
      
      oauth2Client.setCredentials({
        access_token: decrypt(userEmailAccount.access_token),
        refresh_token: userEmailAccount.refresh_token ? decrypt(userEmailAccount.refresh_token) : null,
        expiry_date: userEmailAccount.expires_at ? new Date(userEmailAccount.expires_at).getTime() : undefined,
      })

      // Set up automatic token refresh
      oauth2Client.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
          try {
            // Encrypt and update tokens in database
            const { encrypt } = await import('@/lib/utils/encryption')
            const supabase = await createClient()
            
            await supabase
              .from('email_accounts')
              .update({
                access_token: encrypt(tokens.access_token!),
                refresh_token: encrypt(tokens.refresh_token),
                expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                updated_at: new Date().toISOString()
              })
              .eq('id', userEmailAccount.id)
          } catch (tokenError) {
            console.error('Failed to update calendar tokens:', tokenError)
          }
        }
      })

      return google.calendar({ version: 'v3', auth: oauth2Client })
    },
    'create_calendar_client',
    { userId: userEmailAccount?.user_id }
  )
}

/**
 * Calendar event types
 */
export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }>
  conferenceData?: {
    createRequest?: {
      requestId: string
      conferenceSolutionKey: {
        type: 'hangoutsMeet'
      }
    }
  }
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
  source?: {
    title: string
    url?: string
  }
}

/**
 * Fetch user's calendars from Google Calendar
 */
export async function fetchUserCalendars() {
  return await CalendarErrorHandler.executeWithRetry(
    async () => {
      const calendar = await createCalendarClient()
      const response = await calendar.calendarList.list()
      
      return response.data.items?.map(cal => ({
        id: cal.id!,
        name: cal.summary!,
        description: cal.description,
        primary: cal.primary || false,
        selected: cal.selected || false,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        timeZone: cal.timeZone
      })) || []
    },
    'fetch_user_calendars',
    {}
  ).catch((error) => {
    console.error('Error fetching user calendars:', error)
    // Return fallback response
    return CalendarErrorHandler.createFallbackResponse('fetch_calendars')
  })
}

/**
 * Sync user calendars to database
 */
export async function syncCalendarsToDatabase() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = await createClient()
  const googleCalendars = await fetchUserCalendars()

  for (const gcal of googleCalendars) {
    await supabase
      .from('calendars')
      .upsert({
        user_id: user.id,
        name: gcal.name,
        provider: 'google',
        provider_calendar_id: gcal.id,
        is_primary: gcal.primary,
        sync_enabled: gcal.selected
      }, {
        onConflict: 'user_id,provider_calendar_id,provider'
      })
  }

  return googleCalendars
}

/**
 * Fetch events from Google Calendar
 */
export async function fetchCalendarEvents(
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 250
) {
  return await CalendarErrorHandler.executeWithRetry(
    async () => {
      const calendar = await createCalendarClient()
      
      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      })

      return response.data.items?.map(event => ({
        id: event.id!,
        summary: event.summary || 'Untitled Event',
        description: event.description,
        start: event.start?.dateTime || event.start?.date!,
        end: event.end?.dateTime || event.end?.date!,
        location: event.location,
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email!,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus as any
        })),
        created: event.created,
        updated: event.updated,
        htmlLink: event.htmlLink,
        status: event.status,
        transparency: event.transparency,
        organizer: event.organizer
      })) || []
    },
    'fetch_calendar_events',
    { calendarId, timeMin, timeMax }
  ).catch((error) => {
    console.error('Error fetching calendar events:', error)
    // Return fallback response
    return CalendarErrorHandler.createFallbackResponse('fetch_events')
  })
}

/**
 * Create event in Google Calendar
 */
export async function createCalendarEvent(
  calendarId: string = 'primary',
  event: CalendarEvent
) {
  try {
    const calendar = await createCalendarClient()
    
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      conferenceDataVersion: event.conferenceData ? 1 : undefined
    })

    return response.data
  } catch (error) {
    console.error('Error creating calendar event:', error)
    throw error
  }
}

/**
 * Update event in Google Calendar
 */
export async function updateCalendarEvent(
  calendarId: string = 'primary',
  eventId: string,
  event: Partial<CalendarEvent>
) {
  try {
    const calendar = await createCalendarClient()
    
    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: event
    })

    return response.data
  } catch (error) {
    console.error('Error updating calendar event:', error)
    throw error
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteCalendarEvent(
  calendarId: string = 'primary',
  eventId: string
) {
  try {
    const calendar = await createCalendarClient()
    
    await calendar.events.delete({
      calendarId,
      eventId
    })

    return true
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    throw error
  }
}

/**
 * Check for free/busy times
 */
export async function checkFreeBusy(
  calendarIds: string[],
  timeMin: string,
  timeMax: string
) {
  try {
    const calendar = await createCalendarClient()
    
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: calendarIds.map(id => ({ id }))
      }
    })

    return response.data
  } catch (error) {
    console.error('Error checking free/busy:', error)
    throw error
  }
}

/**
 * Sync events from Google Calendar to database
 */
export async function syncEventsToDatabase(calendarId?: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = await createClient()
  
  // Get user's calendars from database
  const { data: userCalendars } = await supabase
    .from('calendars')
    .select('*')
    .eq('user_id', user.id)
    .eq('sync_enabled', true)

  if (!userCalendars?.length) {
    throw new Error('No calendars configured for sync')
  }

  const calendarsToSync = calendarId 
    ? userCalendars.filter(cal => cal.provider_calendar_id === calendarId)
    : userCalendars

  let totalSynced = 0

  for (const cal of calendarsToSync) {
    try {
      const events = await fetchCalendarEvents(
        cal.provider_calendar_id,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()  // 60 days ahead
      )

      for (const event of events) {
        await supabase
          .from('events')
          .upsert({
            user_id: user.id,
            calendar_id: cal.id,
            title: event.summary,
            description: event.description,
            start_time: new Date(event.start).toISOString(),
            end_time: new Date(event.end).toISOString(),
            location: event.location,
            ai_generated: false,
            status: event.status === 'confirmed' ? 'confirmed' : 'pending'
          }, {
            onConflict: 'user_id,calendar_id,start_time,end_time,title'
          })
        
        totalSynced++
      }
    } catch (error) {
      console.error(`Error syncing calendar ${cal.name}:`, error)
    }
  }

  return { synced: totalSynced, calendars: calendarsToSync.length }
}