import { Suspense } from 'react'
import { EmailList } from '@/components/email/EmailList'
import { GmailSyncManager } from '@/components/email/GmailSyncManager'
import { PageLayout } from '@/components/layout/PageLayout'

export default function EmailsPage() {
  return (
    <PageLayout
      title="Email Management"
      description="View and manage your emails with AI-powered task extraction"
    >
      <div className="space-y-6">
        {/* Gmail Sync Manager - Prominent placement at top */}
        <Suspense 
          fallback={
            <div className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          }
        >
          <GmailSyncManager />
        </Suspense>

        {/* Email List */}
        <Suspense 
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
        >
          <EmailList />
        </Suspense>
      </div>
    </PageLayout>
  )
}