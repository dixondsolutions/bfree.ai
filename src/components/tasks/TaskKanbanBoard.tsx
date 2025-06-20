'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EmailViewer } from '@/components/email/EmailViewer'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { 
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Zap,
  Brain,
  Timer,
  User,
  Calendar,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  Check,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

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
  created_at: string
  updated_at: string
}

interface TaskKanbanBoardProps {
  className?: string
  onTaskUpdate?: (task: Task) => void
  onTaskCreate?: (task: Partial<Task>) => void
  filters?: {
    category?: string
    priority?: string
    ai_generated?: boolean
  }
}

const statusColumns = [
  { id: 'pending', title: 'To Do', icon: Circle, color: 'text-gray-600' },
  { id: 'in_progress', title: 'In Progress', icon: Clock, color: 'text-blue-600' },
  { id: 'completed', title: 'Completed', icon: CheckCircle2, color: 'text-green-600' },
  { id: 'blocked', title: 'Blocked', icon: AlertCircle, color: 'text-red-600' }
]

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

export function TaskKanbanBoard({ 
  className, 
  onTaskUpdate, 
  onTaskCreate,
  filters = {}
}: TaskKanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [viewingEmailTaskId, setViewingEmailTaskId] = useState<string | null>(null)

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        status: 'pending,in_progress,completed,blocked',
        limit: '100'
      })

      if (filters.category) params.append('category', filters.category)
      if (filters.priority) params.append('priority', filters.priority)

      const response = await fetch(`/api/tasks?${params}`)
      const data = await response.json()

      if (data.success) {
        let tasksData = data.tasks || []
        
        // Apply AI filter if specified
        if (filters.ai_generated !== undefined) {
          tasksData = tasksData.filter((task: Task) => task.ai_generated === filters.ai_generated)
        }

        setTasks(tasksData)
      } else {
        setError(data.error || 'Failed to load tasks')
      }
    } catch (err) {
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Update task status
  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const updatedTask = tasks.find(t => t.id === taskId)
        if (updatedTask) {
          const newTask = { ...updatedTask, status: newStatus }
          setTasks(tasks.map(t => t.id === taskId ? newTask : t))
          onTaskUpdate?.(newTask)
        }
      }
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  // Group tasks by status
  const tasksByStatus = statusColumns.reduce((acc, column) => {
    acc[column.id] = tasks.filter(task => task.status === column.id)
    return acc
  }, {} as Record<string, Task[]>)

  // Handle drag and drop
  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault()
    if (draggedTask && draggedTask.status !== newStatus) {
      updateTaskStatus(draggedTask.id, newStatus)
    }
    setDraggedTask(null)
  }

  // Quick actions
  const handleQuickAction = (task: Task, action: 'start' | 'pause' | 'complete') => {
    let newStatus: Task['status']
    switch (action) {
      case 'start':
        newStatus = 'in_progress'
        break
      case 'pause':
        newStatus = 'pending'
        break
      case 'complete':
        newStatus = 'completed'
        break
      default:
        return
    }
    updateTaskStatus(task.id, newStatus)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Task Card Component
  const TaskCard = ({ task }: { task: Task }) => {
    const PriorityIcon = priorityIcons[task.priority]
    const isOverdue = task.due_date && new Date(task.due_date) < new Date()

    return (
      <Card
        draggable
        onDragStart={() => handleDragStart(task)}
        className={cn(
          "cursor-move transition-all duration-200 hover:shadow-md",
          task.status === 'completed' && "opacity-75",
          isOverdue && task.status !== 'completed' && "border-red-300 bg-red-50"
        )}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 
                  className={cn(
                    "font-medium text-sm cursor-pointer hover:text-primary",
                    task.status === 'completed' && "line-through text-gray-500"
                  )}
                  onClick={() => setSelectedTask(task)}
                >
                  {task.title}
                </h4>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => setEditingTask(task)}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1 flex-wrap">
              <Badge className={cn("text-xs", priorityColors[task.priority])}>
                <PriorityIcon className="h-2 w-2 mr-1" />
                {task.priority}
              </Badge>
              
              {task.ai_generated && (
                <Badge variant="outline" className="text-xs">
                  <Brain className="h-2 w-2 mr-1" />
                  AI
                </Badge>
              )}
              
              {task.category && (
                <Badge variant="secondary" className="text-xs">
                  {task.category}
                </Badge>
              )}
              
              {task.source_email_record_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-blue-600 hover:text-blue-800"
                  onClick={(e) => {
                    e.stopPropagation()
                    setViewingEmailTaskId(task.id)
                  }}
                  title="View source email"
                >
                  <Mail className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-1 text-xs text-muted-foreground">
              {task.estimated_duration && (
                <div className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {formatDuration(task.estimated_duration)}
                </div>
              )}
              
              {task.due_date && (
                <div className={cn(
                  "flex items-center gap-1",
                  isOverdue && task.status !== 'completed' && "text-red-600"
                )}>
                  <Calendar className="h-3 w-3" />
                  Due {format(new Date(task.due_date), 'MMM d')}
                </div>
              )}
              
              {task.scheduled_start && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(task.scheduled_start), 'h:mm a')}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              {task.status === 'pending' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => handleQuickAction(task, 'start')}
                >
                  <Play className="h-2 w-2 mr-1" />
                  Start
                </Button>
              )}
              
              {task.status === 'in_progress' && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => handleQuickAction(task, 'pause')}
                  >
                    <Pause className="h-2 w-2 mr-1" />
                    Pause
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => handleQuickAction(task, 'complete')}
                  >
                    <Check className="h-2 w-2 mr-1" />
                    Done
                  </Button>
                </>
              )}
              
              {task.confidence_score && (
                <Badge variant="outline" className="text-xs ml-auto">
                  {Math.round(task.confidence_score * 100)}%
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Loading tasks...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-4" />
        <p className="font-medium">{error}</p>
        <Button variant="outline" onClick={loadTasks} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Board</h2>
          <p className="text-muted-foreground">
            {tasks.length} tasks • {tasks.filter(t => t.ai_generated).length} AI generated
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusColumns.map(column => {
          const Icon = column.icon
          const columnTasks = tasksByStatus[column.id] || []
          
          return (
            <Card key={column.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className={cn("text-sm flex items-center gap-2", column.color)}>
                  <Icon className="h-4 w-4" />
                  {column.title}
                  <Badge variant="secondary" className="ml-auto">
                    {columnTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent 
                className="flex-1 space-y-3 min-h-[400px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id as Task['status'])}
              >
                {columnTasks.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No {column.title.toLowerCase()}</p>
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription className="sr-only">
              View and manage detailed information for the selected task
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
                {selectedTask.description && (
                  <p className="text-muted-foreground mt-2">{selectedTask.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge className="ml-2">{selectedTask.status.replace('_', ' ')}</Badge>
                </div>
                <div>
                  <span className="font-medium">Priority:</span>
                  <Badge className={cn("ml-2", priorityColors[selectedTask.priority])}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Category:</span>
                  <p>{selectedTask.category}</p>
                </div>
                {selectedTask.estimated_duration && (
                  <div>
                    <span className="font-medium">Duration:</span>
                    <p>{formatDuration(selectedTask.estimated_duration)}</p>
                  </div>
                )}
                {selectedTask.due_date && (
                  <div>
                    <span className="font-medium">Due Date:</span>
                    <p>{format(new Date(selectedTask.due_date), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                )}
                {selectedTask.scheduled_start && (
                  <div>
                    <span className="font-medium">Scheduled:</span>
                    <p>{format(new Date(selectedTask.scheduled_start), 'MMM d, yyyy h:mm a')}</p>
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
                  {selectedTask.source_email_record_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      onClick={() => {
                        setViewingEmailTaskId(selectedTask.id)
                        setSelectedTask(null)
                      }}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      View Email
                    </Button>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditingTask(selectedTask)
                    setSelectedTask(null)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedTask(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Viewer Modal */}
      {viewingEmailTaskId && (
        <Dialog open={!!viewingEmailTaskId} onOpenChange={() => setViewingEmailTaskId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Source Email</DialogTitle>
              <DialogDescription className="sr-only">
                View the original email that generated this task
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-auto max-h-[80vh]">
              {(() => {
                const task = tasks.find(t => t.id === viewingEmailTaskId)
                if (task?.source_email_record_id) {
                  return (
                    <EmailViewer 
                      emailId={task.source_email_record_id}
                      onClose={() => setViewingEmailTaskId(null)}
                    />
                  )
                }
                return (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Email not found or not available</p>
                  </div>
                )
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}