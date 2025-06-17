import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { GmailConnectButton } from '@/components/email/GmailConnectButton'
import { EmailProcessor } from '@/components/email/EmailProcessor'
import { AIProcessor } from '@/components/ai/AIProcessor'
import { getUserProfile, getUserEmailAccounts, getUserCalendars } from '@/lib/database/utils'
import { getProcessingStatus } from '@/lib/gmail/processor'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Get user data
  const [profile, emailAccounts, calendars, processingStatus] = await Promise.all([
    getUserProfile(),
    getUserEmailAccounts(),
    getUserCalendars(),
    getProcessingStatus()
  ])

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        {/* Success/Error Messages */}
        {params.success === 'gmail_connected' && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            ✅ Gmail account connected successfully! You can now process emails for scheduling information.
          </div>
        )}
        
        {params.error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            ❌ {
              params.error === 'gmail_auth_failed' ? 'Gmail authentication failed. Please try again.' :
              params.error === 'unauthorized' ? 'Authentication error. Please sign in again.' :
              params.error === 'callback_failed' ? 'Gmail connection failed. Please try again.' :
              'An error occurred. Please try again.'
            }
          </div>
        )}

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
          <p className="mt-2 text-gray-600">
            Here&apos;s what&apos;s happening with your AI scheduling assistant today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-semibold">📧</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Email Accounts</p>
                  <p className="text-2xl font-bold text-gray-900">{emailAccounts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">📅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Calendars</p>
                  <p className="text-2xl font-bold text-gray-900">{calendars.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-semibold">🤖</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">AI Suggestions</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-yellow-600 font-semibold">⚡</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Events Today</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Setup Progress */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Setup Progress</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm">✓</span>
                    </div>
                    <span className="text-gray-700">Account Created</span>
                  </div>
                  <Badge variant="success">Complete</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm">✓</span>
                    </div>
                    <span className="text-gray-700">Database Schema</span>
                  </div>
                  <Badge variant="success">Complete</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      emailAccounts.length > 0 ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      <span className={`text-sm ${
                        emailAccounts.length > 0 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {emailAccounts.length > 0 ? '✓' : '⏳'}
                      </span>
                    </div>
                    <span className="text-gray-700">Gmail Integration</span>
                  </div>
                  <Badge variant={emailAccounts.length > 0 ? 'success' : 'warning'}>
                    {emailAccounts.length > 0 ? 'Connected' : 'Pending'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      processingStatus.completed > 0 ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <span className={`text-sm ${
                        processingStatus.completed > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {processingStatus.completed > 0 ? '✓' : '○'}
                      </span>
                    </div>
                    <span className="text-gray-700">AI Processing</span>
                  </div>
                  <Badge variant={processingStatus.completed > 0 ? 'success' : 'default'}>
                    {processingStatus.completed > 0 ? 'Active' : 'Not Started'}
                  </Badge>
                </div>

                {emailAccounts.length === 0 && (
                  <div className="pt-4">
                    <GmailConnectButton />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Email Processing */}
            <EmailProcessor emailAccountConnected={emailAccounts.length > 0} />
          </div>

          {/* AI Processing Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AIProcessor hasEmailsToProcess={processingStatus.completed > 0} />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  📧 View Recent Emails
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  🤖 Review AI Suggestions
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  📅 Open Calendar
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  ⚙️ Adjust Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Development Status */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">🚀 Development Status</h2>
            </CardHeader>
            <CardContent>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                <h3 className="font-semibold text-primary mb-3">✅ Completed Features</h3>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li>• Next.js 15 application structure with TypeScript</li>
                  <li>• Supabase authentication with Gmail OAuth support</li>
                  <li>• Complete database schema with Row Level Security</li>
                  <li>• Responsive UI components and dashboard layout</li>
                  <li>• User profile and preference management</li>
                </ul>
                
                <h3 className="font-semibold text-yellow-600 mb-3">🔨 In Progress</h3>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li>• Gmail API integration for email fetching</li>
                  <li>• OpenAI GPT-4 integration for content analysis</li>
                  <li>• Calendar synchronization features</li>
                </ul>

                <div className="flex space-x-3">
                  <Button variant="primary" size="sm">
                    View Full Roadmap
                  </Button>
                  <Button variant="outline" size="sm">
                    Contribute
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}