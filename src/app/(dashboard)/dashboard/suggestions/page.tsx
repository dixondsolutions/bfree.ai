import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SuggestionCard } from '@/components/ai/SuggestionCard'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AIAnalysisLoader, LoadingSpinner } from '@/components/ui/Loading'
import { Select } from '@/components/ui/Select'
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-success-600 to-success-500 bg-clip-text text-transparent">
                AI Suggestions
              </h1>
              <p className="mt-3 text-lg text-neutral-600">
                Review and manage AI-generated scheduling suggestions from your emails.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Select
                options={[
                  { value: 'all', label: 'All Suggestions', icon: '📊' },
                  { value: 'pending', label: 'Pending Review', icon: '⏳' },
                  { value: 'approved', label: 'Approved', icon: '✅' },
                  { value: 'rejected', label: 'Rejected', icon: '❌' }
                ]}
                value="all"
                onChange={() => {}}
                className="w-48"
              />
              <Button variant="outline" size="md">
                <span className="mr-2">🔄</span>
                Refresh
              </Button>
              <Button variant="primary" size="md">
                <span className="mr-2">🤖</span>
                Generate More
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* AI Processing Status */}
          <Card className="border border-neutral-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">AI Processing Status</h2>
                <LoadingSpinner size="xs" variant="primary" />
              </div>
              <p className="text-sm text-neutral-500 mt-1">Real-time analysis of your email content</p>
            </CardHeader>
            <CardContent>
              <AIAnalysisLoader />
            </CardContent>
          </Card>

          {/* Suggestions Grid */}
          {suggestions.length === 0 ? (
            <Card className="border border-neutral-200 shadow-sm">
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-success-100 to-success-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-success-600 text-3xl">🤖</span>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">No AI Suggestions Yet</h3>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                  Connect Gmail and process emails to start getting AI-powered scheduling suggestions.
                  Our AI will analyze your emails and suggest optimal meeting times.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="primary" size="md">
                    <span className="mr-2">🚀</span>
                    Start AI Analysis
                  </Button>
                  <Button variant="outline" size="md">
                    <span className="mr-2">📎</span>
                    View Setup Guide
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border border-neutral-200 hover:border-success-300 transition-colors duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">📊</span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">{suggestions.length}</div>
                    <div className="text-sm text-neutral-500">Total Suggestions</div>
                  </CardContent>
                </Card>
                
                <Card className="border border-neutral-200 hover:border-warning-300 transition-colors duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">⏳</span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">
                      {suggestions.filter(s => s.status === 'pending').length}
                    </div>
                    <div className="text-sm text-neutral-500">Pending Review</div>
                  </CardContent>
                </Card>
                
                <Card className="border border-neutral-200 hover:border-blue-300 transition-colors duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">✅</span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">
                      {suggestions.filter(s => s.status === 'approved').length}
                    </div>
                    <div className="text-sm text-neutral-500">Approved</div>
                  </CardContent>
                </Card>
                
                <Card className="border border-neutral-200 hover:border-error-300 transition-colors duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-error-500 to-error-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">🎯</span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">95%</div>
                    <div className="text-sm text-neutral-500">Accuracy Score</div>
                  </CardContent>
                </Card>
              </div>

              {/* Suggestions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900">Recent Suggestions</h3>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-success-100 text-success-800 border-success-200">
                      <span className="mr-1">🤖</span>
                      AI Powered
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      <span className="mr-1">⚡</span>
                      Real-time
                    </Badge>
                  </div>
                </div>
                
                {suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                      <SuggestionCard
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}