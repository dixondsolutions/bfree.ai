/**
 * Enhanced Dashboard Client Component  
 * Beautiful natural green design that feels like an extension of yourself
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
  Zap,
  Target,
  BarChart3,
  RefreshCw
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50">
      {/* Dashboard Container with proper spacing */}
      <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Welcome Header - Natural and Personal */}
        <div className="relative space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25">
              <Sun className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-800 via-emerald-700 to-green-800 bg-clip-text text-transparent">
                Good morning! 🌱
              </h1>
              <p className="text-lg text-green-700/90 font-medium">
                Your AI assistant is growing with you today. Let's nurture your productivity together.
              </p>
            </div>
          </div>
          {/* Subtle decorative element */}
          <div className="absolute -top-2 -right-2 w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-300/20 rounded-full blur-2xl -z-10"></div>
        </div>

        {/* AI-Powered Overview - Clean but vibrant */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Leaf className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-green-800">AI-Powered Growth Center</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Gmail Intelligence */}
            <Card className="group border-green-200/70 hover:border-green-400/60 transition-all duration-300 bg-white/90 backdrop-blur-sm hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
                      <Brain className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-green-800">Gmail Intelligence</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300/50">
                    ✅ Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-green-900">
                    {data.emailAccounts.length}
                  </div>
                  <p className="text-sm text-green-700/80 leading-relaxed">
                    {data.metrics.totalEmailsSynced > 0 
                      ? `${data.metrics.totalEmailsSynced} emails synced and analyzed`
                      : 'Ready to sync your emails'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Smart Scheduling */}
            <Card className="group border-emerald-200/70 hover:border-emerald-400/60 transition-all duration-300 bg-white/90 backdrop-blur-sm hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-green-800">Smart Scheduling</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-emerald-300/60 text-emerald-700 bg-emerald-50">
                    <Target className="h-3 w-3 mr-1" />
                    Growing
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-green-900">
                    {data.upcomingEvents.length}
                  </div>
                  <p className="text-sm text-green-700/80 leading-relaxed">
                    upcoming events optimized for your flow
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="group border-lime-200/70 hover:border-lime-400/60 transition-all duration-300 bg-white/90 backdrop-blur-sm hover:shadow-lg hover:shadow-lime-500/10 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-lime-500 to-yellow-500 text-white shadow-md">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-green-800">AI Insights</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-yellow-300/60 text-yellow-700 bg-yellow-50">
                    <Zap className="h-3 w-3 mr-1" />
                    {data.metrics.aiProcessingAccuracy}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-green-900">
                    {data.aiSuggestions.length}
                  </div>
                  <p className="text-sm text-green-700/80 leading-relaxed">
                    intelligent suggestions waiting for you
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Time Optimization */}
            <Card className="group border-orange-200/70 hover:border-orange-400/60 transition-all duration-300 bg-white/90 backdrop-blur-sm hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md">
                      <Clock className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-green-800">Time Optimization</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-orange-300/60 text-orange-700 bg-orange-50">
                    ✨ +{data.metrics.timesSaved}h saved
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-green-900">
                    {data.metrics.timesSaved}h
                  </div>
                  <p className="text-sm text-green-700/80 leading-relaxed">
                    freed up for what matters most to you
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Status - Clean and informative */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-green-800">System Harmony</h2>
          </div>
          
          <Card className="border-green-200/70 bg-gradient-to-r from-green-50/50 to-emerald-50/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500 text-white">
                  <CheckCircle className="h-5 w-5" />
                </div>
                Everything is flowing smoothly
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-green-700 font-medium">
                  {data.processingQueue.length} items in queue, {data.metrics.automationRate}% automation active
                </span>
                <Badge className="bg-green-100 text-green-700 border-green-300/50 px-4 py-1">
                  <RefreshCw className="h-3 w-3 mr-2" />
                  All systems green
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Hub - Natural and inviting */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-green-800">Growth Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {[
              {
                icon: Mail,
                title: "Email Garden",
                description: "Cultivate your inbox with AI-powered insights",
                gradient: "from-blue-500 to-cyan-600",
                href: "/dashboard/emails"
              },
              {
                icon: Calendar,
                title: "Schedule Flow",
                description: "Find your natural rhythm with smart scheduling",
                gradient: "from-green-500 to-emerald-600",
                href: "/dashboard/calendar"
              },
              {
                icon: TrendingUp,
                title: "Growth Analytics",
                description: "Watch your productivity bloom over time",
                gradient: "from-purple-500 to-violet-600",
                href: "/dashboard/analytics"
              },
              {
                icon: Brain,
                title: "Task Harmony",
                description: "Balance your workload with intelligent prioritization",
                gradient: "from-orange-500 to-red-500",
                href: "/dashboard/tasks"
              },
              {
                icon: Settings,
                title: "Personal Tuning",
                description: "Adjust your AI companion to grow with you",
                gradient: "from-gray-500 to-slate-600",
                href: "/dashboard/settings"
              }
            ].map((action, index) => (
              <div key={action.title} className="group">
                <Card className="h-full border-green-200/50 hover:border-green-400/60 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300 bg-white/90 backdrop-blur-sm cursor-pointer hover:-translate-y-2">
                  <CardHeader className="pb-4">
                    <div className="space-y-4">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br ${action.gradient} text-white shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-base font-bold text-green-800 group-hover:text-green-900 transition-colors leading-tight">
                        {action.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm text-green-700/80 group-hover:text-green-700 transition-colors leading-relaxed">
                      {action.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Automation Hub - Inspiring and personal */}
        <div className="mt-12">
          <Card className="border-green-200/70 bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-300/20 to-emerald-400/10 rounded-full blur-3xl"></div>
            <CardContent className="p-8 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl">
                    <Brain className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-green-800">Your AI Growth Partner</h3>
                    <p className="text-green-700/90 text-lg max-w-lg leading-relaxed">
                      Fine-tune your digital companion to understand your unique rhythm and help you flourish.
                    </p>
                  </div>
                </div>
                <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <Settings className="h-5 w-5 mr-2" />
                  Personalize Experience
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 