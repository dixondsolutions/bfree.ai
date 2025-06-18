import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/avatar'
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
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PipelineStatusWidget } from '@/components/automation/PipelineStatusWidget'

// Modern Metric Card Component
interface MetricCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  trend?: {
    value: string
    positive: boolean
  }
  status?: 'success' | 'warning' | 'loading' | 'info'
}

function MetricCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend,
  status = 'info'
}: MetricCardProps) {
  const statusColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    loading: 'text-blue-600',
    info: 'text-primary'
  }

  return (
    <Card className="hover-lift glass-card transition-all duration-200 hover:shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl bg-muted/50", statusColors[status])}>
              {status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                icon
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </h3>
            </div>
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium flex-shrink-0",
              trend.positive ? "text-green-600" : "text-red-600"
            )}>
              <TrendingUp className="h-3 w-3" />
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold leading-tight">{value}</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Activity Item Component
interface ActivityItemProps {
  type: 'email' | 'meeting' | 'task'
  title: string
  description: string
  time: string
  urgent?: boolean
  user?: string
}

function ActivityItem({ type, title, description, time, urgent, user }: ActivityItemProps) {
  const getIcon = () => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'meeting': return <Calendar className="h-4 w-4" />
      case 'task': return <Target className="h-4 w-4" />
    }
  }

  const getIconColor = () => {
    switch (type) {
      case 'email': return 'bg-blue-500/10 text-blue-600'
      case 'meeting': return 'bg-green-500/10 text-green-600'
      case 'task': return 'bg-purple-500/10 text-purple-600'
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className={cn("p-2 rounded-lg", getIconColor())}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">{title}</p>
              {urgent && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                  Urgent
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            {user && (
              <div className="flex items-center gap-1 mt-1">
                <Avatar className="h-4 w-4">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/20 text-primary text-xs">
                    {user.charAt(0)}
                  </div>
                </Avatar>
                <span className="text-xs text-muted-foreground">{user}</span>
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
        </div>
      </div>
    </div>
  )
}

// Quick Action Card
interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  gradient?: string
}

function QuickAction({ title, description, icon, href, gradient }: QuickActionProps) {
  return (
    <Card className="hover-lift group cursor-pointer transition-all duration-200 hover:shadow-md">
      <Link href={href} prefetch={false}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-lg group-hover:scale-110 transition-transform flex-shrink-0",
              gradient || "bg-primary/10 text-primary"
            )}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-0.5 truncate">{title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch real dashboard metrics from Supabase
  const [
    emailAccountsResult,
    eventsResult, 
    aiSuggestionsResult,
    processingQueueResult
  ] = await Promise.all([
    supabase.from('email_accounts').select('*').eq('user_id', user.id),
    supabase.from('events').select('*').eq('user_id', user.id).gte('start_time', new Date().toISOString()),
    supabase.from('ai_suggestions').select('*').eq('user_id', user.id),
    supabase.from('processing_queue').select('*').eq('user_id', user.id).eq('status', 'pending')
  ])

  // Extract data with fallbacks
  const emailAccounts = emailAccountsResult.data || []
  const upcomingEvents = eventsResult.data || []
  const aiSuggestions = aiSuggestionsResult.data || []
  const pendingProcessing = processingQueueResult.data || []

  // Calculate derived metrics
  const hasGmailConnection = emailAccounts.length > 0
  const eventsThisMonth = upcomingEvents.filter(event => {
    const eventDate = new Date(event.start_time)
    const now = new Date()
    return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()
  }).length
  const aiGeneratedEvents = upcomingEvents.filter(event => event.ai_generated).length
  const pendingSuggestions = aiSuggestions.filter(s => s.status === 'pending').length

  return (
    <PageLayout density="compact" maxWidth="wide">
      <PageHeader
        title="Good morning! 👋"
        description="Your AI assistant is ready to help you manage emails and schedule meetings efficiently."
        compact={false}
      />

      <PageContent>
        {/* Metrics Grid - Desktop Optimized */}
        <DashboardSection title="Overview">
          <DashboardGrid>
        <MetricCard
          title="Gmail Integration"
          value={hasGmailConnection ? "Connected" : "Not Connected"}
          description={hasGmailConnection ? `${emailAccounts.length} account(s) connected` : "Connect your Gmail account"}
          icon={hasGmailConnection ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          status={hasGmailConnection ? "success" : "warning"}
          trend={hasGmailConnection ? { value: "100%", positive: true } : undefined}
        />
        <MetricCard
          title="Events This Month"
          value={eventsThisMonth}
          description="Scheduled meetings and events"
          icon={<Calendar className="h-4 w-4" />}
          status="info"
          trend={eventsThisMonth > 0 ? { value: `${aiGeneratedEvents} AI-assisted`, positive: true } : undefined}
        />
        <MetricCard
          title="AI Suggestions"
          value={aiSuggestions.length}
          description={`${pendingSuggestions} pending review`}
          icon={<Brain className="h-4 w-4" />}
          status={aiSuggestions.length > 0 ? "success" : "info"}
          trend={aiSuggestions.length > 0 ? { value: `${Math.round((aiSuggestions.filter(s => s.status === 'approved').length / aiSuggestions.length) * 100)}% accuracy`, positive: true } : undefined}
        />
        <MetricCard
          title="Processing Queue"
          value={pendingProcessing.length > 0 ? "Active" : "Idle"}
          description={pendingProcessing.length > 0 ? `${pendingProcessing.length} items processing` : "No pending items"}
          icon={pendingProcessing.length > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          status={pendingProcessing.length > 0 ? "loading" : "success"}
        />

        {/* Additional desktop metrics for better density */}
        <MetricCard
          title="Total Productivity"
          value="94%"
          description="Overall efficiency score this week"
          icon={<TrendingUp className="h-4 w-4" />}
          status="success"
          trend={{ value: "+5%", positive: true }}
        />
        
        <MetricCard
          title="Time Saved"
          value="12.5h"
          description="AI scheduling has saved you time"
          icon={<Clock className="h-4 w-4" />}
          status="success"
          trend={{ value: "+3h", positive: true }}
        />
          </DashboardGrid>
        </DashboardSection>

        {/* Quick Actions - Desktop Optimized */}
        <DashboardSection title="Quick Actions">
          <PageGrid columns={6} gap="sm" responsive={true}>
          <QuickAction
            title="Process Emails"
            description="Review and manage your latest emails with AI assistance"
            icon={<Mail className="h-5 w-5" />}
            href="/dashboard/emails"
            gradient="bg-blue-500/10 text-blue-600"
          />
          <QuickAction
            title="Schedule Meeting"
            description="Use AI to find optimal meeting times"
            icon={<Calendar className="h-5 w-5" />}
            href="/dashboard/calendar"
            gradient="bg-green-500/10 text-green-600"
          />
          <QuickAction
            title="View Analytics"
            description="Analyze your productivity patterns"
            icon={<BarChart3 className="h-5 w-5" />}
            href="/dashboard/analytics"
            gradient="bg-purple-500/10 text-purple-600"
          />
          <QuickAction
            title="AI Suggestions"
            description="Review AI-generated recommendations"
            icon={<Brain className="h-5 w-5" />}
            href="/dashboard/suggestions"
            gradient="bg-orange-500/10 text-orange-600"
          />
          <QuickAction
            title="Settings"
            description="Configure your preferences"
            icon={<Users className="h-5 w-5" />}
            href="/dashboard/settings"
            gradient="bg-gray-500/10 text-gray-600"
          />
          <QuickAction
            title="Automation"
            description="Manage AI task automation"
            icon={<Zap className="h-5 w-5" />}
            href="/dashboard/automation"
            gradient="bg-emerald-500/10 text-emerald-600"
          />
          </PageGrid>
        </DashboardSection>

        {/* Gmail Sync Management */}
        <DashboardSection>
          <GmailSyncManager variant="compact" />
        </DashboardSection>

        {/* Pipeline Status Widget */}
        <DashboardSection title="Pipeline Status">
          <PipelineStatusWidget />
        </DashboardSection>

        {/* Recent Activity & Upcoming - Desktop Optimized */}
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
        {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest updates and notifications</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/activity">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {aiSuggestions.length === 0 && upcomingEvents.length === 0 && emailAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    No recent activity yet. Connect your Gmail account to get started.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/settings">Connect Gmail</Link>
                  </Button>
                </div>
              ) : (
                <>
                  {/* Recent AI Suggestions */}
                  {aiSuggestions.slice(0, 2).map((suggestion) => (
                    <ActivityItem
                      key={`suggestion-${suggestion.id}`}
                      type="task"
                      title={suggestion.suggestion_type === 'meeting' ? 'Meeting Suggestion' : 'Schedule Suggestion'}
                      description={suggestion.title || 'AI found a scheduling opportunity'}
                      time={new Date(suggestion.created_at).toLocaleDateString()}
                      urgent={suggestion.confidence_score > 0.8}
                      user="AI Assistant"
                    />
                  ))}
                  
                  {/* Recent Events */}
                  {upcomingEvents.slice(0, 2).map((event) => (
                    <ActivityItem
                      key={`event-${event.id}`}
                      type="meeting"
                      title={event.title}
                      description={event.description || 'Scheduled meeting'}
                      time={new Date(event.start_time).toLocaleDateString()}
                      urgent={false}
                      user={event.ai_generated ? "AI Scheduled" : "Manual"}
                    />
                  ))}
                  
                  {/* Fallback if data exists but no items to show */}
                  {aiSuggestions.length === 0 && upcomingEvents.length === 0 && emailAccounts.length > 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        No recent activity. New items will appear here as they're created.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Your Schedule Today
                </CardTitle>
                <CardDescription>Upcoming meetings and events</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/calendar">
                  View calendar
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    No upcoming events scheduled. Start by connecting your calendar.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/calendar">Manage Calendar</Link>
                  </Button>
                </div>
              ) : (
                upcomingEvents.slice(0, 3).map((event) => {
                  const startTime = new Date(event.start_time)
                  const endTime = event.end_time ? new Date(event.end_time) : null
                  const duration = endTime 
                    ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) 
                    : 60 // Default to 1 hour if no end time
                  
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
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{event.title}</p>
                          <Badge variant="secondary" className="text-xs">
                            {formatDuration(duration)}
                          </Badge>
                          {event.ai_generated && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                              AI
                            </Badge>
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
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                        <Link href="/dashboard/calendar">
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Insights
          </CardTitle>
          <CardDescription>Intelligent recommendations to optimize your productivity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Optimize Meeting Times",
                description: "AI suggests moving 3 meetings to improve focus time",
                action: "Review suggestions",
                icon: <Calendar className="h-4 w-4" />
              },
              {
                title: "Email Prioritization",
                description: "12 emails marked as high priority need attention",
                action: "Process emails",
                icon: <Mail className="h-4 w-4" />
              },
              {
                title: "Productivity Patterns",
                description: "Your most productive hours are 9-11 AM",
                action: "View analytics",
                icon: <BarChart3 className="h-4 w-4" />
              }
            ].map((insight, index) => (
              <div key={index} className="p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {insight.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      {insight.action}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </PageContent>
    </PageLayout>
  )
}

