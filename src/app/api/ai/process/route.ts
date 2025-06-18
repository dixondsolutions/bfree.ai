import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { processQueuedEmails, getAIProcessingStats } from '@/lib/openai/processor'

/**
 * Initialize default automation settings for a user
 */
async function initializeAutomationSettings(userId: string) {
  const supabase = await createClient()
  
  // Check if settings already exist
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('preference_key', 'automation_settings')
    .single()

  if (!existing) {
    // Create default automation settings
    const defaultSettings = {
      autoCreateTasks: true,
      autoScheduleTasks: true,
      confidenceThreshold: 0.4,
      processingEnabled: true,
      emailFilters: {
        includeKeywords: ['meeting', 'schedule', 'appointment', 'task', 'deadline', 'due'],
        excludeKeywords: ['unsubscribe', 'newsletter', 'promotion']
      },
      workingHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'UTC'
      }
    }

    await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        preference_key: 'automation_settings',
        preference_value: defaultSettings
      })

    console.log('Initialized automation settings for user:', userId)
    return defaultSettings
  }

  return existing.preference_value
}

/**
 * Create tasks from high-confidence AI suggestions
 */
async function createTasksFromSuggestions(userId: string) {
  const supabase = await createClient()
  
  // Get automation settings
  const { data: settingsData } = await supabase
    .from('user_preferences')
    .select('preference_value')
    .eq('user_id', userId)
    .eq('preference_key', 'automation_settings')
    .single()

  const defaultSettings = {
    autoCreateTasks: true,
    confidenceThreshold: 0.4,
    autoScheduleTasks: false,
    taskDefaults: {
      defaultCategory: 'work',
      defaultPriority: 'medium',
      defaultDuration: 60,
      autoScheduleHighPriority: true,
      schedulingWindow: { hours: 24, urgentHours: 2 }
    }
  }
  
  const settings = settingsData?.preference_value || defaultSettings
  
  if (!settings.autoCreateTasks) {
    console.log('Auto-task creation disabled for user:', userId)
    return { tasksCreated: 0, message: 'Auto-task creation is disabled' }
  }

  // Get high-confidence pending suggestions
  const { data: suggestions } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('confidence_score', settings.confidenceThreshold || 0.4)

  const tasksCreated = []

  for (const suggestion of suggestions || []) {
    try {
      // Convert AI suggestion to task using settings
      const taskData = {
        user_id: userId,
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.task_category || settings.taskDefaults?.defaultCategory || 'work',
        priority: suggestion.feedback?.priority || settings.taskDefaults?.defaultPriority || 'medium',
        estimated_duration: suggestion.estimated_duration || settings.taskDefaults?.defaultDuration || 60,
        due_date: suggestion.suggested_due_date ? new Date(suggestion.suggested_due_date).toISOString() :
                  (suggestion.suggested_time ? new Date(suggestion.suggested_time).toISOString() : null),
        energy_level: suggestion.energy_level || 3,
        tags: suggestion.suggested_tags || (suggestion.suggestion_type ? [suggestion.suggestion_type] : ['ai-generated']),
        ai_generated: true,
        source_email_id: suggestion.source_email_id,
        source_email_record_id: suggestion.email_record_id,
        source_suggestion_id: suggestion.id,
        confidence_score: suggestion.confidence_score,
        notes: `Confidence: ${Math.round(suggestion.confidence_score * 100)}%\n${suggestion.feedback?.reasoning || 'Generated from AI analysis'}`
      }

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

      if (!taskError) {
        // Mark suggestion as converted
        await supabase
          .from('ai_suggestions')
          .update({ 
            status: 'processed',
            feedback: { 
              ...suggestion.feedback, 
              converted_to_task: true,
              task_id: task.id 
            }
          })
          .eq('id', suggestion.id)

        tasksCreated.push({
          task,
          suggestion,
          auto_created: true
        })

        console.log(`Auto-created task: "${task.title}" from suggestion ${suggestion.id}`)
      } else {
        console.error(`Failed to create task from suggestion ${suggestion.id}:`, taskError)
      }
    } catch (error) {
      console.error(`Error creating task from suggestion ${suggestion.id}:`, error)
    }
  }

  return { 
    tasksCreated: tasksCreated.length, 
    tasks: tasksCreated,
    message: `Created ${tasksCreated.length} tasks from AI suggestions` 
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize automation settings if they don't exist
    await initializeAutomationSettings(user.id)

    // Check if there are any pending items in the processing queue
    const { data: pendingItems, error: queueError } = await supabase
      .from('processing_queue')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1)

    if (queueError) {
      return NextResponse.json({ error: 'Failed to check processing queue' }, { status: 500 })
    }

    // Get processing stats
    const stats = await getAIProcessingStats()

    return NextResponse.json({
      success: true,
      status: pendingItems && pendingItems.length > 0 ? 'processing' : 'idle',
      stats,
      message: pendingItems && pendingItems.length > 0 
        ? 'Processing queue has pending items'
        : 'No pending items to process'
    })

  } catch (error) {
    console.error('Error in GET /api/ai/process:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's automation settings for consistent confidence threshold
    const { getUserAutomationSettings } = await import('@/lib/automation/settings')
    const automationSettings = await getUserAutomationSettings()

    // Initialize automation settings if needed
    await initializeAutomationSettings(user.id)

    // Process emails with AI
    const result = await processQueuedEmails()

    // Get suggestions that meet the user's confidence threshold for auto-creation
    const { data: highConfidenceSuggestions } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gte('confidence_score', automationSettings.confidenceThreshold || 0.4) // Use user's threshold

    const tasksAutoCreated = highConfidenceSuggestions?.length || 0

    // Get current stats
    const stats = await getAIProcessingStats()

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} emails, created ${result.suggestions} suggestions, auto-created ${tasksAutoCreated} tasks`,
      details: {
        emailsQueued: result.processed,
        emailsProcessed: result.processed,
        suggestionsCreated: result.suggestions,
        tasksAutoCreated,
        errors: result.errors
      },
      stats: stats || {
        totalSuggestions: 0,
        pendingSuggestions: 0,
        approvedSuggestions: 0,
        queuePending: 0,
        queueCompleted: 0,
        queueFailed: 0
      },
      automationSettings: {
        enabled: automationSettings.enabled,
        categories: automationSettings.categories,
        keywordFilters: automationSettings.keywordFilters,
        autoCreateTasks: automationSettings.autoCreateTasks,
        dailyProcessing: automationSettings.dailyProcessing,
        confidenceThreshold: automationSettings.confidenceThreshold
      }
    })

  } catch (error) {
    console.error('Error processing emails:', error)
    return NextResponse.json({ 
      error: 'Failed to process emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}