import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuggestionsClient } from '@/components/ai/SuggestionsClient'
import { PageLayout, PageHeader, PageContent, FullHeightContainer } from '@/components/layout/PageLayout'
import { getUserAISuggestions } from '@/lib/openai/processor'

export default async function SuggestionsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const suggestions = await getUserAISuggestions()

  return (
    <FullHeightContainer>
      <PageLayout fillHeight={true}>
        <PageHeader
          title="AI Suggestions"
          description="Review and manage AI-generated scheduling suggestions from your emails."
        />

        <PageContent fillHeight={true}>
          <SuggestionsClient initialSuggestions={suggestions} />
        </PageContent>
      </PageLayout>
    </FullHeightContainer>
  )
}
