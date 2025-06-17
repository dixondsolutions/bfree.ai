import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=gmail_auth_failed`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=missing_code`)
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.id !== state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=unauthorized`)
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user info to store email address
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()

    if (!userInfo.email) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=no_email`)
    }

    // Encrypt sensitive tokens before storing
    const { encrypt } = await import('@/lib/utils/encryption')
    
    // Store email account in database
    const { error: insertError } = await supabase
      .from('email_accounts')
      .upsert({
        user_id: user.id,
        email: userInfo.email,
        provider: 'gmail',
        access_token: encrypt(tokens.access_token!),
        refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        is_active: true
      }, {
        onConflict: 'user_id,email,provider'
      })

    if (insertError) {
      console.error('Error storing email account:', insertError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=store_failed`)
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=gmail_connected`)
  } catch (error) {
    console.error('Error in Gmail callback:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=callback_failed`)
  }
}