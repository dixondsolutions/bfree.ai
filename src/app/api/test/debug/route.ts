import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'

export async function GET() {
  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      supabase: {
        connected: false,
        user: null,
        error: null
      },
      database: {
        tables: [],
        errors: []
      },
      apis: {
        tasksEndpoint: null,
        suggestionsEndpoint: null
      }
    }

    // Test Supabase connection
    try {
      const user = await getCurrentUser()
      debugInfo.supabase.connected = true
      debugInfo.supabase.user = user ? { id: user.id, email: user.email } : null
    } catch (error) {
      debugInfo.supabase.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test database tables
    if (debugInfo.supabase.connected) {
      const supabase = await createClient()
      
      // Test tasks table
      try {
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('id, title, status, created_at')
          .limit(5)
        
        debugInfo.database.tables.push({
          name: 'tasks',
          status: 'ok',
          count: tasks?.length || 0,
          sample: tasks?.slice(0, 2) || []
        })
      } catch (error) {
        debugInfo.database.errors.push(`tasks: ${error}`)
      }

      // Test ai_suggestions table
      try {
        const { data: suggestions, error } = await supabase
          .from('ai_suggestions')
          .select('id, title, status, suggested_time, confidence_score')
          .limit(5)
        
        debugInfo.database.tables.push({
          name: 'ai_suggestions',
          status: 'ok',
          count: suggestions?.length || 0,
          sample: suggestions?.slice(0, 2) || []
        })
      } catch (error) {
        debugInfo.database.errors.push(`ai_suggestions: ${error}`)
      }
    }

    // Test API endpoints
    try {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000'
      
      // Test tasks API
      const tasksResponse = await fetch(`${baseUrl}/api/tasks?limit=1`)
      debugInfo.apis.tasksEndpoint = {
        status: tasksResponse.status,
        ok: tasksResponse.ok,
        data: tasksResponse.ok ? await tasksResponse.json() : null
      }
    } catch (error) {
      debugInfo.apis.tasksEndpoint = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 