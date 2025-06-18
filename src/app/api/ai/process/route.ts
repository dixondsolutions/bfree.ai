import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { processQueuedEmails, getAIProcessingStats } from '@/lib/openai/processor'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if there are any pending items in the processing queue
    const { data: pendingItems, error: queueError } = await supabase
      .from('processing_queue')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1)

    if (queueError) {
      console.error('Error checking processing queue:', queueError)
    }

    // Check if any items are currently being processed
    const { data: processingItems, error: processingError } = await supabase
      .from('processing_queue')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'processing')
      .limit(1)

    if (processingError) {
      console.error('Error checking processing items:', processingError)
    }

    const isProcessing = (processingItems && processingItems.length > 0) || false
    const hasPendingItems = (pendingItems && pendingItems.length > 0) || false

    // Get email count
    const { data: emailCount, error: emailError } = await supabase
      .from('emails')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    // Get AI processing stats
    const stats = await getAIProcessingStats()

    return NextResponse.json({
      isProcessing,
      hasPendingItems,
      emailsProcessed: emailCount?.length || 0,
      suggestionsGenerated: stats.totalSuggestions,
      pendingSuggestions: stats.pendingSuggestions,
      approvedSuggestions: stats.approvedSuggestions,
      averageConfidence: stats.averageConfidence
    })
  } catch (error) {
    console.error('Error getting AI process status:', error)
    return NextResponse.json(
      { error: 'Failed to get process status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if there are any items to process
    const { data: queueItems, error: queueError } = await supabase
      .from('processing_queue')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1)

    if (queueError) {
      return NextResponse.json(
        { error: `Failed to check queue: ${queueError.message}` },
        { status: 500 }
      )
    }

          // If no pending items, check if we have emails that haven't been processed
      if (!queueItems || queueItems.length === 0) {
        const { data: unprocessedEmails, error: emailError } = await supabase
          .from('emails')
          .select('id, gmail_id, subject, from_address, to_address, content_text, received_at')
          .eq('user_id', user.id)
          .or('ai_analyzed.is.null,ai_analyzed.eq.false')
          .limit(10)

      if (emailError) {
        return NextResponse.json(
          { error: `Failed to check emails: ${emailError.message}` },
          { status: 500 }
        )
      }

              // Create queue items for unprocessed emails
        if (unprocessedEmails && unprocessedEmails.length > 0) {
          const queueInserts = unprocessedEmails.map(email => ({
            user_id: user.id,
            email_id: email.gmail_id || email.id,
            email_record_id: email.id,
            status: 'pending',
            content: {
              subject: email.subject,
              from: email.from_address,
              to: email.to_address,
              body: email.content_text || 'No content available',
              date: email.received_at
            },
            metadata: {
              source: 'manual_trigger',
              email_count: unprocessedEmails.length
            }
          }))

        const { error: insertError } = await supabase
          .from('processing_queue')
          .insert(queueInserts)

        if (insertError) {
          console.error('Error inserting queue items:', insertError)
          return NextResponse.json(
            { error: `Failed to create queue items: ${insertError.message}` },
            { status: 500 }
          )
        }
      }
    }

    // Process the queued emails
    const result = await processQueuedEmails(10)

    return NextResponse.json({
      success: true,
      processed: result.processed,
      suggestions: result.suggestions,
      errors: result.errors,
      message: `Processed ${result.processed} emails, generated ${result.suggestions} suggestions`
    })
  } catch (error) {
    console.error('Error processing emails:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process emails' },
      { status: 500 }
    )
  }
}