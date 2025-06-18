'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  AlertCircle,
  Zap,
  Brain,
  User,
  Timer
} from 'lucide-react'
import { 
  format, 
  addDays, 
  startOfWeek, 
  addWeeks, 
  isSameDay, 
  isToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  startOfDay,
  endOfDay,
  parseISO
} from 'date-fns'

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

interface CalendarTask {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  estimated_duration?: number
  due_date?: string
  scheduled_start?: string
  scheduled_end?: string
  ai_generated: boolean
  confidence_score?: number
  created_at: string
}

interface ModernCalendarProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onTaskClick?: (task: CalendarTask) => void
  className?: string
  view?: 'month' | 'week' | 'day'
  onViewChange?: (view: 'month' | 'week' | 'day') => void
}

const priorityColors = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white', 
  medium: 'bg-blue-500 text-white',
  low: 'bg-gray-500 text-white'
}

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: AlertCircle,
  blocked: AlertCircle
}

export function ModernCalendar({ 
  selectedDate, 
  onDateChange, 
  onEventClick,
  onTaskClick,
  className,
  view = 'month',
  onViewChange 
}: ModernCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<CalendarTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(selectedDate)

  // Fetch events and tasks for the current view
  const fetchCalendarData = useCallback(async (date: Date) => {
    try {
      setLoading(true)
      setError(null)

      let startDate: Date
      let endDate: Date

      // Determine date range based on view
      switch (view) {
        case 'week':
          startDate = startOfWeek(date)
          endDate = addDays(startDate, 6)
          break
        case 'day':
          startDate = startOfDay(date)
          endDate = endOfDay(date)
          break
        case 'month':
        default:
          startDate = startOfMonth(date)
          endDate = endOfMonth(date)
          break
      }

      // Fetch calendar events
      console.log('Fetching calendar events for range:', { startDate, endDate })
      const eventsResponse = await fetch(
        `/api/calendar/events?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
      )
      
      console.log('Events response status:', eventsResponse.status)
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        console.log('Events data received:', eventsData)
        setEvents(eventsData.events || [])
      } else {
        const errorText = await eventsResponse.text()
        console.error('Events fetch failed:', eventsResponse.status, errorText)
        throw new Error(`Events API failed: ${eventsResponse.status} ${errorText}`)
      }

      // Fetch tasks
      console.log('Fetching tasks for range:', { startDate, endDate })
      const tasksResponse = await fetch(
        `/api/tasks?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&status=pending,in_progress,completed&limit=100`
      )
      
      console.log('Tasks response status:', tasksResponse.status)
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        console.log('Tasks data received:', tasksData)
        setTasks(tasksData.tasks || [])
      } else {
        const errorText = await tasksResponse.text()
        console.error('Tasks fetch failed:', tasksResponse.status, errorText)
        throw new Error(`Tasks API failed: ${tasksResponse.status} ${errorText}`)
      }

    } catch (err) {
      setError('Failed to load calendar data')
      console.error('Calendar data fetch error:', err)
      console.error('Error details:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      })
    } finally {
      setLoading(false)
    }
  }, [view])

  useEffect(() => {
    setCurrentDate(selectedDate)
    fetchCalendarData(selectedDate)
  }, [selectedDate, fetchCalendarData])

  // Navigation functions
  const navigatePrev = () => {
    let newDate: Date
    switch (view) {
      case 'week':
        newDate = addWeeks(currentDate, -1)
        break
      case 'day':
        newDate = addDays(currentDate, -1)
        break
      case 'month':
      default:
        newDate = addMonths(currentDate, -1)
        break
    }
    setCurrentDate(newDate)
    onDateChange(newDate)
  }

  const navigateNext = () => {
    let newDate: Date
    switch (view) {
      case 'week':
        newDate = addWeeks(currentDate, 1)
        break
      case 'day':
        newDate = addDays(currentDate, 1)
        break
      case 'month':
      default:
        newDate = addMonths(currentDate, 1)
        break
    }
    setCurrentDate(newDate)
    onDateChange(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    onDateChange(today)
  }

  // Get events/tasks for a specific date
  const getDateItems = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    const dayEvents = events.filter(event => {
      const eventDate = format(parseISO(event.start), 'yyyy-MM-dd')
      return eventDate === dateStr
    })

    const dayTasks = tasks.filter(task => {
      if (task.scheduled_start) {
        const taskDate = format(parseISO(task.scheduled_start), 'yyyy-MM-dd')
        return taskDate === dateStr
      }
      if (task.due_date) {
        const dueDate = format(parseISO(task.due_date), 'yyyy-MM-dd')
        return dueDate === dateStr
      }
      return false
    })

    return { events: dayEvents, tasks: dayTasks }
  }

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = addDays(startOfWeek(monthEnd), 41) // 6 weeks

    const calendarDays = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    }).slice(0, 42) // Exactly 6 weeks

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map(day => {
          const { events: dayEvents, tasks: dayTasks } = getDateItems(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isSelected = isSameDay(day, selectedDate)
          const isTodayDate = isToday(day)
          const hasItems = dayEvents.length > 0 || dayTasks.length > 0
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[120px] p-2 border border-border/50 cursor-pointer transition-colors hover:bg-muted/50",
                !isCurrentMonth && "text-muted-foreground bg-muted/20",
                isSelected && "bg-primary/10 border-primary",
                isTodayDate && "bg-blue-50 border-blue-200"
              )}
              onClick={() => onDateChange(day)}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                isTodayDate && "text-blue-600",
                isSelected && "text-primary font-semibold"
              )}>
                {format(day, 'd')}
              </div>
              
              {hasItems && (
                <div className="space-y-1">
                  {/* Show first few events/tasks */}
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayTasks.slice(0, 2).map(task => {
                    const StatusIcon = statusIcons[task.status]
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "text-xs p-1 rounded truncate cursor-pointer flex items-center gap-1",
                          task.status === 'completed' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          onTaskClick?.(task)
                        }}
                      >
                        <StatusIcon className="h-2 w-2 flex-shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </div>
                    )
                  })}
                  {(dayEvents.length + dayTasks.length) > 4 && (
                    <div className="text-xs text-muted-foreground">
                      +{(dayEvents.length + dayTasks.length) - 4} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Render week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    return (
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map(day => {
          const { events: dayEvents, tasks: dayTasks } = getDateItems(day)
          const isSelected = isSameDay(day, selectedDate)
          const isTodayDate = isToday(day)
          
          return (
            <div key={day.toISOString()} className="space-y-2">
              <div 
                className={cn(
                  "text-center p-2 rounded-lg cursor-pointer transition-colors",
                  isSelected && "bg-primary text-primary-foreground",
                  isTodayDate && !isSelected && "bg-blue-100 text-blue-800",
                  !isSelected && !isTodayDate && "hover:bg-muted"
                )}
                onClick={() => onDateChange(day)}
              >
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div className="text-lg font-bold">{format(day, 'd')}</div>
              </div>
              
              <div className="space-y-1 min-h-[300px]">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    className="p-2 bg-blue-100 text-blue-800 rounded text-sm cursor-pointer hover:bg-blue-200"
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="font-medium">{event.title}</div>
                    {event.start && (
                      <div className="text-xs opacity-75">
                        {format(parseISO(event.start), 'h:mm a')}
                      </div>
                    )}
                  </div>
                ))}
                
                {dayTasks.map(task => {
                  const StatusIcon = statusIcons[task.status]
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "p-2 rounded text-sm cursor-pointer",
                        task.status === 'completed' ? "bg-green-100 text-green-800 hover:bg-green-200" : 
                        "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                      )}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        <span className="font-medium text-xs">{task.title}</span>
                      </div>
                      {task.estimated_duration && (
                        <div className="text-xs opacity-75 flex items-center gap-1 mt-1">
                          <Timer className="h-2 w-2" />
                          {task.estimated_duration}m
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Render day view
  const renderDayView = () => {
    const { events: dayEvents, tasks: dayTasks } = getDateItems(selectedDate)
    const allItems = [
      ...dayEvents.map(e => ({ ...e, itemType: 'event' as const })),
      ...dayTasks.map(t => ({ ...t, itemType: 'task' as const }))
    ].sort((a, b) => {
      const aTime = a.itemType === 'event' ? a.start : (a.scheduled_start || a.due_date || '')
      const bTime = b.itemType === 'event' ? b.start : (b.scheduled_start || b.due_date || '')
      return aTime.localeCompare(bTime)
    })

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h3>
          <p className="text-muted-foreground">{allItems.length} items scheduled</p>
        </div>
        
        <div className="space-y-3">
          {allItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No events or tasks scheduled for this day</p>
            </div>
          ) : (
            allItems.map(item => {
              if (item.itemType === 'event') {
                return (
                  <Card key={`event-${item.id}`} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onEventClick?.(item)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          {item.start && (
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(item.start), 'h:mm a')}
                              {item.end && ` - ${format(parseISO(item.end), 'h:mm a')}`}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary">Event</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              } else {
                const StatusIcon = statusIcons[item.status]
                return (
                  <Card key={`task-${item.id}`} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onTaskClick?.(item)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={cn(
                          "h-5 w-5",
                          item.status === 'completed' && "text-green-600",
                          item.status === 'in_progress' && "text-blue-600"
                        )} />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {item.scheduled_start && (
                              <span>{format(parseISO(item.scheduled_start), 'h:mm a')}</span>
                            )}
                            {item.estimated_duration && (
                              <span>• {item.estimated_duration}m</span>
                            )}
                            {item.ai_generated && (
                              <Badge variant="outline" className="text-xs">
                                <Brain className="h-2 w-2 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={priorityColors[item.priority]}>
                          {item.priority}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              }
            })
          )}
        </div>
      </div>
    )
  }

  const getViewTitle = () => {
    switch (view) {
      case 'week':
        const weekStart = startOfWeek(currentDate)
        const weekEnd = addDays(weekStart, 6)
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'month':
      default:
        return format(currentDate, 'MMMM yyyy')
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <CardTitle className="text-xl">{getViewTitle()}</CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex rounded-lg border p-1">
              {(['month', 'week', 'day'] as const).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewChange?.(v)}
                  className="text-xs"
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Button>
              ))}
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={navigatePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Loading/Error States */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading calendar...</span>
          </div>
        )}
        
        {error && (
          <div className="flex flex-col gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <div className="text-xs text-red-500 font-mono">
              Check the browser console for detailed error information
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchCalendarData(currentDate)} className="self-start">
              Retry
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {!loading && !error && (
          <>
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </>
        )}
      </CardContent>
    </Card>
  )
}