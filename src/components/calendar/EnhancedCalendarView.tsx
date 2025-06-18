'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { 
  ChevronLeft, 
  ChevronRight, 
  Mail,
  Clock,
  Brain,
  User,
  Timer,
  CheckCircle2,
  Circle,
  AlertCircle,
  Zap,
  ExternalLink
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

interface EmailTaskItem {
  // Task fields
  task_id?: string
  task_title?: string
  task_status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked'
  task_priority?: 'low' | 'medium' | 'high' | 'urgent'
  task_category?: string
  scheduled_start?: string
  scheduled_end?: string
  due_date?: string
  estimated_duration?: number
  ai_generated?: boolean
  confidence_score?: number
  task_created_at?: string
  
  // Email fields
  email_id?: string
  gmail_id?: string
  subject?: string
  from_address?: string
  from_name?: string
  received_at?: string
  importance_level?: 'low' | 'normal' | 'high'
  
  // Processing status
  processing_status?: 'task_created' | 'suggestion_pending' | 'no_action_needed' | 'not_analyzed'
  suggestion_id?: string
  suggestion_status?: string
}

interface EnhancedCalendarViewProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onTaskClick?: (task: EmailTaskItem) => void
  onEmailClick?: (email: EmailTaskItem) => void
  className?: string
  view?: 'month' | 'week' | 'day'
  onViewChange?: (view: 'month' | 'week' | 'day') => void
}

const priorityColors = {
  urgent: 'bg-red-500 text-white border-red-600',
  high: 'bg-orange-500 text-white border-orange-600', 
  medium: 'bg-blue-500 text-white border-blue-600',
  low: 'bg-gray-500 text-white border-gray-600'
}

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: AlertCircle,
  blocked: AlertCircle
}

export function EnhancedCalendarView({ 
  selectedDate, 
  onDateChange, 
  onTaskClick,
  onEmailClick,
  className,
  view = 'month',
  onViewChange 
}: EnhancedCalendarViewProps) {
  const [items, setItems] = useState<EmailTaskItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(selectedDate)

  // Fetch enhanced email-task data
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

      // Fetch email-task data using our enhanced view
      const response = await fetch(
        `/api/calendar/email-tasks?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      } else {
        setError('Failed to load calendar data')
      }

    } catch (err) {
      setError('Failed to load calendar data')
      console.error('Enhanced calendar data fetch error:', err)
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

  // Get items for a specific date
  const getDateItems = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    return items.filter(item => {
      // Check scheduled tasks
      if (item.scheduled_start) {
        const taskDate = format(parseISO(item.scheduled_start), 'yyyy-MM-dd')
        if (taskDate === dateStr) return true
      }
      
      // Check due dates
      if (item.due_date) {
        const dueDate = format(parseISO(item.due_date), 'yyyy-MM-dd')
        if (dueDate === dateStr) return true
      }
      
      // Check email received date for emails without tasks
      if (!item.task_id && item.received_at) {
        const emailDate = format(parseISO(item.received_at), 'yyyy-MM-dd')
        if (emailDate === dateStr) return true
      }
      
      return false
    })
  }

  // Render individual task/email item
  const renderItem = (item: EmailTaskItem, compact: boolean = false) => {
    const isTask = !!item.task_id
    const StatusIcon = isTask && item.task_status ? statusIcons[item.task_status] : Mail
    
    return (
      <div
        key={item.task_id || item.email_id}
        className={cn(
          "p-2 rounded text-sm cursor-pointer transition-colors",
          compact ? "mb-1" : "mb-2",
          isTask
            ? item.task_status === 'completed'
              ? "bg-green-100 text-green-800 border border-green-200 hover:bg-green-200"
              : item.task_priority && priorityColors[item.task_priority]
              ? `${priorityColors[item.task_priority]} hover:opacity-80`
              : "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
            : "bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200"
        )}
        onClick={() => {
          if (isTask && onTaskClick) {
            onTaskClick(item)
          } else if (!isTask && onEmailClick) {
            onEmailClick(item)
          }
        }}
      >
        <div className="flex items-center gap-2">
          <StatusIcon className="h-3 w-3 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs truncate">
              {isTask ? item.task_title : item.subject}
            </div>
            {!compact && (
              <div className="text-xs opacity-75 flex items-center gap-2 mt-1">
                {isTask && item.ai_generated && (
                  <Badge variant="secondary" className="h-4 text-xs">
                    <Brain className="h-2 w-2 mr-1" />
                    AI
                  </Badge>
                )}
                {isTask && item.confidence_score && (
                  <span className="text-xs">
                    {Math.round(item.confidence_score * 100)}%
                  </span>
                )}
                {item.estimated_duration && (
                  <span className="flex items-center gap-1">
                    <Timer className="h-2 w-2" />
                    {item.estimated_duration}m
                  </span>
                )}
                {!isTask && item.from_name && (
                  <span className="truncate">
                    from {item.from_name}
                  </span>
                )}
              </div>
            )}
          </div>
          {isTask && item.email_id && (
            <Mail className="h-3 w-3 opacity-50" title="Created from email" />
          )}
        </div>
      </div>
    )
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
          const dayItems = getDateItems(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isSelected = isSameDay(day, selectedDate)
          const isTodayDate = isToday(day)
          const hasItems = dayItems.length > 0
          
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
                "text-sm font-medium mb-1 flex items-center justify-between",
                isTodayDate && "text-blue-600",
                isSelected && "text-primary font-semibold"
              )}>
                <span>{format(day, 'd')}</span>
                {hasItems && (
                  <Badge variant="secondary" className="h-4 text-xs">
                    {dayItems.length}
                  </Badge>
                )}
              </div>
              
              {hasItems && (
                <div className="space-y-1">
                  {dayItems.slice(0, 3).map(item => renderItem(item, true))}
                  {dayItems.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayItems.length - 3} more
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

  // Get view title
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

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
          <CardTitle className="text-lg font-semibold">
            {getViewTitle()}
          </CardTitle>
        </div>
        
        <div className="flex items-center space-x-2">
          {['month', 'week', 'day'].map((viewOption) => (
            <Button
              key={viewOption}
              variant={view === viewOption ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewChange?.(viewOption as any)}
            >
              {viewOption.charAt(0).toUpperCase() + viewOption.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="text-center py-8 text-muted-foreground">
            {error}
          </div>
        ) : (
          renderMonthView()
        )}
      </CardContent>
    </Card>
  )
} 