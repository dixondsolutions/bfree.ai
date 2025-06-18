'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TaskScheduleView } from '@/components/tasks/TaskScheduleView'
import { DailyTaskReview } from '@/components/tasks/DailyTaskReview'
import { CalendarSync } from '@/components/calendar/CalendarSync'
import { SchedulingAssistant } from '@/components/calendar/SchedulingAssistant'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { MonthlyCalendar, WeeklyCalendar, CalendarEvent } from '@/components/ui/Calendar'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLayout, PageHeader, PageContent, PageSection, FullHeightContainer } from '@/components/layout/PageLayout'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/Loading'

export default function CalendarPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailAccounts, setEmailAccounts] = useState([])
  const [calendars, setCalendars] = useState([])
  const [recentEvents, setRecentEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          router.push('/login')
          return
        }

        setUser(user)

        // Get user data with error handling
        try {
          const [emailAccountsResult, calendarsResult, eventsResult] = await Promise.all([
            supabase.from('email_accounts').select('*').eq('user_id', user.id),
            supabase.from('calendars').select('*').eq('user_id', user.id),
            supabase
              .from('events')
              .select(`
                *,
                calendars (name, provider_calendar_id)
              `)
              .eq('user_id', user.id)
              .gte('start_time', new Date().toISOString())
              .order('start_time')
              .limit(5)
          ])
          
          setEmailAccounts(emailAccountsResult.data || [])
          setCalendars(calendarsResult.data || [])
          setRecentEvents(eventsResult.data || [])
        } catch (error) {
          console.error('Error fetching user data:', error)
          // Continue with empty arrays - graceful degradation
        }
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router, supabase])

  if (loading) {
    return (
      <FullHeightContainer>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
        </div>
      </FullHeightContainer>
    )
  }

  if (!user) {
    return null
  }

  return (
    <FullHeightContainer>
      <PageLayout fillHeight={true}>
        <PageHeader
          title="Calendar & Task Management"
          description="Manage your tasks, calendar events, and AI-powered scheduling in one place."
        >
          <Button variant="outline" size="default">
            <span className="mr-2">🔄</span>
            Sync Now
          </Button>
          <Button variant="default" size="default">
            <span className="mr-2">➕</span>
            New Event
          </Button>
        </PageHeader>

        <PageContent fillHeight={true}>
          <Tabs defaultValue="tasks" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tasks">Task Schedule</TabsTrigger>
              <TabsTrigger value="review">Daily Review</TabsTrigger>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-6">
              <TaskScheduleView 
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </TabsContent>

            <TabsContent value="review" className="space-y-6">
              <DailyTaskReview date={selectedDate} />
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
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
          <div className="space-y-8 flex-1">
            {/* Calendar Views */}
            <PageSection 
              title="Calendar View" 
              description="View and manage your events"
              headerActions={
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
              }
            >
              <Card className="border border-neutral-200 shadow-sm">
                <CardContent className="p-6">
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
                </CardContent>
              </Card>
            </PageSection>

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
                      <p className="text-neutral-500 font-medium mb-2">No calendars connected</p>
                      <p className="text-sm text-neutral-400 mb-4">Connect your Google Calendar to get started</p>
                      <Button variant="outline" size="sm">
                        <span className="mr-2">🔗</span>
                        Connect Calendar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {calendars.map((calendar) => (
                        <div key={calendar.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-neutral-900">{calendar.name}</p>
                              <p className="text-xs text-neutral-500">Google Calendar</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">Active</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Events */}
              <Card className="border border-neutral-200 shadow-sm">
                <CardHeader className="pb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">Upcoming Events</h3>
                  <p className="text-sm text-neutral-500 mt-1">Your next scheduled events</p>
                </CardHeader>
                <CardContent>
                  {recentEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-neutral-400 text-2xl">📅</span>
                      </div>
                      <p className="text-neutral-500 font-medium mb-2">No upcoming events</p>
                      <p className="text-sm text-neutral-400 mb-4">Your schedule is clear</p>
                      <Button variant="outline" size="sm">
                        <span className="mr-2">➕</span>
                        Add Event
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentEvents.map((event) => (
                        <div key={event.id} className="p-3 border border-neutral-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-neutral-900 mb-1">{event.title}</h4>
                              <p className="text-sm text-neutral-500">
                                {new Date(event.start_time).toLocaleDateString()} at{' '}
                                {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {event.ai_generated && (
                              <Badge variant="secondary" className="text-xs">
                                AI
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border border-neutral-200 shadow-sm">
                <CardHeader className="pb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">Quick Actions</h3>
                  <p className="text-sm text-neutral-500 mt-1">Common calendar tasks</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <span className="mr-2">➕</span>
                      Schedule New Meeting
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <span className="mr-2">🔄</span>
                      Sync All Calendars
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <span className="mr-2">🤖</span>
                      AI Schedule Optimization
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <span className="mr-2">📊</span>
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
            </TabsContent>
          </Tabs>
        </PageContent>
      </PageLayout>
    </FullHeightContainer>
  )
}
