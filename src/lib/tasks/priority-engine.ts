import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'

export interface TaskPriorityFactors {
  // Time-based factors
  dueDate?: Date
  createdDate: Date
  estimatedDuration: number // minutes
  
  // Content-based factors
  urgentKeywords: string[] // Words that indicate urgency
  importantKeywords: string[] // Words that indicate importance
  category: string
  
  // Context-based factors
  senderImportance?: number // 1-5 scale for email sender importance
  emailType?: 'request' | 'notification' | 'reminder' | 'information'
  stakeholderCount?: number // Number of people involved
  
  // AI-based factors
  aiConfidence: number // 0-1 from AI analysis
  aiUrgency?: 'low' | 'medium' | 'high' | 'urgent'
  
  // User behavior factors
  userEngagement?: number // How often user works on similar tasks
  previousCompletionTime?: number // Historical data on similar tasks
  
  // External factors
  businessImpact?: 'low' | 'medium' | 'high'
  dependencies?: string[] // Tasks that depend on this one
  blockers?: string[] // Tasks this depends on
}

export interface PriorityCalculationResult {
  finalPriority: 'low' | 'medium' | 'high' | 'urgent'
  priorityScore: number // 0-100
  reasoning: {
    factors: Array<{
      factor: string
      impact: number // -20 to +20
      explanation: string
    }>
    recommendations: string[]
    adjustmentReasons: string[]
  }
  dynamicFactors: {
    timeFactorScore: number
    contentFactorScore: number
    contextFactorScore: number
    aiFactorScore: number
    userFactorScore: number
  }
}

export class TaskPriorityEngine {
  private supabase: any
  private urgentKeywords = [
    'urgent', 'asap', 'immediately', 'emergency', 'critical', 'deadline',
    'rush', 'priority', 'important', 'escalate', 'overdue', 'late'
  ]
  
  private importantKeywords = [
    'meeting', 'presentation', 'client', 'customer', 'board', 'ceo',
    'director', 'manager', 'project', 'launch', 'release', 'milestone',
    'revenue', 'budget', 'contract', 'legal', 'compliance'
  ]

  constructor() {
    this.supabase = null
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Calculate priority for a single task
   */
  async calculateTaskPriority(factors: TaskPriorityFactors): Promise<PriorityCalculationResult> {
    const reasoning = {
      factors: [] as Array<{ factor: string; impact: number; explanation: string }>,
      recommendations: [] as string[],
      adjustmentReasons: [] as string[]
    }

    // Calculate individual factor scores
    const timeFactorScore = this.calculateTimeFactors(factors, reasoning)
    const contentFactorScore = this.calculateContentFactors(factors, reasoning)
    const contextFactorScore = this.calculateContextFactors(factors, reasoning)
    const aiFactorScore = this.calculateAIFactors(factors, reasoning)
    const userFactorScore = await this.calculateUserFactors(factors, reasoning)

    // Weight the factors
    const weights = {
      time: 0.35,      // Deadlines and urgency are critical
      content: 0.25,   // Content analysis for urgency indicators
      context: 0.20,   // Business context and stakeholders
      ai: 0.15,        // AI confidence and analysis
      user: 0.05       // User behavior patterns
    }

    const priorityScore = Math.round(
      timeFactorScore * weights.time +
      contentFactorScore * weights.content +
      contextFactorScore * weights.context +
      aiFactorScore * weights.ai +
      userFactorScore * weights.user
    )

    // Convert score to priority level
    const finalPriority = this.scoreToPriorityLevel(priorityScore)

    // Add recommendations
    this.generateRecommendations(factors, priorityScore, reasoning)

    return {
      finalPriority,
      priorityScore: Math.max(0, Math.min(100, priorityScore)),
      reasoning,
      dynamicFactors: {
        timeFactorScore,
        contentFactorScore,
        contextFactorScore,
        aiFactorScore,
        userFactorScore
      }
    }
  }

  /**
   * Calculate time-based priority factors
   */
  private calculateTimeFactors(
    factors: TaskPriorityFactors, 
    reasoning: PriorityCalculationResult['reasoning']
  ): number {
    let score = 30 // Base score
    const now = new Date()

    // Due date analysis
    if (factors.dueDate) {
      const msUntilDue = factors.dueDate.getTime() - now.getTime()
      const daysUntilDue = msUntilDue / (24 * 60 * 60 * 1000)

      if (daysUntilDue < 0) {
        score += 40
        reasoning.factors.push({
          factor: 'Overdue',
          impact: 40,
          explanation: `Task is ${Math.abs(Math.round(daysUntilDue))} days overdue`
        })
      } else if (daysUntilDue <= 1) {
        score += 35
        reasoning.factors.push({
          factor: 'Due Soon',
          impact: 35,
          explanation: 'Task due within 24 hours'
        })
      } else if (daysUntilDue <= 3) {
        score += 25
        reasoning.factors.push({
          factor: 'Due This Week',
          impact: 25,
          explanation: 'Task due within 3 days'
        })
      } else if (daysUntilDue <= 7) {
        score += 15
        reasoning.factors.push({
          factor: 'Due Next Week',
          impact: 15,
          explanation: 'Task due within a week'
        })
      }
    }

    // Task age analysis
    const msAge = now.getTime() - factors.createdDate.getTime()
    const daysAge = msAge / (24 * 60 * 60 * 1000)

    if (daysAge > 7) {
      score += 10
      reasoning.factors.push({
        factor: 'Task Age',
        impact: 10,
        explanation: `Task created ${Math.round(daysAge)} days ago`
      })
    }

    // Duration consideration
    if (factors.estimatedDuration > 240) { // > 4 hours
      score += 5
      reasoning.factors.push({
        factor: 'Long Duration',
        impact: 5,
        explanation: 'Long tasks need early scheduling'
      })
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate content-based priority factors
   */
  private calculateContentFactors(
    factors: TaskPriorityFactors,
    reasoning: PriorityCalculationResult['reasoning']
  ): number {
    let score = 30 // Base score

    // Check for urgent keywords
    const urgentCount = factors.urgentKeywords.filter(keyword => 
      this.urgentKeywords.some(urgent => 
        keyword.toLowerCase().includes(urgent.toLowerCase())
      )
    ).length

    if (urgentCount > 0) {
      const urgentBonus = Math.min(urgentCount * 15, 30)
      score += urgentBonus
      reasoning.factors.push({
        factor: 'Urgent Keywords',
        impact: urgentBonus,
        explanation: `Found ${urgentCount} urgency indicators in content`
      })
    }

    // Check for important keywords
    const importantCount = factors.importantKeywords.filter(keyword =>
      this.importantKeywords.some(important =>
        keyword.toLowerCase().includes(important.toLowerCase())
      )
    ).length

    if (importantCount > 0) {
      const importantBonus = Math.min(importantCount * 10, 20)
      score += importantBonus
      reasoning.factors.push({
        factor: 'Important Keywords',
        impact: importantBonus,
        explanation: `Found ${importantCount} importance indicators in content`
      })
    }

    // Category-based scoring
    const categoryScores = {
      'work': 10,
      'project': 15,
      'finance': 12,
      'health': 8,
      'education': 6,
      'personal': 5,
      'social': 3,
      'household': 4,
      'travel': 7,
      'other': 0
    }

    const categoryBonus = categoryScores[factors.category as keyof typeof categoryScores] || 0
    if (categoryBonus > 0) {
      score += categoryBonus
      reasoning.factors.push({
        factor: 'Category',
        impact: categoryBonus,
        explanation: `${factors.category} category adds priority weight`
      })
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate context-based priority factors
   */
  private calculateContextFactors(
    factors: TaskPriorityFactors,
    reasoning: PriorityCalculationResult['reasoning']
  ): number {
    let score = 30 // Base score

    // Sender importance
    if (factors.senderImportance) {
      const senderBonus = factors.senderImportance * 4 // 4-20 points
      score += senderBonus
      reasoning.factors.push({
        factor: 'Sender Importance',
        impact: senderBonus,
        explanation: `Important sender (level ${factors.senderImportance}/5)`
      })
    }

    // Email type
    if (factors.emailType) {
      const typeScores = {
        'request': 15,
        'reminder': 12,
        'notification': 8,
        'information': 5
      }
      const typeBonus = typeScores[factors.emailType] || 0
      score += typeBonus
      reasoning.factors.push({
        factor: 'Email Type',
        impact: typeBonus,
        explanation: `${factors.emailType} type email`
      })
    }

    // Stakeholder count
    if (factors.stakeholderCount && factors.stakeholderCount > 1) {
      const stakeholderBonus = Math.min(factors.stakeholderCount * 3, 15)
      score += stakeholderBonus
      reasoning.factors.push({
        factor: 'Multiple Stakeholders',
        impact: stakeholderBonus,
        explanation: `${factors.stakeholderCount} people involved`
      })
    }

    // Business impact
    if (factors.businessImpact) {
      const impactScores = { 'high': 20, 'medium': 10, 'low': 0 }
      const impactBonus = impactScores[factors.businessImpact]
      score += impactBonus
      if (impactBonus > 0) {
        reasoning.factors.push({
          factor: 'Business Impact',
          impact: impactBonus,
          explanation: `${factors.businessImpact} business impact`
        })
      }
    }

    // Dependencies
    if (factors.dependencies && factors.dependencies.length > 0) {
      const depBonus = Math.min(factors.dependencies.length * 5, 15)
      score += depBonus
      reasoning.factors.push({
        factor: 'Dependent Tasks',
        impact: depBonus,
        explanation: `${factors.dependencies.length} tasks depend on this`
      })
    }

    // Blockers
    if (factors.blockers && factors.blockers.length > 0) {
      const blockerPenalty = Math.min(factors.blockers.length * -5, -15)
      score += blockerPenalty
      reasoning.factors.push({
        factor: 'Blocked by Dependencies',
        impact: blockerPenalty,
        explanation: `Blocked by ${factors.blockers.length} tasks`
      })
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate AI-based priority factors
   */
  private calculateAIFactors(
    factors: TaskPriorityFactors,
    reasoning: PriorityCalculationResult['reasoning']
  ): number {
    let score = 30 // Base score

    // AI confidence
    if (factors.aiConfidence) {
      const confidenceBonus = factors.aiConfidence * 20 // 0-20 points
      score += confidenceBonus
      reasoning.factors.push({
        factor: 'AI Confidence',
        impact: confidenceBonus,
        explanation: `AI analysis confidence: ${Math.round(factors.aiConfidence * 100)}%`
      })
    }

    // AI urgency assessment
    if (factors.aiUrgency) {
      const urgencyScores = { 'urgent': 30, 'high': 20, 'medium': 10, 'low': 0 }
      const urgencyBonus = urgencyScores[factors.aiUrgency]
      score += urgencyBonus
      if (urgencyBonus > 0) {
        reasoning.factors.push({
          factor: 'AI Urgency Assessment',
          impact: urgencyBonus,
          explanation: `AI assessed urgency as ${factors.aiUrgency}`
        })
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate user behavior-based priority factors
   */
  private async calculateUserFactors(
    factors: TaskPriorityFactors,
    reasoning: PriorityCalculationResult['reasoning']
  ): Promise<number> {
    let score = 30 // Base score

    try {
      // User engagement with similar tasks
      if (factors.userEngagement) {
        const engagementBonus = factors.userEngagement * 10 // 0-50 points
        score += engagementBonus
        reasoning.factors.push({
          factor: 'User Engagement',
          impact: engagementBonus,
          explanation: 'High engagement with similar tasks'
        })
      }

      // Historical completion patterns
      if (factors.previousCompletionTime) {
        const user = await getCurrentUser()
        if (user) {
          const avgCompletionTime = await this.getUserAvgCompletionTime(
            user.id, 
            factors.category,
            factors.estimatedDuration
          )
          
          if (avgCompletionTime && factors.previousCompletionTime < avgCompletionTime * 0.8) {
            score += 10
            reasoning.factors.push({
              factor: 'Quick Completion History',
              impact: 10,
              explanation: 'User typically completes similar tasks quickly'
            })
          }
        }
      }
    } catch (error) {
      console.error('Error calculating user factors:', error)
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Convert numerical score to priority level
   */
  private scoreToPriorityLevel(score: number): 'low' | 'medium' | 'high' | 'urgent' {
    if (score >= 80) return 'urgent'
    if (score >= 65) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  /**
   * Generate priority recommendations
   */
  private generateRecommendations(
    factors: TaskPriorityFactors,
    score: number,
    reasoning: PriorityCalculationResult['reasoning']
  ) {
    // Due date recommendations
    if (factors.dueDate) {
      const daysUntilDue = (factors.dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      if (daysUntilDue <= 1) {
        reasoning.recommendations.push('Schedule immediately due to tight deadline')
      } else if (daysUntilDue <= 3 && factors.estimatedDuration > 120) {
        reasoning.recommendations.push('Large task with near deadline - consider breaking into smaller parts')
      }
    }

    // Duration recommendations
    if (factors.estimatedDuration > 240) {
      reasoning.recommendations.push('Consider breaking this task into smaller, manageable chunks')
    }

    // Dependency recommendations
    if (factors.blockers && factors.blockers.length > 0) {
      reasoning.recommendations.push('Resolve blocking dependencies before scheduling this task')
    }

    if (factors.dependencies && factors.dependencies.length > 0) {
      reasoning.recommendations.push('Priority task - other tasks are waiting on completion')
    }

    // Engagement recommendations
    if (factors.userEngagement && factors.userEngagement < 0.3) {
      reasoning.recommendations.push('Consider delegating or breaking down - low historical engagement')
    }

    // AI confidence recommendations
    if (factors.aiConfidence < 0.6) {
      reasoning.recommendations.push('Review task details - AI confidence is low, may need clarification')
    }

    // Score-based recommendations
    if (score >= 80) {
      reasoning.recommendations.push('Urgent priority - schedule within next 4 hours if possible')
    } else if (score >= 65) {
      reasoning.recommendations.push('High priority - schedule within next 24 hours')
    } else if (score >= 40) {
      reasoning.recommendations.push('Medium priority - schedule within next 3 days')
    } else {
      reasoning.recommendations.push('Low priority - schedule when convenient')
    }
  }

  /**
   * Get user's average completion time for similar tasks
   */
  private async getUserAvgCompletionTime(
    userId: string,
    category: string,
    estimatedDuration: number
  ): Promise<number | null> {
    try {
      const supabase = await this.getSupabase()
      
      const { data } = await supabase
        .from('tasks')
        .select('actual_duration')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('status', 'completed')
        .not('actual_duration', 'is', null)
        .gte('estimated_duration', estimatedDuration * 0.8)
        .lte('estimated_duration', estimatedDuration * 1.2)
        .limit(10)

      if (!data || data.length === 0) return null

      const avgDuration = data.reduce((sum: number, task: any) => sum + task.actual_duration, 0) / data.length
      return avgDuration
    } catch (error) {
      console.error('Error getting user completion time:', error)
      return null
    }
  }

  /**
   * Batch calculate priorities for multiple tasks
   */
  async calculateBatchPriorities(taskFactors: TaskPriorityFactors[]): Promise<PriorityCalculationResult[]> {
    const results = []
    
    for (const factors of taskFactors) {
      try {
        const result = await this.calculateTaskPriority(factors)
        results.push(result)
      } catch (error) {
        console.error('Error calculating priority for task:', error)
        // Return default priority for failed calculations
        results.push({
          finalPriority: 'medium' as const,
          priorityScore: 50,
          reasoning: {
            factors: [],
            recommendations: ['Priority calculation failed - defaulting to medium'],
            adjustmentReasons: ['Calculation error occurred']
          },
          dynamicFactors: {
            timeFactorScore: 30,
            contentFactorScore: 30,
            contextFactorScore: 30,
            aiFactorScore: 30,
            userFactorScore: 30
          }
        })
      }
    }

    return results
  }

  /**
   * Recalculate priorities based on context changes
   */
  async recalculatePrioritiesWithContext(
    taskFactors: TaskPriorityFactors[],
    contextChanges: {
      newDeadlines?: Array<{ taskIndex: number; deadline: Date }>
      completedTasks?: string[]
      urgentRequests?: string[]
    }
  ): Promise<PriorityCalculationResult[]> {
    
    // Apply context changes
    const updatedFactors = taskFactors.map((factors, index) => {
      let updated = { ...factors }
      
      // Apply new deadlines
      contextChanges.newDeadlines?.forEach(change => {
        if (change.taskIndex === index) {
          updated.dueDate = change.deadline
        }
      })
      
      // Boost priority for urgent requests
      if (contextChanges.urgentRequests?.includes(String(index))) {
        updated.aiUrgency = 'urgent'
        updated.urgentKeywords = [...(updated.urgentKeywords || []), 'urgent request']
      }
      
      return updated
    })

    return this.calculateBatchPriorities(updatedFactors)
  }
}

// Export singleton instance
export const priorityEngine = new TaskPriorityEngine()