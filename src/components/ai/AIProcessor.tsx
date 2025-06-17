'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface AIStats {
  totalSuggestions: number
  pendingSuggestions: number
  approvedSuggestions: number
  averageConfidence: number
}

interface AIProcessorProps {
  hasEmailsToProcess: boolean
}

export function AIProcessor({ hasEmailsToProcess }: AIProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [stats, setStats] = useState<AIStats>({
    totalSuggestions: 0,
    pendingSuggestions: 0,
    approvedSuggestions: 0,
    averageConfidence: 0
  })
  const [lastResult, setLastResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ai/process')
      const data = await response.json()
      
      if (response.ok) {
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching AI stats:', error)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 45000) // Update every 45 seconds
    return () => clearInterval(interval)
  }, [])

  const handleProcessWithAI = async () => {
    try {
      setIsProcessing(true)
      setError(null)
      
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxItems: 20
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process with AI')
      }
      
      setLastResult(data)
      await fetchStats() // Refresh stats after processing
    } catch (error) {
      console.error('Error processing with AI:', error)
      setError(error instanceof Error ? error.message : 'Failed to process with AI')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">AI Processing</h3>
          <Button 
            onClick={handleProcessWithAI} 
            disabled={isProcessing || !hasEmailsToProcess}
            size="sm"
            variant="primary"
          >
            {isProcessing ? 'Processing...' : 'Analyze with AI'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalSuggestions}</div>
            <div className="text-xs text-gray-500">Total Suggestions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingSuggestions}</div>
            <div className="text-xs text-gray-500">Pending Review</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approvedSuggestions}</div>
            <div className="text-xs text-gray-500">Approved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(stats.averageConfidence * 100)}%</div>
            <div className="text-xs text-gray-500">Avg Confidence</div>
          </div>
        </div>

        {/* Last Processing Result */}
        {lastResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Latest AI Analysis</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Processed {lastResult.processed} emails</p>
              <p>• Generated {lastResult.suggestions} new suggestions</p>
              {lastResult.errors > 0 && (
                <p>• {lastResult.errors} processing errors</p>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-1">AI Processing Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Status Information */}
        {!hasEmailsToProcess && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-1">Ready for AI Analysis</h4>
            <p className="text-sm text-gray-600">
              Process emails first to have content available for AI analysis.
            </p>
          </div>
        )}

        {/* AI Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Uses OpenAI GPT-4 for intelligent content analysis</p>
          <p>• Extracts meetings, tasks, deadlines, and reminders</p>
          <p>• Provides confidence scores for each suggestion</p>
          <p>• Learns from your feedback to improve accuracy</p>
        </div>
      </CardContent>
    </Card>
  )
}