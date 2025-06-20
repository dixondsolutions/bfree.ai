import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { emailCache } from '@/lib/email/email-cache'
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
  withAsyncTiming
} from '@/lib/api/response-utils'

/**
 * GET /api/emails/stats - Get email statistics for the current user
 */
export async function GET(request: NextRequest) {
  const { result, processingTime } = await withAsyncTiming(async () => {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // Check cache first
    const cachedStats = emailCache.getCachedEmailStats(user.id)
    if (cachedStats) {
      return successResponse(
        {
          total_emails: cachedStats.totalEmails,
          unread_emails: cachedStats.unreadEmails,
          scheduled_emails: cachedStats.scheduledEmails,
          ai_analyzed_emails: cachedStats.aiAnalyzedEmails,
          cached: true
        },
        'Email statistics retrieved successfully (cached)',
        undefined,
        200,
        1
      )
    }

    const supabase = await createClient()

    try {
      // Use the optimized cached stats function
      console.log('Fetching email statistics from database...')
      const { data: stats, error } = await supabase.rpc('get_user_email_stats_cached', {
        p_user_id: user.id
      })

      if (error) {
        console.error('Error fetching email stats:', error)
        // Fallback to basic stats query
        const { data: fallbackStats, error: fallbackError } = await supabase
          .from('emails')
          .select(`
            id,
            is_unread,
            has_scheduling_content,
            ai_analyzed,
            importance_level,
            has_attachments,
            received_at
          `)
          .eq('user_id', user.id)

        if (fallbackError) {
          return internalErrorResponse(
            'Failed to fetch email statistics',
            fallbackError.message
          )
        }

        // Calculate stats manually
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        const calculatedStats = {
          total_emails: fallbackStats?.length || 0,
          unread_emails: fallbackStats?.filter(email => email.is_unread).length || 0,
          scheduled_emails: fallbackStats?.filter(email => email.has_scheduling_content).length || 0,
          ai_analyzed_emails: fallbackStats?.filter(email => email.ai_analyzed).length || 0,
          high_importance_emails: fallbackStats?.filter(email => email.importance_level === 'high').length || 0,
          emails_with_attachments: fallbackStats?.filter(email => email.has_attachments).length || 0,
          recent_emails_7d: fallbackStats?.filter(email => 
            new Date(email.received_at) >= sevenDaysAgo
          ).length || 0,
          recent_emails_24h: fallbackStats?.filter(email => 
            new Date(email.received_at) >= oneDayAgo
          ).length || 0
        }

        // Cache the calculated stats
        emailCache.cacheEmailStats(user.id, {
          totalEmails: calculatedStats.total_emails,
          unreadEmails: calculatedStats.unread_emails,
          scheduledEmails: calculatedStats.scheduled_emails,
          aiAnalyzedEmails: calculatedStats.ai_analyzed_emails
        })

        return successResponse(
          calculatedStats,
          'Email statistics retrieved successfully (fallback)',
          undefined,
          200,
          processingTime
        )
      }

      console.log('Email statistics fetched successfully')
      
      const statsData = stats[0] || {
        total_emails: 0,
        unread_emails: 0,
        scheduled_emails: 0,
        ai_analyzed_emails: 0,
        high_importance_emails: 0,
        emails_with_attachments: 0,
        recent_emails_7d: 0,
        recent_emails_24h: 0
      }

      // Cache the stats
      emailCache.cacheEmailStats(user.id, {
        totalEmails: statsData.total_emails,
        unreadEmails: statsData.unread_emails,
        scheduledEmails: statsData.scheduled_emails,
        aiAnalyzedEmails: statsData.ai_analyzed_emails
      })

      // Calculate processing efficiency
      const processingEfficiency = statsData.scheduled_emails > 0 
        ? Math.round((statsData.ai_analyzed_emails / statsData.scheduled_emails) * 100)
        : 0

      // Calculate activity trends
      const activityTrend = statsData.recent_emails_7d > 0 
        ? Math.round((statsData.recent_emails_24h / statsData.recent_emails_7d) * 100 * 7) // Daily average as % of weekly
        : 0

      return successResponse(
        {
          ...statsData,
          processing_efficiency: processingEfficiency,
          activity_trend: activityTrend,
          unread_percentage: statsData.total_emails > 0 
            ? Math.round((statsData.unread_emails / statsData.total_emails) * 100)
            : 0,
          scheduling_percentage: statsData.total_emails > 0
            ? Math.round((statsData.scheduled_emails / statsData.total_emails) * 100)
            : 0
        },
        'Email statistics retrieved successfully',
        undefined,
        200,
        processingTime
      )

    } catch (error) {
      console.error('Error in email stats endpoint:', error)
      return internalErrorResponse(
        'Failed to fetch email statistics',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  })

  return result
}

/**
 * GET /api/emails/stats/cache - Get cache statistics for monitoring
 */
export async function POST(request: NextRequest) {
  const { result, processingTime } = await withAsyncTiming(async () => {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    try {
      const body = await request.json()
      const { action } = body

      if (action === 'clear_cache') {
        emailCache.invalidateUserCache(user.id)
        return successResponse(
          { cache_cleared: true },
          'Email cache cleared successfully',
          undefined,
          200,
          processingTime
        )
      }

      if (action === 'get_cache_stats') {
        const cacheStats = emailCache.getCacheStats()
        return successResponse(
          {
            cache_stats: cacheStats,
            hit_rate: emailCache.getCacheHitRate()
          },
          'Cache statistics retrieved successfully',
          undefined,
          200,
          processingTime
        )
      }

      return successResponse(
        { message: 'No action specified' },
        'Cache endpoint accessed',
        undefined,
        200,
        processingTime
      )

    } catch (error) {
      return internalErrorResponse(
        'Failed to process cache request',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  })

  return result
}