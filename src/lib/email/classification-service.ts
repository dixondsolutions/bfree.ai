/**
 * Unified Email Classification Service
 * Centralizes all email classification logic to eliminate duplication
 */

export interface EmailClassification {
  importance_level: 'low' | 'normal' | 'high'
  has_scheduling_content: boolean
  scheduling_keywords: string[]
  should_analyze_with_ai: boolean
  priority_score: number
  category: string
  confidence: number
}

export interface EmailData {
  subject: string
  from_address: string
  from_name?: string
  to_address: string
  content_text?: string
  content_html?: string
  snippet?: string
  labels?: string[]
  received_at: string
}

/**
 * Centralized email classification service
 */
export class EmailClassificationService {
  // Scheduling keywords - single source of truth
  private static readonly SCHEDULING_KEYWORDS = [
    'meeting', 'appointment', 'schedule', 'calendar', 'event', 'conference',
    'call', 'deadline', 'due date', 'reminder', 'invite', 'rsvp', 'booking',
    'reservation', 'interview', 'demo', 'presentation', 'webinar', 'training'
  ]

  // High priority keywords
  private static readonly HIGH_PRIORITY_KEYWORDS = [
    'urgent', 'asap', 'emergency', 'critical', 'deadline', 'important',
    'action required', 'time sensitive', 'immediate', 'priority'
  ]

  // Low priority indicators
  private static readonly LOW_PRIORITY_INDICATORS = [
    'newsletter', 'notification', 'no-reply', 'automated', 'unsubscribe',
    'marketing', 'promotional', 'advertisement', 'spam', 'bulk'
  ]

  // Important domains that should get high priority
  private static readonly IMPORTANT_DOMAINS = [
    'calendar-notification@google.com',
    'no-reply@calendly.com',
    'noreply@zoom.us',
    'noreply@microsoft.com',
    'notifications@slack.com'
  ]

  /**
   * Main classification method - single entry point
   */
  public static classifyEmail(email: EmailData, userEmail?: string): EmailClassification {
    const subject = email.subject || ''
    const fromAddress = email.from_address || ''
    const content = this.extractContent(email)
    const labels = email.labels || []

    // Calculate base scores
    const schedulingScore = this.calculateSchedulingScore(subject, content)
    const importanceScore = this.calculateImportanceScore(email, userEmail)
    const priorityScore = this.calculatePriorityScore(email, userEmail)

    // Determine scheduling content
    const has_scheduling_content = schedulingScore >= 0.3
    const scheduling_keywords = has_scheduling_content 
      ? this.extractSchedulingKeywords(subject, content)
      : []

    // Determine importance level
    const importance_level = this.determineImportanceLevel(importanceScore, fromAddress, labels)

    // Determine if AI analysis is needed
    const should_analyze_with_ai = this.shouldAnalyzeWithAI(
      has_scheduling_content,
      importance_level,
      schedulingScore,
      content
    )

    // Determine category
    const category = this.categorizeEmail(email)

    // Overall confidence in classification
    const confidence = this.calculateConfidence(schedulingScore, importanceScore, content.length)

    return {
      importance_level,
      has_scheduling_content,
      scheduling_keywords,
      should_analyze_with_ai,
      priority_score: priorityScore,
      category,
      confidence
    }
  }

  /**
   * Extract and consolidate email content
   */
  private static extractContent(email: EmailData): string {
    let content = email.content_text || ''
    
    // Use HTML as fallback if text is empty/short
    if ((!content || content.length < 50) && email.content_html) {
      content = this.htmlToText(email.content_html)
    }
    
    // Use snippet as final fallback
    if (!content && email.snippet) {
      content = email.snippet
    }
    
    // Include subject in content for analysis
    return `${email.subject || ''} ${content}`.trim()
  }

  /**
   * Convert HTML to plain text
   */
  private static htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Calculate scheduling relevance score (0-1)
   */
  private static calculateSchedulingScore(subject: string, content: string): number {
    const text = `${subject} ${content}`.toLowerCase()
    
    let score = 0
    let keywordMatches = 0
    
    // Check for scheduling keywords
    for (const keyword of this.SCHEDULING_KEYWORDS) {
      if (text.includes(keyword)) {
        keywordMatches++
        // Weight certain keywords higher
        if (['meeting', 'appointment', 'schedule', 'deadline'].includes(keyword)) {
          score += 0.15
        } else {
          score += 0.1
        }
      }
    }
    
    // Bonus for multiple keyword matches
    if (keywordMatches >= 2) {
      score += 0.1
    }
    
    // Check for date/time patterns
    const dateTimePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // Date patterns
      /\b\d{1,2}:\d{2}\s*(am|pm|AM|PM)\b/, // Time patterns
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
      /\b(tomorrow|today|next week|this week|next month)\b/i
    ]
    
    for (const pattern of dateTimePatterns) {
      if (pattern.test(text)) {
        score += 0.1
        break // Only add bonus once
      }
    }
    
    return Math.min(score, 1) // Cap at 1.0
  }

  /**
   * Calculate importance score based on sender and content
   */
  private static calculateImportanceScore(email: EmailData, userEmail?: string): number {
    const subject = email.subject || ''
    const fromAddress = email.from_address || ''
    const labels = email.labels || []
    
    let score = 0.5 // Base score
    
    // Check high priority keywords in subject
    const subjectLower = subject.toLowerCase()
    for (const keyword of this.HIGH_PRIORITY_KEYWORDS) {
      if (subjectLower.includes(keyword)) {
        score += 0.2
        break // Only add bonus once
      }
    }
    
    // Check for important domains
    for (const domain of this.IMPORTANT_DOMAINS) {
      if (fromAddress.includes(domain)) {
        score += 0.3
        break
      }
    }
    
    // Check Gmail labels for importance
    if (labels.includes('IMPORTANT')) {
      score += 0.3
    }
    
    // Check for low priority indicators
    const fromLower = fromAddress.toLowerCase()
    for (const indicator of this.LOW_PRIORITY_INDICATORS) {
      if (fromLower.includes(indicator) || subjectLower.includes(indicator)) {
        score -= 0.3
        break
      }
    }
    
    // Check if email is from user themselves
    if (userEmail && fromAddress.toLowerCase().includes(userEmail.toLowerCase())) {
      score += 0.1 // Slight boost for self-sent emails
    }
    
    return Math.max(0, Math.min(score, 1)) // Clamp between 0 and 1
  }

  /**
   * Calculate overall priority score for processing order
   */
  private static calculatePriorityScore(email: EmailData, userEmail?: string): number {
    const schedulingScore = this.calculateSchedulingScore(email.subject || '', this.extractContent(email))
    const importanceScore = this.calculateImportanceScore(email, userEmail)
    const recencyScore = this.calculateRecencyScore(email.received_at)
    
    // Weighted combination
    return (schedulingScore * 0.4) + (importanceScore * 0.4) + (recencyScore * 0.2)
  }

  /**
   * Calculate recency score (newer emails get higher priority)
   */
  private static calculateRecencyScore(receivedAt: string): number {
    const now = new Date()
    const emailDate = new Date(receivedAt)
    const hoursDiff = (now.getTime() - emailDate.getTime()) / (1000 * 60 * 60)
    
    // Score decreases over time
    if (hoursDiff < 1) return 1.0
    if (hoursDiff < 6) return 0.8
    if (hoursDiff < 24) return 0.6
    if (hoursDiff < 72) return 0.4
    return 0.2
  }

  /**
   * Determine importance level from score
   */
  private static determineImportanceLevel(score: number, fromAddress: string, labels: string[]): 'low' | 'normal' | 'high' {
    if (score >= 0.7 || labels.includes('IMPORTANT')) {
      return 'high'
    }
    if (score <= 0.3 || fromAddress.includes('no-reply')) {
      return 'low'
    }
    return 'normal'
  }

  /**
   * Determine if email should be analyzed with AI
   */
  private static shouldAnalyzeWithAI(
    hasSchedulingContent: boolean, 
    importanceLevel: string, 
    schedulingScore: number,
    content: string
  ): boolean {
    // Skip AI analysis for very short emails
    if (content.length < 20) {
      return false
    }
    
    // Always analyze high importance emails
    if (importanceLevel === 'high') {
      return true
    }
    
    // Analyze emails with strong scheduling signals
    if (hasSchedulingContent && schedulingScore >= 0.5) {
      return true
    }
    
    // Skip low importance emails unless they have scheduling content
    if (importanceLevel === 'low' && !hasSchedulingContent) {
      return false
    }
    
    // Analyze normal importance emails with some scheduling indicators
    return hasSchedulingContent && schedulingScore >= 0.3
  }

  /**
   * Extract specific scheduling keywords found in the email
   */
  private static extractSchedulingKeywords(subject: string, content: string): string[] {
    const text = `${subject} ${content}`.toLowerCase()
    const foundKeywords: string[] = []
    
    for (const keyword of this.SCHEDULING_KEYWORDS) {
      if (text.includes(keyword) && !foundKeywords.includes(keyword)) {
        foundKeywords.push(keyword)
      }
    }
    
    return foundKeywords.slice(0, 5) // Limit to 5 keywords
  }

  /**
   * Categorize email type
   */
  private static categorizeEmail(email: EmailData): string {
    const subject = email.subject?.toLowerCase() || ''
    const fromAddress = email.from_address?.toLowerCase() || ''
    
    // Calendar/scheduling emails
    if (this.calculateSchedulingScore(email.subject || '', this.extractContent(email)) >= 0.5) {
      return 'scheduling'
    }
    
    // System notifications
    if (fromAddress.includes('no-reply') || fromAddress.includes('noreply')) {
      return 'notification'
    }
    
    // Marketing/promotional
    if (subject.includes('unsubscribe') || subject.includes('promotional')) {
      return 'marketing'
    }
    
    // Work-related (common business domains)
    const businessIndicators = ['meeting', 'project', 'team', 'client', 'proposal', 'invoice']
    if (businessIndicators.some(indicator => subject.includes(indicator))) {
      return 'work'
    }
    
    return 'general'
  }

  /**
   * Calculate confidence in classification (0-1)
   */
  private static calculateConfidence(schedulingScore: number, importanceScore: number, contentLength: number): number {
    let confidence = 0.5 // Base confidence
    
    // Higher confidence for strong signals
    if (schedulingScore >= 0.7 || importanceScore >= 0.7) {
      confidence += 0.3
    }
    
    // Higher confidence for sufficient content
    if (contentLength >= 100) {
      confidence += 0.1
    }
    
    // Lower confidence for very short content
    if (contentLength < 20) {
      confidence -= 0.2
    }
    
    return Math.max(0.1, Math.min(confidence, 1))
  }

  /**
   * Utility method to get scheduling keywords for external use
   */
  public static getSchedulingKeywords(): string[] {
    return [...this.SCHEDULING_KEYWORDS]
  }

  /**
   * Utility method to validate if an email has sufficient content for processing
   */
  public static hasValidContent(email: EmailData): boolean {
    const content = this.extractContent(email)
    return content.length >= 10 && (email.subject || content.length >= 20)
  }
}