'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar as CalendarIcon, Clock, CheckCircle2, Circle, AlertCircle, Plus } from 'lucide-react'
import { TaskScheduleView } from '@/components/tasks/TaskScheduleView'
import { ModernCalendarScheduler } from '@/components/calendar/ModernCalendarScheduler'
import { format } from 'date-fns'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end?: string
  type: 'task' | 'event'
  status?: string
  priority?: string
  category?: string
  ai_generated?: boolean
  confidence_score?: number
  estimated_duration?: number
  source: 'tasks' | 'calendar'
}

interface CalendarData {
  events: CalendarEvent[]
  eventsByDate: Record<string, CalendarEvent[]>
  summary: {
    totalEvents: number
    tasks: number
    calendarEvents: number
  }
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'schedule' | 'calendar'>('schedule')

  useEffect(() => {
    loadCalendarData()
  }, [selectedDate])

  const loadCalendarData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Format dates for API
      const startDate = selectedDate.toISOString().split('T')[0]
      const endDate = selectedDate.toISOString().split('T')[0]
      
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        include_completed: 'true'
      })

      const response = await fetch(`/api/calendar/events?${params}`)
      const data = await response.json()

      if (data.success) {
        setCalendarData(data)
      } else {
        setError(data.error || 'Failed to load calendar data')
      }
    } catch (err) {
      console.error('Error loading calendar data:', err)
      setError('Network error loading calendar')
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />
      case 'pending': return <Circle className="h-4 w-4 text-gray-400" />
      default: return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const todayEvents = calendarData?.eventsByDate[selectedDate.toISOString().split('T')[0]] || []

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            Manage your schedule and tasks for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={view === 'schedule' ? 'default' : 'outline'}
            onClick={() => setView('schedule')}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          <Button
            variant={view === 'calendar' ? 'default' : 'outline'}
            onClick={() => setView('calendar')}
          >
                         <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {calendarData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{calendarData.summary.totalEvents}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tasks</p>
                  <p className="text-2xl font-bold">{calendarData.summary.tasks}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Calendar Events</p>
                  <p className="text-2xl font-bold">{calendarData.summary.calendarEvents}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {view === 'schedule' ? (
        <TaskScheduleView 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      ) : (
        <ModernCalendarScheduler 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      )}

      {/* Today's Events List */}
      {todayEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Today's Schedule ({todayEvents.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {event.status && getStatusIcon(event.status)}
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        {event.priority && (
                          <Badge className={`text-xs ${getPriorityColor(event.priority)}`}>
                            {event.priority}
                          </Badge>
                        )}
                        {event.ai_generated && (
                          <Badge variant="outline" className="text-xs">
                            AI
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {event.start && format(new Date(event.start), 'h:mm a')}
                    {event.estimated_duration && ` (${event.estimated_duration}m)`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && (!calendarData || calendarData.summary.totalEvents === 0) && (
        <Card>
          <CardContent className="pt-6 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No events scheduled</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any tasks or events for {format(selectedDate, 'MMMM d, yyyy')}
            </p>
            <Button onClick={() => window.location.href = '/dashboard/suggestions'}>
              <Plus className="h-4 w-4 mr-2" />
              Create AI Suggestions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
