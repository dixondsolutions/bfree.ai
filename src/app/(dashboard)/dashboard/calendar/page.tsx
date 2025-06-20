'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ModernCalendar } from '@/components/calendar/ModernCalendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Settings,
  Plus,
  Brain,
  Zap,
  Users,
  TrendingUp
} from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  ai_generated?: boolean
}

interface Calendar {
  id: string
  name: string
  provider: string
  sync_enabled: boolean
}

interface CalendarSummary {
  calendarEvents?: number
  tasks?: number
  upcomingWeek?: number
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [summary, setSummary] = useState<CalendarSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Calendar component state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month')

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        // Get current date for API call
        const today = new Date()
        const startDate = today.toISOString().split('T')[0]
        const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
        
        const [eventsRes, calendarsRes] = await Promise.all([
          fetch(`/api/calendar/events?start_date=${startDate}&end_date=${endDate}`),
          fetch('/api/user/email-accounts')
        ])

        const [eventsData, calendarsData] = await Promise.all([
          eventsRes.ok ? eventsRes.json() : { events: [] },
          calendarsRes.ok ? calendarsRes.json() : { accounts: [] }
        ])

        setEvents(eventsData.events || [])
        setCalendars(calendarsData.accounts || [])
        
        // Calculate summary
        const todayEvents = eventsData.events?.filter((event: CalendarEvent) => {
          const eventDate = new Date(event.start_time).toDateString()
          const today = new Date().toDateString()
          return eventDate === today
        }).length || 0

        setSummary({
          calendarEvents: todayEvents,
          tasks: 12, // Mock data
          upcomingWeek: eventsData.events?.length || 0
        })
      } catch (error) {
        console.error('Error fetching calendar data:', error)
        // Set mock data for development
        setSummary({
          calendarEvents: 3,
          tasks: 12,
          upcomingWeek: 8
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCalendarData()
  }, [])

  const handleEventClick = (event: any) => {
    console.log('Event clicked:', event)
  }

  const handleTaskClick = (task: any) => {
    console.log('Task clicked:', task)
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8 bg-gray-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-2">
            Smart scheduling and calendar management with AI assistance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-2 bg-white border-gray-200">
            <Zap className="h-4 w-4" />
            AI Scheduling Active
          </Badge>
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Today's Events</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.calendarEvents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.tasks || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-50">
                <Brain className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">AI Generated</p>
                <p className="text-2xl font-bold text-gray-900">5</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-50">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Hours Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">6.5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="assistant" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">Calendar View</CardTitle>
                  <CardDescription className="text-gray-600">
                    Your schedule at a glance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ModernCalendar 
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    onEventClick={handleEventClick}
                    onTaskClick={handleTaskClick}
                    view={calendarView}
                    onViewChange={setCalendarView}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start border-gray-200 hover:bg-gray-50">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-gray-200 hover:bg-gray-50">
                    <Brain className="h-4 w-4 mr-2" />
                    AI Schedule Suggestion
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-gray-200 hover:bg-gray-50">
                    <Users className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">Upcoming Events</CardTitle>
                </CardHeader>
                <CardContent>
                  {events.length > 0 ? (
                    <div className="space-y-3">
                      {events.slice(0, 3).map((event) => (
                        <div key={event.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <h4 className="font-medium text-gray-900">{event.title}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(event.start_time).toLocaleDateString()}
                          </p>
                          {event.ai_generated && (
                            <Badge variant="outline" className="mt-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                              AI Generated
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No upcoming events</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assistant" className="space-y-4">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">AI Scheduling Assistant</CardTitle>
              <CardDescription className="text-gray-600">
                Let AI help you optimize your schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Assistant</h3>
                <p className="text-gray-600 mb-4">
                  The AI scheduling assistant will help you optimize your calendar and suggest better meeting times.
                </p>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Brain className="h-4 w-4 mr-2" />
                  Get AI Suggestions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Calendar Settings</CardTitle>
              <CardDescription className="text-gray-600">
                Manage your calendar connections and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Google Calendar</h4>
                    <p className="text-sm text-gray-600">Sync with your Google Calendar</p>
                  </div>
                  <Button variant="outline" className="border-gray-200">
                    Connect
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Outlook Calendar</h4>
                    <p className="text-sm text-gray-600">Sync with your Outlook Calendar</p>
                  </div>
                  <Button variant="outline" className="border-gray-200">
                    Connect
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
