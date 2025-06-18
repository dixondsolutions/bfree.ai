import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'

export interface AutomationSettings {
  enabled: boolean
  autoCreateTasks: boolean
  confidenceThreshold: number
  autoScheduleTasks: boolean
  dailyProcessing: boolean
  webhookProcessing: boolean
  maxEmailsPerDay: number
  categories: string[]
  excludedSenders: string[]
  keywordFilters: string[]
  processingTimeWindow: {
    start: string
    end: string
  }
  prioritySettings: {
    urgentKeywords: string[]
    importantSenders: string[]
    highPriorityDomains: string[]
  }
  taskDefaults: {
    defaultCategory: 'work' | 'personal' | 'health' | 'finance' | 'education' | 'social' | 'household' | 'travel' | 'project' | 'other'
    defaultPriority: 'low' | 'medium' | 'high' | 'urgent'
    defaultDuration: number
    autoScheduleHighPriority: boolean
    schedulingWindow: {
      hours: number
      urgentHours: number
    }
  }
  notificationSettings: {
    emailOnTaskCreation: boolean
    emailOnErrors: boolean
    dailySummary: boolean
    weeklyReport: boolean
  }
}

// Default automation settings
const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  enabled: true,
  autoCreateTasks: true,
  confidenceThreshold: 0.4, // Lowered from 0.7 to 0.4 for better task creation
  autoScheduleTasks: true,
  dailyProcessing: true,
  webhookProcessing: true,
  maxEmailsPerDay: 50,
  categories: ['work', 'personal', 'project'],
  excludedSenders: ['noreply@', 'no-reply@', 'donotreply@'],
  keywordFilters: [
    'meeting', 'schedule', 'appointment', 'call', 'conference',
    'task', 'todo', 'action item', 'deadline', 'due', 'reminder',
    'follow up', 'check in', 'review', 'deliver', 'complete'
  ],
  processingTimeWindow: {
    start: '09:00',
    end: '18:00'
  },
  prioritySettings: {
    urgentKeywords: ['urgent', 'asap', 'emergency', 'critical', 'immediate'],
    importantSenders: [],
    highPriorityDomains: []
  },
  taskDefaults: {
    defaultCategory: 'work',
    defaultPriority: 'medium',
    defaultDuration: 60,
    autoScheduleHighPriority: true,
    schedulingWindow: {
      hours: 24, // Within 24 hours for high priority
      urgentHours: 2 // Within 2 hours for urgent
    }
  },
  notificationSettings: {
    emailOnTaskCreation: false,
    emailOnErrors: true,
    dailySummary: true,
    weeklyReport: false
  }
}

/**
 * Get user's automation settings with defaults
 */
export async function getUserAutomationSettings(): Promise<AutomationSettings> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return DEFAULT_AUTOMATION_SETTINGS
    }

    const supabase = await createClient()

    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('preference_value')
      .eq('user_id', user.id)
      .eq('preference_key', 'automation_settings')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting automation settings:', error)
      return DEFAULT_AUTOMATION_SETTINGS
    }

    if (!preferences) {
      return DEFAULT_AUTOMATION_SETTINGS
    }

    // Merge user settings with defaults to ensure all properties exist
    const userSettings = preferences.preference_value as Partial<AutomationSettings>
    return {
      ...DEFAULT_AUTOMATION_SETTINGS,
      ...userSettings,
      // Ensure nested objects are properly merged
      processingTimeWindow: {
        ...DEFAULT_AUTOMATION_SETTINGS.processingTimeWindow,
        ...userSettings.processingTimeWindow
      },
      prioritySettings: {
        ...DEFAULT_AUTOMATION_SETTINGS.prioritySettings,
        ...userSettings.prioritySettings
      },
      taskDefaults: {
        ...DEFAULT_AUTOMATION_SETTINGS.taskDefaults,
        ...userSettings.taskDefaults,
        schedulingWindow: {
          ...DEFAULT_AUTOMATION_SETTINGS.taskDefaults.schedulingWindow,
          ...userSettings.taskDefaults?.schedulingWindow
        }
      },
      notificationSettings: {
        ...DEFAULT_AUTOMATION_SETTINGS.notificationSettings,
        ...userSettings.notificationSettings
      }
    }
  } catch (error) {
    console.error('Failed to get automation settings:', error)
    return DEFAULT_AUTOMATION_SETTINGS
  }
}

/**
 * Update user's automation settings
 */
export async function updateUserAutomationSettings(settings: Partial<AutomationSettings>): Promise<AutomationSettings> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = await createClient()

  // Get current settings to merge with updates
  const currentSettings = await getUserAutomationSettings()
  const updatedSettings = {
    ...currentSettings,
    ...settings,
    // Ensure nested objects are properly merged
    processingTimeWindow: {
      ...currentSettings.processingTimeWindow,
      ...settings.processingTimeWindow
    },
    prioritySettings: {
      ...currentSettings.prioritySettings,
      ...settings.prioritySettings
    },
    taskDefaults: {
      ...currentSettings.taskDefaults,
      ...settings.taskDefaults,
      schedulingWindow: {
        ...currentSettings.taskDefaults.schedulingWindow,
        ...settings.taskDefaults?.schedulingWindow
      }
    },
    notificationSettings: {
      ...currentSettings.notificationSettings,
      ...settings.notificationSettings
    }
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      preference_key: 'automation_settings',
      preference_value: updatedSettings
    }, {
      onConflict: 'user_id,preference_key'
    })

  if (error) {
    throw new Error(`Failed to update automation settings: ${error.message}`)
  }

  return updatedSettings
}

/**
 * Check if email should be processed based on automation settings
 */
export async function shouldProcessEmail(emailData: {
  from: string
  subject: string
  body: string
  received_at: Date
}): Promise<{ shouldProcess: boolean; reasons: string[] }> {
  const settings = await getUserAutomationSettings()
  const reasons: string[] = []

  if (!settings.enabled) {
    return { shouldProcess: false, reasons: ['Automation is disabled'] }
  }

  // Check excluded senders
  const isExcluded = settings.excludedSenders.some(pattern => 
    emailData.from.toLowerCase().includes(pattern.toLowerCase())
  )

  if (isExcluded) {
    reasons.push('Sender is excluded')
    return { shouldProcess: false, reasons }
  }

  // Check keyword filters
  const emailText = `${emailData.subject} ${emailData.body}`.toLowerCase()
  const hasKeywords = settings.keywordFilters.some(keyword => 
    emailText.includes(keyword.toLowerCase())
  )

  if (!hasKeywords) {
    reasons.push('No relevant keywords found')
    return { shouldProcess: false, reasons }
  }

  // Check processing time window
  const emailHour = emailData.received_at.getHours()
  const startHour = parseInt(settings.processingTimeWindow.start.split(':')[0])
  const endHour = parseInt(settings.processingTimeWindow.end.split(':')[0])

  if (emailHour < startHour || emailHour > endHour) {
    reasons.push('Outside processing time window')
    // Still process but note the reason
  }

  reasons.push('Passed all filters')
  return { shouldProcess: true, reasons }
}

/**
 * Calculate task priority based on automation settings
 */
export async function calculateTaskPriority(emailData: {
  from: string
  subject: string
  body: string
}): Promise<{ priority: 'low' | 'medium' | 'high' | 'urgent'; factors: string[] }> {
  const settings = await getUserAutomationSettings()
  const factors: string[] = []
  let score = 50 // Base score for medium priority

  const emailText = `${emailData.subject} ${emailData.body}`.toLowerCase()

  // Check urgent keywords
  const hasUrgentKeywords = settings.prioritySettings.urgentKeywords.some(keyword => 
    emailText.includes(keyword.toLowerCase())
  )

  if (hasUrgentKeywords) {
    score += 30
    factors.push('Contains urgent keywords')
  }

  // Check important senders
  const isImportantSender = settings.prioritySettings.importantSenders.some(sender => 
    emailData.from.toLowerCase().includes(sender.toLowerCase())
  )

  if (isImportantSender) {
    score += 20
    factors.push('From important sender')
  }

  // Check high priority domains
  const emailDomain = emailData.from.split('@')[1]
  const isHighPriorityDomain = settings.prioritySettings.highPriorityDomains.includes(emailDomain)

  if (isHighPriorityDomain) {
    score += 15
    factors.push('From high priority domain')
  }

  // Additional factors
  if (emailText.includes('deadline') || emailText.includes('due date')) {
    score += 10
    factors.push('Contains deadline references')
  }

  if (emailText.includes('meeting') || emailText.includes('conference')) {
    score += 5
    factors.push('Meeting or conference related')
  }

  // Determine final priority based on score
  let priority: 'low' | 'medium' | 'high' | 'urgent'
  if (score >= 80) priority = 'urgent'
  else if (score >= 65) priority = 'high'
  else if (score >= 40) priority = 'medium'
  else priority = 'low'

  return { priority, factors }
}

/**
 * Get scheduling window for a task based on priority and automation settings
 */
export async function getSchedulingWindow(priority: 'low' | 'medium' | 'high' | 'urgent'): Promise<{ 
  suggestedStart: Date
  suggestedEnd: Date
  autoSchedule: boolean 
}> {
  const settings = await getUserAutomationSettings()
  const now = new Date()
  
  let hoursFromNow: number
  let autoSchedule = false

  switch (priority) {
    case 'urgent':
      hoursFromNow = settings.taskDefaults.schedulingWindow.urgentHours
      autoSchedule = settings.autoScheduleTasks && settings.taskDefaults.autoScheduleHighPriority
      break
    case 'high':
      hoursFromNow = settings.taskDefaults.schedulingWindow.hours
      autoSchedule = settings.autoScheduleTasks && settings.taskDefaults.autoScheduleHighPriority
      break
    case 'medium':
      hoursFromNow = 48 // 2 days for medium priority
      autoSchedule = false
      break
    case 'low':
      hoursFromNow = 168 // 1 week for low priority
      autoSchedule = false
      break
  }

  const suggestedStart = new Date(now.getTime() + (hoursFromNow * 60 * 60 * 1000))
  const suggestedEnd = new Date(suggestedStart.getTime() + (settings.taskDefaults.defaultDuration * 60 * 1000))

  return { suggestedStart, suggestedEnd, autoSchedule }
}