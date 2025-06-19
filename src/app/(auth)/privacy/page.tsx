import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Brain, 
  ArrowLeft,
  Shield,
  Lock,
  Eye
} from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">B Free.AI</span>
            </div>
            <Link href="/signup">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Signup
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="glass-card">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            </div>
            <CardDescription>
              Last updated: {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                1. Information We Collect
              </h2>
              <p className="text-muted-foreground">
                We collect information you provide directly to us, such as when you create an account, connect your email, 
                or use our services. This includes:
              </p>
              <ul className="list-disc pl-6 mt-2 text-muted-foreground">
                <li>Email address and account information</li>
                <li>Email content for AI analysis (processed securely)</li>
                <li>Calendar events and scheduling preferences</li>
                <li>Usage data and interaction patterns</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5" />
                2. How We Use Your Information
              </h2>
              <p className="text-muted-foreground">
                We use your information to provide, improve, and personalize our services:
              </p>
              <ul className="list-disc pl-6 mt-2 text-muted-foreground">
                <li>Analyze emails to extract tasks and meeting opportunities</li>
                <li>Provide intelligent scheduling suggestions</li>
                <li>Improve our AI algorithms and service quality</li>
                <li>Send service-related communications</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Data Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 mt-2 text-muted-foreground">
                <li>End-to-end encryption for sensitive data</li>
                <li>Secure OAuth integration with email providers</li>
                <li>Regular security audits and monitoring</li>
                <li>Limited access controls for our team</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Data Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell, trade, or otherwise transfer your personal information to third parties, except:
              </p>
              <ul className="list-disc pl-6 mt-2 text-muted-foreground">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With trusted service providers under strict agreements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Your Rights</h2>
              <p className="text-muted-foreground">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 mt-2 text-muted-foreground">
                <li>Access and review your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of non-essential communications</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your information only as long as necessary to provide our services or as required by law. 
                Email content is processed in real-time and not permanently stored unless required for service functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to improve your experience, analyze usage patterns, 
                and maintain your session. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@bfree.ai
              </p>
            </section>

            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">Privacy First</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your privacy is fundamental to our service. We're committed to transparency about how we collect, 
                use, and protect your information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}