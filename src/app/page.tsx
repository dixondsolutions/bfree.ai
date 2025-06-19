import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Brain, 
  Mail, 
  Calendar, 
  Zap, 
  Shield, 
  Clock, 
  ArrowRight,
  CheckCircle,
  Users,
  TrendingUp,
  Star
} from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-green-700">bFree.ai</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-5"></div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6">
              Your Email
              <span className="text-green-700 block">Assistant</span>
            </h1>
            <p className="text-xl text-muted-foreground text-pretty mb-8">
              Automatically extract tasks and events from your emails with intelligent calendar management. 
              Organize your schedule with smart assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" asChild className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]">
                <Link href="/login">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="min-w-[200px]">
                Watch Demo
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground animate-fade-in [animation-delay:0.6s]">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-success" />
                No credit card required
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-success" />
                14-day free trial
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-success" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to
              <span className="gradient-text"> stay organized</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powered by advanced AI to understand your emails and automatically schedule your life.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Mail className="h-6 w-6" />,
                title: "Smart Email Processing",
                description: "AI automatically extracts tasks, meetings, and important dates from your emails.",
                color: "text-blue-500"
              },
              {
                icon: <Calendar className="h-6 w-6" />,
                title: "Intelligent Scheduling",
                description: "Find optimal meeting times and automatically schedule events based on your preferences.",
                color: "text-green-500"
              },
              {
                icon: <Brain className="h-6 w-6" />,
                title: "AI-Powered Insights",
                description: "Get intelligent suggestions and insights to optimize your productivity and time management.",
                color: "text-purple-500"
              },
              {
                icon: <Clock className="h-6 w-6" />,
                title: "Time Zone Management",
                description: "Seamlessly handle meetings across multiple time zones with automatic adjustments.",
                color: "text-orange-500"
              },
              {
                icon: <Shield className="h-6 w-6" />,
                title: "Enterprise Security",
                description: "Bank-level encryption and security protocols to keep your data safe and private.",
                color: "text-red-500"
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: "Team Collaboration",
                description: "Coordinate with team members and external contacts for efficient group scheduling.",
                color: "text-indigo-500"
              }
            ].map((feature, index) => (
              <Card key={index} className="hover-lift glass-card animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4 ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by thousands of
              <span className="gradient-text"> professionals</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { number: "10,000+", label: "Active Users", icon: <Users className="h-5 w-5" /> },
              { number: "500K+", label: "Emails Processed", icon: <Mail className="h-5 w-5" /> },
              { number: "98%", label: "Time Saved", icon: <TrendingUp className="h-5 w-5" /> }
            ].map((stat, index) => (
              <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-primary">{stat.icon}</span>
                  <span className="text-4xl font-bold gradient-text">{stat.number}</span>
                </div>
                <p className="text-muted-foreground font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto glass-card animate-scale-in">
            <CardContent className="p-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to organize your email?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join professionals who have organized their workflow with bFree.ai
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]">
                  <Link href="/login">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Schedule a Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">bFree.ai</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Support</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 bFree.ai. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}