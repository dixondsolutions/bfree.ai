/**
 * Gmail Quota Manager
 * Manages Gmail API quotas and rate limiting to ensure compliance with Google's limits
 */

export interface QuotaInfo {
  operation: string
  cost: number
  description: string
}

export interface UserQuotaStatus {
  userId: string
  currentUsage: number
  resetTime: number
  remainingQuota: number
  isNearLimit: boolean
  isAtLimit: boolean
}

export interface QuotaCheckResult {
  allowed: boolean
  currentUsage: number
  remainingQuota: number
  retryAfter?: number
  reason?: string
}

/**
 * Gmail Quota Manager
 * Handles Gmail API quota management and rate limiting
 */
export class GmailQuotaManager {
  // Gmail API quota limits (units per user per second)
  private static readonly QUOTA_LIMIT_PER_SECOND = 250
  private static readonly QUOTA_LIMIT_DAILY = 1_000_000_000 // 1 billion units per day
  private static readonly WARNING_THRESHOLD = 0.8 // 80% usage warning
  
  // Quota costs for different Gmail API operations
  private static readonly QUOTA_COSTS: Record<string, QuotaInfo> = {
    // Messages operations
    'messages.list': { operation: 'messages.list', cost: 5, description: 'List messages' },
    'messages.get': { operation: 'messages.get', cost: 5, description: 'Get message' },
    'messages.send': { operation: 'messages.send', cost: 100, description: 'Send message' },
    'messages.modify': { operation: 'messages.modify', cost: 25, description: 'Modify message' },
    'messages.delete': { operation: 'messages.delete', cost: 25, description: 'Delete message' },
    'messages.batchModify': { operation: 'messages.batchModify', cost: 50, description: 'Batch modify messages' },
    'messages.batchDelete': { operation: 'messages.batchDelete', cost: 50, description: 'Batch delete messages' },
    
    // Threads operations
    'threads.list': { operation: 'threads.list', cost: 5, description: 'List threads' },
    'threads.get': { operation: 'threads.get', cost: 10, description: 'Get thread' },
    'threads.modify': { operation: 'threads.modify', cost: 25, description: 'Modify thread' },
    'threads.delete': { operation: 'threads.delete', cost: 25, description: 'Delete thread' },
    
    // Labels operations
    'labels.list': { operation: 'labels.list', cost: 1, description: 'List labels' },
    'labels.get': { operation: 'labels.get', cost: 1, description: 'Get label' },
    'labels.create': { operation: 'labels.create', cost: 5, description: 'Create label' },
    'labels.update': { operation: 'labels.update', cost: 5, description: 'Update label' },
    'labels.delete': { operation: 'labels.delete', cost: 5, description: 'Delete label' },
    
    // Users operations
    'users.getProfile': { operation: 'users.getProfile', cost: 1, description: 'Get user profile' },
    'users.watch': { operation: 'users.watch', cost: 2, description: 'Watch user mailbox' },
    'users.stop': { operation: 'users.stop', cost: 1, description: 'Stop watching mailbox' },
    
    // History operations
    'users.history.list': { operation: 'users.history.list', cost: 5, description: 'List history' },
    
    // Drafts operations
    'drafts.list': { operation: 'drafts.list', cost: 5, description: 'List drafts' },
    'drafts.get': { operation: 'drafts.get', cost: 5, description: 'Get draft' },
    'drafts.create': { operation: 'drafts.create', cost: 25, description: 'Create draft' },
    'drafts.update': { operation: 'drafts.update', cost: 25, description: 'Update draft' },
    'drafts.send': { operation: 'drafts.send', cost: 100, description: 'Send draft' },
    'drafts.delete': { operation: 'drafts.delete', cost: 25, description: 'Delete draft' }
  }

  // In-memory quota tracking (in production, consider using Redis or database)
  private static quotaUsage = new Map<string, {
    perSecondUsage: { count: number; resetTime: number }
    dailyUsage: { count: number; resetTime: number }
  }>()

  /**
   * Check if operation is allowed within quota limits
   */
  static async checkQuota(userId: string, operation: string): Promise<QuotaCheckResult> {
    const quotaInfo = this.QUOTA_COSTS[operation]
    if (!quotaInfo) {
      console.warn(`Unknown Gmail API operation: ${operation}`)
      return { allowed: true, currentUsage: 0, remainingQuota: this.QUOTA_LIMIT_PER_SECOND }
    }

    const userQuota = this.getUserQuota(userId)
    const now = Date.now()

    // Reset counters if time windows have passed
    if (now >= userQuota.perSecondUsage.resetTime) {
      userQuota.perSecondUsage.count = 0
      userQuota.perSecondUsage.resetTime = now + 1000 // 1 second window
    }

    if (now >= userQuota.dailyUsage.resetTime) {
      userQuota.dailyUsage.count = 0
      userQuota.dailyUsage.resetTime = now + (24 * 60 * 60 * 1000) // 24 hours
    }

    // Check per-second limit
    if (userQuota.perSecondUsage.count + quotaInfo.cost > this.QUOTA_LIMIT_PER_SECOND) {
      const retryAfter = userQuota.perSecondUsage.resetTime - now
      return {
        allowed: false,
        currentUsage: userQuota.perSecondUsage.count,
        remainingQuota: this.QUOTA_LIMIT_PER_SECOND - userQuota.perSecondUsage.count,
        retryAfter: Math.max(retryAfter, 1000), // At least 1 second
        reason: 'Per-second quota limit exceeded'
      }
    }

    // Check daily limit
    if (userQuota.dailyUsage.count + quotaInfo.cost > this.QUOTA_LIMIT_DAILY) {
      const retryAfter = userQuota.dailyUsage.resetTime - now
      return {
        allowed: false,
        currentUsage: userQuota.dailyUsage.count,
        remainingQuota: this.QUOTA_LIMIT_DAILY - userQuota.dailyUsage.count,
        retryAfter,
        reason: 'Daily quota limit exceeded'
      }
    }

    // Operation allowed - reserve quota
    userQuota.perSecondUsage.count += quotaInfo.cost
    userQuota.dailyUsage.count += quotaInfo.cost
    this.quotaUsage.set(userId, userQuota)

    return {
      allowed: true,
      currentUsage: userQuota.perSecondUsage.count,
      remainingQuota: this.QUOTA_LIMIT_PER_SECOND - userQuota.perSecondUsage.count
    }
  }

  /**
   * Get current quota status for a user
   */
  static getUserQuotaStatus(userId: string): UserQuotaStatus {
    const userQuota = this.getUserQuota(userId)
    const now = Date.now()

    // Calculate remaining quota
    const remainingPerSecond = Math.max(0, this.QUOTA_LIMIT_PER_SECOND - userQuota.perSecondUsage.count)
    const remainingDaily = Math.max(0, this.QUOTA_LIMIT_DAILY - userQuota.dailyUsage.count)
    const remainingQuota = Math.min(remainingPerSecond, remainingDaily)

    // Check if near or at limits
    const usageRatio = userQuota.perSecondUsage.count / this.QUOTA_LIMIT_PER_SECOND
    const isNearLimit = usageRatio >= this.WARNING_THRESHOLD
    const isAtLimit = remainingQuota <= 0

    return {
      userId,
      currentUsage: userQuota.perSecondUsage.count,
      resetTime: userQuota.perSecondUsage.resetTime,
      remainingQuota,
      isNearLimit,
      isAtLimit
    }
  }

  /**
   * Get quota cost for an operation
   */
  static getOperationCost(operation: string): number {
    return this.QUOTA_COSTS[operation]?.cost || 1
  }

  /**
   * Get all available operations and their costs
   */
  static getOperationCosts(): Record<string, QuotaInfo> {
    return { ...this.QUOTA_COSTS }
  }

  /**
   * Reserve quota for a batch operation
   */
  static async reserveQuotaForBatch(
    userId: string, 
    operations: { operation: string; count: number }[]
  ): Promise<QuotaCheckResult> {
    let totalCost = 0
    
    // Calculate total cost
    for (const op of operations) {
      const quotaInfo = this.QUOTA_COSTS[op.operation]
      if (quotaInfo) {
        totalCost += quotaInfo.cost * op.count
      }
    }

    // Check if total cost is within limits
    const userQuota = this.getUserQuota(userId)
    const now = Date.now()

    // Reset if needed
    if (now >= userQuota.perSecondUsage.resetTime) {
      userQuota.perSecondUsage.count = 0
      userQuota.perSecondUsage.resetTime = now + 1000
    }

    if (userQuota.perSecondUsage.count + totalCost > this.QUOTA_LIMIT_PER_SECOND) {
      const retryAfter = userQuota.perSecondUsage.resetTime - now
      return {
        allowed: false,
        currentUsage: userQuota.perSecondUsage.count,
        remainingQuota: this.QUOTA_LIMIT_PER_SECOND - userQuota.perSecondUsage.count,
        retryAfter: Math.max(retryAfter, 1000),
        reason: 'Batch operation exceeds quota limit'
      }
    }

    // Reserve quota
    userQuota.perSecondUsage.count += totalCost
    userQuota.dailyUsage.count += totalCost
    this.quotaUsage.set(userId, userQuota)

    return {
      allowed: true,
      currentUsage: userQuota.perSecondUsage.count,
      remainingQuota: this.QUOTA_LIMIT_PER_SECOND - userQuota.perSecondUsage.count
    }
  }

  /**
   * Release reserved quota (for failed operations)
   */
  static releaseQuota(userId: string, operation: string, count: number = 1): void {
    const quotaInfo = this.QUOTA_COSTS[operation]
    if (!quotaInfo) return

    const userQuota = this.getUserQuota(userId)
    const costToRelease = quotaInfo.cost * count

    userQuota.perSecondUsage.count = Math.max(0, userQuota.perSecondUsage.count - costToRelease)
    userQuota.dailyUsage.count = Math.max(0, userQuota.dailyUsage.count - costToRelease)
    
    this.quotaUsage.set(userId, userQuota)
  }

  /**
   * Get optimal batch size for an operation given current quota
   */
  static getOptimalBatchSize(userId: string, operation: string, maxDesiredSize: number = 100): number {
    const quotaInfo = this.QUOTA_COSTS[operation]
    if (!quotaInfo) return maxDesiredSize

    const status = this.getUserQuotaStatus(userId)
    const maxAllowedByQuota = Math.floor(status.remainingQuota / quotaInfo.cost)
    
    return Math.min(maxDesiredSize, maxAllowedByQuota, 100) // Cap at 100 for safety
  }

  /**
   * Wait for quota availability
   */
  static async waitForQuota(userId: string, operation: string): Promise<void> {
    const result = await this.checkQuota(userId, operation)
    
    if (!result.allowed && result.retryAfter) {
      console.log(`Quota exceeded for ${operation}, waiting ${result.retryAfter}ms`)
      await new Promise(resolve => setTimeout(resolve, result.retryAfter))
    }
  }

  /**
   * Get or initialize user quota tracking
   */
  private static getUserQuota(userId: string) {
    let userQuota = this.quotaUsage.get(userId)
    
    if (!userQuota) {
      const now = Date.now()
      userQuota = {
        perSecondUsage: { count: 0, resetTime: now + 1000 },
        dailyUsage: { count: 0, resetTime: now + (24 * 60 * 60 * 1000) }
      }
      this.quotaUsage.set(userId, userQuota)
    }
    
    return userQuota
  }

  /**
   * Clear all quota tracking (useful for testing)
   */
  static clearAllQuotas(): void {
    this.quotaUsage.clear()
  }

  /**
   * Get quota usage statistics for monitoring
   */
  static getQuotaStatistics(): {
    totalUsers: number
    averageUsagePerSecond: number
    peakUsagePerSecond: number
    usersNearLimit: number
    usersAtLimit: number
  } {
    const users = Array.from(this.quotaUsage.values())
    const totalUsers = users.length
    
    if (totalUsers === 0) {
      return {
        totalUsers: 0,
        averageUsagePerSecond: 0,
        peakUsagePerSecond: 0,
        usersNearLimit: 0,
        usersAtLimit: 0
      }
    }

    const usages = users.map(u => u.perSecondUsage.count)
    const averageUsagePerSecond = usages.reduce((sum, usage) => sum + usage, 0) / totalUsers
    const peakUsagePerSecond = Math.max(...usages)
    
    const usersNearLimit = users.filter(u => 
      u.perSecondUsage.count / this.QUOTA_LIMIT_PER_SECOND >= this.WARNING_THRESHOLD
    ).length
    
    const usersAtLimit = users.filter(u => 
      u.perSecondUsage.count >= this.QUOTA_LIMIT_PER_SECOND
    ).length

    return {
      totalUsers,
      averageUsagePerSecond,
      peakUsagePerSecond,
      usersNearLimit,
      usersAtLimit
    }
  }

  /**
   * Check if system is experiencing high quota usage
   */
  static isSystemUnderHighLoad(): boolean {
    const stats = this.getQuotaStatistics()
    return stats.usersNearLimit / Math.max(stats.totalUsers, 1) > 0.5 || stats.peakUsagePerSecond > this.QUOTA_LIMIT_PER_SECOND * 0.9
  }

  /**
   * Estimate time until quota is available
   */
  static estimateQuotaAvailability(userId: string, operation: string): number {
    const result = this.checkQuota(userId, operation)
    return result.retryAfter || 0
  }
}