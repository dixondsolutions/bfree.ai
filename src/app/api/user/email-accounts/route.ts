import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('id, email, provider, is_active, last_sync, expires_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching email accounts:', error)
      return NextResponse.json({ error: 'Failed to fetch email accounts' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      accounts: accounts || []
    })
  } catch (error) {
    console.error('Error in GET /api/user/email-accounts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 