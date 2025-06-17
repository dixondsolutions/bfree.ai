import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type Tables = Database['public']['Tables']
export type User = Tables['users']['Row']
export type EmailAccount = Tables['email_accounts']['Row']
export type Calendar = Tables['calendars']['Row']
export type Event = Tables['events']['Row']
export type AiSuggestion = Tables['ai_suggestions']['Row']
export type UserPreference = Tables['user_preferences']['Row']
export type ProcessingQueue = Tables['processing_queue']['Row']
export type AuditLog = Tables['audit_logs']['Row']
export type RateLimit = Tables['rate_limits']['Row']

/**
 * Get the current authenticated user from Supabase
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

/**
 * Get or create user profile in the public.users table
 */
export async function getUserProfile(userId?: string) {
  const supabase = await createClient()
  const targetUserId = userId || (await getCurrentUser())?.id
  
  if (!targetUserId) {
    return null
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', targetUserId)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return data
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: Partial<User>) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}

/**
 * Get user's email accounts
 */
export async function getUserEmailAccounts() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  if (!user) {
    return []
  }
  
  const { data, error } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching email accounts:', error)
    return []
  }
  
  return data
}

/**
 * Get user's calendars
 */
export async function getUserCalendars() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  if (!user) {
    return []
  }
  
  const { data, error } = await supabase
    .from('calendars')
    .select('*')
    .eq('user_id', user.id)
    .eq('sync_enabled', true)
    .order('is_primary', { ascending: false })
  
  if (error) {
    console.error('Error fetching calendars:', error)
    return []
  }
  
  return data
}

/**
 * Get user's events within a date range
 */
export async function getUserEvents(startDate: string, endDate: string) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  if (!user) {
    return []
  }
  
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      calendars (
        name,
        provider
      )
    `)
    .eq('user_id', user.id)
    .gte('start_time', startDate)
    .lte('end_time', endDate)
    .order('start_time', { ascending: true })
  
  if (error) {
    console.error('Error fetching events:', error)
    return []
  }
  
  return data
}

/**
 * Get user's AI suggestions
 */
export async function getUserAiSuggestions(status?: string) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  if (!user) {
    return []
  }
  
  let query = supabase
    .from('ai_suggestions')
    .select('*')
    .eq('user_id', user.id)
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
    .order('confidence_score', { ascending: false })
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching AI suggestions:', error)
    return []
  }
  
  return data
}

/**
 * Get user preferences
 */
export async function getUserPreferences() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  if (!user) {
    return {}
  }
  
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
  
  if (error) {
    console.error('Error fetching user preferences:', error)
    return {}
  }
  
  // Convert array to object for easier access
  const preferences: Record<string, any> = {}
  data.forEach(pref => {
    preferences[pref.preference_key] = pref.preference_value
  })
  
  return preferences
}

/**
 * Set user preference
 */
export async function setUserPreference(key: string, value: any) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }
  
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      preference_key: key,
      preference_value: value
    })
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}