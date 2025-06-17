import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUserAISuggestions, updateSuggestionStatus } from '@/lib/openai/processor'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const suggestions = await getUserAISuggestions(status)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Error getting AI suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to get AI suggestions' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { suggestionId, status, feedback } = await request.json()

    if (!suggestionId || !status) {
      return NextResponse.json(
        { error: 'Missing suggestionId or status' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected', 'processed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved, rejected, or processed' },
        { status: 400 }
      )
    }

    const updatedSuggestion = await updateSuggestionStatus(suggestionId, status, feedback)

    return NextResponse.json({
      success: true,
      suggestion: updatedSuggestion
    })
  } catch (error) {
    console.error('Error updating AI suggestion:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update suggestion' },
      { status: 500 }
    )
  }
}