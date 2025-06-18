import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { z } from 'zod'

const AutomationSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  autoCreateTasks: z.boolean().default(true),
  confidenceThreshold: z.number().min(0.1).max(1.0).default(0.4), // Lowered from 0.7 to 0.4
  autoScheduleTasks: z.boolean().default(false), // Changed to false for safer default
  dailyProcessing: z.boolean().default(true),
  webhookProcessing: z.boolean().default(true),
  maxEmailsPerDay: z.number().min(1).max(200).default(50),
  categories: z.array(z.string()).default(['work', 'personal', 'project']),
  excludedSenders: z.array(z.string()).default(['noreply@', 'no-reply@', 'donotreply@']),
  keywordFilters: z.array(z.string()).default([
    'meeting', 'schedule', 'appointment', 'call', 'conference',
    'task', 'todo', 'action item', 'deadline', 'due', 'reminder',
    'follow up', 'check in', 'review', 'deliver', 'complete'
  ]),
  processingTimeWindow: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
    end: z.string().regex(/^\d{2}:\d{2}$/).default('18:00')
  }).default({ start: '09:00', end: '18:00' }),
  prioritySettings: z.object({
    urgentKeywords: z.array(z.string()).default(['urgent', 'asap', 'emergency', 'critical', 'immediate']),
    importantSenders: z.array(z.string()).default([]),
    highPriorityDomains: z.array(z.string()).default([])
  }).default({
    urgentKeywords: ['urgent', 'asap', 'emergency', 'critical', 'immediate'],
    importantSenders: [],
    highPriorityDomains: []
  }),
  taskDefaults: z.object({
    defaultCategory: z.enum(['work', 'personal', 'health', 'finance', 'education', 'social', 'household', 'travel', 'project', 'other']).default('work'),
    defaultPriority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    defaultDuration: z.number().min(5).max(480).default(60), // 1 hour default
    autoScheduleHighPriority: z.boolean().default(true),
    schedulingWindow: z.object({
      hours: z.number().min(1).max(168).default(24), // Within 24 hours for high priority
      urgentHours: z.number().min(0.5).max(24).default(2) // Within 2 hours for urgent
    }).default({ hours: 24, urgentHours: 2 })
  }).default({
    defaultCategory: 'work',
    defaultPriority: 'medium',
    defaultDuration: 60,
    autoScheduleHighPriority: true,
    schedulingWindow: { hours: 24, urgentHours: 2 }
  }),
  notificationSettings: z.object({
    emailOnTaskCreation: z.boolean().default(false),
    emailOnErrors: z.boolean().default(true),
    dailySummary: z.boolean().default(true),
    weeklyReport: z.boolean().default(false)
  }).default({
    emailOnTaskCreation: false,
    emailOnErrors: true,
    dailySummary: true,
    weeklyReport: false
  })
})

/**
 * GET /api/automation/settings - Get user's automation settings
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get automation settings from user preferences
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('preference_value')
      .eq('user_id', user.id)
      .eq('preference_key', 'automation_settings')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get automation settings: ${error.message}`)
    }

    // Return default settings if none exist
    const defaultSettings = AutomationSettingsSchema.parse({})
    const userSettings = preferences?.preference_value || {}

    // Merge user settings with defaults
    const settings = { ...defaultSettings, ...userSettings }

    // Validate the merged settings
    const validatedSettings = AutomationSettingsSchema.parse(settings)

    return NextResponse.json({
      success: true,
      settings: validatedSettings,
      hasCustomSettings: !!preferences
    })

  } catch (error) {
    console.error('Error in GET /api/automation/settings:', error)
    return NextResponse.json({ 
      error: 'Failed to get automation settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/automation/settings - Update user's automation settings
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const settings = AutomationSettingsSchema.parse(body)

    const supabase = await createClient()

    // Upsert automation settings
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preference_key: 'automation_settings',
        preference_value: settings
      }, {
        onConflict: 'user_id,preference_key'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update automation settings: ${error.message}`)
    }

    // Log the settings update
    await supabase.from('task_comments').insert({
      task_id: null,
      user_id: user.id,
      comment: `Automation settings updated: ${settings.enabled ? 'enabled' : 'disabled'}, confidence threshold: ${settings.confidenceThreshold}`,
      is_system_comment: true
    })

    return NextResponse.json({
      success: true,
      message: 'Automation settings updated successfully',
      settings
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid settings data', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PUT /api/automation/settings:', error)
    return NextResponse.json({ 
      error: 'Failed to update automation settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/automation/settings - Test automation settings with sample data
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, testData } = body

    switch (action) {
      case 'test-filters':
        return await testEmailFilters(testData)
      
      case 'test-priority':
        return await testPriorityCalculation(testData)
      
      case 'validate-schedule':
        return await validateSchedulingWindow(testData)
      
      default:
        return NextResponse.json({ 
          error: 'Invalid test action',
          availableActions: ['test-filters', 'test-priority', 'validate-schedule']
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in POST /api/automation/settings:', error)
    return NextResponse.json({ 
      error: 'Failed to test automation settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Test email filtering logic
 */
async function testEmailFilters(testData: any) {
  const { email, settings } = testData
  
  if (!email || !settings) {
    return NextResponse.json({ 
      error: 'Test data must include email and settings' 
    }, { status: 400 })
  }

  const results = {
    passes: true,
    reasons: [] as string[],
    recommendations: [] as string[]
  }

  // Test keyword filters
  const emailText = `${email.subject} ${email.body}`.toLowerCase()
  const hasKeywords = settings.keywordFilters.some((keyword: string) => 
    emailText.includes(keyword.toLowerCase())
  )

  if (!hasKeywords) {
    results.passes = false
    results.reasons.push('No scheduling keywords found')
  } else {
    results.reasons.push('Contains scheduling keywords')
  }

  // Test excluded senders
  const isExcluded = settings.excludedSenders.some((pattern: string) => 
    email.from.toLowerCase().includes(pattern.toLowerCase())
  )

  if (isExcluded) {
    results.passes = false
    results.reasons.push('Sender is in excluded list')
  }

  // Test processing time window
  const emailTime = new Date(email.received_at)
  const hour = emailTime.getHours()
  const startHour = parseInt(settings.processingTimeWindow.start.split(':')[0])
  const endHour = parseInt(settings.processingTimeWindow.end.split(':')[0])

  if (hour < startHour || hour > endHour) {
    results.recommendations.push('Email received outside processing window')
  }

  return NextResponse.json({
    success: true,
    testResults: results,
    email: {
      subject: email.subject,
      from: email.from,
      receivedAt: email.received_at
    }
  })
}

/**
 * Test priority calculation
 */
async function testPriorityCalculation(testData: any) {
  const { email, settings } = testData
  
  let priority = 'medium'
  let score = 50
  const factors = []

  // Check urgent keywords
  const emailText = `${email.subject} ${email.body}`.toLowerCase()
  const hasUrgentKeywords = settings.prioritySettings.urgentKeywords.some((keyword: string) => 
    emailText.includes(keyword.toLowerCase())
  )

  if (hasUrgentKeywords) {
    priority = 'urgent'
    score += 30
    factors.push('Contains urgent keywords')
  }

  // Check important senders
  const isImportantSender = settings.prioritySettings.importantSenders.some((sender: string) => 
    email.from.toLowerCase().includes(sender.toLowerCase())
  )

  if (isImportantSender) {
    score += 20
    factors.push('From important sender')
  }

  // Check high priority domains
  const emailDomain = email.from.split('@')[1]
  const isHighPriorityDomain = settings.prioritySettings.highPriorityDomains.includes(emailDomain)

  if (isHighPriorityDomain) {
    score += 15
    factors.push('From high priority domain')
  }

  // Determine final priority based on score
  if (score >= 80) priority = 'urgent'
  else if (score >= 65) priority = 'high'
  else if (score >= 40) priority = 'medium'
  else priority = 'low'

  return NextResponse.json({
    success: true,
    priorityCalculation: {
      finalPriority: priority,
      score: Math.min(score, 100),
      factors,
      email: {
        subject: email.subject,
        from: email.from
      }
    }
  })
}

/**
 * Validate scheduling window
 */
async function validateSchedulingWindow(testData: any) {
  const { settings } = testData
  
  const startTime = settings.processingTimeWindow.start
  const endTime = settings.processingTimeWindow.end
  
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  const isValid = endMinutes > startMinutes
  const duration = isValid ? endMinutes - startMinutes : 0
  
  return NextResponse.json({
    success: true,
    scheduleValidation: {
      isValid,
      duration: Math.round(duration / 60 * 10) / 10, // Hours with 1 decimal
      recommendations: isValid 
        ? [`Processing window: ${duration / 60} hours per day`]
        : ['End time must be after start time']
    }
  })
}