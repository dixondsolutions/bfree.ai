import { NextRequest, NextResponse } from 'next/server'
import { analyzeEmailContent } from '@/lib/openai/client'

export async function POST(request: NextRequest) {
  try {
    // Test the specific email that should be generating suggestions
    const testEmail = {
      subject: "Re: Meeting",
      from: "matthew@vnwil.com",
      to: "test@example.com",
      body: "Hi! No worries. Yes let's plan on doing a virtual meeting. I'll send it for 3pm if that works for you?\r\n\r\n-Matthew\r\nOn Jun 18, 2025 at 5:07 AM -0500",
      date: new Date()
    }
    
    console.log('Testing AI analysis on email:', testEmail.subject)
    console.log('Email content:', testEmail.body.substring(0, 200))
    
    const result = await analyzeEmailContent(testEmail)
    
    console.log('AI Analysis Result:', {
      hasSchedulingContent: result.hasSchedulingContent,
      extractionCount: result.extractions.length,
      overallConfidence: result.overallConfidence,
      summary: result.summary
    })
    
    return NextResponse.json({
      success: true,
      email: testEmail,
      analysis: result,
      debugInfo: {
        hasSchedulingContent: result.hasSchedulingContent,
        extractionCount: result.extractions.length,
        overallConfidence: result.overallConfidence,
        extractions: result.extractions.map(e => ({
          type: e.type,
          title: e.title,
          confidence: e.confidence,
          reasoning: e.reasoning
        }))
      }
    })
  } catch (error) {
    console.error('Debug AI analysis error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 