import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EnhancedDashboard from '@/components/dashboard/EnhancedDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch real dashboard metrics from Supabase
  const [
    emailAccountsResult,
    eventsResult, 
    aiSuggestionsResult,
    tasksResult,
    emailsResult
  ] = await Promise.all([
    supabase.from('email_accounts').select('*').eq('user_id', user.id),
    supabase.from('events').select('*').eq('user_id', user.id).gte('start_time', new Date().toISOString()),
    supabase.from('ai_suggestions').select('*').eq('user_id', user.id).eq('status', 'pending'),
    supabase.from('tasks').select('*').eq('user_id', user.id),
    supabase.from('emails').select('id, is_unread, ai_analyzed').eq('user_id', user.id).limit(100)
  ])

  // Extract data with fallbacks
  const emailAccounts = emailAccountsResult.data || []
  const upcomingEvents = eventsResult.data || []
  const aiSuggestions = aiSuggestionsResult.data || []
  const tasks = tasksResult.data || []
  const emails = emailsResult.data || []

  // Calculate derived metrics
  const totalEmailsSynced = emails.length
  const unreadEmails = emails.filter(email => email.is_unread).length
  const analyzedEmails = emails.filter(email => email.ai_analyzed).length
  
  const aiProcessingAccuracy = emails.length > 0 
    ? Math.round((analyzedEmails / emails.length) * 100)
    : 0

  const pendingTasks = tasks.filter(task => task.status === 'pending').length
  const completedTasks = tasks.filter(task => task.status === 'completed').length
  const timesSaved = Math.round(completedTasks * 0.25) // Estimate 15 minutes saved per completed task
  const automationRate = emailAccounts.length > 0 ? Math.round((analyzedEmails / emails.length) * 100) : 0

  // Prepare data for client component matching the expected interface
  const dashboardData = {
    emailAccounts: emailAccounts.map(account => ({
      provider: account.provider || 'gmail',
      email: account.email || 'Unknown',
      last_sync: account.last_sync || new Date().toISOString()
    })),
    upcomingEvents: upcomingEvents.map(event => ({
      title: event.title || 'Untitled Event',
      start_time: event.start_time,
      end_time: event.end_time
    })),
    aiSuggestions: aiSuggestions.map(suggestion => ({
      suggestion_text: suggestion.suggestion_text || '',
      confidence_score: suggestion.confidence_score || 0,
      created_at: suggestion.created_at
    })),
    processingQueue: [], // We'll remove this since we don't need it
    metrics: {
      totalEmailsSynced,
      unreadEmails,
      pendingTasks,
      aiProcessingAccuracy,
      timesSaved,
      automationRate
    }
  }

  return <EnhancedDashboard data={dashboardData} />
}

