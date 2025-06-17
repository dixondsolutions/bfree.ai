import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth': { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 requests per 15 minutes
  '/api/gmail': { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
  '/api/ai': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 AI requests per minute
  '/api/calendar': { windowMs: 60 * 1000, maxRequests: 50 }, // 50 calendar requests per minute
  'default': { windowMs: 60 * 1000, maxRequests: 100 } // 100 requests per minute default
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get user ID from auth first
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // This would need to be parsed from the JWT token
    // For now, use IP address
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0] || 'unknown'
  
  return ip
}

/**
 * Get rate limit configuration for a route
 */
function getRateLimitConfig(pathname: string): RateLimitConfig {
  for (const [route, config] of Object.entries(DEFAULT_RATE_LIMITS)) {
    if (route !== 'default' && pathname.startsWith(route)) {
      return config
    }
  }
  return DEFAULT_RATE_LIMITS.default
}

/**
 * Check if request should be rate limited
 */
export async function checkRateLimit(request: NextRequest): Promise<{
  allowed: boolean
  remaining: number
  resetTime: Date
  retryAfter?: number
}> {
  try {
    const clientId = getClientId(request)
    const pathname = request.nextUrl.pathname
    const config = getRateLimitConfig(pathname)
    
    const supabase = await createClient()
    const now = new Date()
    const windowStart = new Date(now.getTime() - config.windowMs)
    
    // Clean up old entries
    await supabase
      .from('rate_limits')
      .delete()
      .lt('created_at', windowStart.toISOString())
    
    // Count requests in current window
    const { data: existingRequests, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('client_id', clientId)
      .eq('endpoint', pathname)
      .gte('created_at', windowStart.toISOString())
    
    if (error) {
      console.error('Rate limit check error:', error)
      // Allow request if we can't check rate limit
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(now.getTime() + config.windowMs)
      }
    }
    
    const requestCount = existingRequests?.length || 0
    
    if (requestCount >= config.maxRequests) {
      // Rate limit exceeded
      const oldestRequest = existingRequests[0]
      const resetTime = new Date(new Date(oldestRequest.created_at).getTime() + config.windowMs)
      const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000)
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter
      }
    }
    
    // Record this request
    await supabase
      .from('rate_limits')
      .insert({
        client_id: clientId,
        endpoint: pathname,
        created_at: now.toISOString()
      })
    
    return {
      allowed: true,
      remaining: config.maxRequests - requestCount - 1,
      resetTime: new Date(now.getTime() + config.windowMs)
    }
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Allow request if rate limiting fails
    return {
      allowed: true,
      remaining: 99,
      resetTime: new Date(Date.now() + 60000)
    }
  }
}

/**
 * Rate limiting middleware for API routes
 */
export async function withRateLimit<T>(
  request: NextRequest,
  handler: () => Promise<T>
): Promise<T | Response> {
  const rateLimitResult = await checkRateLimit(request)
  
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': getRateLimitConfig(request.nextUrl.pathname).maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
        }
      }
    )
  }
  
  const response = await handler()
  
  // Add rate limit headers to successful responses
  if (response instanceof Response) {
    response.headers.set('X-RateLimit-Limit', getRateLimitConfig(request.nextUrl.pathname).maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toISOString())
  }
  
  return response
}