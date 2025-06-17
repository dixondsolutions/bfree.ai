'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Sign in error:', error)
    redirect('/login?error=invalid_credentials')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp({
    ...data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error) {
    console.error('Sign up error:', error)
    redirect('/login?error=signup_failed')
  }

  redirect('/login?message=check_email')
}

export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      scopes: 'email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar',
    },
  })

  if (error) {
    console.error('Google sign in error:', error)
    redirect('/login?error=oauth_failed')
  }

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Sign out error:', error)
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}