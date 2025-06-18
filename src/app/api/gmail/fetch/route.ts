import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fetchRecentEmails, processEmails, processEmailsWithAIAnalysis } from '@/lib/gmail/processor'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has connected Gmail
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)

    if (!emailAccounts?.length) {
      return NextResponse.json({ error: 'No Gmail account connected' }, { status: 400 })
    }

    const { maxResults = 50, query, enableAI = true } = await request.json().catch(() => ({}))

    // Fetch emails from Gmail
    const messages = await fetchRecentEmails(maxResults, query)
    
    // Process emails with or without AI analysis
    if (enableAI) {
      const result = await processEmailsWithAIAnalysis(messages)
      
      return NextResponse.json({
        success: true,
        totalFetched: messages.length,
        schedulingRelevant: result.processedEmails.length,
        aiAnalyzed: result.aiAnalysisResults.length > 0,
        tasksCreated: result.tasksCreated.length,
        emails: result.processedEmails.map(email => ({
          id: email.id,
          subject: email.subject,
          from: email.from,
          date: email.date,
          snippet: email.body.substring(0, 200) + '...'
        })),
        statistics: {
          emails_processed: result.processedEmails.length,
          ai_suggestions: result.aiAnalysisResults.reduce((sum, r) => sum + (r.suggestions || 0), 0),
          auto_created_tasks: result.tasksCreated.length,
          high_confidence_conversions: result.tasksCreated.filter(t => t.auto_created).length
        }
      })
    } else {
      // Process emails for scheduling content only
      const processedEmails = await processEmails(messages)

      return NextResponse.json({
        success: true,
        totalFetched: messages.length,
        schedulingRelevant: processedEmails.length,
        aiAnalyzed: false,
        emails: processedEmails.map(email => ({
          id: email.id,
          subject: email.subject,
          from: email.from,
          date: email.date,
          snippet: email.body.substring(0, 200) + '...'
        }))
      })
    }
  } catch (error) {
    console.error('Error fetching Gmail emails:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch emails' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get processing status
    const { data: queue } = await supabase
      .from('processing_queue')
      .select('status, created_at, error_message')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    const status = queue?.reduce((acc, item) => {
      acc[item.status as keyof typeof acc] = (acc[item.status as keyof typeof acc] || 0) + 1
      return acc
    }, { pending: 0, processing: 0, completed: 0, failed: 0 }) || { pending: 0, processing: 0, completed: 0, failed: 0 }

    return NextResponse.json({
      status,
      recentActivity: queue?.slice(0, 10) || []
    })
  } catch (error) {
    console.error('Error getting processing status:', error)
    return NextResponse.json(
      { error: 'Failed to get processing status' },
      { status: 500 }
    )
  }
}