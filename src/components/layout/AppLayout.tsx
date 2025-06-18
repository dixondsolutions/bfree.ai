'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
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

const navigationItems = [
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
    badge: '12'
  },
  {
    title: 'Calendar',
    url: '/dashboard/calendar',
    icon: Calendar,
    description: 'Smart scheduling assistant'
  },
  {
    title: 'AI Suggestions',
    url: '/dashboard/suggestions',
    icon: Sparkles,
    description: 'Intelligent recommendations',
    badge: '3'
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
  const { state } = useSidebar()
  
  return (
    <Sidebar collapsible="icon" className="border-r">
          <SidebarHeader className="border-b py-4" style={{ paddingLeft: state === "collapsed" ? "0.75rem" : "1.5rem", paddingRight: state === "collapsed" ? "0.75rem" : "1.5rem" }}>
            <div className={cn(
              "flex items-center transition-all",
              state === "collapsed" ? "justify-center" : "gap-3"
            )}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              {state === "expanded" && (
                <div className="flex flex-col min-w-0">
                  <span className="text-lg font-bold gradient-text truncate">B Free.AI</span>
                  <span className="text-xs text-muted-foreground truncate">AI Assistant</span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 py-4">
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
                        'w-full transition-all',
                        state === "collapsed" 
                          ? 'justify-center px-2' 
                          : 'justify-start gap-3 px-3 py-2.5',
                        isActive
                          ? 'bg-primary/10 text-primary border-r-2 border-primary'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {state === "expanded" && (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{item.title}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </div>
                            </div>
                            {item.badge && (
                              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground flex-shrink-0">
                                {item.badge}
                              </span>
                            )}
                            {isActive && <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full transition-all",
                    state === "collapsed" 
                      ? "justify-center px-2" 
                      : "justify-start gap-3 px-3 py-2"
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </Avatar>
                  {state === "expanded" && (
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium truncate">John Doe</div>
                      <div className="text-xs text-muted-foreground truncate">john@example.com</div>
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
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
  )
}

function AppMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  return (
    <SidebarInset className="flex-1">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-6">
          <SidebarTrigger className="h-8 w-8" />
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">
                {navigationItems.find(item => item.url === pathname)?.title || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </SidebarInset>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background">
        <AppSidebarContent />
        <AppMainContent>{children}</AppMainContent>
      </div>
    </SidebarProvider>
  )
}