import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { GmailErrorHandler } from '@/lib/gmail/error-handler'

// GET handler to provide helpful error message for direct browser access
export async function GET() {
  return NextResponse.json({
    error: 'Method Not Allowed',
    message: 'This endpoint only accepts POST requests. Please use the Gmail Connect button in the application interface.',
    instructions: 'Go to /dashboard/settings → Integrations tab → Click "Connect Gmail" button'
  }, { status: 405 })
}

export async function POST() {
  return await GmailErrorHandler.executeWithRetry(
    async () => {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      )

      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent', // Force consent screen to get refresh token
        state: user.id // Pass user ID in state for security
      })

      return NextResponse.json({ authUrl })
    },
    'gmail_connect',
    {}
  ).catch((error) => {
    console.error('Error generating Gmail auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    )
  })
}