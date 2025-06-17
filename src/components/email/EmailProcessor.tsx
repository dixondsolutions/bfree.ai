'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface ProcessingStatus {
  pending: number
  processing: number
  completed: number
  failed: number
}

interface EmailProcessorProps {
  emailAccountConnected: boolean
}

export function EmailProcessor({ emailAccountConnected }: EmailProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<ProcessingStatus>({ pending: 0, processing: 0, completed: 0, failed: 0 })
  const [lastResult, setLastResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/gmail/fetch')
      const data = await response.json()
      
      if (response.ok) {
        setStatus(data.status)
      }
    } catch (error) {
      console.error('Error fetching status:', error)
    }
  }

  useEffect(() => {
    if (emailAccountConnected) {
      fetchStatus()
      const interval = setInterval(fetchStatus, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [emailAccountConnected])

  const handleProcessEmails = async () => {
    try {
      setIsProcessing(true)
      setError(null)
      
      const response = await fetch('/api/gmail/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxResults: 50
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process emails')
      }
      
      setLastResult(data)
      await fetchStatus() // Refresh status after processing
    } catch (error) {
      console.error('Error processing emails:', error)
      setError(error instanceof Error ? error.message : 'Failed to process emails')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!emailAccountConnected) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Email Processing</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">📧</span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Connect Gmail First</h4>
            <p className="text-sm text-gray-500">
              Connect your Gmail account to start processing emails for scheduling information.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Email Processing</h3>
          <Button 
            onClick={handleProcessEmails} 
            disabled={isProcessing}
            size="sm"
          >
            {isProcessing ? 'Processing...' : 'Process Emails'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Processing Status */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{status.pending}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{status.processing}</div>
            <div className="text-xs text-gray-500">Processing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{status.completed}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{status.failed}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
        </div>

        {/* Last Processing Result */}
        {lastResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Latest Processing Result</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>• Fetched {lastResult.totalFetched} emails</p>
              <p>• Found {lastResult.schedulingRelevant} scheduling-relevant emails</p>
              {lastResult.emails?.length > 0 && (
                <p>• Ready for AI analysis</p>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-1">Processing Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Processing Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Automatically scans for scheduling-related content</p>
          <p>• Processes unread emails and recent messages</p>
          <p>• Filters based on keywords like &apos;meeting&apos;, &apos;schedule&apos;, &apos;appointment&apos;</p>
        </div>
      </CardContent>
    </Card>
  )
}