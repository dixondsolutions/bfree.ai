import { NextResponse } from 'next/server'
import { analyzeEmailContent } from '@/lib/openai/client'

export async function GET() {
  try {
    // Test with the content from the Nachusa email
    const testEmail = {
      subject: "Re: Nachusa June Guided Hikes",
      from: "matthew@vnwil.com",
      to: "matthew@bwcvb.com", 
      body: `How exciting! Absolutely! -Matthew On Jun 18, 2025 at 11:55 AM -0500, Dee Hudson wrote: > Matt, > > Our summer interpreter is back — Heather Herakovich — and she's beginning to lead guided tours. I should have the July hike dates a lot sooner. > > Would you be able to share these hikes? Possible text: > Take a guided hike at Nachusa Grasslands. Sign up required: https://www.signupgenius.com/go/5080945afa82baafb6-nachusa9#/ > > Thanks! Let me know if you have any questions. > > Dee Hudson > Administrator > > The Nature Conservancy > Nachusa Grasslands > 8772 S. Lowden Road > Franklin Grove, IL 61031 > United States > > dee.hudson@tnc.org > 1 630-926-7331 > > nature.org > >`,
      date: new Date('2025-06-18T17:05:00.000Z')
    }

    console.log('Testing AI analysis with Nachusa email...')
    const result = await analyzeEmailContent(testEmail)
    
    return NextResponse.json({
      success: true,
      emailData: {
        subject: testEmail.subject,
        from: testEmail.from,
        to: testEmail.to,
        bodyLength: testEmail.body.length
      },
      analysisResult: result,
      debug: {
        hasSchedulingContent: result.hasSchedulingContent,
        extractionCount: result.extractions.length,
        overallConfidence: result.overallConfidence,
        extractions: result.extractions.map(e => ({
          type: e.type,
          title: e.title,
          confidence: e.confidence,
          reasoning: e.reasoning.substring(0, 200)
        }))
      }
    })

  } catch (error) {
    console.error('AI analysis test failed:', error)
    return NextResponse.json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 