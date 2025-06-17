'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface MeetingRequest {
  title: string
  description?: string
  duration: number
  priority: 'low' | 'medium' | 'high'
  preferredTimes?: string[]
  deadline?: string
  location?: string
  attendees?: string[]
  requiresPrep?: boolean
  prepTime?: number
}

interface SuggestedSlot {
  start: string
  end: string
  confidence: number
  reasoning: string
  conflicts: string[]
  prepTime?: {
    start: string
    end: string
  }
}

export function SchedulingAssistant() {
  const [request, setRequest] = useState<MeetingRequest>({
    title: '',
    duration: 30,
    priority: 'medium'
  })
  const [suggestions, setSuggestions] = useState<SuggestedSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFindTimes = async () => {
    if (!request.title.trim()) {
      setError('Please enter a meeting title')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'suggest',
          ...request,
          attendees: request.attendees?.filter(email => email.trim())
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to find meeting times')
      }
      
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Error finding meeting times:', error)
      setError(error instanceof Error ? error.message : 'Failed to find meeting times')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAutoSchedule = async () => {
    if (!request.title.trim()) {
      setError('Please enter a meeting title')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'auto-schedule',
          ...request,
          attendees: request.attendees?.filter(email => email.trim())
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule meeting')
      }
      
      if (data.success) {
        setSuggestions([])
        setRequest({ title: '', duration: 30, priority: 'medium' })
        // Show success message or redirect
      }
    } catch (error) {
      console.error('Error auto-scheduling meeting:', error)
      setError(error instanceof Error ? error.message : 'Failed to schedule meeting')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success'
    if (confidence >= 0.6) return 'warning'
    return 'default'
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">AI Scheduling Assistant</h3>
        <p className="text-sm text-gray-600">
          Let AI find the optimal times for your meetings based on your schedule and preferences.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meeting Request Form */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              value={request.title}
              onChange={(e) => setRequest({ ...request, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Weekly team standup"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <select
                value={request.duration}
                onChange={(e) => setRequest({ ...request, duration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={request.priority}
                onChange={(e) => setRequest({ ...request, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={request.description || ''}
              onChange={(e) => setRequest({ ...request, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Brief description of the meeting..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button 
            onClick={handleFindTimes} 
            disabled={isLoading || !request.title.trim()}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? 'Finding...' : 'Find Times'}
          </Button>
          <Button 
            onClick={handleAutoSchedule} 
            disabled={isLoading || !request.title.trim()}
            variant="primary"
            className="flex-1"
          >
            {isLoading ? 'Scheduling...' : 'Auto Schedule'}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-1">Scheduling Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Suggestions Display */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Suggested Times</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatDateTime(suggestion.start)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Duration: {request.duration} minutes
                      </div>
                    </div>
                    <Badge variant={getConfidenceColor(suggestion.confidence)}>
                      {Math.round(suggestion.confidence * 100)}% match
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {suggestion.reasoning}
                  </div>
                  
                  {suggestion.conflicts.length > 0 && (
                    <div className="text-xs text-yellow-600">
                      Potential conflicts: {suggestion.conflicts.join(', ')}
                    </div>
                  )}
                  
                  {suggestion.prepTime && (
                    <div className="text-xs text-blue-600">
                      Prep time: {formatDateTime(suggestion.prepTime.start)} - {formatDateTime(suggestion.prepTime.end)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Info */}
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
          <p>• AI analyzes your calendar for optimal scheduling</p>
          <p>• Considers working hours, buffer time, and preferences</p>
          <p>• Provides confidence scores for each suggestion</p>
          <p>• Auto-schedule picks the best time and creates the event</p>
        </div>
      </CardContent>
    </Card>
  )
}