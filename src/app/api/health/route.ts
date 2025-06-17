import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testEncryption } from '@/lib/utils/encryption'

export async function GET() {
  try {
    const startTime = Date.now()
    
    // Test database connection
    const supabase = await createClient()
    const { data, error } = await supabase.from('users').select('id').limit(1)
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }
    
    // Test encryption functionality
    const encryptionWorking = testEncryption()
    if (!encryptionWorking) {
      throw new Error('Encryption system not working properly')
    }
    
    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'ENCRYPTION_KEY'
    ]
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        database: 'ok',
        encryption: 'ok',
        environment: missingEnvVars.length === 0 ? 'ok' : 'warning'
      },
      responseTimeMs: responseTime,
      version: '1.0.0',
      warnings: missingEnvVars.length > 0 ? [`Missing environment variables: ${missingEnvVars.join(', ')}`] : []
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        error: error instanceof Error ? error.message : 'Unknown error',
        version: '1.0.0'
      },
      { status: 503 }
    )
  }
}