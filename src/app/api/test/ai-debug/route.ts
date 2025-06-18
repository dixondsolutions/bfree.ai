import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all AI suggestions for this user
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get all tasks for this user that are AI generated
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('ai_generated', true)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get recent emails that have been AI analyzed
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('id, subject, from_address, ai_analyzed, ai_analysis_at, has_scheduling_content')
      .eq('user_id', user.id)
      .eq('ai_analyzed', true)
      .order('ai_analysis_at', { ascending: false })
      .limit(10)

    // Get processing queue items
    const { data: queueItems, error: queueError } = await supabase
      .from('processing_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        suggestions: suggestions || [],
        tasks: tasks || [],
        analyzedEmails: emails || [],
        queueItems: queueItems || [],
        errors: {
          suggestions: suggestionsError?.message,
          tasks: tasksError?.message, 
          emails: emailsError?.message,
          queue: queueError?.message
        }
      }
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 