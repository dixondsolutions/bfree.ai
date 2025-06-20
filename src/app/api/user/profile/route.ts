import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Try to get user profile data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, email, created_at')
      .eq('user_id', user.id)
      .single()

    // Return user data with fallbacks
    return NextResponse.json({
      success: true,
      id: user.id,
      email: user.email || profile?.email || 'user@example.com',
      name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      created_at: profile?.created_at || user.created_at
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}