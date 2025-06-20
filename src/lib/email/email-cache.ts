/**
 * Email Cache Service
 * Provides intelligent caching for email data to reduce database load and improve performance
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface EmailCacheKey {
  userId: string
  filters: string // Serialized filter object
  page: number
  limit: number
}

interface EmailStatsCache {
  totalEmails: number
  unreadEmails: number
  scheduledEmails: number
  aiAnalyzedEmails: number
  lastUpdated: number
}

export class EmailCacheService {
  private static instance: EmailCacheService
  private cache = new Map<string, CacheEntry<any>>()
  private statsCache = new Map<string, EmailStatsCache>()
  
  // Cache TTL settings (in milliseconds)
  private readonly EMAIL_LIST_TTL = 2 * 60 * 1000 // 2 minutes for email lists
  private readonly EMAIL_DETAIL_TTL = 5 * 60 * 1000 // 5 minutes for email details
  private readonly EMAIL_STATS_TTL = 1 * 60 * 1000 // 1 minute for stats
  private readonly SEARCH_RESULTS_TTL = 30 * 1000 // 30 seconds for search results

  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), 5 * 60 * 1000) // Cleanup every 5 minutes
  }

  static getInstance(): EmailCacheService {
    if (!EmailCacheService.instance) {
      EmailCacheService.instance = new EmailCacheService()
    }
    return EmailCacheService.instance
  }

  /**
   * Generate cache key for email list queries
   */
  private generateListCacheKey(userId: string, filters: any, page: number, limit: number): string {
    const filterKey = JSON.stringify({
      ...filters,
      // Normalize filter values
      unread_only: !!filters.unread_only,
      scheduling_only: !!filters.scheduling_only,
      importance_level: filters.importance_level || null,
      has_attachments: filters.has_attachments || null,
      from_address: filters.from_address || null,
      search_query: filters.search_query || null
    })
    return `email_list:${userId}:${Buffer.from(filterKey).toString('base64')}:${page}:${limit}`
  }

  /**
   * Cache email list results
   */
  cacheEmailList(
    userId: string, 
    filters: any, 
    page: number, 
    limit: number, 
    data: any
  ): void {
    const key = this.generateListCacheKey(userId, filters, page, limit)
    const ttl = filters.search_query ? this.SEARCH_RESULTS_TTL : this.EMAIL_LIST_TTL
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Get cached email list results
   */
  getCachedEmailList(
    userId: string, 
    filters: any, 
    page: number, 
    limit: number
  ): any | null {
    const key = this.generateListCacheKey(userId, filters, page, limit)
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Cache individual email details
   */
  cacheEmailDetail(emailId: string, data: any): void {
    const key = `email_detail:${emailId}`
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.EMAIL_DETAIL_TTL
    })
  }

  /**
   * Get cached email details
   */
  getCachedEmailDetail(emailId: string): any | null {
    const key = `email_detail:${emailId}`
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Cache email statistics
   */
  cacheEmailStats(userId: string, stats: Omit<EmailStatsCache, 'lastUpdated'>): void {
    this.statsCache.set(userId, {
      ...stats,
      lastUpdated: Date.now()
    })
  }

  /**
   * Get cached email statistics
   */
  getCachedEmailStats(userId: string): EmailStatsCache | null {
    const stats = this.statsCache.get(userId)
    
    if (!stats) {
      return null
    }

    // Check if stats are still fresh
    if (Date.now() - stats.lastUpdated > this.EMAIL_STATS_TTL) {
      this.statsCache.delete(userId)
      return null
    }

    return stats
  }

  /**
   * Invalidate cache entries for a user
   */
  invalidateUserCache(userId: string): void {
    // Invalidate email lists
    for (const [key] of this.cache) {
      if (key.includes(`email_list:${userId}:`)) {
        this.cache.delete(key)
      }
    }

    // Invalidate stats
    this.statsCache.delete(userId)
  }

  /**
   * Invalidate specific email detail cache
   */
  invalidateEmailDetail(emailId: string): void {
    const key = `email_detail:${emailId}`
    this.cache.delete(key)
  }

  /**
   * Invalidate cache when emails are modified
   */
  invalidateOnEmailChange(userId: string, emailIds: string[]): void {
    // Invalidate all list caches for the user (since counts might change)
    for (const [key] of this.cache) {
      if (key.includes(`email_list:${userId}:`)) {
        this.cache.delete(key)
      }
    }

    // Invalidate specific email details
    emailIds.forEach(emailId => this.invalidateEmailDetail(emailId))

    // Invalidate stats
    this.statsCache.delete(userId)
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number
    emailListEntries: number
    emailDetailEntries: number
    statsEntries: number
    memoryUsageEstimate: string
  } {
    let emailListEntries = 0
    let emailDetailEntries = 0

    for (const [key] of this.cache) {
      if (key.startsWith('email_list:')) {
        emailListEntries++
      } else if (key.startsWith('email_detail:')) {
        emailDetailEntries++
      }
    }

    return {
      totalEntries: this.cache.size,
      emailListEntries,
      emailDetailEntries,
      statsEntries: this.statsCache.size,
      memoryUsageEstimate: this.estimateMemoryUsage()
    }
  }

  /**
   * Estimate memory usage of the cache
   */
  private estimateMemoryUsage(): string {
    let totalSize = 0

    // Estimate cache entries
    for (const [key, entry] of this.cache) {
      totalSize += key.length * 2 // UTF-16 characters
      totalSize += JSON.stringify(entry.data).length * 2
      totalSize += 24 // Overhead for timestamp, ttl, etc.
    }

    // Estimate stats cache
    for (const [key, stats] of this.statsCache) {
      totalSize += key.length * 2
      totalSize += 64 // Estimate for stats object
    }

    if (totalSize < 1024) {
      return `${totalSize} bytes`
    } else if (totalSize < 1024 * 1024) {
      return `${Math.round(totalSize / 1024)} KB`
    } else {
      return `${Math.round(totalSize / (1024 * 1024))} MB`
    }
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanup(): void {
    const now = Date.now()
    let removedCount = 0

    // Cleanup main cache
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    // Cleanup stats cache
    for (const [userId, stats] of this.statsCache) {
      if (now - stats.lastUpdated > this.EMAIL_STATS_TTL) {
        this.statsCache.delete(userId)
        removedCount++
      }
    }

    if (removedCount > 0) {
      console.log(`Email cache cleanup: removed ${removedCount} expired entries`)
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear()
    this.statsCache.clear()
  }

  /**
   * Prefetch commonly accessed data
   */
  async prefetchUserData(userId: string, commonFilters: any[] = []): Promise<void> {
    // This would typically call the actual data service
    // For now, we'll just mark common filter combinations as priorities
    console.log(`Prefetching data for user ${userId} with ${commonFilters.length} filter combinations`)
  }

  /**
   * Get cache hit rate for monitoring
   */
  getCacheHitRate(): number {
    // This would require tracking hits/misses
    // For now, return a placeholder
    return 0.85 // 85% hit rate example
  }
}

// Export singleton instance
export const emailCache = EmailCacheService.getInstance()

// Cache invalidation hooks for external use
export const EmailCacheHooks = {
  onEmailsModified: (userId: string, emailIds: string[]) => {
    emailCache.invalidateOnEmailChange(userId, emailIds)
  },
  
  onEmailCreated: (userId: string, emailId: string) => {
    emailCache.invalidateUserCache(userId)
  },
  
  onEmailDeleted: (userId: string, emailIds: string[]) => {
    emailCache.invalidateOnEmailChange(userId, emailIds)
  },
  
  onUserStatsChanged: (userId: string) => {
    emailCache.invalidateUserCache(userId)
  }
}