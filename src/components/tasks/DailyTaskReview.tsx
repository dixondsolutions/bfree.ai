'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar,
  Clock,
  CheckCircle2,
  Target,
  TrendingUp,
  AlertCircle,
  Mail,
  Brain,
  Zap,
  Timer,
  Coffee,
  Sun,
  Moon,
  Activity,
  BarChart3,
  RefreshCw,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns'

interface TaskStats {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  inProgressTasks: number
  overdueTasks: number
  aiGeneratedTasks: number
  averageCompletionTime: number
  productivityScore: number
}

interface EnergyStats {
  morningTasks: number
  afternoonTasks: number
  eveningTasks: number
  optimalEnergyTime: string
  energyEfficiency: number
}

interface WeeklyTrend {
  date: string
  completed: number
  total: number
  efficiency: number
}

interface DailyTaskReviewProps {
  className?: string
  date?: Date
}

export function DailyTaskReview({ className, date = new Date() }: DailyTaskReviewProps) {
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [energyStats, setEnergyStats] = useState<EnergyStats | null>(null)
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')

  useEffect(() => {
    loadTaskReview()
  }, [date, selectedPeriod])

  const loadTaskReview = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load task statistics
      const statsResponse = await fetch('/api/tasks/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: selectedPeriod,
          date: date.toISOString()
        })
      })

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
        setEnergyStats(statsData.energyStats)
      }

      // Load weekly trend
      const weekStart = startOfWeek(date)
      const weekEnd = endOfWeek(date)
      const trendResponse = await fetch(`/api/tasks/trend?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`)
      
      if (trendResponse.ok) {
        const trendData = await trendResponse.json()
        setWeeklyTrend(trendData.trend || [])
      }

    } catch (err) {
      setError('Failed to load task review data')
    } finally {
      setLoading(false)
    }
  }

  const getProductivityGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (score >= 60) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { grade: 'D', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const getEnergyTimeIcon = (time: string) => {
    const hour = parseInt(time.split(':')[0])
    if (hour >= 6 && hour < 12) return Sun
    if (hour >= 12 && hour < 18) return Coffee
    return Moon
  }

  const generateInsights = () => {
    if (!stats || !energyStats) return []

    const insights = []
    
    if (stats.completedTasks > 0) {
      const completionRate = (stats.completedTasks / stats.totalTasks) * 100
      if (completionRate >= 80) {
        insights.push({
          type: 'success',
          message: `Excellent! You completed ${completionRate.toFixed(0)}% of your tasks.`,
          icon: CheckCircle2
        })
      } else if (completionRate >= 60) {
        insights.push({
          type: 'info',
          message: `Good progress! You completed ${completionRate.toFixed(0)}% of your tasks.`,
          icon: Target
        })
      } else {
        insights.push({
          type: 'warning',
          message: `You completed ${completionRate.toFixed(0)}% of your tasks. Consider adjusting your schedule.`,
          icon: AlertCircle
        })
      }
    }

    if (stats.aiGeneratedTasks > 0) {
      const aiRate = (stats.aiGeneratedTasks / stats.totalTasks) * 100
      insights.push({
        type: 'info',
        message: `${aiRate.toFixed(0)}% of your tasks were AI-generated from emails.`,
        icon: Brain
      })
    }

    if (energyStats.energyEfficiency > 80) {
      insights.push({
        type: 'success',
        message: `Your energy management is excellent (${energyStats.energyEfficiency}% efficiency).`,
        icon: Zap
      })
    }

    if (stats.overdueTasks > 0) {
      insights.push({
        type: 'warning',
        message: `You have ${stats.overdueTasks} overdue tasks that need attention.`,
        icon: AlertCircle
      })
    }

    return insights
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const insights = generateInsights()
  const productivityGrade = stats ? getProductivityGrade(stats.productivityScore) : null

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Daily Task Review</h2>
          <p className="text-gray-600">
            {format(date, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectedPeriod === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('today')}
          >
            Today
          </Button>
          <Button
            variant={selectedPeriod === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('week')}
          >
            This Week
          </Button>
          <Button
            variant={selectedPeriod === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('month')}
          >
            This Month
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedTasks || 0}</div>
            <p className="text-xs text-gray-600">
              out of {stats?.totalTasks || 0} total
            </p>
            <Progress 
              value={stats ? (stats.completedTasks / stats.totalTasks) * 100 : 0} 
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats?.productivityScore || 0}%</div>
              {productivityGrade && (
                <Badge className={cn(productivityGrade.bg, productivityGrade.color)}>
                  {productivityGrade.grade}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-600">
              Based on completion rate and timing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI Assistance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.aiGeneratedTasks || 0}</div>
            <p className="text-xs text-gray-600">
              tasks created from emails
            </p>
            <div className="flex items-center gap-1 mt-2">
              <Brain className="h-3 w-3 text-blue-600" />
              <span className="text-xs text-blue-600">AI-powered</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Energy Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{energyStats?.energyEfficiency || 0}%</div>
            <p className="text-xs text-gray-600">
              optimal time scheduling
            </p>
            {energyStats && (
              <div className="flex items-center gap-1 mt-2">
                {(() => {
                  const Icon = getEnergyTimeIcon(energyStats.optimalEnergyTime)
                  return <Icon className="h-3 w-3 text-orange-600" />
                })()}
                <span className="text-xs text-orange-600">
                  Peak: {energyStats.optimalEnergyTime}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="energy">Energy Analysis</TabsTrigger>
          <TabsTrigger value="trends">Weekly Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Daily Insights
              </CardTitle>
              <CardDescription>
                AI-generated insights based on your task completion patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {insights.length > 0 ? (
                    insights.map((insight, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg",
                          insight.type === 'success' && "bg-green-50 border border-green-200",
                          insight.type === 'info' && "bg-blue-50 border border-blue-200",
                          insight.type === 'warning' && "bg-yellow-50 border border-yellow-200"
                        )}
                      >
                        <insight.icon className={cn(
                          "h-5 w-5 mt-0.5",
                          insight.type === 'success' && "text-green-600",
                          insight.type === 'info' && "text-blue-600",
                          insight.type === 'warning' && "text-yellow-600"
                        )} />
                        <p className="text-sm">{insight.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Complete some tasks to see insights</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {stats && stats.overdueTasks > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have {stats.overdueTasks} overdue tasks. Consider rescheduling or breaking them into smaller tasks.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="energy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Energy Distribution
              </CardTitle>
              <CardDescription>
                How you scheduled tasks throughout the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              {energyStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                      <Sun className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                      <div className="text-2xl font-bold">{energyStats.morningTasks}</div>
                      <div className="text-sm text-gray-600">Morning (6-12)</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <Coffee className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold">{energyStats.afternoonTasks}</div>
                      <div className="text-sm text-gray-600">Afternoon (12-18)</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
                      <Moon className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <div className="text-2xl font-bold">{energyStats.eveningTasks}</div>
                      <div className="text-sm text-gray-600">Evening (18-24)</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Optimization Suggestions</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Your peak energy time is {energyStats.optimalEnergyTime}</li>
                      <li>• Schedule high-priority tasks during your energy peaks</li>
                      <li>• Consider batching similar tasks together</li>
                      <li>• Leave buffer time between complex tasks</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Complete tasks with scheduled times to see energy analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly Progress
              </CardTitle>
              <CardDescription>
                Your task completion trend over the past week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {weeklyTrend.length > 0 ? (
                <div className="space-y-4">
                  {weeklyTrend.map((day, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-16 text-sm text-gray-600">
                        {format(new Date(day.date), 'EEE')}
                      </div>
                      <div className="flex-1">
                        <Progress value={(day.completed / day.total) * 100} className="h-2" />
                      </div>
                      <div className="w-20 text-sm text-right">
                        {day.completed}/{day.total}
                      </div>
                      <div className="w-16 text-sm text-right text-gray-600">
                        {Math.round(day.efficiency)}%
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Week Average:</span>
                    <span className="font-medium">
                      {Math.round(weeklyTrend.reduce((sum, day) => sum + day.efficiency, 0) / weeklyTrend.length)}% efficiency
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Complete tasks throughout the week to see trends</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
          <CardDescription>
            Based on your task patterns and completion rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats && stats.pendingTasks > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">Focus on {stats.pendingTasks} pending tasks</span>
                </div>
                <Button size="sm" variant="outline">
                  View Tasks
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
            
            {stats && stats.overdueTasks > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm">Reschedule {stats.overdueTasks} overdue tasks</span>
                </div>
                <Button size="sm" variant="outline">
                  Reschedule
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-600" />
                <span className="text-sm">Process new emails for AI task suggestions</span>
              </div>
              <Button size="sm" variant="outline">
                Process Emails
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}