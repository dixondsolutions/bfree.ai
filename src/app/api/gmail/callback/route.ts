import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    console.log('Gmail callback started:', request.url)
    
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Ensure proper base URL construction - critical fix for malformed URLs
    const protocol = request.nextUrl.protocol
    const host = request.nextUrl.host
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}//${host}`
    
    console.log('Base URL:', baseUrl)
    console.log('OAuth params:', { code: code?.substring(0, 10) + '...', state, error })

    // Validate base URL is not undefined
    if (!baseUrl || baseUrl.includes('undefined')) {
      console.error('Invalid base URL detected:', baseUrl)
      const fallbackUrl = `https://${host || 'bfree-ai.vercel.app'}`
      return NextResponse.redirect(`${fallbackUrl}/dashboard?error=config_error`)
    }

    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(`${baseUrl}/dashboard?error=gmail_auth_failed`)
    }

    if (!code || !state) {
      console.error('Missing required OAuth parameters:', { hasCode: !!code, hasState: !!state })
      return NextResponse.redirect(`${baseUrl}/dashboard?error=missing_code`)
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      state, 
      userIdMatchesState: user?.id === state,
      authError: authError?.message 
    })

    if (authError || !user || user.id !== state) {
      console.error('Authorization failed:', { authError, userId: user?.id, state })
      return NextResponse.redirect(`${baseUrl}/dashboard?error=unauthorized`)
    }

    // Validate Google OAuth configuration
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      console.error('Missing Google OAuth configuration')
      return NextResponse.redirect(`${baseUrl}/dashboard?error=oauth_config_missing`)
    }

    console.log('Google OAuth setup:', {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    })

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Exchange code for tokens with enhanced error handling
    console.log('Exchanging code for tokens...')
    let tokens
    try {
      const tokenResponse = await oauth2Client.getToken(code)
      tokens = tokenResponse.tokens
      console.log('Token exchange successful, token types:', Object.keys(tokens))
    } catch (tokenError: any) {
      console.error('Token exchange failed:', {
        error: tokenError.message,
        code: tokenError.code,
        status: tokenError.status,
        details: tokenError.response?.data
      })
      return NextResponse.redirect(`${baseUrl}/dashboard?error=token_exchange_failed`)
    }

    oauth2Client.setCredentials(tokens)

    // Get user info to store email address
    let userInfo
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const response = await oauth2.userinfo.get()
      userInfo = response.data
    } catch (userInfoError: any) {
      console.error('Failed to get user info:', userInfoError.message)
      return NextResponse.redirect(`${baseUrl}/dashboard?error=userinfo_failed`)
    }

    if (!userInfo.email) {
      console.error('No email address found in user info')
      return NextResponse.redirect(`${baseUrl}/dashboard?error=no_email`)
    }

    // Encrypt sensitive tokens before storing
    console.log('Loading encryption module...')
    let encrypt
    try {
      const encryptionModule = await import('@/lib/utils/encryption')
      encrypt = encryptionModule.encrypt
    } catch (encryptionError) {
      console.error('Failed to load encryption module:', encryptionError)
      return NextResponse.redirect(`${baseUrl}/dashboard?error=encryption_failed`)
    }
    
    console.log('Encrypting tokens...')
    const encryptedAccessToken = encrypt(tokens.access_token!)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null
    
    // Store email account in database
    console.log('Storing email account in database...')
    const { error: insertError } = await supabase
      .from('email_accounts')
      .upsert({
        user_id: user.id,
        email: userInfo.email,
        provider: 'gmail',
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        is_active: true
      }, {
        onConflict: 'user_id,email,provider'
      })

    if (insertError) {
      console.error('Error storing email account:', insertError)
      return NextResponse.redirect(`${baseUrl}/dashboard?error=store_failed`)
    }

    console.log('Gmail connection successful for user:', user.id)
    return NextResponse.redirect(`${baseUrl}/dashboard?success=gmail_connected`)
  } catch (error: any) {
    console.error('Error in Gmail callback:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    })
    
    // Ensure we have a valid base URL for error redirect
    const protocol = request.nextUrl.protocol
    const host = request.nextUrl.host
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}//${host}`
    const fallbackUrl = baseUrl.includes('undefined') 
      ? `https://${host || 'bfree-ai.vercel.app'}`
      : baseUrl
    
    return NextResponse.redirect(`${fallbackUrl}/dashboard?error=callback_failed`)
  }
}