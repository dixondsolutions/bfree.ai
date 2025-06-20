import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { z } from 'zod'

const UpdateSuggestionSchema = z.object({
  status: z.enum(['pending', 'approved', 'declined', 'processed']),
  feedback: z.object({
    reason: z.string().optional(),
    user_notes: z.string().optional(),
    confidence_adjustment: z.number().min(0).max(1).optional()
  }).optional()
})

/**
 * PUT /api/ai/suggestions/[id] - Update a specific AI suggestion
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const suggestionId = params.id
    const body = await request.json()
    const updateData = UpdateSuggestionSchema.parse(body)

    const supabase = await createClient()

    // First, verify the suggestion exists and belongs to the user
    const { data: existingSuggestion, error: fetchError } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingSuggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    // Update the suggestion
    const updatePayload: any = {
      status: updateData.status,
      updated_at: new Date().toISOString()
    }

    // Merge feedback if provided
    if (updateData.feedback) {
      updatePayload.feedback = {
        ...existingSuggestion.feedback,
        ...updateData.feedback,
        status_updated_at: new Date().toISOString(),
        status_updated_by: user.id
      }
    }

    const { data: updatedSuggestion, error: updateError } = await supabase
      .from('ai_suggestions')
      .update(updatePayload)
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating suggestion:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update suggestion',
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Suggestion ${updateData.status}`,
      suggestion: updatedSuggestion
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PUT /api/ai/suggestions/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/ai/suggestions/[id] - Get a specific AI suggestion
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

    const suggestionId = params.id
    const supabase = await createClient()

    const { data: suggestion, error } = await supabase
      .from('ai_suggestions')
      .select(`
        *,
        emails:email_record_id(id, subject, from_address, received_at),
        tasks:tasks!source_suggestion_id(id, title, status, priority, created_at)
      `)
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .single()

    if (error || !suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      suggestion
    })

  } catch (error) {
    console.error('Error in GET /api/ai/suggestions/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/ai/suggestions/[id] - Delete a specific AI suggestion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const suggestionId = params.id
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ai_suggestions')
      .delete()
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .select('id')

    if (error) {
      console.error('Error deleting suggestion:', error)
      return NextResponse.json({ 
        error: 'Failed to delete suggestion',
        details: error.message 
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Suggestion deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/ai/suggestions/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 