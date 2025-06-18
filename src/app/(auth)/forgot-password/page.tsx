import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/Badge'
import { 
  Brain, 
  ArrowLeft,
  Mail,
  Shield,
  CheckCircle
} from 'lucide-react'

export default async function ForgotPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg"></div>
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <span className="text-3xl font-bold">B Free.AI</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-balance">
              Secure Account Recovery
            </h2>
            <p className="text-xl text-white/80 text-pretty">
              We'll help you regain access to your AI-powered productivity assistant quickly and securely.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Email Recovery</h3>
                <p className="text-white/70 text-sm">Secure password reset via email</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Bank-Level Security</h3>
                <p className="text-white/70 text-sm">Your data remains protected throughout</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Quick Access</h3>
                <p className="text-white/70 text-sm">Back to productivity in minutes</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-sm text-white/60">
            Your productivity tools and AI assistant are waiting for your return.
          </div>
        </div>
      </div>

      {/* Right Side - Reset Form */}
      <div className="flex-1 flex flex-col justify-center p-8 lg:p-12">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold gradient-text">B Free.AI</span>
            </div>
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="text-muted-foreground">Enter your email to receive reset instructions</p>
          </div>

          <Card className="glass-card border-0 shadow-xl">
            <CardHeader className="text-center pb-6">
              <div className="hidden lg:block">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
                <CardDescription className="text-base">
                  Enter your email address and we'll send you instructions to reset your password
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Reset Form */}
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="h-11 focus-ring"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 gradient-bg hover-lift"
                  size="lg"
                >
                  Send Reset Instructions
                </Button>
              </form>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Remember your password? </span>
                <Link 
                  href="/login" 
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Sign in
                </Link>
              </div>

              <div className="text-center">
                <Link 
                  href="/login"
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Link>
              </div>

              {/* Help Text */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Need help?</strong> Check your spam folder or contact support if you don't receive an email within a few minutes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 