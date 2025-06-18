'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar as CalendarIcon, Clock, CheckCircle2, Circle, AlertCircle, Plus, Settings, Filter, Brain, Zap } from 'lucide-react'
import { ModernCalendar } from '@/components/calendar/ModernCalendar'
import { TaskScheduleView } from '@/components/tasks/TaskScheduleView'
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
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks'>('calendar')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null)
  const [showAIScheduling, setShowAIScheduling] = useState(false)

  // AI Scheduling function
  const triggerAIScheduling = useCallback(async () => {
    try {
      setShowAIScheduling(true)
      setLoading(true)
      
      const response = await fetch('/api/ai/process', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'schedule_tasks' })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Show success message or handle result
        console.log('AI Scheduling completed:', result)
      }
    } catch (error) {
      console.error('Error during AI scheduling:', error)
    } finally {
      setLoading(false)
      setShowAIScheduling(false)
    }
  }, [])

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const handleTaskClick = (task: CalendarTask) => {
    setSelectedTask(task)
  }

  const refreshCalendar = () => {
    // Calendar component handles its own data fetching
    window.location.reload() // Simple refresh for now
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Tasks</h1>
          <p className="text-muted-foreground">
            Manage your schedule and tasks with AI-powered insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border p-1">
            <Button
              variant={activeTab === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('calendar')}
              className="text-sm"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button
              variant={activeTab === 'tasks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('tasks')}
              className="text-sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Tasks
            </Button>
          </div>

          {/* Action Buttons */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshCalendar}
            disabled={loading}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button 
            variant="default"
            size="sm"
            onClick={triggerAIScheduling}
            disabled={showAIScheduling}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            {showAIScheduling ? 'Scheduling...' : 'AI Schedule'}
          </Button>
          
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Today's Events</p>
                <p className="text-2xl font-bold">{summary?.calendarEvents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Tasks</p>
                <p className="text-2xl font-bold">{summary?.tasks || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">AI Generated</p>
                <p className="text-2xl font-bold">5</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Hours Scheduled</p>
                <p className="text-2xl font-bold">6.5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {activeTab === 'calendar' ? (
        <ModernCalendar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onEventClick={handleEventClick}
          onTaskClick={handleTaskClick}
          view={view}
          onViewChange={setView}
          className="min-h-[600px]"
        />
      ) : (
        <TaskScheduleView
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          className="min-h-[600px]"
        />
      )}

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedEvent.title}</h3>
                {selectedEvent.description && (
                  <p className="text-muted-foreground">{selectedEvent.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Start:</span>
                  <p>{format(new Date(selectedEvent.start), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {selectedEvent.end && (
                  <div>
                    <span className="font-medium">End:</span>
                    <p>{format(new Date(selectedEvent.end), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                )}
                {selectedEvent.category && (
                  <div>
                    <span className="font-medium">Category:</span>
                    <p>{selectedEvent.category}</p>
                  </div>
                )}
                {selectedEvent.priority && (
                  <div>
                    <span className="font-medium">Priority:</span>
                    <Badge className="ml-2">{selectedEvent.priority}</Badge>
                  </div>
                )}
              </div>
              {selectedEvent.ai_generated && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    AI Generated {selectedEvent.confidence_score && 
                      `(${Math.round(selectedEvent.confidence_score * 100)}% confidence)`
                    }
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedTask.title}</h3>
                {selectedTask.description && (
                  <p className="text-muted-foreground">{selectedTask.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge className="ml-2">{selectedTask.status.replace('_', ' ')}</Badge>
                </div>
                <div>
                  <span className="font-medium">Priority:</span>
                  <Badge className="ml-2">{selectedTask.priority}</Badge>
                </div>
                {selectedTask.estimated_duration && (
                  <div>
                    <span className="font-medium">Duration:</span>
                    <p>{selectedTask.estimated_duration} minutes</p>
                  </div>
                )}
                {selectedTask.category && (
                  <div>
                    <span className="font-medium">Category:</span>
                    <p>{selectedTask.category}</p>
                  </div>
                )}
              </div>
              {selectedTask.ai_generated && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <Brain className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-purple-800">
                    AI Generated from Email {selectedTask.confidence_score && 
                      `(${Math.round(selectedTask.confidence_score * 100)}% confidence)`
                    }
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
