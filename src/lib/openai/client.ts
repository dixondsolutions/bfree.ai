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
const SYSTEM_PROMPT = `You are an expert AI assistant specialized in extracting scheduling and task information from emails. Your job is to analyze email content and identify actionable items that need to be scheduled or tracked.

IMPORTANT INSTRUCTIONS:
1. Only extract items that are clearly actionable and scheduling-related
2. Be conservative - it's better to miss something than to create false positives
3. Assign confidence scores based on how explicit and clear the scheduling intent is
4. Consider context clues like sender relationship, email tone, and specific keywords
5. Extract multiple items if the email contains several scheduling requests

SCHEDULING TYPES:
- meeting: Face-to-face, video calls, phone calls, appointments
- task: Work items, assignments, deliverables that need completion
- deadline: Items with specific due dates or time constraints
- reminder: Follow-ups, check-ins, recurring items

CONFIDENCE SCORING:
- 0.9-1.0: Explicit scheduling language ("Let's meet", "Schedule a call", "Due by Friday")
- 0.7-0.8: Strong implied scheduling ("Can we discuss", "Need to review", specific dates mentioned)
- 0.5-0.6: Moderate scheduling hints (general time references, collaborative language)
- 0.3-0.4: Weak scheduling signals (vague future references)
- 0.0-0.2: No clear scheduling intent

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
    const prompt = `Analyze this email for scheduling and task-related content:

SUBJECT: ${emailContent.subject}
FROM: ${emailContent.from}
TO: ${emailContent.to}
DATE: ${emailContent.date.toISOString()}

EMAIL BODY:
${emailContent.body.substring(0, 4000)} ${emailContent.body.length > 4000 ? '...' : ''}

Please analyze this email and extract any scheduling-relevant information.`

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