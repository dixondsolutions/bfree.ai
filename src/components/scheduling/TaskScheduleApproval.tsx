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

  // Smart scheduling algorithm that avoids conflicts and spaces tasks properly
  const generateScheduleSuggestion = async (task: PendingTask, existingSchedules: Array<{start: Date, end: Date}> = []) => {
    const now = new Date()
    const duration = task.estimated_duration || 60
    
    // Define working hours
    const workingHours = { start: 9, end: 17 } // 9 AM to 5 PM
    
    // Get starting point based on priority
    let startDate = new Date(now)
    if (task.priority === 'urgent') {
      // Try to schedule urgent tasks today if possible
      if (now.getHours() < workingHours.end) {
        startDate = new Date(now.getTime() + 15 * 60000) // 15 minutes from now
      } else {
        startDate.setDate(startDate.getDate() + 1)
        startDate.setHours(workingHours.start, 0, 0, 0)
      }
    } else {
      // Start from tomorrow for non-urgent tasks
      startDate.setDate(startDate.getDate() + 1)
      startDate.setHours(workingHours.start, 0, 0, 0)
      
      // Offset by priority
      if (task.priority === 'low') {
        startDate.setDate(startDate.getDate() + 1) // Day after tomorrow
      }
    }
    
    // Find the next available time slot
    const findNextAvailableSlot = (candidateStart: Date): Date => {
      const candidateEnd = new Date(candidateStart.getTime() + duration * 60000)
      
      // Check if within working hours
      if (candidateStart.getHours() < workingHours.start) {
        candidateStart.setHours(workingHours.start, 0, 0, 0)
        return findNextAvailableSlot(candidateStart)
      }
      
      if (candidateEnd.getHours() > workingHours.end || 
          (candidateEnd.getHours() === workingHours.end && candidateEnd.getMinutes() > 0)) {
        // Move to next day
        const nextDay = new Date(candidateStart)
        nextDay.setDate(nextDay.getDate() + 1)
        nextDay.setHours(workingHours.start, 0, 0, 0)
        return findNextAvailableSlot(nextDay)
      }
      
      // Check for conflicts with existing schedules
      const hasConflict = existingSchedules.some(existing => {
        return candidateStart < existing.end && candidateEnd > existing.start
      })
      
      if (hasConflict) {
        // Find the end time of the conflicting appointment and add buffer
        const conflictingEnd = Math.max(...existingSchedules
          .filter(existing => candidateStart < existing.end && candidateEnd > existing.start)
          .map(existing => existing.end.getTime()))
        
        const nextSlot = new Date(conflictingEnd + 15 * 60000) // 15-minute buffer
        return findNextAvailableSlot(nextSlot)
      }
      
      return candidateStart
    }
    
    const finalStart = findNextAvailableSlot(startDate)
    const finalEnd = new Date(finalStart.getTime() + duration * 60000)
    
    return {
      scheduled_start: finalStart.toISOString(),
      scheduled_end: finalEnd.toISOString()
    }
  }

  const handleScheduleNow = async (task: PendingTask) => {
    setProcessingIds(prev => new Set(prev).add(task.id))
    
    try {
      // Get existing schedules to avoid conflicts
      const existingSchedules = await getExistingSchedules()
      const schedule = await generateScheduleSuggestion(task, existingSchedules)
      
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

  // Helper function to get existing schedules from calendar
  const getExistingSchedules = async (): Promise<Array<{start: Date, end: Date}>> => {
    try {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 14) // Next 2 weeks
      
      const response = await fetch(`/api/calendar/events?start_date=${new Date().toISOString()}&end_date=${endDate.toISOString()}`)
      if (!response.ok) return []
      
      const data = await response.json()
      const events = data.events || []
      
      return events.map((event: any) => ({
        start: new Date(event.start),
        end: new Date(event.end)
      })).filter((schedule: any) => !isNaN(schedule.start.getTime()))
    } catch (error) {
      console.error('Error fetching existing schedules:', error)
      return []
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
    
    if (tasksToSchedule.length === 0) return
    
    // Set all tasks as processing
    const taskIds = new Set(tasksToSchedule.map(t => t.id))
    setProcessingIds(prev => new Set([...prev, ...taskIds]))
    
    try {
      // Get existing schedules once for all tasks
      const existingSchedules = await getExistingSchedules()
      
      // Sort tasks by priority and then by estimated duration
      const sortedTasks = [...tasksToSchedule].sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        const aPriority = priorityOrder[a.priority] || 2
        const bPriority = priorityOrder[b.priority] || 2
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority // Higher priority first
        }
        
        // If same priority, shorter tasks first for better packing
        const aDuration = a.estimated_duration || 60
        const bDuration = b.estimated_duration || 60
        return aDuration - bDuration
      })
      
      // Schedule tasks sequentially, each task aware of previous schedules
      const allSchedules = [...existingSchedules]
      const schedulingResults = []
      
      for (const task of sortedTasks) {
        try {
          const schedule = await generateScheduleSuggestion(task, allSchedules)
          
          const response = await fetch(`/api/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...schedule,
              status: 'pending'
            })
          })
          
          if (response.ok) {
            // Add this new schedule to the list for subsequent tasks
            allSchedules.push({
              start: new Date(schedule.scheduled_start),
              end: new Date(schedule.scheduled_end)
            })
            
            schedulingResults.push({
              task: task.title,
              scheduled: true,
              start: schedule.scheduled_start,
              end: schedule.scheduled_end
            })
          } else {
            schedulingResults.push({
              task: task.title,
              scheduled: false,
              error: 'Failed to update task'
            })
          }
        } catch (error) {
          schedulingResults.push({
            task: task.title,
            scheduled: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      // Remove successfully scheduled tasks from pending list
      const successfullyScheduled = schedulingResults
        .filter(r => r.scheduled)
        .map(r => r.task)
      
      setPendingTasks(prev => prev.filter(t => !successfullyScheduled.includes(t.title)))
      
      console.log('Bulk scheduling completed:', schedulingResults)
      
    } catch (error) {
      console.error('Error in bulk scheduling:', error)
    } finally {
      // Clear processing state
      setProcessingIds(prev => {
        const next = new Set(prev)
        taskIds.forEach(id => next.delete(id))
        return next
      })
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
              {pendingTasks.length} AI-generated tasks ready for intelligent scheduling
            </CardDescription>
          </div>
          
          {pendingTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <Button 
                variant="default"
                onClick={handleBulkSchedule}
                disabled={processingIds.size > 0}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                {processingIds.size > 0 ? 'Scheduling...' : `Auto-Schedule All (${pendingTasks.length})`}
              </Button>
              <div className="text-xs text-muted-foreground">
                Tasks will be intelligently spaced with realistic durations
              </div>
            </div>
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
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        <span className="text-muted-foreground">
                          Will be scheduled based on {task.priority} priority
                        </span>
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
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {processingIds.has(task.id) ? 'Scheduling...' : 'Schedule Now'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismiss(task)}
                        disabled={processingIds.has(task.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Skip
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