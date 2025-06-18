import OpenAI from 'openai'

// Initialize OpenAI client lazily to avoid build-time errors
let openaiClient: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

/**
 * Types for AI analysis results
 */
export interface SchedulingExtraction {
  type: 'meeting' | 'task' | 'deadline' | 'reminder'
  title: string
  description?: string
  suggestedDateTime?: string
  duration?: number // in minutes
  location?: string
  participants?: string[]
  priority: 'low' | 'medium' | 'high'
  confidence: number // 0-1 scale
  reasoning: string
}

export interface EmailAnalysisResult {
  hasSchedulingContent: boolean
  extractions: SchedulingExtraction[]
  summary: string
  overallConfidence: number
}

/**
 * System prompt for email analysis
 */
const SYSTEM_PROMPT = `You are a practical AI assistant specialized in extracting scheduling and task information from emails. Your goal is to help users stay organized by identifying actionable items that need attention.

APPROACH:
1. Look for ANY actionable content that requires scheduling, follow-up, or task completion
2. Be practical and helpful - users prefer suggestions they can decline rather than missing important items
3. Consider context like email chains, sender relationships, and business vs personal communication
4. Extract multiple items if the email contains several actionable elements
5. Pay special attention to reply chains and quoted text for context

SCHEDULING TYPES TO DETECT:
- meeting: Any proposed gatherings, calls, appointments, or face-to-face meetings
- task: Work assignments, deliverables, reviews, action items that need completion  
- deadline: Items with specific due dates, time-sensitive requests, or urgent matters
- reminder: Follow-ups, check-ins, confirmations, or recurring items

CONFIDENCE SCORING (be generous but accurate):
- 0.8-1.0: Direct scheduling language ("let's meet", "schedule a call", "due by", specific times/dates)
- 0.6-0.7: Strong business context requiring action ("review needed", "can we discuss", "need to follow up")
- 0.4-0.5: Implied scheduling needs ("we should talk", collaborative planning, project coordination)
- 0.2-0.3: Weak signals (vague future references, general inquiries)
- 0.0-0.1: Clearly no scheduling intent (newsletters, confirmations, FYI messages)

SPECIAL CASES:
- Meeting replies/confirmations: High confidence (0.7+) if time/logistics being discussed
- Project emails: Medium confidence (0.5+) if action items or deadlines mentioned
- Follow-up requests: Medium-high confidence (0.6+) if specific next steps implied
- Email chains: Extract context from quoted messages to understand full conversation

Respond with a JSON object matching the EmailAnalysisResult interface.`

/**
 * Analyze email content using GPT-4
 */
export async function analyzeEmailContent(emailContent: {
  subject: string
  from: string
  to: string
  body: string
  date: Date
}): Promise<EmailAnalysisResult> {
  try {
    // Enhanced email parsing for better context
    const isReply = emailContent.subject.toLowerCase().startsWith('re:') || 
                   emailContent.subject.toLowerCase().startsWith('fwd:')
    
    const emailDate = emailContent.date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric', 
      month: 'short',
      day: 'numeric'
    })
    
    const prompt = `Analyze this email for scheduling and task-related content:

SUBJECT: ${emailContent.subject}
FROM: ${emailContent.from}
TO: ${emailContent.to}
DATE: ${emailDate} (${emailContent.date.toISOString()})
TYPE: ${isReply ? 'Email Reply/Chain' : 'New Email'}

EMAIL CONTENT:
${emailContent.body.substring(0, 5000)} ${emailContent.body.length > 5000 ? '...' : ''}

CONTEXT INSTRUCTIONS:
${isReply ? 
  `This is a reply/forward. Pay attention to both the new message and any quoted/original content for full context. Meeting confirmations, time changes, and logistics discussions in replies are especially important.` : 
  `This is a new email. Look for direct scheduling requests, meeting proposals, deadlines, and action items.`
}

Please analyze this email and extract any scheduling-relevant information. Be practical and helpful - it's better to suggest actionable items that users can decline than to miss important scheduling opportunities.`

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for consistent, conservative results
      max_tokens: 1500
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const result = JSON.parse(content) as EmailAnalysisResult
    
    // Validate and sanitize the result
    return {
      hasSchedulingContent: Boolean(result.hasSchedulingContent),
      extractions: (result.extractions || []).map(extraction => ({
        type: ['meeting', 'task', 'deadline', 'reminder'].includes(extraction.type) 
          ? extraction.type 
          : 'task',
        title: String(extraction.title || 'Untitled'),
        description: extraction.description ? String(extraction.description) : undefined,
        suggestedDateTime: extraction.suggestedDateTime ? String(extraction.suggestedDateTime) : undefined,
        duration: typeof extraction.duration === 'number' ? extraction.duration : undefined,
        location: extraction.location ? String(extraction.location) : undefined,
        participants: Array.isArray(extraction.participants) 
          ? extraction.participants.map(p => String(p)) 
          : undefined,
        priority: ['low', 'medium', 'high'].includes(extraction.priority) 
          ? extraction.priority 
          : 'medium',
        confidence: Math.max(0, Math.min(1, Number(extraction.confidence) || 0)),
        reasoning: String(extraction.reasoning || 'No reasoning provided')
      })),
      summary: String(result.summary || 'No summary available'),
      overallConfidence: Math.max(0, Math.min(1, Number(result.overallConfidence) || 0))
    }
  } catch (error) {
    console.error('Error analyzing email with OpenAI:', error)
    throw new Error(`Failed to analyze email: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate AI suggestions based on multiple emails
 */
export async function generateSuggestions(emails: Array<{
  id: string
  subject: string
  from: string
  body: string
  analysis?: EmailAnalysisResult
}>): Promise<{
  consolidatedSuggestions: SchedulingExtraction[]
  insights: string[]
}> {
  try {
    const emailSummaries = emails.map(email => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      analysis: email.analysis
    }))

    const prompt = `Based on these analyzed emails, provide consolidated scheduling suggestions and insights:

${JSON.stringify(emailSummaries, null, 2)}

Please:
1. Identify patterns and consolidate related scheduling items
2. Suggest optimal scheduling strategies
3. Highlight conflicts or priorities
4. Provide actionable insights for the user

Respond with JSON containing 'consolidatedSuggestions' and 'insights' arrays.`

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert scheduling assistant. Analyze email patterns and provide strategic scheduling recommendations.' 
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
    console.error('Error generating AI suggestions:', error)
    throw new Error(`Failed to generate suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}