import { getOpenAIClient, EmailAnalysisResult, SchedulingExtraction } from './client'

/**
 * Enhanced task extraction interface
 */
export interface TaskExtraction extends SchedulingExtraction {
  category: 'work' | 'personal' | 'health' | 'finance' | 'education' | 'social' | 'household' | 'travel' | 'project' | 'other'
  estimatedDuration: number // in minutes
  suggestedDueDate?: string
  energyLevel: number // 1-5 scale
  suggestedTags: string[]
  context: string // Additional context from email
  recurring?: {
    isRecurring: boolean
    pattern?: string
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  }
  dependencies?: string[] // Mentions of other tasks this depends on
}

export interface TaskAnalysisResult {
  hasTaskContent: boolean
  taskExtractions: TaskExtraction[]
  emailSummary: string
  overallConfidence: number
  processingInsights: {
    emailType: 'request' | 'notification' | 'reminder' | 'information' | 'other'
    urgency: 'low' | 'medium' | 'high' | 'urgent'
    complexity: 'simple' | 'moderate' | 'complex'
    stakeholders: string[]
    followUpRequired: boolean
  }
}

/**
 * System prompt for enhanced task extraction
 */
const TASK_EXTRACTION_PROMPT = `You are an expert AI assistant specialized in extracting actionable tasks from emails with sophisticated understanding of work patterns, priorities, and scheduling nuances.

CORE MISSION:
Extract actionable tasks that require human attention, time investment, or completion. Be conservative but thorough - it's better to miss vague items than create false tasks.

TASK CATEGORIES:
- work: Professional tasks, meetings, projects, deliverables
- personal: Personal errands, appointments, self-care
- health: Medical appointments, fitness, wellness activities  
- finance: Banking, payments, investments, tax-related
- education: Learning, courses, certifications, training
- social: Social events, family gatherings, community activities
- household: Home maintenance, cleaning, organization
- travel: Trip planning, bookings, travel arrangements
- project: Specific project work, milestones, dependencies
- other: Items that don't fit other categories

PRIORITY ASSESSMENT:
- urgent: Immediate action required (today/tomorrow)
- high: Important deadlines within a week
- medium: Standard priority, flexible timing
- low: Nice to have, no specific deadline

ENERGY LEVEL MAPPING (1-5 scale):
- 5 (High): Complex problem-solving, creative work, important meetings
- 4 (Medium-High): Detailed planning, significant communications
- 3 (Medium): Standard tasks, routine meetings, administrative work
- 2 (Medium-Low): Simple tasks, quick responses, data entry
- 1 (Low): Organizing, filing, brief calls, simple follow-ups

DURATION ESTIMATION GUIDELINES:
- Quick tasks: 5-15 minutes (emails, quick calls)
- Short tasks: 15-30 minutes (simple tasks, brief meetings)
- Standard tasks: 30-60 minutes (most work tasks)
- Long tasks: 1-3 hours (complex work, long meetings)
- Project work: 3+ hours (break into smaller tasks if possible)

CONFIDENCE SCORING:
- 0.9-1.0: Explicit task language ("Please complete", "Due by", "Schedule")
- 0.7-0.8: Strong implied tasks ("Need to", "Should", specific dates)
- 0.5-0.6: Moderate task hints (collaborative language, future references)
- 0.3-0.4: Weak task signals (vague mentions)
- 0.0-0.2: No clear task intent

CONTEXT EXTRACTION:
Capture important context that helps with scheduling and prioritization:
- Relationships between people mentioned
- Project or initiative context
- Dependencies on other work
- External deadlines or constraints
- Seasonal or time-sensitive factors

RECURRING TASK DETECTION:
Identify patterns suggesting recurring tasks:
- "weekly status update"
- "monthly review"
- "annual planning"
- Regular meeting patterns

Respond with a JSON object matching the TaskAnalysisResult interface.`

/**
 * Analyze email content for task extraction with enhanced capabilities
 */
export async function extractTasksFromEmail(emailContent: {
  subject: string
  from: string
  to: string
  body: string
  date: Date
}): Promise<TaskAnalysisResult> {
  try {
    const prompt = `Analyze this email for actionable tasks with enhanced context and scheduling insights:

SUBJECT: ${emailContent.subject}
FROM: ${emailContent.from}
TO: ${emailContent.to}
DATE: ${emailContent.date.toISOString()}

EMAIL BODY:
${emailContent.body.substring(0, 4000)}${emailContent.body.length > 4000 ? '...' : ''}

Please analyze this email and extract actionable tasks with detailed scheduling and context information.`

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: TASK_EXTRACTION_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const result = JSON.parse(content) as TaskAnalysisResult
    
    // Validate and sanitize the result
    return {
      hasTaskContent: Boolean(result.hasTaskContent),
      taskExtractions: (result.taskExtractions || []).map(task => ({
        // Scheduling extraction fields
        type: ['meeting', 'task', 'deadline', 'reminder'].includes(task.type) ? task.type : 'task',
        title: String(task.title || 'Untitled Task'),
        description: task.description ? String(task.description) : undefined,
        suggestedDateTime: task.suggestedDateTime ? String(task.suggestedDateTime) : undefined,
        duration: typeof task.duration === 'number' ? task.duration : (task.estimatedDuration || 30),
        location: task.location ? String(task.location) : undefined,
        participants: Array.isArray(task.participants) ? task.participants.map(p => String(p)) : undefined,
        priority: ['low', 'medium', 'high', 'urgent'].includes(task.priority) ? task.priority : 'medium',
        confidence: Math.max(0, Math.min(1, Number(task.confidence) || 0)),
        reasoning: String(task.reasoning || 'No reasoning provided'),
        
        // Enhanced task fields
        category: ['work', 'personal', 'health', 'finance', 'education', 'social', 'household', 'travel', 'project', 'other'].includes(task.category) 
          ? task.category 
          : 'other',
        estimatedDuration: typeof task.estimatedDuration === 'number' 
          ? Math.max(5, Math.min(480, task.estimatedDuration)) // 5 min to 8 hours
          : 30,
        suggestedDueDate: task.suggestedDueDate ? String(task.suggestedDueDate) : undefined,
        energyLevel: typeof task.energyLevel === 'number' 
          ? Math.max(1, Math.min(5, Math.round(task.energyLevel)))
          : 3,
        suggestedTags: Array.isArray(task.suggestedTags) 
          ? task.suggestedTags.map(tag => String(tag)).slice(0, 10) // Max 10 tags
          : [],
        context: String(task.context || ''),
        recurring: task.recurring ? {
          isRecurring: Boolean(task.recurring.isRecurring),
          pattern: task.recurring.pattern ? String(task.recurring.pattern) : undefined,
          frequency: ['daily', 'weekly', 'monthly', 'yearly'].includes(task.recurring.frequency)
            ? task.recurring.frequency
            : undefined
        } : undefined,
        dependencies: Array.isArray(task.dependencies) 
          ? task.dependencies.map(dep => String(dep))
          : undefined
      })),
      emailSummary: String(result.emailSummary || 'No summary available'),
      overallConfidence: Math.max(0, Math.min(1, Number(result.overallConfidence) || 0)),
      processingInsights: {
        emailType: ['request', 'notification', 'reminder', 'information', 'other'].includes(result.processingInsights?.emailType)
          ? result.processingInsights.emailType
          : 'other',
        urgency: ['low', 'medium', 'high', 'urgent'].includes(result.processingInsights?.urgency)
          ? result.processingInsights.urgency
          : 'medium',
        complexity: ['simple', 'moderate', 'complex'].includes(result.processingInsights?.complexity)
          ? result.processingInsights.complexity
          : 'moderate',
        stakeholders: Array.isArray(result.processingInsights?.stakeholders)
          ? result.processingInsights.stakeholders.map(s => String(s))
          : [],
        followUpRequired: Boolean(result.processingInsights?.followUpRequired)
      }
    }
  } catch (error) {
    console.error('Error extracting tasks from email:', error)
    throw new Error(`Failed to extract tasks: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Analyze multiple emails for task patterns and dependencies
 */
export async function analyzeEmailsForTaskPatterns(emails: Array<{
  id: string
  subject: string
  from: string
  body: string
  taskAnalysis?: TaskAnalysisResult
}>): Promise<{
  consolidatedTasks: TaskExtraction[]
  taskRelationships: Array<{
    task1: string
    task2: string
    relationship: 'dependency' | 'sequence' | 'related' | 'alternative'
    confidence: number
  }>
  recommendations: {
    priority: string[]
    scheduling: string[]
    grouping: string[]
  }
  patterns: {
    recurringTasks: string[]
    projectClusters: string[]
    urgentItems: string[]
  }
}> {
  try {
    const emailSummaries = emails.map(email => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      taskAnalysis: email.taskAnalysis
    }))

    const prompt = `Analyze these emails for task patterns, dependencies, and optimization opportunities:

${JSON.stringify(emailSummaries, null, 2)}

Please provide:
1. Consolidated task list (removing duplicates, merging related items)
2. Task relationships and dependencies
3. Scheduling and priority recommendations
4. Pattern identification (recurring tasks, project clusters, urgent items)

Focus on helping the user optimize their task management and scheduling.`

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert task management consultant. Analyze email patterns and provide strategic task organization recommendations.' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    return JSON.parse(content)
  } catch (error) {
    console.error('Error analyzing email patterns:', error)
    throw new Error(`Failed to analyze patterns: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate smart task scheduling suggestions
 */
export async function generateTaskSchedulingSuggestions(tasks: TaskExtraction[], userPreferences: {
  workingHours: { start: string; end: string }
  energyPeaks: string[] // Time slots when energy is highest
  busyDays: string[] // Days that are typically busy
  preferredTaskDuration: number // Preferred chunk size in minutes
}): Promise<{
  schedulingStrategy: string
  timeSlotRecommendations: Array<{
    taskId?: string
    timeSlot: string
    reasoning: string
    energyMatch: number // 1-5
  }>
  priorityInsights: string[]
  optimizationTips: string[]
}> {
  try {
    const prompt = `Generate smart scheduling recommendations for these tasks:

TASKS:
${JSON.stringify(tasks, null, 2)}

USER PREFERENCES:
${JSON.stringify(userPreferences, null, 2)}

Provide strategic scheduling recommendations that optimize for:
- Energy level matching (high-energy tasks during peak hours)
- Time slot efficiency (appropriate duration matching)
- Priority and deadline alignment
- Dependency sequencing
- Work-life balance

Focus on actionable, personalized recommendations.`

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert productivity consultant specializing in task scheduling optimization based on energy patterns, priorities, and personal preferences.' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    return JSON.parse(content)
  } catch (error) {
    console.error('Error generating scheduling suggestions:', error)
    throw new Error(`Failed to generate suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}