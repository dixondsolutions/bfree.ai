import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/database/utils'
import { emailService } from '@/lib/email/email-service'

/**
 * GET /api/emails/statistics - Get email statistics for the user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const statistics = await emailService.getEmailStatistics()

    // Calculate additional metrics
    const processingEfficiency = statistics.total_emails > 0 
      ? Math.round((statistics.analyzed_emails / statistics.total_emails) * 100)
      : 0

    const schedulingContentRatio = statistics.total_emails > 0
      ? Math.round((statistics.scheduling_emails / statistics.total_emails) * 100)
      : 0

    const recentActivityRatio = statistics.emails_last_7_days > 0
      ? Math.round((statistics.analyzed_last_7_days / statistics.emails_last_7_days) * 100)
      : 0

    const enhancedStatistics = {
      ...statistics,
      processing_efficiency: processingEfficiency,
      scheduling_content_ratio: schedulingContentRatio,
      recent_activity_ratio: recentActivityRatio,
      insights: {
        needsAttention: statistics.unread_emails > 20,
        processingBehind: processingEfficiency < 50 && statistics.total_emails > 10,
        highSchedulingActivity: schedulingContentRatio > 30,
        activeUser: statistics.emails_last_7_days > 5
      },
      recommendations: []
    }

    // Generate recommendations
    if (statistics.unread_emails > 20) {
      enhancedStatistics.recommendations.push('You have many unread emails. Consider enabling bulk processing.')
    }

    if (processingEfficiency < 50 && statistics.total_emails > 10) {
      enhancedStatistics.recommendations.push('Many emails haven\'t been analyzed yet. Enable automatic AI processing.')
    }

    if (schedulingContentRatio > 30) {
      enhancedStatistics.recommendations.push('High scheduling activity detected. Consider enabling auto-task creation.')
    }

    if (statistics.emails_last_7_days === 0) {
      enhancedStatistics.recommendations.push('No recent email activity. Check your Gmail connection.')
    }

    return NextResponse.json({
      success: true,
      statistics: enhancedStatistics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in GET /api/emails/statistics:', error)
    return NextResponse.json({ 
      error: 'Failed to get email statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}