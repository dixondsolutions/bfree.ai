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

    // Get task statistics
    const { data: tasks } = await supabase
      .from('task_overview')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (!tasks) {
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

    const totalTasks = tasks.length
    const completedTasks = tasks.filter(task => task.status === 'completed').length
    const pendingTasks = tasks.filter(task => task.status === 'pending').length
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length
    const overdueTasks = tasks.filter(task => task.is_overdue).length
    const aiGeneratedTasks = tasks.filter(task => task.ai_generated).length

    // Calculate average completion time for completed tasks
    const completedTasksWithTimes = tasks.filter(task => 
      task.status === 'completed' && 
      task.completed_at && 
      task.created_at
    )
    
    const averageCompletionTime = completedTasksWithTimes.length > 0
      ? completedTasksWithTimes.reduce((sum, task) => {
          const createdAt = new Date(task.created_at)
          const completedAt = new Date(task.completed_at)
          return sum + (completedAt.getTime() - createdAt.getTime())
        }, 0) / completedTasksWithTimes.length / (1000 * 60 * 60) // Convert to hours
      : 0

    // Calculate productivity score
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    const onTimeRate = overdueTasks === 0 ? 100 : Math.max(0, 100 - (overdueTasks / totalTasks) * 100)
    const productivityScore = Math.round((completionRate * 0.7) + (onTimeRate * 0.3))

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