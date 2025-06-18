'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar as CalendarIcon, Clock, CheckCircle2, Circle, AlertCircle, Plus } from 'lucide-react'
import { TaskScheduleView } from '@/components/tasks/TaskScheduleView'
import { ModernCalendarScheduler } from '@/components/calendar/ModernCalendarScheduler'
import { format, startOfDay, endOfDay } from 'date-fns'

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

interface EventSummary {
  totalEvents: number
  tasks: number
  calendarEvents: number
  dateRange: { start: string; end: string }
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventsByDate, setEventsByDate] = useState<Record<string, CalendarEvent[]>>({})
  const [summary, setSummary] = useState<EventSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch events for the selected date
  const fetchEvents = useCallback(async (date: Date) => {
    try {
      setLoading(true)
      setError(null)
      
      const startDate = startOfDay(date).toISOString()
      const endDate = endOfDay(date).toISOString()
      
      const response = await fetch(`/api/calendar/events?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&include_completed=false`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setEvents(data.events || [])
        setEventsByDate(data.eventsByDate || {})
        setSummary(data.summary || null)
      } else {
        throw new Error(data.error || 'Failed to fetch events')
      }
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setEvents([])
      setEventsByDate({})
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load events when component mounts or date changes
  useEffect(() => {
    fetchEvents(selectedDate)
  }, [fetchEvents, selectedDate]) // selectedDate is stable from useState

  // Get events for the selected date
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
  const todaysEvents = eventsByDate[selectedDateKey] || []

  const priorityColors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  }

  const statusIcons = {
    pending: Circle,
    in_progress: Clock,
    completed: CheckCircle2,
    deferred: AlertCircle
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            Manage your schedule and tasks for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchEvents(selectedDate)}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="default"
            onClick={() => {
              // Trigger AI suggestions creation
              fetch('/api/ai/suggestions', { method: 'POST' })
                .then(() => fetchEvents(selectedDate))
                .catch(console.error)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create AI Tasks
          </Button>
          <Button variant="outline">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <Circle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.tasks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calendar Events</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.calendarEvents || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Failed to load schedule</span>
            </div>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => fetchEvents(selectedDate)}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading schedule...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
          {/* Today's Events List */}
          {todaysEvents.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todaysEvents.map((event) => {
                    const StatusIcon = statusIcons[event.status as keyof typeof statusIcons] || Circle
                    
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{event.title}</div>
                            {event.description && (
                              <div className="text-sm text-muted-foreground">
                                {event.description}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(event.start), 'h:mm a')}
                              {event.end && ` - ${format(new Date(event.end), 'h:mm a')}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.priority && (
                            <Badge
                              variant="secondary"
                              className={`${priorityColors[event.priority as keyof typeof priorityColors]} text-white text-xs`}
                            >
                              {event.priority}
                            </Badge>
                          )}
                          {event.ai_generated && (
                            <Badge variant="outline" className="text-xs">
                              AI
                            </Badge>
                          )}
                          <Badge variant={event.type === 'task' ? 'default' : 'secondary'} className="text-xs">
                            {event.type}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No events scheduled</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any tasks or events for {format(selectedDate, 'MMMM d, yyyy')}
                  </p>
                  <Button
                    onClick={() => {
                      // Trigger AI suggestions creation
                      fetch('/api/ai/suggestions', { method: 'POST' })
                        .then(() => fetchEvents(selectedDate))
                        .catch(console.error)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create AI Suggestions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Schedule Component */}
          <TaskScheduleView selectedDate={selectedDate} onDateChange={setSelectedDate} />

          {/* Calendar Scheduler Component */}
          <ModernCalendarScheduler 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            events={events}
          />
        </>
      )}
    </div>
  )
}
