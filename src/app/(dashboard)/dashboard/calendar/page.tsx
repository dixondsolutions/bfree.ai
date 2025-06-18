'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar as CalendarIcon, Clock, CheckCircle2, Circle, AlertCircle, Plus } from 'lucide-react'
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
    <div className="space-y-4">
      {/* Simplified Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar & Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')} • {summary?.totalEvents || 0} events
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchEvents(selectedDate)} disabled={loading}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="default"
            size="sm"
            onClick={async () => {
              try {
                setLoading(true)
                const response = await fetch('/api/ai/process', { method: 'POST' })
                const result = await response.json()
                
                if (result.success) {
                  await fetchEvents(selectedDate)
                  if (result.details?.tasksAutoCreated > 0) {
                    console.log(`✅ Created ${result.details.tasksAutoCreated} tasks from AI analysis`)
                  }
                }
              } catch (error) {
                console.error('Error triggering AI task creation:', error)
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            {loading ? 'Processing...' : 'Create AI Tasks'}
          </Button>
        </div>
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

      {/* Simplified Schedule View */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Today's Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Today's Schedule</CardTitle>
              <p className="text-sm text-muted-foreground">
                {todaysEvents.length} events • {todaysEvents.filter(e => e.type === 'task').length} tasks
              </p>
            </CardHeader>
            <CardContent>
              {todaysEvents.length > 0 ? (
                <div className="space-y-3">
                  {todaysEvents.map((event) => {
                    const StatusIcon = statusIcons[event.status as keyof typeof statusIcons] || Circle
                    
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                      >
                        <StatusIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(event.start), 'h:mm a')}
                            {event.end && ` - ${format(new Date(event.end), 'h:mm a')}`}
                            {event.estimated_duration && ` (${event.estimated_duration}m)`}
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            {event.priority && (
                              <Badge className={`${priorityColors[event.priority as keyof typeof priorityColors]} text-white text-xs`}>
                                {event.priority}
                              </Badge>
                            )}
                            {event.ai_generated && (
                              <Badge variant="outline" className="text-xs">AI</Badge>
                            )}
                            <Badge variant={event.type === 'task' ? 'default' : 'secondary'} className="text-xs">
                              {event.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No events for {format(selectedDate, 'MMM d')}
                  </p>
                  <Button variant="outline" onClick={() => fetchEvents(selectedDate)}>
                    Check for updates
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Calendar Component */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Calendar View</CardTitle>
              <p className="text-sm text-muted-foreground">Navigate dates and view schedule</p>
            </CardHeader>
            <CardContent>
              <ModernCalendarScheduler 
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                events={events}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
