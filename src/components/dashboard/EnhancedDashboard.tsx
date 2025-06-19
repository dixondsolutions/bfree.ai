/**
 * Simple Dashboard Component  
 * Clean, functional design without complex effects
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
  Activity
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Dashboard Container with proper spacing */}
      <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
        {/* Welcome Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500 text-white">
              <Sun className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-green-800">
                Good morning! 🌱
              </h1>
              <p className="text-green-700">
                Your AI assistant is ready to help you manage emails and schedule meetings efficiently.
              </p>
            </div>
          </div>
        </div>

        {/* AI-Powered Overview */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-green-800 flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600" />
            AI-Powered Overview
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Gmail Intelligence */}
            <Card className="border-green-200 hover:border-green-300 transition-colors bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-sm font-medium text-green-800">Gmail Intelligence</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                    ✅ 100% Synced
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-900">
                    {data.emailAccounts.length}
                  </div>
                  <p className="text-sm text-green-700">
                    account(s) with AI processing
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Smart Scheduling */}
            <Card className="border-green-200 hover:border-green-300 transition-colors bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-lime-600" />
                    <CardTitle className="text-sm font-medium text-green-800">Smart Scheduling</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-lime-300 text-lime-700">
                    ➡️ 0% accuracy
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-900">
                    {data.upcomingEvents.length}
                  </div>
                  <p className="text-sm text-green-700">
                    AI-optimized meetings this month
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="border-green-200 hover:border-green-300 transition-colors bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="text-sm font-medium text-green-800">AI Insights</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                    ➡️ 0% accuracy
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-900">
                    {data.aiSuggestions.length}
                  </div>
                  <p className="text-sm text-green-700">
                    {data.aiSuggestions.length} suggestions awaiting review
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Time Optimization */}
            <Card className="border-green-200 hover:border-green-300 transition-colors bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-sm font-medium text-green-800">Time Optimization</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-orange-300 text-orange-700">
                    ✅ +3h this week
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-900">
                    {data.metrics.timesSaved}h
                  </div>
                  <p className="text-sm text-green-700">
                    AI automation saved you time this week
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Status */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-green-800 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            System Status
          </h2>
          
          <Card className="border-green-200 bg-white">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-green-700">
                  {data.processingQueue.length} items in queue
                </span>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI-Powered Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-green-800">
            AI-Powered Actions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {[
              {
                icon: Mail,
                title: "Smart Email Processing",
                description: "AI analyzes and categorizes your emails automatically",
                color: "blue",
                href: "/dashboard/emails"
              },
              {
                icon: Calendar,
                title: "Intelligent Scheduling",
                description: "AI finds optimal meeting times and schedules",
                color: "green",
                href: "/dashboard/calendar"
              },
              {
                icon: TrendingUp,
                title: "Productivity Analytics",
                description: "AI-powered insights into your work patterns",
                color: "purple",
                href: "/dashboard/analytics"
              },
              {
                icon: Brain,
                title: "Task Optimization",
                description: "Smart task scheduling and prioritization",
                color: "orange",
                href: "/dashboard/tasks"
              },
              {
                icon: Settings,
                title: "AI Preferences",
                description: "Configure your AI assistant settings",
                color: "gray",
                href: "/dashboard/settings"
              }
            ].map((action, index) => (
              <div key={action.title} className="group">
                <Card className="h-full border-green-200 hover:border-green-300 hover:shadow-md transition-all duration-200 bg-white cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${
                        action.color === 'blue' ? 'bg-blue-500' :
                        action.color === 'green' ? 'bg-green-500' :
                        action.color === 'purple' ? 'bg-purple-500' :
                        action.color === 'orange' ? 'bg-orange-500' :
                        'bg-gray-500'
                      } text-white`}>
                        <action.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <CardTitle className="text-sm font-medium text-green-800 group-hover:text-green-900 transition-colors">
                      {action.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs text-green-700 group-hover:text-green-800 transition-colors">
                      {action.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Automation Hub */}
        <div className="mt-8">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-green-500 text-white">
                    <Brain className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">Automation Hub</h3>
                    <p className="text-sm text-green-700">
                      Monitor and control your AI automation settings
                    </p>
                  </div>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 