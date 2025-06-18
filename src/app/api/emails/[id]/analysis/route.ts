import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'

/**
 * GET /api/emails/[id]/analysis - Get AI analysis results for a specific email
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailId = params.id
    const supabase = await createClient()

    // Get email with AI analysis data
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select(`
        id,
        subject,
        from_address,
        ai_analyzed,
        ai_analysis_at,
        has_scheduling_content,
        scheduling_keywords,
        ai_suggestions:ai_suggestions!email_record_id(
          id,
          title,
          description,
          suggestion_type,
          confidence_score,
          status,
          feedback,
          created_at
        ),
        tasks:tasks!source_email_record_id(
          id,
          title,
          status,
          priority,
          ai_generated,
          confidence_score,
          created_at
        )
      `)
      .or(`id.eq.${emailId},gmail_id.eq.${emailId}`)
      .eq('user_id', user.id)
      .single()

    if (emailError) {
      console.error('Error fetching email analysis:', emailError)
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Format the analysis results
    const analysis = {
      email_id: email.id,
      subject: email.subject,
      from_address: email.from_address,
      analyzed: email.ai_analyzed,
      analyzed_at: email.ai_analysis_at,
      has_scheduling_content: email.has_scheduling_content,
      keywords_extracted: email.scheduling_keywords || [],
      
      suggestions: email.ai_suggestions?.map((suggestion: any) => ({
        id: suggestion.id,
        type: suggestion.suggestion_type,
        title: suggestion.title,
        description: suggestion.description,
        confidence: suggestion.confidence_score,
        status: suggestion.status,
        reasoning: suggestion.feedback?.reasoning,
        participants: suggestion.feedback?.participants,
        location: suggestion.feedback?.location,
        duration: suggestion.feedback?.duration,
        priority: suggestion.feedback?.priority,
        created_at: suggestion.created_at
      })) || [],
      
      tasks_created: email.tasks?.map((task: any) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        confidence: task.confidence_score,
        ai_generated: task.ai_generated,
        created_at: task.created_at
      })) || [],
      
      summary: {
        total_suggestions: email.ai_suggestions?.length || 0,
        total_tasks_created: email.tasks?.filter((t: any) => t.ai_generated).length || 0,
        avg_confidence: email.ai_suggestions?.length > 0 
          ? email.ai_suggestions.reduce((sum: number, s: any) => sum + s.confidence_score, 0) / email.ai_suggestions.length
          : 0,
        high_confidence_suggestions: email.ai_suggestions?.filter((s: any) => s.confidence_score >= 0.7).length || 0
      }
    }

    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (error) {
    console.error('Error in GET /api/emails/[id]/analysis:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}