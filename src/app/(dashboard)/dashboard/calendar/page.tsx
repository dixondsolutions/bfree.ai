import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarSync } from '@/components/calendar/CalendarSync'
import { SchedulingAssistant } from '@/components/calendar/SchedulingAssistant'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { MonthlyCalendar, WeeklyCalendar, CalendarEvent } from '@/components/ui/Calendar'
import { Button } from '@/components/ui/Button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/Loading'
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
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              Calendar Management
            </h1>
            <p className="mt-3 text-lg text-neutral-600">
              Sync your calendars and use AI-powered scheduling to optimize your time.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="default">
              <span className="mr-2">🔄</span>
              Sync Now
            </Button>
            <Button variant="default" size="default">
              <span className="mr-2">➕</span>
              New Event
            </Button>
          </div>
        </div>
      </div>

      {/* Gmail Connection Check */}
      {emailAccounts.length === 0 && (
        <div className="mb-6 bg-gradient-to-r from-warning-50 to-warning-100 border border-warning-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-warning-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">⚠️</span>
            </div>
            <div>
              <h3 className="font-semibold text-warning-800">Gmail Connection Required</h3>
              <p className="text-warning-700 text-sm mt-1">
                Please connect your Gmail account first to enable calendar sync and scheduling features.
              </p>
            </div>
            <Button variant="default" size="sm" className="ml-auto">
              Connect Gmail
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="space-y-8">
        {/* Calendar Views */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-neutral-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">Calendar View</h2>
                <p className="text-sm text-neutral-600 mt-1">View and manage your events</p>
              </div>
              <div className="flex items-center space-x-3">
                <Select defaultValue="month">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">📅 Month View</SelectItem>
                    <SelectItem value="week">🗓️ Week View</SelectItem>
                    <SelectItem value="day">📊 Day View</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <span className="mr-1">⏪</span>
                  Prev
                </Button>
                <Button variant="outline" size="sm">
                  Today
                </Button>
                <Button variant="outline" size="sm">
                  Next
                  <span className="ml-1">⏩</span>
                </Button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <MonthlyCalendar
              events={recentEvents?.map((event): CalendarEvent => ({
                id: event.id,
                title: event.title,
                start: new Date(event.start_time),
                end: new Date(event.end_time || event.start_time),
                isAIGenerated: event.ai_generated,
                color: event.ai_generated ? 'green' : 'blue'
              })) || []}
              onDateClick={(date) => console.log('Date clicked:', date)}
              onEventClick={(event) => console.log('Event clicked:', event)}
              className="border-0 shadow-none"
            />
          </div>
        </div>

        {/* Calendar Management Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CalendarSync />
          <SchedulingAssistant />
        </div>

        {/* Calendar Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Connected Calendars */}
          <Card className="border border-neutral-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">Connected Calendars</h3>
                <LoadingSpinner size="xs" variant="primary" />
              </div>
              <p className="text-sm text-neutral-500 mt-1">Manage your calendar connections</p>
            </CardHeader>
            <CardContent>
              {calendars.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-neutral-400 text-2xl">📅</span>
                  </div>
                  <h4 className="font-medium text-neutral-900 mb-2">No calendars connected</h4>
                  <p className="text-sm text-neutral-500 mb-4">
                    Sync with Google Calendar to get started with scheduling.
                  </p>
                  <Button variant="default" size="sm">
                    <span className="mr-2">🔗</span>
                    Connect Calendar
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {calendars.map((calendar) => (
                    <div key={calendar.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          calendar.sync_enabled ? 'bg-success-100' : 'bg-neutral-200'
                        }`}>
                          <span className={`text-lg ${
                            calendar.sync_enabled ? 'text-success-600' : 'text-neutral-400'
                          }`}>
                            📅
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900">{calendar.name}</div>
                          <div className="text-sm text-neutral-500 capitalize flex items-center space-x-2">
                            <span>{calendar.provider}</span>
                            {calendar.is_primary && (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Primary</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full shadow-sm ${
                          calendar.sync_enabled ? 'bg-success-400' : 'bg-neutral-300'
                        }`} />
                        <span className={`text-xs font-medium ${
                          calendar.sync_enabled ? 'text-success-600' : 'text-neutral-500'
                        }`}>
                          {calendar.sync_enabled ? 'Synced' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="border border-neutral-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">Upcoming Events</h3>
                <Button variant="ghost" size="sm">
                  <span className="text-xs">View All →</span>
                </Button>
              </div>
              <p className="text-sm text-neutral-500 mt-1">Next 5 scheduled events</p>
            </CardHeader>
            <CardContent>
              {!recentEvents || recentEvents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-neutral-400 text-2xl">📋</span>
                  </div>
                  <h4 className="font-medium text-neutral-900 mb-2">No upcoming events</h4>
                  <p className="text-sm text-neutral-500 mb-4">
                    Sync your calendar or create new events to get started.
                  </p>
                  <Button variant="outline" size="sm">
                    <span className="mr-2">➕</span>
                    Create Event
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <div key={event.id} className="group p-4 border border-neutral-200 rounded-lg hover:border-neutral-300 hover:shadow-sm transition-all duration-200 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-neutral-900 group-hover:text-primary-600 transition-colors">
                              {event.title}
                            </h4>
                            {event.ai_generated && (
                              <Badge className="bg-success-100 text-success-700 border-success-200 text-xs">
                                🤖 AI
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-neutral-600 flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                              <span>📅</span>
                              <span>{new Date(event.start_time).toLocaleDateString()}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span>🕐</span>
                              <span>{new Date(event.start_time).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}</span>
                            </span>
                          </div>
                          {event.calendars && (
                            <div className="text-xs text-neutral-500 mt-2 flex items-center space-x-1">
                              <span>🗓️</span>
                              <span>{event.calendars.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm">
                            <span className="text-xs">→</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar Stats */}
          <Card className="border border-neutral-200 shadow-sm">
            <CardHeader className="pb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Calendar Stats</h3>
              <p className="text-sm text-neutral-500 mt-1">Quick overview of your calendar data</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{calendars.length}</div>
                  <div className="text-sm font-medium text-blue-700">Connected Calendars</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {calendars.filter(c => c.sync_enabled).length} syncing
                  </div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-success-50 to-success-100 rounded-xl border border-success-200">
                  <div className="text-3xl font-bold text-success-600 mb-1">{recentEvents?.length || 0}</div>
                  <div className="text-sm font-medium text-success-700">Upcoming Events</div>
                  <div className="text-xs text-success-600 mt-1">Next 30 days</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {recentEvents?.filter(e => e.ai_generated).length || 0}
                  </div>
                  <div className="text-sm font-medium text-purple-700">AI Generated</div>
                  <div className="text-xs text-purple-600 mt-1">Smart scheduling</div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-900 mb-3">Features</h4>
                <div className="space-y-2 text-xs text-neutral-600">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-success-400 rounded-full"></span>
                    <span>Real-time calendar synchronization</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-success-400 rounded-full"></span>
                    <span>AI-powered scheduling optimization</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-success-400 rounded-full"></span>
                    <span>Conflict detection and resolution</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-success-400 rounded-full"></span>
                    <span>Smart meeting suggestions</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
