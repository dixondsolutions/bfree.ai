import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AutomationControlCenter } from '@/components/automation/AutomationControlCenter'
import { PageLayout, PageHeader, PageContent, FullHeightContainer } from '@/components/layout/PageLayout'

export default async function AutomationPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <FullHeightContainer>
      <PageLayout fillHeight={true}>
        <PageHeader
          title="AI Automation Control Center"
          description="Configure and manage your AI-powered email processing and task creation"
        />

        <PageContent fillHeight={true}>
          <AutomationControlCenter />
        </PageContent>
      </PageLayout>
    </FullHeightContainer>
  )
}