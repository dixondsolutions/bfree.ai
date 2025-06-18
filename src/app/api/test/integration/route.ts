import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/database/utils'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Test 1: Get user automation settings
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('preference_key', 'automation_settings')
      .single()

    // Test 2: Get AI suggestions with different statuses
    const { data: allSuggestions } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Test 3: Get tasks (all statuses)
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Test 4: Get recent emails with AI analysis
    const { data: recentEmails } = await supabase
      .from('emails')
      .select('id, subject, from_address, ai_analyzed, has_scheduling_content, received_at')
      .eq('user_id', user.id)
      .order('received_at', { ascending: false })
      .limit(10)

    // Test 5: Get processing queue status
    const { data: queueItems } = await supabase
      .from('processing_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Analyze suggestions by confidence score
    const suggestionsByConfidence = allSuggestions?.reduce((acc, s) => {
      const range = s.confidence_score >= 0.7 ? 'high' : 
                   s.confidence_score >= 0.4 ? 'medium' : 'low'
      acc[range] = (acc[range] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Analyze tasks by source
    const tasksBySource = allTasks?.reduce((acc, t) => {
      const source = t.ai_generated ? 'ai' : 'manual'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const automationSettings = userPrefs?.preference_value || null
    const confidenceThreshold = automationSettings?.confidenceThreshold || 0.4

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email
      },
      automation: {
        settings: automationSettings,
        confidenceThreshold,
        autoCreateTasks: automationSettings?.autoCreateTasks || false
      },
      suggestions: {
        total: allSuggestions?.length || 0,
        byStatus: allSuggestions?.reduce((acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {},
        byConfidence: suggestionsByConfidence,
        highConfidenceCount: allSuggestions?.filter(s => s.confidence_score >= confidenceThreshold).length || 0,
        recent: allSuggestions?.slice(0, 5).map(s => ({
          id: s.id,
          title: s.title,
          status: s.status,
          confidence_score: s.confidence_score,
          created_at: s.created_at
        })) || []
      },
      tasks: {
        total: allTasks?.length || 0,
        byStatus: allTasks?.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {},
        bySource: tasksBySource,
        aiGenerated: allTasks?.filter(t => t.ai_generated).length || 0,
        recent: allTasks?.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          ai_generated: t.ai_generated,
          source_email_id: t.source_email_id,
          created_at: t.created_at
        })) || []
      },
      emails: {
        total: recentEmails?.length || 0,
        analyzed: recentEmails?.filter(e => e.ai_analyzed).length || 0,
        withSchedulingContent: recentEmails?.filter(e => e.has_scheduling_content).length || 0,
        recent: recentEmails?.slice(0, 5) || []
      },
      queue: {
        total: queueItems?.length || 0,
        byStatus: queueItems?.reduce((acc, q) => {
          acc[q.status] = (acc[q.status] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {},
        recent: queueItems?.slice(0, 5) || []
      },
      analysis: {
        tasksFromSuggestions: allTasks?.filter(t => t.source_suggestion_id).length || 0,
        highConfidencePendingSuggestions: allSuggestions?.filter(s => 
          s.status === 'pending' && s.confidence_score >= confidenceThreshold
        ).length || 0,
        autoCreationEnabled: automationSettings?.autoCreateTasks && automationSettings?.enabled
      }
    })

  } catch (error) {
    console.error('Integration test error:', error)
    return NextResponse.json({ 
      error: 'Integration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 