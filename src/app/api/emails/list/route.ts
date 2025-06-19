import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email/email-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const filter = searchParams.get('filter') || 'all'
    const query = searchParams.get('query') || ''
    const offset = (page - 1) * limit

    // Check if user has connected Gmail
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)

    if (!emailAccounts?.length) {
      return NextResponse.json({ 
        emails: [],
        total: 0,
        page,
        limit,
        hasNextPage: false,
        message: 'No Gmail account connected. Please connect your Gmail account to view emails.',
        fallbackMode: true
      })
    }

    try {
      // Build filters based on URL parameters
      const filters: any = {
        limit,
        offset
      }

      // Apply filters based on the filter parameter
      if (filter === 'unread') {
        filters.unread_only = true
      } else if (filter === 'needs-scheduling') {
        filters.scheduling_only = true
      } else if (filter === 'ai-priority') {
        filters.importance_level = 'high'
      }

      // Add search query if provided
      if (query) {
        filters.search_query = query
      }

      // Get emails from DATABASE (not Gmail API!)
      const emailData = await emailService.getEmails(filters)

      // Transform database emails to frontend format
      const emails = emailData.emails.map(email => {
        // Generate time ago string
        const timeAgo = getTimeAgo(new Date(email.received_at))

        // Parse sender name and email
        const fromName = email.from_name || email.from_address.split('@')[0]

        return {
          id: email.id, // Database ID
          from: {
            name: fromName,
            email: email.from_address,
            avatar: null
          },
          subject: email.subject || 'No Subject',
          preview: email.snippet || 'No preview available',
          time: timeAgo,
          isRead: !email.is_unread,
          isStarred: false, // TODO: Add is_starred to database query
          hasAttachment: email.attachment_count > 0,
          aiAnalysis: {
            priority: email.importance_level || 'medium',
            needsScheduling: email.has_scheduling_content || false,
            sentiment: 'neutral', // TODO: Add sentiment analysis to database
            suggestedActions: email.has_scheduling_content 
              ? ['Schedule meeting', 'Check availability'] 
              : email.importance_level === 'high' 
              ? ['Reply urgently', 'Review details']
              : ['Draft response', 'Archive'],
            isAnalyzed: email.ai_analyzed
          },
          taskCount: email.task_count || 0,
          suggestionCount: email.suggestion_count || 0
        }
      })

      // Get AI suggestions count for additional context
      const { count: aiSuggestionsCount } = await supabase
        .from('ai_suggestions')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'pending')

      return NextResponse.json({
        emails,
        total: emailData.total,
        page,
        limit,
        hasNextPage: emailData.pagination.hasMore,
        totalFetched: emails.length,
        aiSuggestionsCount: aiSuggestionsCount || 0,
        fallbackMode: false,
        source: 'database' // Indicate this is from database
      })

    } catch (dbError) {
      console.error('Database error:', dbError)
      
      // Fallback: Return empty state with sync suggestion
      return NextResponse.json({
        emails: [],
        total: 0,
        page,
        limit,
        hasNextPage: false,
        totalFetched: 0,
        fallbackMode: true,
        message: 'No emails found in database. Please sync your Gmail account first.',
        error: 'Database error - emails may need to be synced'
      })
    }

  } catch (error) {
    console.error('Email list API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    )
  }
}

// Helper function to generate "time ago" strings
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return diffMins <= 1 ? '1 min ago' : `${diffMins} min ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
} 