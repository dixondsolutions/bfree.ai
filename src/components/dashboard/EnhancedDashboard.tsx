/**
 * Clean Dashboard Component for bFree.ai
 * Subtle natural design with light touches of green
 */

'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Brain, 
  Calendar, 
  Mail, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Settings,
  Sparkles,
  Leaf,
  Sun,
  Activity,
  BarChart3,
  RefreshCw,
  Zap,
  Target,
  Users
} from 'lucide-react'

interface DashboardData {
  emailAccounts: Array<{ provider: string; email: string; last_sync: string }>
  upcomingEvents: Array<{ title: string; start_time: string; end_time: string }>
  aiSuggestions: Array<{ suggestion_text: string; confidence_score: number; created_at: string }>
  processingQueue: Array<{ email_id: string; status: string; priority: string }>
  metrics: {
    totalEmailsSynced: number
    aiProcessingAccuracy: number
    timesSaved: number
    automationRate: number
  }
}

interface EnhancedDashboardProps {
  data: DashboardData
}

export default function EnhancedDashboard({ data }: EnhancedDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Dashboard Container */}
      <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Welcome Header - Clean and personal */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-green-500 text-white shadow-sm">
              <Sun className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Good morning! 🌿
              </h1>
              <p className="text-gray-600 text-lg">
                Welcome back to <span className="font-semibold text-green-700">bFree.ai</span> — your productivity companion is ready to help.
              </p>
            </div>
          </div>
        </div>

        {/* Overview Cards - Clean with subtle accents */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Gmail Intelligence */}
            <Card className="border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50 text-green-600">
                      <Brain className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-medium text-gray-900">Gmail Intelligence</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {data.emailAccounts.length}
                  </div>
                  <p className="text-sm text-gray-600">
                    {data.metrics.totalEmailsSynced > 0 
                      ? `${data.metrics.totalEmailsSynced} emails analyzed`
                      : 'Ready to connect your email'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Smart Scheduling */}
            <Card className="border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-medium text-gray-900">Smart Scheduling</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-blue-200 text-blue-700 text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    Learning
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {data.upcomingEvents.length}
                  </div>
                  <p className="text-sm text-gray-600">
                    upcoming events this week
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-medium text-gray-900">AI Insights</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-yellow-200 text-yellow-700 text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    {data.metrics.aiProcessingAccuracy}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {data.aiSuggestions.length}
                  </div>
                  <p className="text-sm text-gray-600">
                    suggestions ready for review
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Time Saved */}
            <Card className="border-gray-200 hover:border-green-300 transition-colors bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-medium text-gray-900">Time Saved</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs">
                    +{data.metrics.timesSaved}h
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {data.metrics.timesSaved}h
                  </div>
                  <p className="text-sm text-gray-600">
                    this week with bFree.ai
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Status - Clean */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
          </div>
          
          <Card className="border-gray-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">All systems operational</h3>
                    <p className="text-sm text-gray-600">
                      {data.processingQueue.length} items in queue • {data.metrics.automationRate}% automation active
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-50 text-green-700 border-green-200">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Running smoothly
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Minimal and clean */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[
              {
                icon: Mail,
                title: "Email Processing",
                description: "Review AI-analyzed emails",
                color: "blue",
                href: "/dashboard/emails"
              },
              {
                icon: Calendar,
                title: "Schedule",
                description: "Manage your calendar",
                color: "green",
                href: "/dashboard/calendar"
              },
              {
                icon: TrendingUp,
                title: "Analytics",
                description: "View productivity insights",
                color: "purple",
                href: "/dashboard/analytics"
              },
              {
                icon: Users,
                title: "Automation",
                description: "Configure AI settings",
                color: "orange",
                href: "/dashboard/automation"
              },
              {
                icon: Settings,
                title: "Settings",
                description: "Account preferences",
                color: "gray",
                href: "/dashboard/settings"
              }
            ].map((action, index) => (
              <Card key={action.title} className="group border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 bg-white cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="space-y-3">
                    <div className={`p-2.5 rounded-lg ${
                      action.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                      action.color === 'green' ? 'bg-green-50 text-green-600' :
                      action.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                      action.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                      {action.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">
                    {action.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* bFree.ai Hub - Clean branding */}
        <div className="mt-8">
          <Card className="border-gray-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-50">
                    <Brain className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Customize bFree.ai
                    </h3>
                    <p className="text-gray-600">
                      Personalize your AI assistant to work exactly how you do.
                    </p>
                  </div>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Personalize
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 