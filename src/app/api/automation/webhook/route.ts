import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processEmailsWithAIAnalysis, fetchRecentEmails } from '@/lib/gmail/processor'

/**
 * POST /api/automation/webhook - Webhook for real-time email processing
 * This endpoint can be called by external services (like Gmail push notifications) 
 * to trigger immediate email processing when new emails arrive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { userId, emailId, trigger = 'webhook' } = body

    console.log('Webhook triggered:', { userId, emailId, trigger })

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user exists and has active email account
    const { data: user } = await supabase
      .from('users')
      .select(`
        id,
        email,
        email_accounts!inner(id, is_active)
      `)
      .eq('id', userId)
      .eq('email_accounts.is_active', true)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found or no active email account' }, { status: 404 })
    }

    // Check if we should process this webhook (rate limiting)
    const { data: recentWebhooks } = await supabase
      .from('processing_queue')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .limit(10)

    if (recentWebhooks && recentWebhooks.length > 5) {
      console.log(`Rate limiting webhook for user ${userId} - too many recent requests`)
      return NextResponse.json({ 
        message: 'Rate limited - too many recent webhook requests',
        processed: false 
      })
    }

    // Fetch recent emails (last 1-2 emails if specific emailId not provided)
    const query = emailId ? `rfc822msgid:${emailId}` : 'newer_than:1h'
    const maxResults = emailId ? 1 : 5
    
    let messages
    try {
      messages = await fetchRecentEmails(maxResults, query)
    } catch (emailError) {
      console.error('Error fetching emails in webhook:', emailError)
      return NextResponse.json({ 
        error: 'Failed to fetch emails',
        details: emailError instanceof Error ? emailError.message : 'Unknown error'
      }, { status: 500 })
    }

    if (messages.length === 0) {
      return NextResponse.json({ 
        message: 'No new emails found to process',
        processed: false 
      })
    }

    // Process emails with AI analysis
    try {
      const result = await processEmailsWithAIAnalysis(messages)

      // Log webhook activity
      await supabase.from('task_comments').insert({
        task_id: null, // System-level comment
        user_id: userId,
        comment: `Webhook triggered processing: ${result.processedEmails.length} emails analyzed, ${result.tasksCreated.length} tasks created`,
        is_system_comment: true
      })

      const response = {
        success: true,
        trigger,
        processed: true,
        timestamp: new Date().toISOString(),
        results: {
          emailsProcessed: result.processedEmails.length,
          aiSuggestions: result.aiAnalysisResults.reduce((sum, r) => sum + (r.suggestions || 0), 0),
          tasksCreated: result.tasksCreated.length,
          autoConversions: result.tasksCreated.filter(t => t.auto_created).length
        },
        message: `Processed ${result.processedEmails.length} emails via webhook`
      }

      console.log('Webhook processing completed:', response.results)
      return NextResponse.json(response)

    } catch (processingError) {
      console.error('Error in webhook processing:', processingError)
      
      // Log the error
      await supabase.from('task_comments').insert({
        task_id: null,
        user_id: userId,
        comment: `Webhook processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`,
        is_system_comment: true
      })

      return NextResponse.json({ 
        error: 'Webhook processing failed',
        details: processingError instanceof Error ? processingError.message : 'Unknown error',
        processed: false
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in webhook endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Webhook endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        processed: false
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/automation/webhook - Get webhook status and recent activity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const hours = parseInt(searchParams.get('hours') || '24')

    const supabase = await createClient()

    let query = supabase
      .from('task_comments')
      .select(`
        id,
        comment,
        created_at,
        user_id,
        users!inner(email)
      `)
      .eq('is_system_comment', true)
      .ilike('comment', '%Webhook%')
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: webhookLogs } = await query

    // Get webhook statistics
    const statistics = {
      totalWebhooks: webhookLogs?.length || 0,
      successfulWebhooks: webhookLogs?.filter(log => !log.comment.includes('failed')).length || 0,
      failedWebhooks: webhookLogs?.filter(log => log.comment.includes('failed')).length || 0,
      lastWebhookTime: webhookLogs?.[0]?.created_at || null,
      timeRange: `${hours} hours`
    }

    return NextResponse.json({
      statistics,
      recentActivity: webhookLogs?.slice(0, 10) || [],
      status: 'operational'
    })

  } catch (error) {
    console.error('Error getting webhook status:', error)
    return NextResponse.json(
      { error: 'Failed to get webhook status' },
      { status: 500 }
    )
  }
}