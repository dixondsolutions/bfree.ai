/**
 * Enhanced Dashboard Client Component
 * Natural, gentle animations with proper layout spacing
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/avatar'
import { animations, componentAnimations } from '@/lib/animations'
import { 
  Brain, 
  Calendar, 
  Mail, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50">
      {/* Dashboard Container with proper spacing */}
      <motion.div 
        className="w-full max-w-7xl mx-auto p-6 space-y-8"
        {...animations.pageEnter}
      >
        {/* Welcome Header */}
        <motion.div 
          className="space-y-2"
          {...animations.fadeIn}
        >
          <div className="flex items-center gap-3">
            <motion.div 
              {...componentAnimations.button}
              className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-lime-500 text-white"
            >
              <Sun className="h-6 w-6" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-700 via-green-600 to-lime-600 bg-clip-text text-transparent">
                Good morning! 🌱
              </h1>
              <p className="text-green-700/80">
                Your AI assistant is ready to help you manage emails and schedule meetings efficiently.
              </p>
            </div>
          </div>
        </motion.div>

        {/* AI-Powered Overview */}
        <motion.div 
          className="space-y-4"
          {...animations.stagger}
        >
          <h2 className="text-xl font-semibold text-green-800 flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600" />
            AI-Powered Overview
          </h2>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={animations.stagger}
          >
            {/* Gmail Intelligence */}
            <motion.div variants={animations.staggerItem}>
              <Card className="border-green-200/50 hover:border-green-300/70 transition-all duration-300 bg-white/80 backdrop-blur-sm">
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
                    <p className="text-sm text-green-700/80">
                      account(s) with AI processing
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Smart Scheduling */}
            <motion.div variants={animations.staggerItem}>
              <Card className="border-green-200/50 hover:border-green-300/70 transition-all duration-300 bg-white/80 backdrop-blur-sm">
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
                    <p className="text-sm text-green-700/80">
                      AI-optimized meetings this month
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Insights */}
            <motion.div variants={animations.staggerItem}>
              <Card className="border-green-200/50 hover:border-green-300/70 transition-all duration-300 bg-white/80 backdrop-blur-sm">
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
                    <p className="text-sm text-green-700/80">
                      {data.aiSuggestions.length} suggestions awaiting review
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Time Optimization */}
            <motion.div variants={animations.staggerItem}>
              <Card className="border-green-200/50 hover:border-green-300/70 transition-all duration-300 bg-white/80 backdrop-blur-sm">
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
                    <p className="text-sm text-green-700/80">
                      AI automation saved you time this week
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* System Status */}
        <motion.div 
          className="space-y-4"
          variants={animations.stagger}
        >
          <h2 className="text-xl font-semibold text-green-800 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            System Status
          </h2>
          
          <motion.div variants={animations.staggerItem}>
            <Card className="border-green-200/50 bg-white/80 backdrop-blur-sm">
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
          </motion.div>
        </motion.div>

        {/* AI-Powered Actions */}
        <motion.div 
          className="space-y-4"
          variants={animations.stagger}
        >
          <h2 className="text-xl font-semibold text-green-800">
            AI-Powered Actions
          </h2>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
            variants={animations.stagger}
          >
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
              <motion.div key={action.title} variants={animations.staggerItem}>
                <motion.div
                  {...componentAnimations.dashboardCard}
                  className="group"
                >
                  <Card className="h-full border-green-200/50 hover:border-green-300/70 transition-all duration-300 bg-white/80 backdrop-blur-sm cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-lg bg-gradient-to-r from-${action.color}-500 to-${action.color}-600 text-white group-hover:shadow-lg transition-all duration-300`}>
                          <action.icon className="h-4 w-4" />
                        </div>
                      </div>
                      <CardTitle className="text-sm font-medium text-green-800 group-hover:text-green-900 transition-colors">
                        {action.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-xs text-green-700/70 group-hover:text-green-700 transition-colors">
                        {action.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Automation Hub */}
        <motion.div 
          className="mt-8"
          variants={animations.stagger}
        >
          <motion.div variants={animations.staggerItem}>
            <Card className="border-green-200/50 bg-gradient-to-r from-green-50 to-lime-50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-lime-500 text-white">
                      <Brain className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800">Automation Hub</h3>
                      <p className="text-sm text-green-700/80">
                        Monitor and control your AI automation settings
                      </p>
                    </div>
                  </div>
                  <motion.div {...componentAnimations.button}>
                    <Button className="bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 text-white border-0">
                      Configure
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
} 