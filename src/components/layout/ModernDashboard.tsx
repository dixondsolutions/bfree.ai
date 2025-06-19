import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Mail, 
  Settings, 
  User, 
  Menu, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Brain,
  CalendarDays,
  MessageSquare,
  Search,
  Bell
} from 'lucide-react';

// Status Card Component (inspired by Magic UI)
interface StatusCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  status: 'success' | 'warning' | 'loading' | 'info';
  trend?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ 
  title, 
  value, 
  description, 
  icon, 
  status, 
  trend 
}) => {
  const statusColors = {
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    loading: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    info: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card/50 p-6 shadow-sm transition-all hover:shadow-md hover:border-border/60 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && (
              <span className="text-xs text-green-500 font-medium">+{trend}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
          statusColors[status]
        )}>
          {status === 'loading' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            icon
          )}
        </div>
      </div>
      
      {/* Subtle hover effect */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background/80 to-muted/20 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
};

// Modern Sidebar Component
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navItems = [
    { icon: <Calendar className="h-5 w-5" />, label: 'Dashboard', active: true },
    { icon: <Mail className="h-5 w-5" />, label: 'Gmail', badge: '12' },
    { icon: <CalendarDays className="h-5 w-5" />, label: 'Calendar' },
    { icon: <MessageSquare className="h-5 w-5" />, label: 'AI Analysis' },
    { icon: <Settings className="h-5 w-5" />, label: 'Settings' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-full w-64 transform bg-card/95 backdrop-blur-xl border-r transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">bFree.ai</span>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4">
          {navItems.map((item, index) => (
            <button
              key={index}
              className={cn(
                "group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                item.active 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        
        {/* User Profile */}
        <div className="border-t p-4">
          <div className="flex items-center space-x-3 rounded-lg p-2 hover:bg-accent">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">John Doe</p>
              <p className="text-xs text-muted-foreground">john@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Modern Header Component
interface HeaderProps {
  onSidebarToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSidebarToggle }) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onSidebarToggle}
          className="lg:hidden rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back! Here&apos;s your AI assistant overview.</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
          <Search className="h-5 w-5" />
        </button>
        <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">3</span>
        </button>
      </div>
    </header>
  );
};

// Main Dashboard Component
export const ModernDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Good morning! 👋</h2>
              <p className="text-muted-foreground">
                Your AI assistant is ready to help you manage emails and schedule meetings efficiently.
              </p>
            </div>
            
            {/* Status Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {statusCards.map((card, index) => (
                <StatusCard key={index} {...card} />
              ))}
            </div>
            
            {/* Recent Activity Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Emails */}
              <div className="rounded-xl border bg-card/50 p-6 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Recent Emails</h3>
                  <button className="text-sm text-primary hover:underline">View all</button>
                </div>
                <div className="space-y-3">
                  {[
                    { from: "Alice Johnson", subject: "Q4 Planning Meeting", time: "2 min ago", urgent: true },
                    { from: "Bob Smith", subject: "Project Update Required", time: "15 min ago", urgent: false },
                    { from: "Carol Williams", subject: "Budget Review Schedule", time: "1 hour ago", urgent: false }
                  ].map((email, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-foreground truncate">{email.from}</p>
                          {email.urgent && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{email.subject}</p>
                        <p className="text-xs text-muted-foreground">{email.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Upcoming Meetings */}
              <div className="rounded-xl border bg-card/50 p-6 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Upcoming Meetings</h3>
                  <button className="text-sm text-primary hover:underline">View calendar</button>
                </div>
                <div className="space-y-3">
                  {[
                    { title: "Team Standup", time: "10:00 AM", duration: "30 min" },
                    { title: "Client Presentation", time: "2:00 PM", duration: "1 hour" },
                    { title: "Project Review", time: "4:30 PM", duration: "45 min" }
                  ].map((meeting, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{meeting.title}</p>
                        <p className="text-sm text-muted-foreground">{meeting.time} • {meeting.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ModernDashboard; 