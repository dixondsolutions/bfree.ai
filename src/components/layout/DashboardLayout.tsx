import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/auth/actions'
import { Button } from '@/components/ui/Button'
import { ToastProvider } from '@/components/ui/Toast'

interface DashboardLayoutProps {
  children: ReactNode
}

export async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-100">
        {/* Navigation Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-primary-600">B Free.AI</h1>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <a href="/dashboard" className="text-gray-500 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Dashboard
                  </a>
                  <a href="/dashboard/calendar" className="text-gray-500 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Calendar
                  </a>
                  <a href="/dashboard/suggestions" className="text-gray-500 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    AI Suggestions
                  </a>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user?.email}
                </span>
                <form action={signOut}>
                  <Button variant="outline" size="sm" type="submit">
                    Sign out
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}