'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, CheckCircle, Plus, Mail, Clock, User, Calendar, Brain, Zap } from 'lucide-react'
import { format, parseISO, isToday, isYesterday, subDays } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'task_created' | 'task_completed' | 'email_processed' | 'calendar_event' | 'ai_suggestion'
  title: string
  description: string
  timestamp: string
  metadata?: any
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'task_completed',
    title: 'Review quarterly budget',
    description: 'Completed financial review task from email analysis',
    timestamp: new Date().toISOString(),
    metadata: { priority: 'high', category: 'finance' }
  },
  {
    id: '2',
    type: 'email_processed',
    title: 'New email from client',
    description: 'AI extracted 2 tasks from John Smith\'s project update email',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    metadata: { email_count: 1, tasks_extracted: 2 }
  },
  {
    id: '3',
    type: 'task_created',
    title: 'Schedule team meeting',
    description: 'AI suggested scheduling from email conversation',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: { ai_generated: true, confidence: 0.85 }
  },
  {
    id: '4',
    type: 'calendar_event',
    title: 'Daily standup meeting',
    description: 'Recurring calendar event started',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    metadata: { duration: 30 }
  },
  {
    id: '5',
    type: 'ai_suggestion',
    title: 'Calendar optimization',
    description: 'AI suggested rescheduling 3 tasks for better time management',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    metadata: { suggestions_count: 3 }
  }
]

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'task_completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case 'task_created':
      return <Plus className="h-5 w-5 text-blue-500" />
    case 'email_processed':
      return <Mail className="h-5 w-5 text-purple-500" />
    case 'calendar_event':
      return <Calendar className="h-5 w-5 text-orange-500" />
    case 'ai_suggestion':
      return <Brain className="h-5 w-5 text-pink-500" />
    default:
      return <Activity className="h-5 w-5 text-gray-500" />
  }
}

const getActivityBadgeColor = (type: string) => {
  switch (type) {
    case 'task_completed':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'task_created':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'email_processed':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'calendar_event':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'ai_suggestion':
      return 'bg-pink-50 text-pink-700 border-pink-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

const formatActivityDate = (timestamp: string) => {
  const date = parseISO(timestamp)
  
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`
  } else {
    return format(date, 'MMM d at h:mm a')
  }
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>(mockActivities)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // In a real app, fetch activities from API
    const fetchActivities = async () => {
      setLoading(true)
      try {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        setActivities(mockActivities)
      } catch (error) {
        console.error('Error fetching activities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = parseISO(activity.timestamp)
    let dateKey: string
    
    if (isToday(date)) {
      dateKey = 'Today'
    } else if (isYesterday(date)) {
      dateKey = 'Yesterday'
    } else {
      dateKey = format(date, 'MMMM d, yyyy')
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(activity)
    return groups
  }, {} as Record<string, ActivityItem[]>)

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8 bg-gray-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Feed</h1>
          <p className="text-gray-600 mt-2">Track all your recent activities and system updates</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2 bg-white border-gray-200">
          <Activity className="h-4 w-4" />
          Live Feed
        </Badge>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Tasks Completed</p>
                <p className="text-2xl font-bold text-gray-900">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <Plus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Tasks Created</p>
                <p className="text-2xl font-bold text-gray-900">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-50">
                <Mail className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Emails Processed</p>
                <p className="text-2xl font-bold text-gray-900">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-50">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Last Active</p>
                <p className="text-sm font-bold text-gray-900">30m ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Recent Activity</CardTitle>
          <CardDescription className="text-gray-600">
            Your latest tasks, emails, and system activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {Object.keys(groupedActivities)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
              .map((dateGroup) => (
                <div key={dateGroup} className="space-y-4">
                  <div className="sticky top-0 bg-white py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">{dateGroup}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {groupedActivities[dateGroup].map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900 mb-1">
                                {activity.title}
                              </h4>
                              <p className="text-sm text-gray-600 mb-2">
                                {activity.description}
                              </p>
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getActivityBadgeColor(activity.type)}`}
                                >
                                  {activity.type.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {formatActivityDate(activity.timestamp)}
                                </span>
                              </div>
                            </div>
                            
                            {activity.metadata?.ai_generated && (
                              <div className="flex-shrink-0">
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                  <Brain className="h-3 w-3 mr-1" />
                                  AI
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            
            {activities.length === 0 && !loading && (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
                <p className="text-gray-600">
                  Your recent activities will appear here as you use bFree.ai
                </p>
              </div>
            )}
            
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading activities...</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 