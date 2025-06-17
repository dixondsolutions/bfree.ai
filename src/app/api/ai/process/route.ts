import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { processQueuedEmails, getAIProcessingStats } from '@/lib/openai/processor'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { maxItems = 10 } = await request.json().catch(() => ({}))

    // Process queued emails with AI
    const result = await processQueuedEmails(maxItems)

    return NextResponse.json({
      success: true,
      ...result,
      message: `Processed ${result.processed} emails, generated ${result.suggestions} suggestions`
    })
  } catch (error) {
    console.error('Error processing emails with AI:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process emails' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get AI processing statistics
    const stats = await getAIProcessingStats()

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting AI processing stats:', error)
    return NextResponse.json(
      { error: 'Failed to get AI processing stats' },
      { status: 500 }
    )
  }
}