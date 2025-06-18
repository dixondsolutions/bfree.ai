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
 * System prompt for email analysis - Enhanced for business context and actionable content
 */
const SYSTEM_PROMPT = `You are an expert AI assistant specialized in extracting actionable scheduling and task information from business emails. Your goal is to help busy professionals stay organized by identifying ALL actionable items that need attention.

CORE PHILOSOPHY:
- Be practical and proactive - users prefer actionable suggestions they can decline rather than missing important items
- Business context matters - work emails deserve higher attention than promotional content
- Informal language often contains the most important actionable items
- Email chains and conversations contain rich context - analyze the full thread

EMAIL CLASSIFICATION PRIORITY:
1. WORK INTERNAL: Same organization/domain emails (.com, known colleagues) - HIGH PRIORITY
2. BUSINESS EXTERNAL: Clients, partners, vendors, professional contacts - HIGH PRIORITY  
3. GOOGLE SERVICES: Chat notifications, calendar invites, meeting updates - MEDIUM-HIGH PRIORITY
4. CHAMBER/PROFESSIONAL: Industry associations, networking groups - MEDIUM PRIORITY
5. PROMOTIONAL: Marketing emails, newsletters, sales pitches - LOW PRIORITY

ACTIONABLE CONTENT DETECTION:
Look for these patterns with HIGH SENSITIVITY:

MEETING/SCHEDULING LANGUAGE:
- Direct: "let's meet", "schedule a call", "set up a meeting", "book some time"
- Informal: "would you like to join", "let's plan on", "want to get together"
- Logistics: "I'll send you", "calendar invite", "what time works", "available for"
- Confirmations: "sounds good", "that works", "see you then", "accepted"

TASK/ACTION LANGUAGE:
- Direct: "need you to", "can you please", "review required", "complete by"
- Implied: "let me know", "send over", "look for it", "follow up on"
- Deadlines: "by Friday", "this week", "next Tuesday", "end of month"
- Coordination: "final schedule", "prepare for", "confirm details"

PROJECT/COLLABORATION:
- "video shoot", "content review", "planning meeting", "strategy session"  
- "onboarding", "training", "presentation", "demo"
- "press release", "marketing materials", "social media", "website updates"

TIME-SENSITIVE INDICATORS:
- "urgent", "ASAP", "today", "tomorrow", "this week", "next week"
- "Thursday", "Friday", specific dates, "end of day", "morning", "afternoon"
- "before [event]", "after [meeting]", "by [deadline]"

EMAIL CHAIN CONTEXT:
- Parse quoted text and conversation history for full context
- Meeting replies often contain the most actionable logistics
- "Re:" and "Fwd:" subjects indicate ongoing conversations with history
- Google Chat notifications contain informal but critical scheduling information

CONFIDENCE SCORING (Be generous for business emails):
- 0.9-1.0: Explicit scheduling with times/dates, direct task assignments
- 0.7-0.8: Strong business scheduling language, meeting logistics, project coordination
- 0.5-0.6: Informal scheduling, implied tasks, follow-up requests
- 0.3-0.4: Weak signals, general inquiries, vague future references  
- 0.1-0.2: Minimal actionable content, mostly informational

BUSINESS CONTEXT BONUSES:
- Work internal emails: +0.2 confidence boost
- Email chains/replies: +0.2 confidence boost for scheduling discussions
- Known business contacts: +0.1 confidence boost
- Project/team coordination: +0.2 confidence boost

TASK GENERATION GUIDELINES:
Create specific, actionable tasks like:
- "Send meeting invite for [topic] to [person] for [time]"
- "Follow up with [person] about [specific topic]"
- "Review and provide feedback on [deliverable] by [deadline]"
- "Confirm attendance for [event] on [date]"
- "Prepare materials for [meeting/project] by [date]"

IGNORE THESE (Low/No scheduling content):
- Pure promotional emails without personal engagement
- Newsletter subscriptions and marketing blasts
- Automated confirmations without scheduling implications
- Political fundraising emails (unless from business contacts)
- General announcements without action items

Respond with a JSON object matching the EmailAnalysisResult interface. Focus on being helpful and proactive while maintaining accuracy.`

/**
 * Classify email type and priority based on sender and content patterns
 */
function classifyEmail(emailContent: {
  subject: string
  from: string
  to: string
  body: string
}): {
  type: 'work_internal' | 'business_external' | 'google_service' | 'chamber_professional' | 'promotional' | 'other'
  priority: 'high' | 'medium' | 'low'
  confidenceBoost: number
  context: string[]
} {
  const from = emailContent.from.toLowerCase()
  const subject = emailContent.subject.toLowerCase()
  const body = emailContent.body.toLowerCase()
  
  // Work internal (same organization/domain)
  if (from.includes('@vnwil.com') || from.includes('matthew@') || from.includes('jayne@')) {
    return {
      type: 'work_internal',
      priority: 'high',
      confidenceBoost: 0.2,
      context: ['work_internal', 'team_communication']
    }
  }
  
  // Google services (chat, calendar, meet)
  if (from.includes('@google.com') || from.includes('chat-noreply') || 
      subject.includes('google chat') || subject.includes('calendar')) {
    return {
      type: 'google_service',
      priority: 'high',
      confidenceBoost: 0.15,
      context: ['google_service', 'collaboration_tool']
    }
  }
  
  // Chamber and professional organizations
  if (from.includes('chamber') || from.includes('@saukvalley') || 
      body.includes('chamber of commerce') || body.includes('networking')) {
    return {
      type: 'chamber_professional',
      priority: 'medium',
      confidenceBoost: 0.1,
      context: ['professional_org', 'networking']
    }
  }
  
  // Promotional/marketing emails
  if (from.includes('noreply') || from.includes('marketing') || from.includes('promo') ||
      from.includes('@staples.com') || from.includes('@marriott') || from.includes('@dscc.org') ||
      subject.includes('save') || subject.includes('offer') || subject.includes('%') ||
      body.includes('unsubscribe') || body.includes('promotional')) {
    return {
      type: 'promotional',
      priority: 'low',
      confidenceBoost: -0.3,
      context: ['promotional', 'marketing']
    }
  }
  
  // Business external (likely clients, partners, vendors)
  if (from.includes('.com') && !from.includes('noreply') && 
      (body.includes('meeting') || body.includes('project') || body.includes('business') ||
       subject.includes('re:') || subject.includes('fwd:'))) {
    return {
      type: 'business_external',
      priority: 'high',
      confidenceBoost: 0.1,
      context: ['business_external', 'client_communication']
    }
  }
  
  return {
    type: 'other',
    priority: 'medium',
    confidenceBoost: 0,
    context: ['general']
  }
}

/**
 * Detect email chain patterns and extract conversation context
 */
function analyzeEmailChain(emailContent: {
  subject: string
  body: string
}): {
  isReply: boolean
  isForward: boolean
  hasQuotedContent: boolean
  conversationDepth: number
  chainBoost: number
} {
  const subject = emailContent.subject.toLowerCase()
  const body = emailContent.body.toLowerCase()
  
  const isReply = subject.startsWith('re:')
  const isForward = subject.startsWith('fwd:') || subject.startsWith('fw:')
  const hasQuotedContent = body.includes('wrote:') || body.includes('on ') || 
                          body.includes('-----original message-----') || body.includes('>')
  
  // Estimate conversation depth based on subject prefixes
  const reCount = (subject.match(/re:/g) || []).length
  const fwdCount = (subject.match(/fwd:|fw:/g) || []).length
  const conversationDepth = reCount + fwdCount
  
  // Email chains with scheduling discussions get confidence boost
  const chainBoost = (isReply || isForward) && (
    body.includes('meeting') || body.includes('schedule') || body.includes('calendar') ||
    body.includes('time') || body.includes('available')
  ) ? 0.2 : 0
  
  return {
    isReply,
    isForward,
    hasQuotedContent,
    conversationDepth,
    chainBoost
  }
}

/**
 * Analyze email content using GPT-4 - Enhanced version
 */
export async function analyzeEmailContent(emailContent: {
  subject: string
  from: string
  to: string
  body: string
  date: Date
}): Promise<EmailAnalysisResult> {
  try {
    // Classify email type and priority
    const classification = classifyEmail(emailContent)
    const chainAnalysis = analyzeEmailChain(emailContent)
    
    // Skip low-value promotional emails unless they have business context
    if (classification.type === 'promotional' && !chainAnalysis.isReply) {
      return {
        hasSchedulingContent: false,
        extractions: [],
        summary: 'Promotional email with no actionable content',
        overallConfidence: 0.1
      }
    }
    
    const emailDate = emailContent.date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric', 
      month: 'short',
      day: 'numeric'
    })
    
    // Enhanced prompt with classification context
    const prompt = `Analyze this ${classification.type.replace('_', ' ')} email for scheduling and task-related content:

SUBJECT: ${emailContent.subject}
FROM: ${emailContent.from}
TO: ${emailContent.to}
DATE: ${emailDate} (${emailContent.date.toISOString()})

EMAIL CLASSIFICATION:
- Type: ${classification.type.replace('_', ' ').toUpperCase()}
- Priority: ${classification.priority.toUpperCase()}
- Context: ${classification.context.join(', ')}
- Is Reply/Chain: ${chainAnalysis.isReply ? 'YES' : 'NO'}
- Conversation Depth: ${chainAnalysis.conversationDepth}

EMAIL CONTENT:
${emailContent.body.substring(0, 5000)} ${emailContent.body.length > 5000 ? '...' : ''}

ANALYSIS INSTRUCTIONS:
${classification.type === 'work_internal' ? 
  `🔴 HIGH PRIORITY: This is internal work communication. Be very sensitive to scheduling needs, project coordination, and informal task assignments. Look for meeting planning, content reviews, deadlines, and team coordination.` : 
  classification.type === 'google_service' ?
  `🔴 HIGH PRIORITY: This is a Google service notification. These often contain critical meeting logistics, calendar changes, or team communication. Pay special attention to quoted chat conversations and scheduling discussions.` :
  classification.type === 'business_external' ?
  `🟡 MEDIUM-HIGH PRIORITY: This is external business communication. Look for client meetings, project deadlines, vendor coordination, and professional scheduling.` :
  `🟢 STANDARD PRIORITY: Analyze for any actionable content, but be appropriately selective.`
}

${chainAnalysis.isReply ? 
  `📧 EMAIL CHAIN DETECTED: This is part of an ongoing conversation. Pay extra attention to the new message content AND any quoted/original messages. Meeting confirmations, time changes, and logistics discussions in replies are especially important. Look for phrases like "sounds good", "that works", "I'll send", "calendar invite", etc.` : 
  `📧 NEW EMAIL: Look for direct scheduling requests, meeting proposals, deadlines, and action items.`
}

Remember: It's better to suggest actionable items that users can decline than to miss important scheduling opportunities. Focus on practical, business-relevant tasks and meetings.`

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 1500
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const result = JSON.parse(content) as EmailAnalysisResult
    
    // Apply confidence adjustments based on classification
    const totalConfidenceBoost = classification.confidenceBoost + chainAnalysis.chainBoost
    const adjustedConfidence = Math.max(0, Math.min(1, (result.overallConfidence || 0) + totalConfidenceBoost))
    
    // Apply confidence boost to individual extractions
    const adjustedExtractions = (result.extractions || []).map(extraction => ({
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
        : classification.priority as 'low' | 'medium' | 'high',
      confidence: Math.max(0, Math.min(1, (Number(extraction.confidence) || 0) + totalConfidenceBoost)),
      reasoning: String(extraction.reasoning || 'No reasoning provided')
    }))
    
    // Validate and sanitize the result
    const hasSchedulingFromContent = Boolean(result.hasSchedulingContent) || adjustedExtractions.length > 0
    
    // Additional heuristic check for common scheduling patterns (safety net)
    const emailText = `${emailContent.subject} ${emailContent.body}`.toLowerCase()
    const hasSchedulingHeuristics = 
      emailText.includes('meeting') ||
      emailText.includes('schedule') ||
      emailText.includes('calendar') ||
      emailText.includes('appointment') ||
      emailText.includes('call') ||
      /\d{1,2}(:\d{2})?\s*(am|pm)/i.test(emailContent.body) || // Time patterns
      /\b(tomorrow|today|next week|this week)\b/i.test(emailContent.body) ||
      emailText.includes('send it') && emailText.includes('time') ||
      (classification.type === 'work_internal' && (
        emailText.includes('virtual') || 
        emailText.includes('zoom') || 
        emailText.includes('teams') ||
        emailText.includes("let's plan") ||
        emailText.includes('works for you')
      ))
    
    // Use heuristics as fallback if AI missed obvious scheduling content
    const finalHasScheduling = hasSchedulingFromContent || (hasSchedulingHeuristics && adjustedConfidence > 0.3)
    
    // If heuristics detected scheduling but AI didn't create extractions, create a basic extraction
    if (hasSchedulingHeuristics && adjustedExtractions.length === 0 && adjustedConfidence > 0.2) {
      const heuristicExtraction = {
        type: 'task' as const,
        title: `Follow up on: ${emailContent.subject.replace(/^(re:|fwd?:)\s*/i, '').trim()}`,
        description: `Email contains scheduling-related content that may need attention`,
        suggestedDateTime: undefined,
        duration: undefined,
        location: undefined,
        participants: undefined,
        priority: 'medium' as const,
        confidence: Math.max(0.4, adjustedConfidence + 0.2), // Boost confidence for heuristic matches
        reasoning: `Heuristic detection: Email contains scheduling keywords and patterns`
      }
      
      adjustedExtractions.push(heuristicExtraction)
      console.log(`Heuristic fallback created extraction for "${emailContent.subject.substring(0, 50)}"`)
    }
    
    console.log(`Email analysis result for "${emailContent.subject.substring(0, 50)}":`, {
      aiDetected: result.hasSchedulingContent,
      extractionCount: adjustedExtractions.length,
      heuristicDetected: hasSchedulingHeuristics,
      finalDecision: finalHasScheduling,
      confidence: adjustedConfidence,
      emailType: classification.type
    })
    
    return {
      hasSchedulingContent: finalHasScheduling || adjustedExtractions.length > 0,
      extractions: adjustedExtractions,
      summary: String(result.summary || 'No summary available'),
      overallConfidence: Math.max(adjustedConfidence, adjustedExtractions.length > 0 ? 0.4 : 0)
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