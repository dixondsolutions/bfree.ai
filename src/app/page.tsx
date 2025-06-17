import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:from-zinc-800/30">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            B Free.AI
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8">
            AI-Powered Email Scheduling Assistant
          </p>
          <div className="bg-white/80 dark:bg-zinc-900/80 rounded-lg p-8 max-w-2xl mx-auto backdrop-blur-sm">
            <h2 className="text-2xl font-semibold mb-4 text-zinc-800 dark:text-zinc-200">
              Welcome to Your AI Scheduling Assistant
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Automatically extract tasks and events from your emails with intelligent calendar optimization. 
              Give yourself more freedom by letting AI handle your scheduling.
            </p>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-primary mb-2">🚀 Authentication Ready</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Next.js 15 with Supabase authentication is configured and ready to use!
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}