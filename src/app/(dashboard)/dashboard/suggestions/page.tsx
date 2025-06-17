import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SuggestionCard } from '@/components/ai/SuggestionCard'
import { getUserAISuggestions } from '@/lib/openai/processor'

export default async function SuggestionsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const suggestions = await getUserAISuggestions()

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Suggestions</h1>
          <p className="mt-2 text-gray-600">
            Review and manage AI-generated scheduling suggestions from your emails.
          </p>
        </div>

        {suggestions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">🤖</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Suggestions Yet</h3>
            <p className="text-gray-500 mb-4">
              Connect Gmail and process emails to start getting AI-powered scheduling suggestions.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApprove={async (id) => {
                  // This would be handled by client-side code
                  console.log('Approve suggestion:', id)
                }}
                onReject={async (id) => {
                  // This would be handled by client-side code
                  console.log('Reject suggestion:', id)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}