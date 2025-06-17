import { z } from 'zod'

// User schemas
export const userProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  timezone: z.string().optional(),
  working_hours_start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
  working_hours_end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
  avatar_url: z.string().url().optional().nullable()
})

// Email schemas
export const emailFetchSchema = z.object({
  maxResults: z.number().min(1).max(500).default(50),
  query: z.string().optional(),
  labelIds: z.array(z.string()).optional()
})

// AI processing schemas
export const aiProcessSchema = z.object({
  maxItems: z.number().min(1).max(100).default(20),
  forceReprocess: z.boolean().default(false)
})

// Calendar schemas
export const calendarSyncSchema = z.object({
  type: z.enum(['full', 'calendars', 'events']).default('full'),
  calendarId: z.string().optional()
})

export const meetingRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  duration: z.number().min(15).max(480), // 15 minutes to 8 hours
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  preferredTimes: z.array(z.string().datetime()).optional(),
  deadline: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  attendees: z.array(z.string().email()).optional(),
  requiresPrep: z.boolean().default(false),
  prepTime: z.number().min(0).max(120).optional(), // 0 to 2 hours
  isRecurring: z.boolean().default(false),
  searchDays: z.number().min(1).max(60).default(14)
})

export const scheduleActionSchema = z.object({
  action: z.enum(['suggest', 'auto-schedule', 'check-conflicts']),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  duration: z.number().min(15).max(480).default(30),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  preferredTimes: z.array(z.string().datetime()).optional(),
  deadline: z.string().datetime().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  requiresPrep: z.boolean().default(false),
  prepTime: z.number().min(0).max(120).optional(),
  isRecurring: z.boolean().default(false),
  searchDays: z.number().min(1).max(60).default(14),
  // For check-conflicts action
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  excludeEventId: z.string().uuid().optional()
})

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  start_time: z.string().datetime('Invalid start time'),
  end_time: z.string().datetime('Invalid end time'),
  location: z.string().max(200).optional(),
  calendar_id: z.string().uuid().optional(),
  calendarId: z.string().optional(), // Google Calendar ID
  timeZone: z.string().default('UTC'),
  attendees: z.array(z.string().email()).optional(),
  ai_generated: z.boolean().default(false),
  confidence_score: z.number().min(0).max(1).optional()
}).refine(data => {
  const start = new Date(data.start_time)
  const end = new Date(data.end_time)
  return start < end
}, {
  message: 'End time must be after start time',
  path: ['end_time']
})

export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  calendar_id: z.string().uuid().optional(),
  calendarId: z.string().optional(),
  timeZone: z.string().default('UTC'),
  attendees: z.array(z.string().email()).optional(),
  ai_generated: z.boolean().default(false),
  confidence_score: z.number().min(0).max(1).optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  updateGoogle: z.boolean().default(false),
  googleEventId: z.string().optional()
}).refine((data) => {
  if (data.start_time && data.end_time) {
    const start = new Date(data.start_time)
    const end = new Date(data.end_time)
    return start < end
  }
  return true
}, {
  message: 'End time must be after start time',
  path: ['end_time']
})

// Suggestion schemas
export const suggestionActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'modify']),
  suggestionId: z.string().uuid(),
  modifications: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    start_time: z.string().datetime().optional(),
    end_time: z.string().datetime().optional(),
    location: z.string().optional()
  }).optional()
})

// Preference schemas
export const schedulingPreferencesSchema = z.object({
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
  }),
  workingDays: z.array(z.number().min(0).max(6)), // 0 = Sunday, 6 = Saturday
  timeZone: z.string(),
  bufferTime: z.number().min(0).max(60), // minutes
  preferredMeetingLength: z.number().min(15).max(240), // minutes
  avoidBackToBack: z.boolean(),
  maxMeetingsPerDay: z.number().min(1).max(20)
})

// Validation helper functions
export function validateRequestBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw new Error(`Validation error: ${message}`)
    }
    throw error
  }
}

export function validateQueryParams<T>(schema: z.ZodSchema<T>, params: URLSearchParams): T {
  const obj: Record<string, any> = {}
  
  for (const [key, value] of params.entries()) {
    // Handle array parameters (e.g., attendees[])
    if (key.endsWith('[]')) {
      const baseKey = key.slice(0, -2)
      if (!obj[baseKey]) obj[baseKey] = []
      obj[baseKey].push(value)
    } else {
      obj[key] = value
    }
  }
  
  return validateRequestBody(schema, obj)
}