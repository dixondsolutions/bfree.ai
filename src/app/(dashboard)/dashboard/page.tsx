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
    processingQueueResult
  ] = await Promise.all([
    supabase.from('email_accounts').select('*').eq('user_id', user.id),
    supabase.from('events').select('*').eq('user_id', user.id).gte('start_time', new Date().toISOString()),
    supabase.from('ai_suggestions').select('*').eq('user_id', user.id),
    supabase.from('processing_queue').select('*').eq('user_id', user.id).eq('status', 'pending')
  ])

  // Extract data with fallbacks
  const emailAccounts = emailAccountsResult.data || []
  const upcomingEvents = eventsResult.data || []
  const aiSuggestions = aiSuggestionsResult.data || []
  const pendingProcessing = processingQueueResult.data || []

  // Calculate derived metrics
  const hasGmailConnection = emailAccounts.length > 0
  const eventsThisMonth = upcomingEvents.filter(event => {
    const eventDate = new Date(event.start_time)
    const now = new Date()
    return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()
  }).length
  const aiGeneratedEvents = upcomingEvents.filter(event => event.ai_generated).length
  const pendingSuggestions = aiSuggestions.filter(s => s.status === 'pending').length

  // Prepare data for client component
  const dashboardData = {
    emailAccounts,
    upcomingEvents,
    aiSuggestions,
    pendingProcessing,
    hasGmailConnection,
    eventsThisMonth,
    aiGeneratedEvents,
    pendingSuggestions
  }

  return <EnhancedDashboard data={dashboardData} />
}

