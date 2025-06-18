import { ModernEmailInterface } from '@/components/email/ModernEmailInterface'
import { PageLayout, PageContent } from '@/components/layout/PageLayout'

export default function EmailsPage() {
  return (
    <PageLayout maxWidth="full" padding="tight">
      <PageContent className="h-full">
        <ModernEmailInterface />
      </PageContent>
    </PageLayout>
  )
}