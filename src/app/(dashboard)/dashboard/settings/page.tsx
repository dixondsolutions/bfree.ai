import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/settings/SettingsClient'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/PageLayout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch user data and preferences
  const [emailAccountsResult, calendarsResult, preferencesResult] = await Promise.all([
    supabase.from('email_accounts').select('*').eq('user_id', user.id),
    supabase.from('calendars').select('*').eq('user_id', user.id),
    supabase.from('user_preferences').select('*').eq('user_id', user.id).single()
  ])

  const emailAccounts = emailAccountsResult.data || []
  const calendars = calendarsResult.data || []
  const preferences = preferencesResult.data || null

  return (
    <PageLayout>
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences."
      />

      <PageContent>
        <ErrorBoundary>
          <SettingsClient 
            user={user}
            emailAccounts={emailAccounts}
            calendars={calendars}
            preferences={preferences}
          />
        </ErrorBoundary>
      </PageContent>
    </PageLayout>
  )
}