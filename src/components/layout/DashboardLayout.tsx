import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ToastProvider } from '@/components/ui/Toast'
import { AppLayout } from './AppLayout'

interface DashboardLayoutProps {
  children: ReactNode
}

export async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <ToastProvider>
      <AppLayout user={user ? {
        email: user.email,
        name: user.user_metadata?.full_name,
        image: user.user_metadata?.avatar_url
      } : undefined}>
        {children}
      </AppLayout>
    </ToastProvider>
  )
}