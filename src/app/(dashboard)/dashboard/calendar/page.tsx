import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { CalendarSync } from '@/components/calendar/CalendarSync'
import { SchedulingAssistant } from '@/components/calendar/SchedulingAssistant'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { getUserEmailAccounts, getUserCalendars } from '@/lib/database/utils'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Get user data
  const [emailAccounts, calendars] = await Promise.all([
    getUserEmailAccounts(),
    getUserCalendars()
  ])

  // Get recent events
  const { data: recentEvents } = await supabase
    .from('events')
    .select(`
      *,
      calendars (name, provider_calendar_id)
    `)
    .eq('user_id', user.id)
    .gte('start_time', new Date().toISOString())
    .order('start_time')
    .limit(5)

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Calendar Management</h1>
          <p className="mt-2 text-gray-600">
            Sync your calendars and use AI-powered scheduling to optimize your time.
          </p>
        </div>

        {/* Gmail Connection Check */}
        {emailAccounts.length === 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
            ⚠️ Please connect your Gmail account first to enable calendar sync and scheduling features.
          </div>
        )}

        {/* Main Grid */}
        <div className="space-y-8">
          {/* Calendar Management Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CalendarSync />
            <SchedulingAssistant />
          </div>

          {/* Calendar Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Connected Calendars */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Connected Calendars</h3>
              </CardHeader>
              <CardContent>
                {calendars.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-gray-400 text-xl">📅</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      No calendars connected yet. Sync with Google Calendar to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {calendars.map((calendar) => (
                      <div key={calendar.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{calendar.name}</div>
                          <div className="text-sm text-gray-500 capitalize">{calendar.provider}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {calendar.is_primary && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Primary</span>
                          )}
                          <div className={`w-3 h-3 rounded-full ${calendar.sync_enabled ? 'bg-green-400' : 'bg-gray-300'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
              </CardHeader>
              <CardContent>
                {!recentEvents || recentEvents.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-gray-400 text-xl">📋</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      No upcoming events found. Sync your calendar or create new events.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentEvents.map((event) => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="font-medium text-gray-900 mb-1">{event.title}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(event.start_time).toLocaleDateString()} at{' '}
                          {new Date(event.start_time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        {event.calendars && (
                          <div className="text-xs text-gray-500 mt-1">
                            {event.calendars.name}
                          </div>
                        )}
                        {event.ai_generated && (
                          <div className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded mt-2 inline-block">
                            AI Generated
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calendar Stats */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Calendar Stats</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{calendars.length}</div>
                    <div className="text-xs text-gray-500">Connected Calendars</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{recentEvents?.length || 0}</div>
                    <div className="text-xs text-gray-500">Upcoming Events</div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {recentEvents?.filter(e => e.ai_generated).length || 0}
                    </div>
                    <div className="text-xs text-gray-500">AI Generated</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                  <p>• Real-time calendar synchronization</p>
                  <p>• AI-powered scheduling optimization</p>
                  <p>• Conflict detection and resolution</p>
                  <p>• Smart meeting suggestions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}