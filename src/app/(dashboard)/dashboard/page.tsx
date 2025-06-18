import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Mail,
  Calendar,
  Brain,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Status Card Component
interface StatusCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  status: 'success' | 'warning' | 'loading' | 'info'
  trend?: string
}

function StatusCard({ 
  title, 
  value, 
  description, 
  icon, 
  status, 
  trend 
}: StatusCardProps) {
  const statusColors = {
    success: 'bg-green-500/10 text-green-600 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    loading: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    info: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg border",
          statusColors[status]
        )}>
          {status === 'loading' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            icon
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
        {trend && (
          <p className="text-xs text-green-600 mt-1">
            +{trend} from last month
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Email Item Component
interface EmailItemProps {
  from: string
  subject: string
  time: string
  urgent?: boolean
}

function EmailItem({ from, subject, time, urgent }: EmailItemProps) {
  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <Mail className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{from}</p>
          {urgent && (
            <Badge variant="destructive" className="text-xs">
              Urgent
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{subject}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}

// Meeting Item Component
interface MeetingItemProps {
  title: string
  time: string
  duration: string
}

function MeetingItem({ title, time, duration }: MeetingItemProps) {
  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
        <Calendar className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{time} • {duration}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  // Sample data - in a real app, this would come from your API
  const statusCards = [
    {
      title: "Gmail Integration",
      value: "Connected",
      description: "Last sync 2 minutes ago",
      icon: <CheckCircle className="h-5 w-5" />,
      status: 'success' as const,
      trend: "100%"
    },
    {
      title: "Emails Processed",
      value: "247",
      description: "This month",
      icon: <Mail className="h-5 w-5" />,
      status: 'info' as const,
      trend: "23%"
    },
    {
      title: "Meetings Scheduled",
      value: "18",
      description: "AI-assisted scheduling",
      icon: <Calendar className="h-5 w-5" />,
      status: 'success' as const,
      trend: "12%"
    },
    {
      title: "AI Analysis",
      value: "Active",
      description: "Processing new emails",
      icon: <Brain className="h-5 w-5" />,
      status: 'loading' as const
    }
  ]

  const recentEmails = [
    { from: "Alice Johnson", subject: "Q4 Planning Meeting", time: "2 min ago", urgent: true },
    { from: "Bob Smith", subject: "Project Update Required", time: "15 min ago", urgent: false },
    { from: "Carol Williams", subject: "Budget Review Schedule", time: "1 hour ago", urgent: false }
  ]

  const upcomingMeetings = [
    { title: "Team Standup", time: "10:00 AM", duration: "30 min" },
    { title: "Client Presentation", time: "2:00 PM", duration: "1 hour" },
    { title: "Project Review", time: "4:30 PM", duration: "45 min" }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Good morning! 👋</h2>
        <p className="text-muted-foreground">
          Your AI assistant is ready to help you manage emails and schedule meetings efficiently.
        </p>
      </div>
      
      {/* Status Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((card, index) => (
          <StatusCard key={index} {...card} />
        ))}
      </div>
      
      {/* Recent Activity Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Emails */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Emails</CardTitle>
              <CardDescription>Latest emails requiring attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/emails">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentEmails.map((email, index) => (
              <EmailItem key={index} {...email} />
            ))}
          </CardContent>
        </Card>
        
        {/* Upcoming Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>Your schedule for today</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/calendar">
                View calendar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {upcomingMeetings.map((meeting, index) => (
              <MeetingItem key={index} {...meeting} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

