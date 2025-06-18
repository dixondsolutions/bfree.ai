import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json({
        error: 'start_date and end_date are required'
      }, { status: 400 })
    }

    // Try the enhanced database function first
    const { data: items, error } = await supabase.rpc('get_email_task_calendar_data', {
      p_user_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) {
      console.warn('Database function error, using fallback query:', error)
      
      // Comprehensive fallback query with all relationships
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('emails')
        .select(`
          id as email_id,
          gmail_id,
          subject,
          from_address,
          from_name,
          received_at,
          importance_level,
          ai_analyzed,
          processed_at,
          has_scheduling_content,
          tasks!tasks_source_email_record_id_fkey (
            id as task_id,
            title as task_title,
            status as task_status,
            priority as task_priority,
            category as task_category,
            scheduled_start,
            scheduled_end,
            due_date,
            estimated_duration,
            ai_generated,
            confidence_score,
            created_at as task_created_at,
            source_email_id,
            source_suggestion_id
          ),
          ai_suggestions!ai_suggestions_email_record_id_fkey (
            id as suggestion_id,
            title as suggestion_title,
            status as suggestion_status,
            confidence_score as suggestion_confidence,
            suggestion_type,
            suggested_time,
            created_at as suggestion_created_at
          )
        `)
        .eq('user_id', user.id)
        .or(`received_at.gte.${startDate},received_at.lte.${endDate}`)
        .order('received_at', { ascending: false })

      if (fallbackError) {
        throw new Error(`Failed to fetch email-task data: ${fallbackError.message}`)
      }

      // Transform fallback data to match expected format
      const transformedItems = fallbackData?.flatMap(email => {
        const baseItem = {
          email_id: email.email_id,
          gmail_id: email.gmail_id,
          subject: email.subject,
          from_address: email.from_address,
          from_name: email.from_name,
          received_at: email.received_at,
          importance_level: email.importance_level,
          processing_status: determineProcessingStatus(email),
          suggestion_id: null,
          suggestion_status: null
        }

        // Create items for each task linked to this email
        const taskItems = email.tasks?.map(task => ({
          ...baseItem,
          task_id: task.task_id,
          task_title: task.task_title,
          task_status: task.task_status,
          task_priority: task.task_priority,
          task_category: task.task_category,
          scheduled_start: task.scheduled_start,
          scheduled_end: task.scheduled_end,
          due_date: task.due_date,
          estimated_duration: task.estimated_duration,
          ai_generated: task.ai_generated,
          confidence_score: task.confidence_score,
          task_created_at: task.task_created_at
        })) || []

        // If no tasks but has suggestions, create suggestion items
        if (taskItems.length === 0 && email.ai_suggestions?.length > 0) {
          return email.ai_suggestions.map(suggestion => ({
            ...baseItem,
            suggestion_id: suggestion.suggestion_id,
            suggestion_status: suggestion.suggestion_status,
            // Include suggestion data for potential task creation
            suggested_time: suggestion.suggested_time,
            suggestion_type: suggestion.suggestion_type,
            suggestion_confidence: suggestion.suggestion_confidence
          }))
        }

        // Return task items if they exist, otherwise return base email item
        return taskItems.length > 0 ? taskItems : [baseItem]
      }) || []

      return NextResponse.json({
        success: true,
        items: transformedItems,
        fallback: true,
        total: transformedItems.length,
        debug: {
          emailsFound: fallbackData?.length || 0,
          itemsGenerated: transformedItems.length
        }
      })
    }

    // Success with database function
    return NextResponse.json({
      success: true,
      items: items || [],
      total: items?.length || 0,
      enhanced: true
    })

  } catch (error) {
    console.error('Calendar email-tasks API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch calendar data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Determine processing status for an email based on its related data
 */
function determineProcessingStatus(email: any): string {
  if (email.tasks && email.tasks.length > 0) {
    return 'task_created'
  }
  if (email.ai_suggestions && email.ai_suggestions.length > 0) {
    return 'suggestion_pending'
  }
  if (email.ai_analyzed) {
    return 'no_action_needed'
  }
  return 'not_analyzed'
}

/**
 * POST endpoint for manual task creation from calendar
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emailId, taskData } = await request.json()
    
    if (!emailId || !taskData) {
      return NextResponse.json({
        error: 'emailId and taskData are required'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Get email record for linking
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('id, gmail_id, subject, from_address')
      .eq('id', emailId)
      .eq('user_id', user.id)
      .single()

    if (emailError || !email) {
      return NextResponse.json({
        error: 'Email not found'
      }, { status: 404 })
    }

    // Create task with proper email linking
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: taskData.title,
        description: taskData.description || `Created from email: ${email.subject}`,
        category: taskData.category || 'work',
        priority: taskData.priority || 'medium',
        status: 'pending',
        ai_generated: false,
        source_email_id: email.gmail_id,
        source_email_record_id: email.id,
        due_date: taskData.due_date,
        scheduled_start: taskData.scheduled_start,
        scheduled_end: taskData.scheduled_end,
        estimated_duration: taskData.estimated_duration || 30,
        notes: `Manual task created from email\nFrom: ${email.from_address}\nSubject: ${email.subject}`,
        tags: ['manual', 'email']
      })
      .select()
      .single()

    if (taskError) {
      throw new Error(`Failed to create task: ${taskError.message}`)
    }

    return NextResponse.json({
      success: true,
      task,
      message: 'Task created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Manual task creation error:', error)
    return NextResponse.json({
      error: 'Failed to create task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 