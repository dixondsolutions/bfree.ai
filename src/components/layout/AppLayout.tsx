'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { Card } from '@/components/ui/Card'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/avatar'
import {
  Brain,
  Calendar,
  Mail,
  MessageSquare,
  Settings,
  Users,
  Bell,
  Search,
  LogOut,
  User,
  Sparkles,
  BarChart3,
  Home,
  ChevronRight
} from 'lucide-react'

// Hook to fetch user data
function useUserData() {
  const [userData, setUserData] = useState({
    name: 'Loading...',
    email: 'Loading...'
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          setUserData({
            name: data.name || data.email || 'User',
            email: data.email || 'user@example.com'
          })
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        setUserData({
          name: 'User',
          email: 'user@example.com'
        })
      }
    }

    fetchUserData()
  }, [])

  return userData
}

// Hook to fetch notification counts
function useNotificationCounts() {
  const [counts, setCounts] = useState({
    emails: 0,
    tasks: 0
  })

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [emailsRes, tasksRes] = await Promise.all([
          fetch('/api/emails?limit=50'),
          fetch('/api/tasks?status=pending')
        ])

        const [emailsData, tasksData] = await Promise.all([
          emailsRes.ok ? emailsRes.json() : { emails: [] },
          tasksRes.ok ? tasksRes.json() : { tasks: [] }
        ])

        setCounts({
          emails: emailsData.emails?.length || 0,
          tasks: tasksData.tasks?.length || 0
        })
      } catch (error) {
        console.error('Error fetching notification counts:', error)
      }
    }

    fetchCounts()
    // Refresh every 30 seconds
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  return counts
}

const getNavigationItems = (counts: any) => [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
    description: 'Overview and quick actions'
  },
  {
    title: 'Emails',
    url: '/dashboard/emails',
    icon: Mail,
    description: 'AI-processed email insights',
    badge: counts.emails > 0 ? counts.emails.toString() : undefined
  },
  {
    title: 'Calendar',
    url: '/dashboard/calendar',
    icon: Calendar,
    description: 'Smart scheduling assistant',
    badge: counts.tasks > 0 ? counts.tasks.toString() : undefined
  },
  {
    title: 'Automation',
    url: '/dashboard/automation',
    icon: Users,
    description: 'AI automation settings'
  },
  {
    title: 'Analytics',
    url: '/dashboard/analytics',
    icon: BarChart3,
    description: 'Productivity insights'
  },
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Settings,
    description: 'Account and preferences'
  }
]

interface AppLayoutProps {
  children: React.ReactNode
}

function AppSidebarContent() {
  const pathname = usePathname()
  const { state, setOpen } = useSidebar()
  const notificationCounts = useNotificationCounts()
  const userData = useUserData()
  const navigationItems = getNavigationItems(notificationCounts)
  
  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-gray-200 bg-white z-40 fixed left-0 top-0 h-full"
    >
      <SidebarHeader className="border-b border-gray-200 py-4 px-4 bg-white">
        <div className={cn(
          "flex items-center transition-all duration-200",
          state === "collapsed" ? "justify-center" : "gap-3"
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 flex-shrink-0">
            <Brain className="h-5 w-5 text-white" />
          </div>
          {state === "expanded" && (
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-bold text-green-700 truncate">
                bFree.ai
              </span>
              <span className="text-xs text-gray-600 truncate">Email Assistant</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 bg-white">
        <SidebarMenu>
          {navigationItems.map((item) => {
            const isActive = pathname === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={state === "collapsed" ? item.title : undefined}
                  className={cn(
                    'w-full transition-all duration-200 mb-1',
                    state === "collapsed" 
                      ? 'justify-center px-2 py-3 mx-1' 
                      : 'justify-start gap-3 px-3 py-2.5 mx-1 rounded-lg',
                    isActive
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'hover:bg-gray-50 hover:text-gray-900 text-gray-700'
                  )}
                >
                  <Link href={item.url} className="flex items-center gap-3 w-full">
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {state === "expanded" && (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {item.description}
                          </div>
                        </div>
                        {item.badge && (
                          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs text-white flex-shrink-0">
                            {item.badge}
                          </span>
                        )}
                        {isActive && <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0 text-green-600" />}
                      </>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 p-3 bg-white">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={cn(
                "w-full transition-all text-gray-700 hover:bg-gray-50",
                state === "collapsed" 
                  ? "justify-center px-2" 
                  : "justify-start gap-3 px-3 py-2"
              )}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-200">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              </Avatar>
              {state === "expanded" && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium truncate">{userData.name}</div>
                  <div className="text-xs text-gray-500 truncate">{userData.email}</div>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="flex items-center w-full">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

function AppMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const notificationCounts = useNotificationCounts()
  const totalNotifications = notificationCounts.emails + notificationCounts.tasks
  const { state } = useSidebar()
  
  return (
    <div 
      className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-200",
        state === "expanded" ? "ml-[280px]" : "ml-[64px]"
      )}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex h-16 items-center gap-4 px-6">
          <SidebarTrigger className="h-8 w-8 z-50 hover:bg-gray-100 rounded-md p-1" />
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">
                {getNavigationItems(notificationCounts).find(item => item.url === pathname)?.title || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <Bell className="h-4 w-4" />
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                  {totalNotifications > 9 ? '9+' : totalNotifications}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 bg-gray-50/30">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider 
      defaultOpen={false}
      style={{
        "--sidebar-width": "280px",
        "--sidebar-width-icon": "64px"
      } as React.CSSProperties}
    >
      <div className="flex min-h-screen w-full bg-gray-50/30 relative">
        <AppSidebarContent />
        <AppMainContent>{children}</AppMainContent>
      </div>
    </SidebarProvider>
  )
}