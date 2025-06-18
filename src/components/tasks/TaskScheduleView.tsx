'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Zap,
  Mail,
  AlertCircle,
  ChevronRight,
  Timer,
  Plus,
  RotateCcw,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, startOfDay, endOfDay, addDays, isSameDay } from 'date-fns'

interface Task {
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
  source_email_id?: string
  source_email_record_id?: string
  confidence_score?: number
  energy_level?: number
  tags?: string[]
  subtasks?: Task[]
  created_at: string
  updated_at: string
}

interface TaskScheduleViewProps {
  className?: string
  selectedDate?: Date
  onDateChange?: (date: Date) => void
}

interface DailySchedule {
  date: Date
  tasks: Task[]
  totalTasks: number
  completedTasks: number
  estimatedDuration: number
  completedDuration: number
}

const priorityColors = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  low: 'bg-gray-100 text-gray-800 border-gray-200'
}

const priorityIcons = {
  urgent: AlertCircle,
  high: Zap,
  medium: Circle,
  low: Circle
}

export function TaskScheduleView({ className, selectedDate = new Date(), onDateChange }: TaskScheduleViewProps) {
  const [schedule, setSchedule] = useState<DailySchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingTask, setUpdatingTask] = useState<string | null>(null)

  useEffect(() => {
    loadDailySchedule(selectedDate)
  }, [selectedDate])

  const loadDailySchedule = async (date: Date) => {
    try {
      setLoading(true)
      setError(null)

      const startDate = startOfDay(date).toISOString()
      const endDate = endOfDay(date).toISOString()
      
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        include_subtasks: 'true',
        status: 'pending,in_progress,completed'
      })

      const response = await fetch(`/api/tasks?${params}`)
      const data = await response.json()

      if (data.success) {
        const dayTasks = data.tasks || []
        const completedTasks = dayTasks.filter((task: Task) => task.status === 'completed')
        const totalDuration = dayTasks.reduce((sum: number, task: Task) => sum + (task.estimated_duration || 0), 0)
        const completedDuration = completedTasks.reduce((sum: number, task: Task) => sum + (task.estimated_duration || 0), 0)

        setSchedule({
          date,
          tasks: dayTasks,
          totalTasks: dayTasks.length,
          completedTasks: completedTasks.length,
          estimatedDuration: totalDuration,
          completedDuration: completedDuration
        })
      } else {
        setError(data.error || 'Failed to load schedule')
      }
    } catch (err) {
      setError('Network error loading schedule')
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      setUpdatingTask(taskId)
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()
      
      if (data.success) {
        // Reload the schedule to reflect changes
        await loadDailySchedule(selectedDate)
      } else {
        setError(data.error || 'Failed to update task')
      }
    } catch (err) {
      setError('Network error updating task')
    } finally {
      setUpdatingTask(null)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const getTaskIcon = (task: Task) => {
    if (task.status === 'completed') return CheckCircle2
    if (task.ai_generated) return Mail
    return priorityIcons[task.priority]
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = addDays(selectedDate, direction === 'next' ? 1 : -1)
    onDateChange?.(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    onDateChange?.(today)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !schedule) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            {error || 'Failed to load schedule'}
          </div>
          <Button 
            variant="outline" 
            onClick={() => loadDailySchedule(selectedDate)}
            className="mt-4"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const completionPercentage = schedule.totalTasks > 0 
    ? Math.round((schedule.completedTasks / schedule.totalTasks) * 100) 
    : 0

  const timeProgress = schedule.estimatedDuration > 0
    ? Math.round((schedule.completedDuration / schedule.estimatedDuration) * 100)
    : 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(selectedDate, 'EEEE, MMMM d')}
              </CardTitle>
              <CardDescription>
                {isSameDay(selectedDate, new Date()) 
                  ? "Today's schedule" 
                  : format(selectedDate, 'yyyy')
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                disabled={isSameDay(selectedDate, new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
              >
                →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Tasks Completed</span>
                <span className="font-medium">
                  {schedule.completedTasks} / {schedule.totalTasks}
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
              <div className="text-xs text-gray-600">
                {completionPercentage}% complete
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Time Progress</span>
                <span className="font-medium">
                  {formatDuration(schedule.completedDuration)} / {formatDuration(schedule.estimatedDuration)}
                </span>
              </div>
              <Progress value={timeProgress} className="h-2" />
              <div className="text-xs text-gray-600">
                {timeProgress}% of estimated time
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Badge
                variant={completionPercentage === 100 ? "default" : "secondary"}
                className="text-lg py-2 px-4"
              >
                {completionPercentage === 100 ? "Day Complete!" : `${schedule.totalTasks - schedule.completedTasks} remaining`}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="space-y-3">
        {schedule.tasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No tasks scheduled</h3>
                <p className="text-sm">
                  {isSameDay(selectedDate, new Date()) 
                    ? "You have no tasks scheduled for today." 
                    : "No tasks are scheduled for this date."
                  }
                </p>
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          schedule.tasks.map((task) => {
            const Icon = getTaskIcon(task)
            const isCompleted = task.status === 'completed'
            const isInProgress = task.status === 'in_progress'
            const isUpdating = updatingTask === task.id

            return (
              <Card 
                key={task.id} 
                className={cn(
                  "transition-all duration-200",
                  isCompleted && "opacity-75 bg-green-50 border-green-200",
                  isInProgress && "border-blue-300 bg-blue-50",
                  isUpdating && "opacity-50"
                )}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateTaskStatus(task.id, 'completed')
                        } else {
                          updateTaskStatus(task.id, 'pending')
                        }
                      }}
                      disabled={isUpdating}
                      className="mt-1"
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn(
                          "h-4 w-4",
                          isCompleted && "text-green-600",
                          isInProgress && "text-blue-600",
                          task.priority === 'urgent' && "text-red-600",
                          task.priority === 'high' && "text-orange-600"
                        )} />
                        <h3 className={cn(
                          "font-medium",
                          isCompleted && "line-through text-gray-600"
                        )}>
                          {task.title}
                        </h3>
                        {task.ai_generated && (
                          <Badge variant="secondary" className="text-xs">
                            AI
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", priorityColors[task.priority])}
                        >
                          {task.priority.toUpperCase()}
                        </Badge>
                      </div>

                      {task.description && (
                        <p className={cn(
                          "text-sm text-gray-600",
                          isCompleted && "line-through"
                        )}>
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {task.estimated_duration && (
                          <div className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {formatDuration(task.estimated_duration)}
                          </div>
                        )}
                        {task.scheduled_start && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.scheduled_start), 'h:mm a')}
                          </div>
                        )}
                        {task.category && (
                          <Badge variant="outline" className="text-xs">
                            {task.category}
                          </Badge>
                        )}
                        {task.source_email_record_id && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            From email
                          </div>
                        )}
                      </div>

                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium text-gray-700">
                            Subtasks ({task.subtasks.filter(st => st.status === 'completed').length}/{task.subtasks.length})
                          </div>
                          {task.subtasks.slice(0, 3).map((subtask) => (
                            <div key={subtask.id} className="flex items-center gap-2 pl-4 border-l-2 border-gray-200">
                              <Checkbox
                                checked={subtask.status === 'completed'}
                                onCheckedChange={(checked) => {
                                  updateTaskStatus(subtask.id, checked ? 'completed' : 'pending')
                                }}
                                size="sm"
                              />
                              <span className={cn(
                                "text-sm",
                                subtask.status === 'completed' && "line-through text-gray-500"
                              )}>
                                {subtask.title}
                              </span>
                            </div>
                          ))}
                          {task.subtasks.length > 3 && (
                            <div className="text-xs text-gray-500 pl-4">
                              +{task.subtasks.length - 3} more subtasks
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      {!isCompleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateTaskStatus(task.id, isInProgress ? 'pending' : 'in_progress')}
                          disabled={isUpdating}
                        >
                          {isInProgress ? 'Pause' : 'Start'}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Quick Actions */}
      {schedule.tasks.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Quick actions for today
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Mark All Complete
                </Button>
                <Button variant="outline" size="sm">
                  Reschedule Remaining
                </Button>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}