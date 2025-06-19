import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { BarChart3, TrendingUp, Calendar, Clock, Target, Activity } from 'lucide-react'

interface AnalyticsData {
  taskStats: {
    total: number
    completed: number
    pending: number
    completionRate: number
  }
  productivity: {
    dailyAverage: number
    weeklyTrend: number
    peakHours: string[]
  }
  categories: Array<{
    name: string
    count: number
    completionRate: number
  }>
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // For now, use mock data since API endpoints might not be fully set up
  const analytics: AnalyticsData = {
    taskStats: {
      total: 127,
      completed: 89,
      pending: 38,
      completionRate: 70
    },
    productivity: {
      dailyAverage: 6.2,
      weeklyTrend: 12,
      peakHours: ['9:00 AM', '2:00 PM', '7:00 PM']
    },
    categories: [
      { name: 'Work', count: 45, completionRate: 78 },
      { name: 'Personal', count: 32, completionRate: 65 },
      { name: 'Health', count: 28, completionRate: 82 },
      { name: 'Finance', count: 22, completionRate: 91 }
    ]
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8 bg-gray-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Track your productivity and task completion patterns</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2 bg-white border-gray-200">
          <TrendingUp className="h-4 w-4" />
          Updated now
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Total Tasks</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{analytics.taskStats.total}</div>
            <p className="text-xs text-gray-600">
              {analytics.taskStats.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Completion Rate</CardTitle>
            <div className="p-2 rounded-lg bg-green-50">
              <BarChart3 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{analytics.taskStats.completionRate}%</div>
            <Progress value={analytics.taskStats.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Daily Average</CardTitle>
            <div className="p-2 rounded-lg bg-purple-50">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{analytics.productivity.dailyAverage}</div>
            <p className="text-xs text-gray-600">
              tasks completed per day
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">Weekly Trend</CardTitle>
            <div className="p-2 rounded-lg bg-orange-50">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">+{analytics.productivity.weeklyTrend}%</div>
            <p className="text-xs text-gray-600">
              vs last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Category Breakdown</CardTitle>
            <CardDescription className="text-gray-600">Task completion by category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.categories.map((category) => (
              <div key={category.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{category.count} tasks</span>
                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                      {category.completionRate}%
                    </Badge>
                  </div>
                </div>
                <Progress value={category.completionRate} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Peak Productivity Hours</CardTitle>
            <CardDescription className="text-gray-600">When you complete most tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.productivity.peakHours.map((hour, index) => (
                <div key={hour} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">{hour}</span>
                  <Badge variant="outline" className="bg-white border-gray-200">Peak #{index + 1}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Status Overview */}
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Task Status Overview</CardTitle>
          <CardDescription className="text-gray-600">Current status of all your tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-green-600">{analytics.taskStats.completed}</div>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-yellow-600">{analytics.taskStats.pending}</div>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-blue-600">{analytics.taskStats.total}</div>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 