import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/database/utils'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { period = 'today', date } = body
    const targetDate = date ? new Date(date) : new Date()

    const supabase = await createClient()

    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'week':
        startDate = startOfWeek(targetDate)
        endDate = endOfWeek(targetDate)
        break
      case 'month':
        startDate = startOfMonth(targetDate)
        endDate = endOfMonth(targetDate)
        break
      default: // today
        startDate = startOfDay(targetDate)
        endDate = endOfDay(targetDate)
    }

    // Get task statistics using the new function that doesn't rely on task_overview
    const { data: statsResult, error: statsError } = await supabase
      .rpc('get_task_stats_for_period', {
        p_user_id: user.id,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

    if (statsError) {
      console.error('Error fetching task stats:', statsError)
      return NextResponse.json({
        success: true,
        stats: {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          aiGeneratedTasks: 0,
          averageCompletionTime: 0,
          productivityScore: 0
        },
        energyStats: {
          morningTasks: 0,
          afternoonTasks: 0,
          eveningTasks: 0,
          optimalEnergyTime: '09:00',
          energyEfficiency: 0
        }
      })
    }

    const stats = statsResult?.[0] || {
      total_tasks: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      in_progress_tasks: 0,
      overdue_tasks: 0,
      ai_generated_tasks: 0,
      average_completion_time_hours: 0,
      productivity_score: 0
    }

    const totalTasks = stats.total_tasks
    const completedTasks = stats.completed_tasks
    const pendingTasks = stats.pending_tasks
    const inProgressTasks = stats.in_progress_tasks
    const overdueTasks = stats.overdue_tasks
    const aiGeneratedTasks = stats.ai_generated_tasks
    const averageCompletionTime = stats.average_completion_time_hours
    const productivityScore = stats.productivity_score

    // Get tasks for energy analysis
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Energy statistics
    const morningTasks = tasks.filter(task => {
      if (!task.scheduled_start) return false
      const hour = new Date(task.scheduled_start).getHours()
      return hour >= 6 && hour < 12
    }).length

    const afternoonTasks = tasks.filter(task => {
      if (!task.scheduled_start) return false
      const hour = new Date(task.scheduled_start).getHours()
      return hour >= 12 && hour < 18
    }).length

    const eveningTasks = tasks.filter(task => {
      if (!task.scheduled_start) return false
      const hour = new Date(task.scheduled_start).getHours()
      return hour >= 18 && hour < 24
    }).length

    // Determine optimal energy time based on completion rates
    const completedMorning = tasks.filter(task => {
      if (!task.scheduled_start || task.status !== 'completed') return false
      const hour = new Date(task.scheduled_start).getHours()
      return hour >= 6 && hour < 12
    }).length

    const completedAfternoon = tasks.filter(task => {
      if (!task.scheduled_start || task.status !== 'completed') return false
      const hour = new Date(task.scheduled_start).getHours()
      return hour >= 12 && hour < 18
    }).length

    const completedEvening = tasks.filter(task => {
      if (!task.scheduled_start || task.status !== 'completed') return false
      const hour = new Date(task.scheduled_start).getHours()
      return hour >= 18 && hour < 24
    }).length

    const morningRate = morningTasks > 0 ? (completedMorning / morningTasks) * 100 : 0
    const afternoonRate = afternoonTasks > 0 ? (completedAfternoon / afternoonTasks) * 100 : 0
    const eveningRate = eveningTasks > 0 ? (completedEvening / eveningTasks) * 100 : 0

    let optimalEnergyTime = '09:00'
    if (afternoonRate > morningRate && afternoonRate > eveningRate) {
      optimalEnergyTime = '14:00'
    } else if (eveningRate > morningRate && eveningRate > afternoonRate) {
      optimalEnergyTime = '20:00'
    }

    const energyEfficiency = Math.round(Math.max(morningRate, afternoonRate, eveningRate))

    return NextResponse.json({
      success: true,
      stats: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        aiGeneratedTasks,
        averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
        productivityScore
      },
      energyStats: {
        morningTasks,
        afternoonTasks,
        eveningTasks,
        optimalEnergyTime,
        energyEfficiency
      }
    })

  } catch (error) {
    console.error('Error in POST /api/tasks/stats:', error)
    return NextResponse.json({ 
      error: 'Failed to get task statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}