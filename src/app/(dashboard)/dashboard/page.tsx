import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/avatar'
import { PageLayout, PageHeader, PageContent, PageGrid, PageSection } from '@/components/layout/PageLayout'
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
    <Card className="hover-lift glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg bg-muted", statusColors[status])}>
              {status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                icon
              )}
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
            </div>
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.positive ? "text-green-600" : "text-red-600"
            )}>
              <TrendingUp className="h-3 w-3" />
              {trend.value}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
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
    <Card className="hover-lift group cursor-pointer">
      <Link href={href}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-xl group-hover:scale-110 transition-transform",
              gradient || "bg-primary/10 text-primary"
            )}>
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Good morning! 👋"
        description="Your AI assistant is ready to help you manage emails and schedule meetings efficiently."
      />

      <PageContent>
        {/* Metrics Grid */}
        <PageSection title="Overview">
          <PageGrid columns={4}>
        <MetricCard
          title="Gmail Integration"
          value="Connected"
          description="Last sync 2 minutes ago"
          icon={<CheckCircle className="h-4 w-4" />}
          status="success"
          trend={{ value: "+100%", positive: true }}
        />
        <MetricCard
          title="Emails Processed"
          value="247"
          description="This month"
          icon={<Mail className="h-4 w-4" />}
          status="info"
          trend={{ value: "+23%", positive: true }}
        />
        <MetricCard
          title="Meetings Scheduled"
          value="18"
          description="AI-assisted scheduling"
          icon={<Calendar className="h-4 w-4" />}
          status="success"
          trend={{ value: "+12%", positive: true }}
        />
        <MetricCard
          title="AI Analysis"
          value="Active"
          description="Processing new emails"
          icon={<Brain className="h-4 w-4" />}
          status="loading"
        />
          </PageGrid>
        </PageSection>

        {/* Quick Actions */}
        <PageSection title="Quick Actions">
          <PageGrid columns={3} gap="md">
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
          </PageGrid>
        </PageSection>

        {/* Recent Activity & Upcoming */}
        <div className="grid gap-6 lg:grid-cols-2">
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
              <ActivityItem
                type="email"
                title="Q4 Planning Meeting"
                description="Alice Johnson sent you an email about quarterly planning"
                time="2 min ago"
                urgent={true}
                user="Alice Johnson"
              />
              <ActivityItem
                type="meeting"
                title="Project Update Required"
                description="Scheduled with Bob Smith for next week"
                time="15 min ago"
                user="Bob Smith"
              />
              <ActivityItem
                type="task"
                title="Budget Review"
                description="AI suggests scheduling with Carol Williams"
                time="1 hour ago"
                user="Carol Williams"
              />
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
              {[
                { title: "Team Standup", time: "10:00 AM", duration: "30 min", attendees: 5 },
                { title: "Client Presentation", time: "2:00 PM", duration: "1 hour", attendees: 3 },
                { title: "Project Review", time: "4:30 PM", duration: "45 min", attendees: 2 }
              ].map((meeting, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{meeting.title}</p>
                      <Badge variant="secondary" className="text-xs">
                        {meeting.duration}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{meeting.time}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{meeting.attendees} people</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
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

