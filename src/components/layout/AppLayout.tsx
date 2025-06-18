'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { 
  Calendar, 
  Mail, 
  Settings, 
  Brain,
  CalendarDays,
  MessageSquare,
  Home,
  LogOut,
  User,
  Bell,
  Search,
  Menu
} from 'lucide-react'
import { signOut } from '@/lib/auth/actions'

interface AppLayoutProps {
  children: ReactNode
  user?: {
    email?: string
    name?: string
    image?: string
  }
}

export function AppLayout({ children, user }: AppLayoutProps) {
  const pathname = usePathname()
  
  const navItems = [
    { 
      icon: Home, 
      label: 'Dashboard', 
      href: '/dashboard',
      active: pathname === '/dashboard'
    },
    { 
      icon: Mail, 
      label: 'Gmail', 
      href: '/dashboard/emails',
      active: pathname === '/dashboard/emails',
      badge: '12'
    },
    { 
      icon: CalendarDays, 
      label: 'Calendar', 
      href: '/dashboard/calendar',
      active: pathname === '/dashboard/calendar'
    },
    { 
      icon: MessageSquare, 
      label: 'AI Suggestions', 
      href: '/dashboard/suggestions',
      active: pathname === '/dashboard/suggestions'
    },
    { 
      icon: Settings, 
      label: 'Settings', 
      href: '/dashboard/settings',
      active: pathname === '/dashboard/settings'
    },
  ]

  const getPageTitle = () => {
    const currentNav = navItems.find(item => item.active)
    return currentNav?.label || 'Dashboard'
  }

  const getPageDescription = () => {
    switch (pathname) {
      case '/dashboard':
        return "Welcome back! Here's your AI assistant overview."
      case '/dashboard/emails':
        return 'Manage and process your emails with AI assistance.'
      case '/dashboard/calendar':
        return 'View and manage your calendar events.'
      case '/dashboard/suggestions':
        return 'Review AI-generated suggestions for your schedule.'
      case '/dashboard/settings':
        return 'Configure your preferences and integrations.'
      default:
        return ''
    }
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">B Free.AI</span>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={item.active}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter>
            <div className="p-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.image} />
                      <AvatarFallback>
                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-xs">
                      <span className="font-medium">{user?.name || 'User'}</span>
                      <span className="text-muted-foreground">{user?.email}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
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
                  <DropdownMenuItem asChild>
                    <form action={signOut}>
                      <button type="submit" className="flex w-full items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              
              <div>
                <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
                <p className="text-sm text-muted-foreground">{getPageDescription()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  3
                </span>
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}