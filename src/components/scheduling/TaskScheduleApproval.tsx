'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  X, 
  Edit3,
  AlertTriangle,
  Zap
} from 'lucide-react'
import { format, addMinutes } from 'date-fns'

interface PendingTask {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_duration: number
  category?: string
  ai_generated: boolean
  confidence_score?: number
  suggested_start?: string
  suggested_end?: string
  conflicts_detected?: boolean
  conflicting_events?: any[]
}

interface TaskScheduleApprovalProps {
  onApproveSchedule: (taskId: string, scheduleData: any) => Promise<void>
  onRejectSchedule: (taskId: string) => Promise<void>
  onModifySchedule: (taskId: string, newStart: Date, newEnd: Date) => Promise<void>
}

export function TaskScheduleApproval({ 
  onApproveSchedule, 
  onRejectSchedule, 
  onModifySchedule 
}: TaskScheduleApprovalProps) {
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPendingTasks()
  }, [])

  const fetchPendingTasks = async () => {
    try {
      setLoading(true)
      // Get tasks that need scheduling approval
      const response = await fetch('/api/tasks?status=pending_schedule&ai_generated=true')
      if (response.ok) {
        const data = await response.json()
        setPendingTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching pending tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (task: PendingTask) => {
    if (!task.suggested_start || !task.suggested_end) return
    
    setProcessingIds(prev => new Set(prev).add(task.id))
    
    try {
      await onApproveSchedule(task.id, {
        scheduled_start: task.suggested_start,
        scheduled_end: task.suggested_end,
        status: 'scheduled'
      })
      
      // Remove from pending list
      setPendingTasks(prev => prev.filter(t => t.id !== task.id))
    } catch (error) {
      console.error('Error approving schedule:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }

  const handleReject = async (task: PendingTask) => {
    setProcessingIds(prev => new Set(prev).add(task.id))
    
    try {
      await onRejectSchedule(task.id)
      
      // Remove from pending list
      setPendingTasks(prev => prev.filter(t => t.id !== task.id))
    } catch (error) {
      console.error('Error rejecting schedule:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }

  const handleModify = async (task: PendingTask, timeAdjustment: number) => {
    if (!task.suggested_start) return
    
    setProcessingIds(prev => new Set(prev).add(task.id))
    
    try {
      const currentStart = new Date(task.suggested_start)
      const newStart = addMinutes(currentStart, timeAdjustment)
      const newEnd = addMinutes(newStart, task.estimated_duration)
      
      await onModifySchedule(task.id, newStart, newEnd)
      
      // Update the task in the list
      setPendingTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { 
              ...t, 
              suggested_start: newStart.toISOString(), 
              suggested_end: newEnd.toISOString() 
            }
          : t
      ))
    } catch (error) {
      console.error('Error modifying schedule:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }

  const handleBulkApprove = async () => {
    const tasksToApprove = pendingTasks.filter(t => 
      t.suggested_start && t.suggested_end && !t.conflicts_detected
    )
    
    for (const task of tasksToApprove) {
      await handleApprove(task)
    }
  }

  const priorityColors = {
    urgent: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-green-500 text-white'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Task Scheduling Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading pending tasks...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (pendingTasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Task Scheduling Approval
          </CardTitle>
          <CardDescription>
            AI-generated tasks that need scheduling approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              No tasks are waiting for scheduling approval.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Task Scheduling Approval
            </CardTitle>
            <CardDescription>
              {pendingTasks.length} AI-generated tasks need scheduling approval
            </CardDescription>
          </div>
          
          {pendingTasks.some(t => !t.conflicts_detected) && (
            <Button 
              variant="default"
              onClick={handleBulkApprove}
              disabled={processingIds.size > 0}
            >
              <Zap className="h-4 w-4 mr-2" />
              Approve All ({pendingTasks.filter(t => !t.conflicts_detected).length})
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {pendingTasks.map((task) => (
            <Card key={task.id} className="border border-neutral-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{task.title}</h4>
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                      {task.ai_generated && (
                        <Badge variant="outline" className="text-xs">
                          AI Generated
                        </Badge>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {task.description}
                      </p>
                    )}

                    {task.suggested_start && task.suggested_end ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {format(new Date(task.suggested_start), 'MMM d, h:mm a')} - {format(new Date(task.suggested_end), 'h:mm a')}
                          </span>
                          <span className="text-muted-foreground">
                            ({task.estimated_duration}m)
                          </span>
                        </div>
                        
                        {task.conflicts_detected && (
                          <div className="flex items-center gap-2 text-sm text-orange-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Scheduling conflict detected</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No suggested time available
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* Time adjustment buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleModify(task, -60)}
                        disabled={processingIds.has(task.id)}
                        className="text-xs px-2 py-1"
                      >
                        -1h
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleModify(task, 60)}
                        disabled={processingIds.has(task.id)}
                        className="text-xs px-2 py-1"
                      >
                        +1h
                      </Button>
                    </div>

                    {/* Main action buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(task)}
                        disabled={processingIds.has(task.id) || !task.suggested_start}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(task)}
                        disabled={processingIds.has(task.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>

                {processingIds.has(task.id) && (
                  <div className="mt-4 flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Processing...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}