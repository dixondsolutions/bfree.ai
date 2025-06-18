import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/database/utils'
import { emailService } from '@/lib/email/email-service'
import { z } from 'zod'

const SearchSchema = z.object({
  query: z.string().optional(),
  from: z.string().optional(),
  subject: z.string().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  labels: z.array(z.string()).optional(),
  hasAttachments: z.boolean().optional(),
  importance: z.enum(['low', 'normal', 'high']).optional(),
  aiAnalyzed: z.boolean().optional(),
  limit: z.number().min(1).max(200).optional(),
  offset: z.number().min(0).optional()
})

/**
 * POST /api/emails/search - Advanced email search
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const searchParams = SearchSchema.parse(body)

    // Convert date strings to Date objects
    const processedParams = {
      ...searchParams,
      dateRange: searchParams.dateRange ? {
        start: new Date(searchParams.dateRange.start),
        end: new Date(searchParams.dateRange.end)
      } : undefined
    }

    const emails = await emailService.searchEmails(processedParams)

    return NextResponse.json({
      success: true,
      emails,
      count: emails.length,
      searchParams: processedParams
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid search parameters', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/emails/search:', error)
    return NextResponse.json({ 
      error: 'Failed to search emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/emails/search - Simple email search via query parameters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    const searchQuery = {
      query: searchParams.get('q') || undefined,
      from: searchParams.get('from') || undefined,
      subject: searchParams.get('subject') || undefined,
      hasAttachments: searchParams.get('hasAttachments') === 'true' ? true : undefined,
      importance: searchParams.get('importance') as 'low' | 'normal' | 'high' | undefined,
      aiAnalyzed: searchParams.get('aiAnalyzed') === 'true' ? true : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    }

    // Handle date range
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    if (dateFrom && dateTo) {
      searchQuery.dateRange = {
        start: new Date(dateFrom),
        end: new Date(dateTo)
      }
    }

    const emails = await emailService.searchEmails(searchQuery)

    return NextResponse.json({
      success: true,
      emails,
      count: emails.length,
      query: searchParams.get('q') || '',
      filters: searchQuery
    })

  } catch (error) {
    console.error('Error in GET /api/emails/search:', error)
    return NextResponse.json({ 
      error: 'Failed to search emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}