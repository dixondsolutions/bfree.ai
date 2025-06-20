import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export async function POST() {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Logout error:', error)
      return NextResponse.json(
        { error: 'Failed to log out' },
        { status: 500 }
      )
    }

    // Redirect to login page
    redirect('/login')
    
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { error: 'Server error during logout' },
      { status: 500 }
    )
  }
}