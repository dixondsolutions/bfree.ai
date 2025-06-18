'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, CheckCircle, Clock, Mail, Calendar, Plus, Edit3 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'task_completed' | 'task_created' | 'email_processed' | 'calendar_event' | 'task_updated'
  title: string
  description: string
  timestamp: Date
  metadata?: any
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'task_completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'task_created':
      return <Plus className="h-4 w-4 text-blue-500" />
    case 'task_updated':
      return <Edit3 className="h-4 w-4 text-orange-500" />
    case 'email_processed':
      return <Mail className="h-4 w-4 text-purple-500" />
    case 'calendar_event':
      return <Calendar className="h-4 w-4 text-indigo-500" />
    default:
      return <Activity className="h-4 w-4 text-gray-500" />
  }
}

const getActivityBadge = (type: string) => {
  switch (type) {
    case 'task_completed':
      return <Badge variant="outline" className="text-green-600 border-green-200">Completed</Badge>
    case 'task_created':
      return <Badge variant="outline" className="text-blue-600 border-blue-200">Created</Badge>
    case 'task_updated':
      return <Badge variant="outline" className="text-orange-600 border-orange-200">Updated</Badge>
    case 'email_processed':
      return <Badge variant="outline" className="text-purple-600 border-purple-200">Email</Badge>
    case 'calendar_event':
      return <Badge variant="outline" className="text-indigo-600 border-indigo-200">Calendar</Badge>
    default:
      return <Badge variant="outline">Activity</Badge>
  }
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      // For now, use mock data since API endpoints might not be fully set up
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          type: 'task_completed',
          title: 'Review Q4 budget proposal',
          description: 'Completed the quarterly budget review task',
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          metadata: { category: 'work', priority: 'high' }
        },
        {
          id: '2',
          type: 'email_processed',
          title: 'Meeting invitation from Sarah',
          description: 'AI processed email and suggested calendar booking',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          metadata: { emailId: 'email_123', confidence: 0.85 }
        },
        {
          id: '3',
          type: 'task_created',
          title: 'Prepare presentation slides',
          description: 'New task created from email analysis',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
          metadata: { sourceEmail: true, priority: 'medium' }
        },
        {
          id: '4',
          type: 'calendar_event',
          title: 'Team standup meeting',
          description: 'Automatically synced with Google Calendar',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
          metadata: { duration: '30 minutes' }
        },
        {
          id: '5',
          type: 'task_updated',
          title: 'Update project timeline',
          description: 'Modified due date and priority level',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
          metadata: { changes: ['due_date', 'priority'] }
        },
        {
          id: '6',
          type: 'task_completed',
          title: 'Send client follow-up email',
          description: 'Marked as completed in daily review',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          metadata: { category: 'work' }
        }
      ]
      
      setActivities(mockActivities)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
      setLoading(false)
    }
  }

  const groupActivitiesByDate = (activities: ActivityItem[]) => {
    const groups: { [key: string]: ActivityItem[] } = {}
    
    activities.forEach(activity => {
      const date = activity.timestamp.toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
    })
    
    return groups
  }

  const groupedActivities = groupActivitiesByDate(activities)
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()

  const getDateLabel = (dateString: string) => {
    if (dateString === today) return 'Today'
    if (dateString === yesterday) return 'Yesterday'
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p>Loading activity...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Feed</h1>
          <p className="text-gray-600 mt-2">Track all your recent activities and system updates</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Live Feed
        </Badge>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Tasks Completed</p>
                <p className="text-2xl font-bold">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Tasks Created</p>
                <p className="text-2xl font-bold">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Emails Processed</p>
                <p className="text-2xl font-bold">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Last Active</p>
                <p className="text-sm font-bold">30m ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest tasks, emails, and system activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {Object.keys(groupedActivities)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
              .map(dateString => (
                <div key={dateString} className="space-y-4 mb-8">
                  <div className="sticky top-0 bg-white py-2 border-b">
                    <h3 className="font-semibold text-lg">{getDateLabel(dateString)}</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {groupedActivities[dateString]
                      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                      .map(activity => (
                        <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex-shrink-0 mt-1">
                            {getActivityIcon(activity.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-gray-900 truncate">
                                {activity.title}
                              </h4>
                              {getActivityBadge(activity.type)}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {activity.description}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                              </p>
                              
                              {activity.metadata && (
                                <div className="flex gap-1">
                                  {activity.metadata.priority && (
                                    <Badge variant="outline" className="text-xs">
                                      {activity.metadata.priority}
                                    </Badge>
                                  )}
                                  {activity.metadata.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {activity.metadata.category}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 