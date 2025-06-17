import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

/**
 * Create an authenticated Gmail client using stored OAuth tokens
 */
export async function createGmailClient(userEmailAccount?: any) {
  if (!userEmailAccount) {
    // Get the user's email account from the database
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: emailAccounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !emailAccounts?.length) {
      throw new Error('No Gmail account connected')
    }

    userEmailAccount = emailAccounts[0]
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  // Decrypt tokens before use
  const { decrypt } = await import('@/lib/utils/encryption')
  
  oauth2Client.setCredentials({
    access_token: decrypt(userEmailAccount.access_token),
    refresh_token: userEmailAccount.refresh_token ? decrypt(userEmailAccount.refresh_token) : null,
    expiry_date: userEmailAccount.expires_at ? new Date(userEmailAccount.expires_at).getTime() : undefined,
  })

  // Set up automatic token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      // Encrypt tokens before updating
      const { encrypt } = await import('@/lib/utils/encryption')
      
      // Update the stored tokens in the database
      const supabase = await createClient()
      await supabase
        .from('email_accounts')
        .update({
          access_token: encrypt(tokens.access_token!),
          refresh_token: encrypt(tokens.refresh_token),
          expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userEmailAccount.id)
    }
  })

  return google.gmail({ version: 'v1', auth: oauth2Client })
}

/**
 * Types for Gmail API responses
 */
export interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload: {
    headers: { name: string; value: string }[]
    body?: {
      data?: string
      size: number
    }
    parts?: Array<{
      mimeType: string
      body?: {
        data?: string
        size: number
      }
    }>
  }
  internalDate: string
}

export interface GmailThread {
  id: string
  messages: GmailMessage[]
}

/**
 * Decode base64url encoded string
 */
export function decodeBase64Url(str: string): string {
  try {
    // Replace base64url chars and add padding if needed
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const padding = base64.length % 4
    const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64
    
    return Buffer.from(paddedBase64, 'base64').toString('utf-8')
  } catch (error) {
    console.error('Error decoding base64url:', error)
    return ''
  }
}

/**
 * Extract text content from Gmail message payload
 */
export function extractMessageContent(message: GmailMessage): {
  subject: string
  from: string
  to: string
  body: string
  date: Date
} {
  const headers = message.payload.headers
  const subject = headers.find(h => h.name === 'Subject')?.value || ''
  const from = headers.find(h => h.name === 'From')?.value || ''
  const to = headers.find(h => h.name === 'To')?.value || ''
  const date = new Date(parseInt(message.internalDate))

  let body = ''

  // Extract body content
  if (message.payload.body?.data) {
    body = decodeBase64Url(message.payload.body.data)
  } else if (message.payload.parts) {
    // Look for text/plain or text/html parts
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = decodeBase64Url(part.body.data)
        break
      } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
        body = decodeBase64Url(part.body.data)
      }
    }
  }

  // Clean up HTML tags if present
  body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  return { subject, from, to, body, date }
}