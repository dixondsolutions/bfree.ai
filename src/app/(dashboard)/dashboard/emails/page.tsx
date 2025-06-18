import { ModernEmailInterface } from '@/components/email/ModernEmailInterface'
import { PageLayout, PageContent, FullHeightContainer } from '@/components/layout/PageLayout'

export default function EmailsPage() {
  return (
    <FullHeightContainer>
      <PageLayout maxWidth="full" padding="tight" fillHeight={true}>
        <PageContent fillHeight={true}>
          <ModernEmailInterface />
        </PageContent>
      </PageLayout>
    </FullHeightContainer>
  )
}