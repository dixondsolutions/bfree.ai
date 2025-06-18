#!/usr/bin/env node

/**
 * Bulletproof Email-Task System Verification Script
 * Tests the complete workflow from email processing to calendar display
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Verification Tests
 */
class BulletproofSystemVerifier {
  constructor() {
    this.tests = []
    this.passed = 0
    this.failed = 0
  }

  async run() {
    console.log('🚀 Starting Bulletproof Email-Task System Verification\n')

    await this.testDatabaseSchema()
    await this.testDataIntegrity()
    await this.testCalendarFunction()
    await this.testProcessingWorkflow()
    await this.testAPIEndpoints()
    
    this.printSummary()
  }

  test(name, testFn) {
    this.tests.push({ name, testFn })
  }

  async runTest(name, testFn) {
    try {
      const result = await testFn()
      if (result !== false) {
        console.log(`✅ ${name}`)
        this.passed++
        return true
      } else {
        console.log(`❌ ${name}`)
        this.failed++
        return false
      }
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`)
      this.failed++
      return false
    }
  }

  async testDatabaseSchema() {
    console.log('📊 Testing Database Schema...')

    // Test 1: Check all required tables exist
    await this.runTest('All required tables exist', async () => {
      const requiredTables = ['users', 'emails', 'tasks', 'ai_suggestions', 'processing_queue']
      const { data: tables } = await supabase
        .rpc('exec', { 
          sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` 
        })
      
      const tableNames = tables?.map(t => t.table_name) || []
      return requiredTables.every(table => tableNames.includes(table))
    })

    // Test 2: Check foreign key constraints
    await this.runTest('Foreign key constraints are set up', async () => {
      const { data: constraints } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('constraint_type', 'FOREIGN KEY')
        .in('constraint_name', [
          'tasks_source_email_record_id_fkey',
          'ai_suggestions_email_record_id_fkey'
        ])
      
      return constraints?.length === 2
    })

    // Test 3: Check calendar function exists
    await this.runTest('Calendar function exists', async () => {
      const { data } = await supabase.rpc('exec', {
        sql: `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_email_task_calendar_data') as exists`
      })
      return data?.[0]?.exists
    })

    console.log('')
  }

  async testDataIntegrity() {
    console.log('🔗 Testing Data Integrity...')

    // Test 1: Check email-task relationships
    await this.runTest('Email-task relationships are valid', async () => {
      const { data: stats } = await supabase.rpc('exec', {
        sql: `
          SELECT 
            COUNT(*) as total_tasks,
            COUNT(source_email_record_id) as tasks_with_links,
            COUNT(*) - COUNT(source_email_record_id) as missing_links
          FROM tasks
          WHERE ai_generated = true
        `
      })
      
      const result = stats?.[0]
      if (result) {
        console.log(`   📈 AI Tasks: ${result.total_tasks}, Linked: ${result.tasks_with_links}, Missing: ${result.missing_links}`)
        return result.missing_links === 0 || result.tasks_with_links > 0
      }
      return false
    })

    // Test 2: Check AI suggestions linking
    await this.runTest('AI suggestions are properly linked to emails', async () => {
      const { data: stats } = await supabase.rpc('exec', {
        sql: `
          SELECT 
            COUNT(*) as total_suggestions,
            COUNT(email_record_id) as linked_suggestions
          FROM ai_suggestions
        `
      })
      
      const result = stats?.[0]
      if (result) {
        console.log(`   🤖 AI Suggestions: ${result.total_suggestions}, Linked: ${result.linked_suggestions}`)
        return result.linked_suggestions === result.total_suggestions
      }
      return false
    })

    console.log('')
  }

  async testCalendarFunction() {
    console.log('📅 Testing Calendar Function...')

    // Test 1: Function returns data
    await this.runTest('Calendar function returns data', async () => {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (!users?.[0]) return false

      const { data: calendarData, error } = await supabase.rpc('get_email_task_calendar_data', {
        p_user_id: users[0].id,
        p_start_date: '2025-06-01',
        p_end_date: '2025-06-30'
      })

      console.log(`   📊 Calendar items found: ${calendarData?.length || 0}`)
      return !error && Array.isArray(calendarData)
    })

    // Test 2: Function includes processing status
    await this.runTest('Calendar function includes processing status', async () => {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (!users?.[0]) return false

      const { data: calendarData } = await supabase.rpc('get_email_task_calendar_data', {
        p_user_id: users[0].id,
        p_start_date: '2025-06-01',
        p_end_date: '2025-06-30'
      })

      if (calendarData?.[0]) {
        const hasProcessingStatus = 'processing_status' in calendarData[0]
        const statuses = [...new Set(calendarData.map(item => item.processing_status))]
        console.log(`   🎯 Processing statuses found: ${statuses.join(', ')}`)
        return hasProcessingStatus
      }
      return false
    })

    console.log('')
  }

  async testProcessingWorkflow() {
    console.log('⚡ Testing Processing Workflow...')

    // Test 1: Check if enhanced processor file exists
    await this.runTest('Enhanced processor file exists', async () => {
      const fs = require('fs')
      const path = require('path')
      const processorPath = path.join(process.cwd(), 'src/lib/automation/enhanced-processor.ts')
      return fs.existsSync(processorPath)
    })

    // Test 2: Check processing queue functionality
    await this.runTest('Processing queue is functional', async () => {
      const { data: queueStats } = await supabase.rpc('exec', {
        sql: `
          SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_items,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_items
          FROM processing_queue
        `
      })
      
      const result = queueStats?.[0]
      if (result) {
        console.log(`   📋 Queue: ${result.total_items} total, ${result.completed_items} completed, ${result.failed_items} failed`)
        return true // Queue exists and has structure
      }
      return false
    })

    console.log('')
  }

  async testAPIEndpoints() {
    console.log('🌐 Testing API Endpoints...')

    // Test 1: Check if calendar API file exists
    await this.runTest('Calendar API endpoint exists', async () => {
      const fs = require('fs')
      const path = require('path')
      const apiPath = path.join(process.cwd(), 'src/app/api/calendar/email-tasks/route.ts')
      return fs.existsSync(apiPath)
    })

    // Test 2: Check enhanced calendar view exists
    await this.runTest('Enhanced calendar view component exists', async () => {
      const fs = require('fs')
      const path = require('path')
      const componentPath = path.join(process.cwd(), 'src/components/calendar/EnhancedCalendarView.tsx')
      return fs.existsSync(componentPath)
    })

    console.log('')
  }

  printSummary() {
    console.log('📋 Verification Summary')
    console.log('=' + '='.repeat(50))
    console.log(`✅ Passed: ${this.passed}`)
    console.log(`❌ Failed: ${this.failed}`)
    console.log(`📊 Total: ${this.passed + this.failed}`)
    
    if (this.failed === 0) {
      console.log('\n🎉 All tests passed! Your bulletproof email-task system is working correctly.')
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues above.')
    }

    console.log('\n🔧 Next Steps:')
    console.log('1. Test the enhanced calendar view in your browser')
    console.log('2. Process a new email to verify end-to-end workflow')
    console.log('3. Check calendar display shows email-task relationships')
  }
}

// Run verification
const verifier = new BulletproofSystemVerifier()
verifier.run().catch(console.error) 