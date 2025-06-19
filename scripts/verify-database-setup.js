const { createClient } = require('@supabase/supabase-js')

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyDatabaseSetup() {
  console.log('🔍 Verifying B Free.AI Database Setup...\n')
  
  try {
    // 1. Check if required tables exist
    console.log('📋 Checking required tables...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'users', 
        'email_accounts', 
        'emails',
        'calendars',
        'events',
        'ai_suggestions',
        'user_preferences',
        'processing_queue',
        'audit_logs'
      ])

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError)
      return false
    }

    const tableNames = tables.map(t => t.table_name)
    const requiredTables = ['users', 'email_accounts', 'emails', 'calendars', 'events', 'ai_suggestions']
    const missingTables = requiredTables.filter(table => !tableNames.includes(table))
    
    if (missingTables.length > 0) {
      console.error('❌ Missing required tables:', missingTables)
      return false
    }
    console.log('✅ All required tables exist')

    // 2. Check if user creation trigger exists
    console.log('\n🔧 Checking user creation trigger...')
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table')
      .eq('trigger_name', 'on_auth_user_created')

    if (triggersError) {
      console.error('❌ Error checking triggers:', triggersError)
      return false
    }

    if (triggers.length === 0) {
      console.error('❌ Missing user creation trigger: on_auth_user_created')
      return false
    }
    console.log('✅ User creation trigger exists')

    // 3. Check if handle_new_user function exists
    console.log('\n⚙️ Checking user creation function...')
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'handle_new_user')
      .eq('routine_schema', 'public')

    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError)
      return false
    }

    if (functions.length === 0) {
      console.error('❌ Missing user creation function: handle_new_user')
      return false
    }
    console.log('✅ User creation function exists')

    // 4. Check RLS policies on critical tables
    console.log('\n🔒 Checking Row Level Security policies...')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname')
      .in('tablename', ['users', 'email_accounts'])

    if (policiesError) {
      console.error('❌ Error checking RLS policies:', policiesError)
      return false
    }

    const policyCount = policies.length
    if (policyCount < 4) { // Should have at least 4 policies (2 for users, 2+ for email_accounts)
      console.error('❌ Missing RLS policies. Found:', policyCount)
      return false
    }
    console.log('✅ RLS policies are configured')

    // 5. Test user creation flow
    console.log('\n👤 Testing user creation flow...')
    
    // Create a test user to see if the trigger works
    const testEmail = `test-${Date.now()}@example.com`
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User'
      }
    })

    if (authError) {
      console.error('❌ Error creating test user:', authError)
      return false
    }

    // Check if user profile was created automatically
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !userProfile) {
      console.error('❌ User profile not created automatically:', profileError)
      
      // Clean up test user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return false
    }

    console.log('✅ User creation flow working correctly')

    // Clean up test user
    await supabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('users').delete().eq('id', authData.user.id)

    console.log('\n🎉 Database setup verification PASSED! Gmail authentication should work.')
    return true

  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  }
}

// Run verification
verifyDatabaseSetup().then(success => {
  if (!success) {
    console.log('\n💡 To fix database issues, run the migration scripts in your Supabase SQL editor:')
    console.log('   1. src/lib/database/migrations/001_initial_schema.sql')
    console.log('   2. src/lib/database/migrations/002_add_token_encryption.sql')
    console.log('   3. src/lib/database/migrations/003_add_task_management.sql')
    console.log('   4. src/lib/database/migrations/004_add_automation_enhancements.sql')
    console.log('   5. src/lib/database/migrations/005_add_email_storage.sql')
    console.log('   6. src/lib/database/migrations/006_fix_calendar_data_issues.sql')
    process.exit(1)
  }
  process.exit(0)
}) 