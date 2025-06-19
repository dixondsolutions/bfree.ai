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
  scheduled_start?: string
  scheduled_end?: string
  conflicts_detected?: boolean
  conflicting_events?: any[]
}

interface TaskScheduleApprovalProps {
  // No props needed - component handles its own API calls
}

export function TaskScheduleApproval(props: TaskScheduleApprovalProps = {}) {
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPendingTasks()
  }, [])

  const fetchPendingTasks = async () => {
    try {
      setLoading(true)
      // Get unscheduled tasks that could benefit from scheduling
      const response = await fetch('/api/tasks?status=pending&ai_generated=true')
      if (response.ok) {
        const data = await response.json()
        // Filter to only tasks that don't have a scheduled time yet
        const unscheduledTasks = (data.tasks || []).filter(task => !task.scheduled_start)
        setPendingTasks(unscheduledTasks)
      }
    } catch (error) {
      console.error('Error fetching pending tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateScheduleSuggestion = (task: PendingTask) => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0) // 9 AM tomorrow
    
    const duration = task.estimated_duration || 60
    let suggestedStart = new Date(tomorrow)
    
    // Adjust based on priority
    if (task.priority === 'urgent') {
      if (now.getHours() < 17) {
        suggestedStart = new Date(now.getTime() + 30 * 60000) // 30 minutes from now
      }
    } else if (task.priority === 'high') {
      suggestedStart = tomorrow
    } else {
      suggestedStart.setDate(suggestedStart.getDate() + 1)
    }
    
    const suggestedEnd = new Date(suggestedStart.getTime() + duration * 60000)
    
    return {
      scheduled_start: suggestedStart.toISOString(),
      scheduled_end: suggestedEnd.toISOString()
    }
  }

  const handleScheduleNow = async (task: PendingTask) => {
    setProcessingIds(prev => new Set(prev).add(task.id))
    
    try {
      const schedule = generateScheduleSuggestion(task)
      
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...schedule,
          status: 'pending' // Keep as pending but now with schedule
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to schedule task')
      }
      
      // Remove from pending list
      setPendingTasks(prev => prev.filter(t => t.id !== task.id))
    } catch (error) {
      console.error('Error scheduling task:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }

  const handleDismiss = async (task: PendingTask) => {
    setProcessingIds(prev => new Set(prev).add(task.id))
    
    try {
      // Just remove from the scheduling suggestion list (no API call needed)
      setPendingTasks(prev => prev.filter(t => t.id !== task.id))
    } catch (error) {
      console.error('Error dismissing task:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }

  const handleBulkSchedule = async () => {
    const tasksToSchedule = pendingTasks.filter(t => !processingIds.has(t.id))
    
    for (const task of tasksToSchedule) {
      await handleScheduleNow(task)
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
            AI-generated tasks that could benefit from scheduling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              No unscheduled AI tasks found.
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
              {pendingTasks.length} AI-generated tasks could use scheduling
            </CardDescription>
          </div>
          
          {pendingTasks.length > 0 && (
            <Button 
              variant="default"
              onClick={handleBulkSchedule}
              disabled={processingIds.size > 0}
            >
              <Zap className="h-4 w-4 mr-2" />
              Schedule All ({pendingTasks.length})
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

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Estimated duration: {task.estimated_duration || 60} minutes</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Ready for scheduling
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleScheduleNow(task)}
                        disabled={processingIds.has(task.id)}
                      >
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Schedule
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismiss(task)}
                        disabled={processingIds.has(task.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Dismiss
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