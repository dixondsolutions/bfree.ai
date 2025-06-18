import { Suspense } from 'react'
import { EmailList } from '@/components/email/EmailList'
import { PageLayout } from '@/components/layout/PageLayout'

export default function EmailsPage() {
  return (
    <PageLayout
      title="Email Management"
      description="View and manage your emails with AI-powered task extraction"
    >
      <Suspense 
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <EmailList />
      </Suspense>
    </PageLayout>
  )
}