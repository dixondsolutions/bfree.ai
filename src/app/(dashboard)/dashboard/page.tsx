import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Loading'
import { LoadingSpinner } from '@/components/ui/Loading'
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
            Welcome back!
          </h1>
          <p className="mt-3 text-lg text-neutral-600">
            Here&apos;s what&apos;s happening with your AI scheduling assistant today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-neutral-200 hover:border-primary-300 transition-colors duration-200 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">📧</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-500">Email Accounts</p>
                  <p className="text-3xl font-bold text-neutral-900">{emailAccounts.length}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {emailAccounts.length > 0 ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 hover:border-blue-300 transition-colors duration-200 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">📅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-500">Calendars</p>
                  <p className="text-3xl font-bold text-neutral-900">{calendars.length}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {calendars.length > 0 ? 'Synced' : 'Not synced'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 hover:border-success-300 transition-colors duration-200 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">🤖</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-500">AI Suggestions</p>
                  <p className="text-3xl font-bold text-neutral-900">0</p>
                  <p className="text-xs text-neutral-400 mt-1">Processing...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 hover:border-warning-300 transition-colors duration-200 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">⚡</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-500">Events Today</p>
                  <p className="text-3xl font-bold text-neutral-900">0</p>
                  <p className="text-xs text-neutral-400 mt-1">Up to date</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Setup Progress */}
            <Card className="border border-neutral-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">Setup Progress</h2>
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="xs" variant="primary" />
                    <span className="text-xs text-neutral-500">Checking status...</span>
                  </div>
                </div>
                <Progress 
                  value={emailAccounts.length > 0 ? 75 : 50} 
                  max={100}
                  variant="primary"
                  size="sm"
                  className="mt-2"
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg border border-success-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-success-600 text-sm font-semibold">✓</span>
                    </div>
                    <div>
                      <span className="text-neutral-900 font-medium">Account Created</span>
                      <p className="text-xs text-success-600">Authentication enabled</p>
                    </div>
                  </div>
                  <Badge className="bg-success-100 text-success-800 border-success-200">Complete</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg border border-success-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-success-600 text-sm font-semibold">✓</span>
                    </div>
                    <div>
                      <span className="text-neutral-900 font-medium">Database Schema</span>
                      <p className="text-xs text-success-600">All tables configured</p>
                    </div>
                  </div>
                  <Badge className="bg-success-100 text-success-800 border-success-200">Complete</Badge>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg border ${
                  emailAccounts.length > 0 
                    ? 'bg-success-50 border-success-200' 
                    : 'bg-warning-50 border-warning-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                      emailAccounts.length > 0 ? 'bg-success-100' : 'bg-warning-100'
                    }`}>
                      <span className={`text-sm font-semibold ${
                        emailAccounts.length > 0 ? 'text-success-600' : 'text-warning-600'
                      }`}>
                        {emailAccounts.length > 0 ? '✓' : '⏳'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-900 font-medium">Gmail Integration</span>
                      <p className={`text-xs ${
                        emailAccounts.length > 0 ? 'text-success-600' : 'text-warning-600'
                      }`}>
                        {emailAccounts.length > 0 ? 'OAuth2 connected' : 'Awaiting connection'}
                      </p>
                    </div>
                  </div>
                  <Badge className={emailAccounts.length > 0 
                    ? 'bg-success-100 text-success-800 border-success-200' 
                    : 'bg-warning-100 text-warning-800 border-warning-200'
                  }>
                    {emailAccounts.length > 0 ? 'Connected' : 'Pending'}
                  </Badge>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg border ${
                  processingStatus.completed > 0 
                    ? 'bg-success-50 border-success-200' 
                    : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                      processingStatus.completed > 0 ? 'bg-success-100' : 'bg-neutral-100'
                    }`}>
                      <span className={`text-sm font-semibold ${
                        processingStatus.completed > 0 ? 'text-success-600' : 'text-neutral-400'
                      }`}>
                        {processingStatus.completed > 0 ? '✓' : '○'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-900 font-medium">AI Processing</span>
                      <p className={`text-xs ${
                        processingStatus.completed > 0 ? 'text-success-600' : 'text-neutral-500'
                      }`}>
                        {processingStatus.completed > 0 ? 'GPT-4 analyzing emails' : 'Ready to start'}
                      </p>
                    </div>
                  </div>
                  <Badge className={processingStatus.completed > 0 
                    ? 'bg-success-100 text-success-800 border-success-200' 
                    : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                  }>
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
            <Card className="border border-neutral-200 shadow-sm">
              <CardHeader>
                <h2 className="text-lg font-semibold text-neutral-900">Quick Actions</h2>
                <p className="text-sm text-neutral-500 mt-1">Common tasks and shortcuts</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" size="md" className="w-full justify-start hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 group">
                  <span className="text-lg mr-3 group-hover:scale-110 transition-transform">📧</span>
                  <span className="flex-1 text-left">View Recent Emails</span>
                  <span className="text-xs text-neutral-400 group-hover:text-primary-600">→</span>
                </Button>
                <Button variant="outline" size="md" className="w-full justify-start hover:border-success-300 hover:bg-success-50 transition-all duration-200 group">
                  <span className="text-lg mr-3 group-hover:scale-110 transition-transform">🤖</span>
                  <span className="flex-1 text-left">Review AI Suggestions</span>
                  <span className="text-xs text-neutral-400 group-hover:text-success-600">→</span>
                </Button>
                <Button variant="outline" size="md" className="w-full justify-start hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
                  <span className="text-lg mr-3 group-hover:scale-110 transition-transform">📅</span>
                  <span className="flex-1 text-left">Open Calendar</span>
                  <span className="text-xs text-neutral-400 group-hover:text-blue-600">→</span>
                </Button>
                <Button variant="outline" size="md" className="w-full justify-start hover:border-neutral-400 hover:bg-neutral-50 transition-all duration-200 group">
                  <span className="text-lg mr-3 group-hover:scale-110 transition-transform">⚙️</span>
                  <span className="flex-1 text-left">Adjust Settings</span>
                  <span className="text-xs text-neutral-400 group-hover:text-neutral-600">→</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Development Status */}
        <div className="mt-8">
          <Card className="border border-neutral-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🚀</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-primary-900">Development Status</h2>
                  <p className="text-sm text-primary-700">Track our progress building B Free.AI</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="bg-success-50 border border-success-200 rounded-lg p-5">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-success-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <h3 className="font-semibold text-success-800">Completed Features</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-success-700">
                    <li className="flex items-start space-x-2">
                      <span className="text-success-500 mt-0.5">•</span>
                      <span>Next.js 15 application structure with TypeScript</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-success-500 mt-0.5">•</span>
                      <span>Supabase authentication with Gmail OAuth support</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-success-500 mt-0.5">•</span>
                      <span>Complete database schema with Row Level Security</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-success-500 mt-0.5">•</span>
                      <span>Professional UI component library with accessibility</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-success-500 mt-0.5">•</span>
                      <span>User profile and preference management</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-5">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-warning-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">⏳</span>
                    </div>
                    <h3 className="font-semibold text-warning-800">In Progress</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-warning-700">
                    <li className="flex items-start space-x-2">
                      <span className="text-warning-500 mt-0.5">•</span>
                      <span>Gmail API integration for email fetching</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-warning-500 mt-0.5">•</span>
                      <span>OpenAI GPT-4 integration for content analysis</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-warning-500 mt-0.5">•</span>
                      <span>Calendar synchronization features</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button variant="primary" size="md" className="hover:scale-105 transition-transform">
                    <span className="mr-2">📋</span>
                    View Full Roadmap
                  </Button>
                  <Button variant="outline" size="md" className="hover:scale-105 transition-transform">
                    <span className="mr-2">🤝</span>
                    Contribute
                  </Button>
                  <Button variant="ghost" size="md" className="hover:scale-105 transition-transform">
                    <span className="mr-2">📊</span>
                    Analytics
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