/**
 * Enhanced Dashboard Client Component
 * Contains all animation logic and AI-themed UI improvements
 */

'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/avatar'
import { 
  AnimatedCard, 
  AnimatedCardHeader, 
  AnimatedCardTitle, 
  AnimatedCardDescription, 
  AnimatedCardContent,
  AnimatedCardFooter,
  AICard,
  StatusCard
} from '@/components/ui/AnimatedCard'
import { AnimatedButton, AIButton } from '@/components/ui/AnimatedButton'
import { PageLayout, PageHeader, PageContent, PageGrid, PageSection, DashboardGrid, DashboardSection } from '@/components/layout/PageLayout'
import { GmailSyncManager } from '@/components/email/GmailSyncManager'
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Mail,
  Calendar,
  Brain,
  ArrowRight,
  Plus,
  TrendingUp,
  Users,
  Clock,
  Zap,
  Target,
  BarChart3,
  Activity,
  Sparkles,
  Bot,
  Cpu,
  Shield,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PipelineStatusWidget } from '@/components/automation/PipelineStatusWidget'
import { TaskScheduleApproval } from '@/components/scheduling/TaskScheduleApproval'
import { motion } from 'framer-motion'
import { animations } from '@/lib/animations'

// Define interfaces for the data passed from server
interface DashboardData {
  emailAccounts: any[]
  upcomingEvents: any[]
  aiSuggestions: any[]
  pendingProcessing: any[]
  hasGmailConnection: boolean
  eventsThisMonth: number
  aiGeneratedEvents: number
  pendingSuggestions: number
}

interface EnhancedDashboardProps {
  data: DashboardData
}

// Enhanced Animated Metric Card Component
interface MetricCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  trend?: {
    value: string
    positive: boolean
  }
  status?: 'success' | 'warning' | 'loading' | 'info' | 'ai'
  aiEnhanced?: boolean
  staggerDelay?: number
}

function EnhancedMetricCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend,
  status = 'info',
  aiEnhanced = false,
  staggerDelay = 0
}: MetricCardProps) {
  const statusStyles = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    loading: 'bg-info/10 text-info border-info/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    ai: 'bg-gradient-to-br from-primary/10 via-ai-neural/10 to-ai-electric/10 text-primary border-primary/20'
  }

  const cardVariant = aiEnhanced ? 'glass' : 'elevated'
  
  return (
    <AnimatedCard
      variant={cardVariant}
      glow={status === 'ai'}
      aiThemed={aiEnhanced}
      staggerDelay={staggerDelay}
      className="group relative overflow-hidden"
    >
      {/* AI Particle Effects */}
      {aiEnhanced && (
        <div className="absolute inset-0 pointer-events-none opacity-60">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/40 rounded-full"
              style={{
                left: `${20 + i * 25}%`,
                top: `${30 + i * 15}%`,
              }}
              animate={{
                y: [0, -15, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.7,
                ease: animations.easings.gentle,
              }}
            />
          ))}
        </div>
      )}

      <AnimatedCardContent className="p-6">
        <motion.div 
          className="flex items-start justify-between mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...animations.transitions.springSmooth, delay: staggerDelay + 0.1 }}
        >
          <div className="flex items-center gap-3">
            <motion.div 
              className={cn(
                "p-3 rounded-xl transition-all duration-300",
                statusStyles[status],
                status === 'ai' && "shadow-glow-primary"
              )}
              whileHover={{ scale: 1.1, rotate: status === 'ai' ? 180 : 0 }}
              transition={animations.transitions.springBouncy}
            >
              {status === 'loading' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="h-5 w-5" />
                </motion.div>
              ) : (
                icon
              )}
            </motion.div>
            <div className="min-w-0 flex-1">
              <motion.h3 
                className="text-sm font-medium text-muted-foreground truncate"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...animations.transitions.springSmooth, delay: staggerDelay + 0.2 }}
              >
                {title}
              </motion.h3>
            </div>
          </div>
          {trend && (
            <motion.div 
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium flex-shrink-0 px-2 py-1 rounded-full",
                trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...animations.transitions.springBouncy, delay: staggerDelay + 0.3 }}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                animate={{ y: trend.positive ? [-1, 1, -1] : [1, -1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <TrendingUp className={cn(
                  "h-3 w-3",
                  !trend.positive && "rotate-180"
                )} />
              </motion.div>
              <span>{trend.value}</span>
            </motion.div>
          )}
        </motion.div>
        
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...animations.transitions.springSmooth, delay: staggerDelay + 0.4 }}
        >
          <motion.div 
            className="text-3xl font-bold leading-tight gradient-text-primary"
            whileHover={{ scale: 1.05 }}
            transition={animations.transitions.springBouncy}
          >
            {value}
          </motion.div>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </motion.div>
      </AnimatedCardContent>
    </AnimatedCard>
  )
}

// Enhanced Activity Item Component with animations
interface ActivityItemProps {
  type: 'email' | 'meeting' | 'task' | 'ai'
  title: string
  description: string
  time: string
  urgent?: boolean
  user?: string
  index: number
}

function EnhancedActivityItem({ type, title, description, time, urgent, user, index }: ActivityItemProps) {
  const getIcon = () => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'meeting': return <Calendar className="h-4 w-4" />
      case 'task': return <Target className="h-4 w-4" />
      case 'ai': return <Bot className="h-4 w-4" />
    }
  }

  const getIconStyle = () => {
    switch (type) {
      case 'email': return 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
      case 'meeting': return 'bg-green-500/10 text-green-600 border border-green-500/20'
      case 'task': return 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
      case 'ai': return 'bg-gradient-to-br from-primary/10 to-ai-electric/10 text-primary border border-primary/20'
    }
  }

  return (
    <motion.div 
      className="flex items-start gap-3 p-4 rounded-xl hover:bg-accent/50 transition-all duration-300 cursor-pointer group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...animations.transitions.springSmooth, delay: index * 0.1 }}
      whileHover={{ x: 4, scale: 1.01 }}
    >
      <motion.div 
        className={cn("p-2.5 rounded-lg", getIconStyle())}
        whileHover={{ scale: 1.1, rotate: type === 'ai' ? 360 : 0 }}
        transition={animations.transitions.springBouncy}
      >
        {getIcon()}
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <motion.p 
                className="text-sm font-medium group-hover:text-primary transition-colors"
                layoutId={`title-${index}`}
              >
                {title}
              </motion.p>
              {urgent && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={animations.transitions.springBouncy}
                >
                  <Badge variant="destructive" className="text-xs px-2 py-0.5 animate-pulse">
                    Urgent
                  </Badge>
                </motion.div>
              )}
              {type === 'ai' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...animations.transitions.springBouncy, delay: 0.2 }}
                >
                  <Badge className="text-xs px-2 py-0.5 bg-gradient-to-r from-primary to-ai-electric text-white border-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                </motion.div>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
              {description}
            </p>
            {user && (
              <motion.div 
                className="flex items-center gap-2 mt-2"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                <Avatar className="h-5 w-5">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-medium">
                    {user.charAt(0)}
                  </div>
                </Avatar>
                <span className="text-xs text-muted-foreground">{user}</span>
              </motion.div>
            )}
          </div>
          <motion.span 
            className="text-xs text-muted-foreground whitespace-nowrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.2 }}
          >
            {time}
          </motion.span>
        </div>
      </div>
    </motion.div>
  )
}

// Enhanced Quick Action Card with sophisticated animations
interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  gradient?: string
  aiFeature?: boolean
  index: number
}

function EnhancedQuickAction({ title, description, icon, href, gradient, aiFeature = false, index }: QuickActionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...animations.transitions.springSmooth, delay: index * 0.1 }}
    >
      <AnimatedCard 
        variant="interactive"
        glow={aiFeature}
        aiThemed={aiFeature}
        className="group relative overflow-hidden"
      >
        {aiFeature && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: 'linear',
            }}
          />
        )}
        
        <Link href={href} prefetch={false}>
          <AnimatedCardContent className="p-5">
            <div className="flex items-center gap-4">
              <motion.div 
                className={cn(
                  "p-3 rounded-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0",
                  gradient || "bg-primary/10 text-primary border border-primary/20",
                  aiFeature && "shadow-glow-primary"
                )}
                whileHover={{ 
                  scale: 1.15,
                  rotate: aiFeature ? 180 : 5
                }}
                transition={animations.transitions.springBouncy}
              >
                {icon}
              </motion.div>
              <div className="flex-1 min-w-0">
                <motion.h3 
                  className="font-semibold text-sm mb-1 truncate group-hover:text-primary transition-colors"
                  layoutId={`action-title-${index}`}
                >
                  {title}
                </motion.h3>
                <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                  {description}
                </p>
              </div>
              <motion.div
                className="flex-shrink-0"
                whileHover={{ x: 4 }}
                transition={animations.transitions.fast}
              >
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </motion.div>
            </div>
          </AnimatedCardContent>
        </Link>
      </AnimatedCard>
    </motion.div>
  )
}

export default function EnhancedDashboard({ data }: EnhancedDashboardProps) {
  const {
    emailAccounts,
    upcomingEvents,
    aiSuggestions,
    pendingProcessing,
    hasGmailConnection,
    eventsThisMonth,
    aiGeneratedEvents,
    pendingSuggestions
  } = data

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={animations.page}
    >
      <PageLayout density="compact" maxWidth="wide">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={animations.transitions.springSmooth}
        >
          <PageHeader
            title="Good morning! 👋"
            description="Your AI assistant is ready to help you manage emails and schedule meetings efficiently."
            compact={false}
          >
            <AIButton
              processing={pendingProcessing.length > 0}
              thinking={false}
              size="lg"
              className="shadow-elevation-3"
            >
              <Brain className="h-5 w-5 mr-2" />
              AI Dashboard
            </AIButton>
          </PageHeader>
        </motion.div>

        <PageContent>
          {/* Enhanced Metrics Grid with staggered animations */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={animations.stagger}
          >
            <DashboardSection title="AI-Powered Overview">
              <DashboardGrid>
                <motion.div variants={animations.staggerItem}>
                  <EnhancedMetricCard
                    title="Gmail Intelligence"
                    value={hasGmailConnection ? "Connected" : "Connect Now"}
                    description={hasGmailConnection ? `${emailAccounts.length} account(s) with AI processing` : "Enable AI email processing"}
                    icon={hasGmailConnection ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    status={hasGmailConnection ? "success" : "warning"}
                    trend={hasGmailConnection ? { value: "100% Synced", positive: true } : undefined}
                    aiEnhanced={hasGmailConnection}
                    staggerDelay={0}
                  />
                </motion.div>
                
                <motion.div variants={animations.staggerItem}>
                  <EnhancedMetricCard
                    title="Smart Scheduling"
                    value={eventsThisMonth}
                    description="AI-optimized meetings this month"
                    icon={<Calendar className="h-5 w-5" />}
                    status="ai"
                    trend={eventsThisMonth > 0 ? { value: `${aiGeneratedEvents} AI-created`, positive: true } : undefined}
                    aiEnhanced={true}
                    staggerDelay={0.1}
                  />
                </motion.div>
                
                <motion.div variants={animations.staggerItem}>
                  <EnhancedMetricCard
                    title="AI Insights"
                    value={aiSuggestions.length}
                    description={`${pendingSuggestions} suggestions awaiting review`}
                    icon={<Sparkles className="h-5 w-5" />}
                    status="ai"
                    trend={aiSuggestions.length > 0 ? { 
                      value: `${Math.round((aiSuggestions.filter(s => s.status === 'approved').length / aiSuggestions.length) * 100)}% accuracy`, 
                      positive: true 
                    } : undefined}
                    aiEnhanced={true}
                    staggerDelay={0.2}
                  />
                </motion.div>
                
                <motion.div variants={animations.staggerItem}>
                  <EnhancedMetricCard
                    title="Time Optimization"
                    value="12.5h"
                    description="AI automation saved you time this week"
                    icon={<Cpu className="h-5 w-5" />}
                    status="ai"
                    trend={{ value: "+3h this week", positive: true }}
                    aiEnhanced={true}
                    staggerDelay={0.3}
                  />
                </motion.div>
                
                <motion.div variants={animations.staggerItem}>
                  <EnhancedMetricCard
                    title="System Status"
                    value={pendingProcessing.length > 0 ? "Processing" : "Ready"}
                    description={pendingProcessing.length > 0 ? `${pendingProcessing.length} items in queue` : "All systems operational"}
                    icon={pendingProcessing.length > 0 ? <RefreshCw className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                    status={pendingProcessing.length > 0 ? "loading" : "success"}
                    aiEnhanced={true}
                    staggerDelay={0.4}
                  />
                </motion.div>
              </DashboardGrid>
            </DashboardSection>
          </motion.div>

          {/* Enhanced Quick Actions with AI theming */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={animations.stagger}
          >
            <DashboardSection title="AI-Powered Actions">
              <PageGrid columns={6} gap="sm" responsive={true}>
                <EnhancedQuickAction
                  title="Smart Email Processing"
                  description="AI analyzes and categorizes your emails intelligently"
                  icon={<Mail className="h-5 w-5" />}
                  href="/dashboard/emails"
                  gradient="bg-blue-500/10 text-blue-600 border border-blue-500/20"
                  aiFeature={true}
                  index={0}
                />
                <EnhancedQuickAction
                  title="Intelligent Scheduling"
                  description="AI finds optimal meeting times automatically"
                  icon={<Brain className="h-5 w-5" />}
                  href="/dashboard/calendar"
                  gradient="bg-green-500/10 text-green-600 border border-green-500/20"
                  aiFeature={true}
                  index={1}
                />
                <EnhancedQuickAction
                  title="Productivity Analytics"
                  description="AI-powered insights into your work patterns"
                  icon={<BarChart3 className="h-5 w-5" />}
                  href="/dashboard/analytics"
                  gradient="bg-purple-500/10 text-purple-600 border border-purple-500/20"
                  aiFeature={true}
                  index={2}
                />
                <EnhancedQuickAction
                  title="Task Optimization"
                  description="Smart task scheduling and prioritization"
                  icon={<Target className="h-5 w-5" />}
                  href="/dashboard/calendar"
                  gradient="bg-orange-500/10 text-orange-600 border border-orange-500/20"
                  aiFeature={true}
                  index={3}
                />
                <EnhancedQuickAction
                  title="AI Preferences"
                  description="Configure your AI assistant settings"
                  icon={<Users className="h-5 w-5" />}
                  href="/dashboard/settings"
                  gradient="bg-gray-500/10 text-gray-600 border border-gray-500/20"
                  index={4}
                />
                <EnhancedQuickAction
                  title="Automation Hub"
                  description="Manage AI workflows and automations"
                  icon={<Zap className="h-5 w-5" />}
                  href="/dashboard/automation"
                  gradient="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  aiFeature={true}
                  index={5}
                />
              </PageGrid>
            </DashboardSection>
          </motion.div>

          {/* Enhanced Task Scheduling Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...animations.transitions.springSmooth, delay: 0.6 }}
          >
            <DashboardSection title="AI Task Scheduling">
              <AICard 
                status={pendingProcessing.length > 0 ? "processing" : "idle"}
                showParticles={pendingProcessing.length > 0}
                className="p-6"
              >
                <TaskScheduleApproval />
              </AICard>
            </DashboardSection>
          </motion.div>

          {/* Enhanced Activity Feed with sophisticated animations */}
          <motion.div
            className="grid gap-6 lg:grid-cols-2"
            initial="hidden"
            animate="visible"
            variants={animations.stagger}
          >
            {/* AI-Enhanced Recent Activity */}
            <motion.div variants={animations.staggerItem}>
              <AnimatedCard variant="glass" glow className="h-full">
                <AnimatedCardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <AnimatedCardTitle className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        >
                          <Activity className="h-5 w-5 text-primary" />
                        </motion.div>
                        Recent AI Activity
                      </AnimatedCardTitle>
                      <AnimatedCardDescription>
                        Latest AI insights and automated actions
                      </AnimatedCardDescription>
                    </div>
                    <AnimatedButton variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/activity">
                        View all
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </AnimatedButton>
                  </div>
                </AnimatedCardHeader>
                <AnimatedCardContent stagger>
                  <div className="space-y-2">
                    {aiSuggestions.length === 0 && upcomingEvents.length === 0 && emailAccounts.length === 0 ? (
                      <motion.div 
                        className="text-center py-8"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={animations.transitions.springSmooth}
                      >
                        <motion.div 
                          className="w-16 h-16 bg-gradient-to-br from-primary/10 to-ai-electric/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-primary/20"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: animations.easings.gentle }}
                        >
                          <Bot className="h-8 w-8 text-primary" />
                        </motion.div>
                        <p className="text-sm text-muted-foreground mb-4">
                          No AI activity yet. Connect your Gmail to unlock intelligent insights.
                        </p>
                        <AIButton variant="primary" size="sm" asChild>
                          <Link href="/dashboard/settings">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Enable AI Features
                          </Link>
                        </AIButton>
                      </motion.div>
                    ) : (
                      <>
                        {/* AI-Enhanced Activity Items */}
                        {aiSuggestions.slice(0, 2).map((suggestion, index) => (
                          <EnhancedActivityItem
                            key={`ai-suggestion-${suggestion.id}`}
                            type="ai"
                            title={`AI ${suggestion.suggestion_type === 'meeting' ? 'Meeting' : 'Schedule'} Suggestion`}
                            description={suggestion.title || 'AI found an optimization opportunity'}
                            time={new Date(suggestion.created_at).toLocaleDateString()}
                            urgent={suggestion.confidence_score > 0.8}
                            user="AI Assistant"
                            index={index}
                          />
                        ))}
                        
                        {/* Enhanced Events */}
                        {upcomingEvents.slice(0, 2).map((event, index) => (
                          <EnhancedActivityItem
                            key={`event-${event.id}`}
                            type={event.ai_generated ? 'ai' : 'meeting'}
                            title={event.title}
                            description={event.description || 'Scheduled meeting'}
                            time={new Date(event.start_time).toLocaleDateString()}
                            urgent={false}
                            user={event.ai_generated ? "AI Scheduled" : "Manual"}
                            index={index + aiSuggestions.slice(0, 2).length}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </AnimatedCardContent>
              </AnimatedCard>
            </motion.div>

            {/* Enhanced Schedule View */}
            <motion.div variants={animations.staggerItem}>
              <AnimatedCard variant="glass" className="h-full">
                <AnimatedCardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <AnimatedCardTitle className="flex items-center gap-2">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Clock className="h-5 w-5 text-primary" />
                        </motion.div>
                        Smart Schedule Today
                      </AnimatedCardTitle>
                      <AnimatedCardDescription>
                        AI-optimized meetings and events
                      </AnimatedCardDescription>
                    </div>
                    <AnimatedButton variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/calendar">
                        Open calendar
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </AnimatedButton>
                  </div>
                </AnimatedCardHeader>
                <AnimatedCardContent stagger>
                  <div className="space-y-4">
                    {upcomingEvents.length === 0 ? (
                      <motion.div 
                        className="text-center py-8"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={animations.transitions.springSmooth}
                      >
                        <motion.div 
                          className="w-16 h-16 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-green-500/20"
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        >
                          <Calendar className="h-8 w-8 text-green-600" />
                        </motion.div>
                        <p className="text-sm text-muted-foreground mb-4">
                          No events scheduled. Let AI help you optimize your calendar.
                        </p>
                        <AIButton variant="primary" size="sm" asChild>
                          <Link href="/dashboard/calendar">
                            <Brain className="h-4 w-4 mr-2" />
                            Smart Scheduling
                          </Link>
                        </AIButton>
                      </motion.div>
                    ) : (
                      upcomingEvents.slice(0, 3).map((event, index) => {
                        const startTime = new Date(event.start_time)
                        const endTime = event.end_time ? new Date(event.end_time) : null
                        const duration = endTime 
                          ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) 
                          : 60

                        const formatTime = (date: Date) => {
                          return date.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })
                        }

                        const formatDuration = (minutes: number) => {
                          if (minutes >= 60) {
                            const hours = Math.floor(minutes / 60)
                            const remainingMinutes = minutes % 60
                            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
                          }
                          return `${minutes}m`
                        }

                        return (
                          <motion.div 
                            key={event.id} 
                            className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 group cursor-pointer"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...animations.transitions.springSmooth, delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, x: 4 }}
                          >
                            <motion.div 
                              className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20"
                              whileHover={{ scale: 1.1, rotate: event.ai_generated ? 180 : 0 }}
                              transition={animations.transitions.springBouncy}
                            >
                              {event.ai_generated ? (
                                <Brain className="h-5 w-5 text-primary" />
                              ) : (
                                <Calendar className="h-5 w-5 text-primary" />
                              )}
                            </motion.div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium group-hover:text-primary transition-colors">
                                  {event.title}
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {formatDuration(duration)}
                                </Badge>
                                {event.ai_generated && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={animations.transitions.springBouncy}
                                  >
                                    <Badge className="text-xs bg-gradient-to-r from-primary to-ai-electric text-white border-0">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      AI
                                    </Badge>
                                  </motion.div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatTime(startTime)}</span>
                                <span>•</span>
                                <span>{startTime.toLocaleDateString()}</span>
                                {event.description && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[150px]">{event.description}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <motion.div
                              whileHover={{ x: 4 }}
                              transition={animations.transitions.fast}
                            >
                              <AnimatedButton variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                <Link href="/dashboard/calendar">
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              </AnimatedButton>
                            </motion.div>
                          </motion.div>
                        )
                      })
                    )}
                  </div>
                </AnimatedCardContent>
              </AnimatedCard>
            </motion.div>
          </motion.div>

          {/* Enhanced Pipeline Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...animations.transitions.springSmooth, delay: 0.8 }}
          >
            <DashboardSection title="AI Processing Pipeline">
              <AICard 
                status={pendingProcessing.length > 0 ? "thinking" : "idle"}
                showParticles={true}
                className="p-6"
              >
                <PipelineStatusWidget />
              </AICard>
            </DashboardSection>
          </motion.div>

          {/* Gmail Integration Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...animations.transitions.springSmooth, delay: 1.0 }}
          >
            <DashboardSection title="Gmail Intelligence Hub">
              <AnimatedCard variant="glass" glow aiThemed>
                <AnimatedCardContent className="p-6">
                  <GmailSyncManager />
                </AnimatedCardContent>
              </AnimatedCard>
            </DashboardSection>
          </motion.div>
        </PageContent>
      </PageLayout>
    </motion.div>
  )
} 