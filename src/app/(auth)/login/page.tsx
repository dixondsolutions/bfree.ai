import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/Badge'
import { signInWithEmail } from '@/lib/auth/actions'
import { 
  Brain, 
  Mail, 
  ArrowRight,
  Shield,
  Zap,
  CheckCircle,
  Github,
  Chrome
} from 'lucide-react'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const signInWithGoogle = async () => {
    'use server'
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      },
    })
    
    if (data.url) {
      redirect(data.url)
    }
  }

  const signInWithGithub = async () => {
    'use server'
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      },
    })
    
    if (data.url) {
      redirect(data.url)
    }
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
              Your AI-Powered Productivity Assistant
            </h2>
            <p className="text-xl text-white/80 text-pretty">
              Transform your email chaos into organized productivity with intelligent scheduling and task management.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Email Processing</h3>
                <p className="text-white/70 text-sm">AI extracts tasks and events automatically</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Intelligent Scheduling</h3>
                <p className="text-white/70 text-sm">Find perfect meeting times effortlessly</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Enterprise Security</h3>
                <p className="text-white/70 text-sm">Bank-level encryption for your data</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>No credit card required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
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
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <Card className="glass-card border-0 shadow-xl">
            <CardHeader className="text-center pb-6">
              <div className="hidden lg:block">
                <Badge variant="secondary" className="mb-4">
                  <Zap className="w-3 h-3 mr-1" />
                  AI-Powered
                </Badge>
                <CardTitle className="text-2xl font-bold">Welcome back!</CardTitle>
                <CardDescription className="text-base">
                  Sign in to your account to continue your productivity journey
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Social Login Buttons */}
              <div className="space-y-3">
                <form action={signInWithGoogle}>
                  <Button 
                    type="submit" 
                    variant="outline" 
                    className="w-full h-11 hover-glow"
                  >
                    <Chrome className="mr-3 h-4 w-4" />
                    Continue with Google
                  </Button>
                </form>
                <form action={signInWithGithub}>
                  <Button 
                    type="submit" 
                    variant="outline" 
                    className="w-full h-11 hover-glow"
                  >
                    <Github className="mr-3 h-4 w-4" />
                    Continue with GitHub
                  </Button>
                </form>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Email Form */}
              <form action={signInWithEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="h-11 focus-ring"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    className="h-11 focus-ring"
                    required
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="remember"
                      className="rounded border-border"
                    />
                    <Label htmlFor="remember" className="text-sm font-normal">
                      Remember me
                    </Label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full h-11 hover-glow">
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Sign up for free
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Your data is encrypted and secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}