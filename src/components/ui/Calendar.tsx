'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  color?: string
  description?: string
  location?: string
  isAIGenerated?: boolean
  confidence?: number
}

export interface CalendarProps {
  /** Current date to display */
  date?: Date
  /** Calendar events */
  events?: CalendarEvent[]
  /** Callback when date is clicked */
  onDateClick?: (date: Date) => void
  /** Callback when event is clicked */
  onEventClick?: (event: CalendarEvent) => void
  /** Whether to show week numbers */
  showWeekNumbers?: boolean
  /** Working hours (24-hour format) */
  workingHours?: { start: number; end: number }
  /** Additional classes */
  className?: string
}

export function MonthlyCalendar({
  date = new Date(),
  events = [],
  onDateClick,
  onEventClick,
  showWeekNumbers = false,
  className,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(date)

  // Get calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    
    // Start of calendar (might be previous month)
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay())
    
    // End of calendar (might be next month)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 41) // 6 weeks * 7 days
    
    const days: Date[] = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return {
      days,
      firstDay,
      lastDay,
      monthName: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
  }, [currentDate])

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  return (
    <div className={cn('bg-white rounded-lg border border-neutral-200', className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-900">
          {calendarData.monthName}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="p-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="p-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs font-medium text-neutral-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.days.map((day, index) => {
            const dayEvents = getEventsForDate(day)
            return (
              <div
                key={index}
                className={cn(
                  'min-h-[80px] p-1 border border-neutral-100 rounded cursor-pointer transition-colors',
                  {
                    'bg-neutral-50 text-neutral-400': !isCurrentMonth(day),
                    'bg-white hover:bg-neutral-50': isCurrentMonth(day),
                    'bg-primary-50 border-primary-200': isToday(day),
                  }
                )}
                onClick={() => onDateClick?.(day)}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-sm font-medium',
                    {
                      'text-primary-600': isToday(day),
                      'text-neutral-400': !isCurrentMonth(day),
                      'text-neutral-900': isCurrentMonth(day) && !isToday(day),
                    }
                  )}>
                    {day.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-xs text-neutral-500">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Events */}
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        'text-xs px-1 py-0.5 rounded truncate cursor-pointer',
                        event.color ? `bg-${event.color}-100 text-${event.color}-800` : 'bg-blue-100 text-blue-800',
                        {
                          'bg-green-100 text-green-800 border border-green-200': event.isAIGenerated,
                        }
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                      title={event.title}
                    >
                      {event.isAIGenerated && '🤖 '}
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-neutral-500 px-1">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export interface WeeklyCalendarProps extends CalendarProps {
  /** Hour format (12 or 24) */
  hourFormat?: 12 | 24
}

export function WeeklyCalendar({
  date = new Date(),
  events = [],
  onDateClick,
  onEventClick,
  workingHours = { start: 9, end: 17 },
  hourFormat = 24,
  className,
}: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(date)

  // Get week data
  const weekData = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    
    const hours: number[] = []
    for (let i = 0; i < 24; i++) {
      hours.push(i)
    }
    
    return { days, hours, startOfWeek }
  }, [currentDate])

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  const formatHour = (hour: number) => {
    if (hourFormat === 12) {
      if (hour === 0) return '12 AM'
      if (hour === 12) return '12 PM'
      return hour > 12 ? `${hour - 12} PM` : `${hour} AM`
    }
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const getEventsForTimeSlot = (day: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      const slotStart = new Date(day)
      slotStart.setHours(hour, 0, 0, 0)
      const slotEnd = new Date(day)
      slotEnd.setHours(hour + 1, 0, 0, 0)
      
      return (
        eventStart.getDate() === day.getDate() &&
        eventStart.getMonth() === day.getMonth() &&
        eventStart.getFullYear() === day.getFullYear() &&
        eventStart < slotEnd &&
        eventEnd > slotStart
      )
    })
  }

  const isWorkingHour = (hour: number) => {
    return hour >= workingHours.start && hour < workingHours.end
  }

  return (
    <div className={cn('bg-white rounded-lg border border-neutral-200', className)}>
      {/* Week Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-900">
          Week of {weekData.startOfWeek.toLocaleDateString()}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('prev')}
            className="p-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('next')}
            className="p-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="overflow-auto max-h-96">
        <div className="grid grid-cols-8 gap-px bg-neutral-200">
          {/* Time Column Header */}
          <div className="bg-white p-2 border-r border-neutral-200">
            <div className="text-xs font-medium text-neutral-500">Time</div>
          </div>
          
          {/* Day Headers */}
          {weekData.days.map((day) => (
            <div
              key={day.getTime()}
              className="bg-white p-2 text-center cursor-pointer hover:bg-neutral-50"
              onClick={() => onDateClick?.(day)}
            >
              <div className="text-xs font-medium text-neutral-500">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-lg font-semibold text-neutral-900">
                {day.getDate()}
              </div>
            </div>
          ))}

          {/* Time Slots */}
          {weekData.hours.map((hour) => (
            <div key={hour} className="contents">
              {/* Time Label */}
              <div className="bg-white p-2 border-r border-neutral-200 text-xs text-neutral-500">
                {formatHour(hour)}
              </div>
              
              {/* Day Columns */}
              {weekData.days.map((day) => {
                const timeSlotEvents = getEventsForTimeSlot(day, hour)
                return (
                  <div
                    key={`${day.getTime()}-${hour}`}
                    className={cn(
                      'bg-white p-1 min-h-[60px] border-b border-neutral-100',
                      {
                        'bg-blue-50': isWorkingHour(hour),
                        'bg-neutral-50': !isWorkingHour(hour),
                      }
                    )}
                  >
                    {timeSlotEvents.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          'text-xs p-1 mb-1 rounded cursor-pointer',
                          event.color ? `bg-${event.color}-100 text-${event.color}-800` : 'bg-blue-100 text-blue-800',
                          {
                            'bg-green-100 text-green-800 border border-green-200': event.isAIGenerated,
                          }
                        )}
                        onClick={() => onEventClick?.(event)}
                        title={`${event.title}\n${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}`}
                      >
                        {event.isAIGenerated && '🤖 '}
                        {event.title}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export interface DailyCalendarProps extends CalendarProps {
  /** Hour format (12 or 24) */
  hourFormat?: 12 | 24
  /** Time slot interval in minutes */
  intervalMinutes?: 15 | 30 | 60
}

export function DailyCalendar({
  date = new Date(),
  events = [],
  onDateClick,
  onEventClick,
  workingHours = { start: 9, end: 17 },
  hourFormat = 24,
  intervalMinutes = 30,
  className,
}: DailyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(date)

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: Date[] = []
    const start = new Date(currentDate)
    start.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < (24 * 60) / intervalMinutes; i++) {
      const slot = new Date(start)
      slot.setMinutes(start.getMinutes() + (i * intervalMinutes))
      slots.push(slot)
    }
    
    return slots
  }, [currentDate, intervalMinutes])

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  const formatTimeSlot = (slot: Date) => {
    const hour = slot.getHours()
    const minute = slot.getMinutes()
    
    if (hourFormat === 12) {
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  const getEventsForSlot = (slot: Date) => {
    const slotEnd = new Date(slot.getTime() + intervalMinutes * 60000)
    
    return events.filter(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      
      return (
        eventStart.getDate() === slot.getDate() &&
        eventStart.getMonth() === slot.getMonth() &&
        eventStart.getFullYear() === slot.getFullYear() &&
        eventStart < slotEnd &&
        eventEnd > slot
      )
    })
  }

  const isWorkingSlot = (slot: Date) => {
    const hour = slot.getHours()
    return hour >= workingHours.start && hour < workingHours.end
  }

  return (
    <div className={cn('bg-white rounded-lg border border-neutral-200', className)}>
      {/* Day Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-900">
          {currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDay('prev')}
            className="p-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDay('next')}
            className="p-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Time Slots */}
      <div className="overflow-auto max-h-96">
        <div className="space-y-px">
          {timeSlots.map((slot) => {
            const slotEvents = getEventsForSlot(slot)
            return (
              <div
                key={slot.getTime()}
                className={cn(
                  'flex border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer',
                  {
                    'bg-blue-50': isWorkingSlot(slot),
                    'bg-neutral-25': !isWorkingSlot(slot),
                  }
                )}
                onClick={() => onDateClick?.(slot)}
              >
                <div className="w-20 p-2 text-xs text-neutral-500 border-r border-neutral-200">
                  {formatTimeSlot(slot)}
                </div>
                <div className="flex-1 p-2 min-h-[50px]">
                  {slotEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        'text-xs p-2 mb-1 rounded cursor-pointer',
                        event.color ? `bg-${event.color}-100 text-${event.color}-800` : 'bg-blue-100 text-blue-800',
                        {
                          'bg-green-100 text-green-800 border border-green-200': event.isAIGenerated,
                        }
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                    >
                      <div className="font-medium">
                        {event.isAIGenerated && '🤖 '}
                        {event.title}
                      </div>
                      <div className="text-neutral-600 mt-1">
                        {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {event.location && (
                        <div className="text-neutral-500 mt-1">📍 {event.location}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}