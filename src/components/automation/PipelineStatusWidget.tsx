'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Mail, 
  Brain, 
  ClipboardList, 
  Calendar,
  Activity,
  TrendingUp,
  Zap,
  Clock
} from 'lucide-react'

interface PipelineHealth {
  status: 'healthy' | 'warning' | 'error'
  message: string
  components: {
    email_sync: ComponentStatus
    ai_processing: ComponentStatus
    task_creation: ComponentStatus
    calendar_integration: ComponentStatus
  }
  statistics: {
    total_emails: number
    analyzed_emails: number
    created_tasks: number
    scheduled_tasks: number
    pending_queue: number
    failed_queue: number
    last_24h: {
      emails_processed: number
      tasks_created: number
      success_rate: number
    }
  }
  recommendations: string[]
}

interface ComponentStatus {
  status: 'healthy' | 'warning' | 'error'
  message: string
  last_activity?: string
  metrics?: Record<string, any>
}

export function PipelineStatusWidget() {
  const [health, setHealth] = useState<PipelineHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchHealth = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/pipeline/status')
      const data = await response.json()
      
      if (data.success) {
        setHealth(data.health)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch pipeline health:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRepair = async (component: string) => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/pipeline/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'repair', component })
      })
      
      if (response.ok) {
        // Refresh status after repair
        await fetchHealth()
      }
    } catch (error) {
      console.error('Failed to repair component:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleQuickAction = async (action: string) => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/pipeline/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        await fetchHealth()
      }
    } catch (error) {
      console.error('Failed to execute action:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Refresh every 5 minutes
    const interval = setInterval(fetchHealth, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'email_sync':
        return <Mail className="h-4 w-4" />
      case 'ai_processing':
        return <Brain className="h-4 w-4" />
      case 'task_creation':
        return <ClipboardList className="h-4 w-4" />
      case 'calendar_integration':
        return <Calendar className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pipeline Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pipeline Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Failed to load pipeline status</p>
            <Button variant="outline" onClick={fetchHealth} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const analysisRate = health.statistics.total_emails > 0 
    ? Math.round((health.statistics.analyzed_emails / health.statistics.total_emails) * 100)
    : 0

  const schedulingRate = health.statistics.created_tasks > 0 
    ? Math.round((health.statistics.scheduled_tasks / health.statistics.created_tasks) * 100)
    : 0

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Pipeline Status</CardTitle>
            <Badge className={getStatusColor(health.status)}>
              {getStatusIcon(health.status)}
              <span className="ml-1 capitalize">{health.status}</span>
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHealth}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          {health.message}
          {lastUpdated && (
            <span className="block text-xs text-gray-400 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Component Status */}
        <div>
          <h4 className="text-sm font-medium mb-3">Component Health</h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(health.components).map(([key, component]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  {getComponentIcon(key)}
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {key.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">
                      {component.message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(component.status)}
                  {component.status === 'error' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRepair(key)}
                      disabled={isRefreshing}
                    >
                      Fix
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Key Metrics */}
        <div>
          <h4 className="text-sm font-medium mb-3">Key Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Analysis</span>
                <span className="text-sm font-medium">{analysisRate}%</span>
              </div>
              <Progress value={analysisRate} className="h-2" />
              <p className="text-xs text-gray-500">
                {health.statistics.analyzed_emails} of {health.statistics.total_emails} emails
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto-Scheduling</span>
                <span className="text-sm font-medium">{schedulingRate}%</span>
              </div>
              <Progress value={schedulingRate} className="h-2" />
              <p className="text-xs text-gray-500">
                {health.statistics.scheduled_tasks} of {health.statistics.created_tasks} tasks
              </p>
            </div>
          </div>

          {/* 24h Performance */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-blue-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-lg font-semibold text-blue-600">
                  {health.statistics.last_24h.emails_processed}
                </span>
              </div>
              <p className="text-xs text-blue-600">Emails Processed</p>
            </div>
            
            <div className="p-3 rounded-lg bg-green-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ClipboardList className="h-4 w-4 text-green-600" />
                <span className="text-lg font-semibold text-green-600">
                  {health.statistics.last_24h.tasks_created}
                </span>
              </div>
              <p className="text-xs text-green-600">Tasks Created</p>
            </div>
            
            <div className="p-3 rounded-lg bg-purple-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-lg font-semibold text-purple-600">
                  {health.statistics.last_24h.success_rate}%
                </span>
              </div>
              <p className="text-xs text-purple-600">Success Rate</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {(health.statistics.failed_queue > 0 || health.statistics.pending_queue > 20) && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
              <div className="flex flex-wrap gap-2">
                {health.statistics.failed_queue > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction('retry-failed')}
                    disabled={isRefreshing}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Retry Failed ({health.statistics.failed_queue})
                  </Button>
                )}
                {health.statistics.pending_queue > 20 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction('clear-queue')}
                    disabled={isRefreshing}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Clear Queue ({health.statistics.pending_queue})
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Recommendations */}
        {health.recommendations.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Recommendations</h4>
              <div className="space-y-2">
                {health.recommendations.slice(0, 3).map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 rounded bg-blue-50 text-blue-700">
                    <Activity className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}