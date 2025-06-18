import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json({ 
        error: 'Start and end dates are required' 
      }, { status: 400 })
    }

    const startDate = new Date(start)
    const endDate = new Date(end)
    const supabase = await createClient()

    // Get all days in the range
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    
    // Get tasks for the entire period
    const { data: tasks } = await supabase
      .from('task_overview')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (!tasks) {
      return NextResponse.json({
        success: true,
        trend: days.map(day => ({
          date: day.toISOString(),
          completed: 0,
          total: 0,
          efficiency: 0
        }))
      })
    }

    // Group tasks by day
    const trendData = days.map(day => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      
      const dayTasks = tasks.filter(task => {
        const taskDate = new Date(task.created_at)
        return taskDate >= dayStart && taskDate <= dayEnd
      })
      
      const completedTasks = dayTasks.filter(task => task.status === 'completed')
      const total = dayTasks.length
      const completed = completedTasks.length
      const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0
      
      return {
        date: day.toISOString(),
        completed,
        total,
        efficiency
      }
    })

    // Also get tasks scheduled for each day (not just created)
    const scheduledTrendData = await Promise.all(
      days.map(async (day) => {
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        
        const { data: scheduledTasks } = await supabase
          .from('task_overview')
          .select('*')
          .eq('user_id', user.id)
          .gte('scheduled_start', dayStart.toISOString())
          .lte('scheduled_start', dayEnd.toISOString())
        
        const total = scheduledTasks?.length || 0
        const completed = scheduledTasks?.filter(task => task.status === 'completed').length || 0
        const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0
        
        return {
          date: day.toISOString(),
          completed,
          total,
          efficiency
        }
      })
    )

    // Combine creation-based and schedule-based data, preferring schedule-based if available
    const combinedTrend = trendData.map((createdData, index) => {
      const scheduledData = scheduledTrendData[index]
      
      // Use scheduled data if it has tasks, otherwise fall back to created data
      if (scheduledData.total > 0) {
        return scheduledData
      }
      return createdData
    })

    return NextResponse.json({
      success: true,
      trend: combinedTrend
    })

  } catch (error) {
    console.error('Error in GET /api/tasks/trend:', error)
    return NextResponse.json({ 
      error: 'Failed to get task trends',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}