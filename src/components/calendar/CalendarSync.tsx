'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface SyncStatus {
  calendars: number
  lastSync: string | null
  status: string
}

export function CalendarSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    calendars: 0,
    lastSync: null,
    status: 'ready'
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/calendar/sync')
      const data = await response.json()
      
      if (response.ok) {
        setSyncStatus(data)
      }
    } catch (error) {
      console.error('Error fetching sync status:', error)
    }
  }

  useEffect(() => {
    fetchSyncStatus()
  }, [])

  const handleSync = async (type: 'full' | 'calendars' | 'events' = 'full') => {
    try {
      setIsSyncing(true)
      setError(null)
      
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync calendars')
      }
      
      setLastResult(data)
      await fetchSyncStatus() // Refresh status after sync
    } catch (error) {
      console.error('Error syncing calendars:', error)
      setError(error instanceof Error ? error.message : 'Failed to sync calendars')
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Calendar Sync</h3>
          <Button 
            onClick={() => handleSync('full')} 
            disabled={isSyncing}
            size="sm"
            variant="default"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{syncStatus.calendars}</div>
            <div className="text-xs text-gray-500">Calendars Connected</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700">
              {formatLastSync(syncStatus.lastSync)}
            </div>
            <div className="text-xs text-gray-500">Last Sync</div>
          </div>
        </div>

        {/* Sync Options */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Button 
              onClick={() => handleSync('calendars')} 
              disabled={isSyncing}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              Sync Calendar List
            </Button>
            <Button 
              onClick={() => handleSync('events')} 
              disabled={isSyncing}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              Sync Events
            </Button>
          </div>
        </div>

        {/* Last Sync Result */}
        {lastResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Sync Completed</h4>
            <div className="text-sm text-green-700 space-y-1">
              {lastResult.result?.synced && (
                <p>• Synced {lastResult.result.synced} events</p>
              )}
              {lastResult.result?.calendars && (
                <p>• Updated {lastResult.result.calendars} calendars</p>
              )}
              <p>• Completed at {new Date(lastResult.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-1">Sync Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-600">Sync Status:</span>
          <Badge variant={syncStatus.status === 'ready' ? 'secondary' : 'default'}>
            {syncStatus.status}
          </Badge>
        </div>

        {/* Sync Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Automatically syncs with Google Calendar</p>
          <p>• Two-way sync maintains data consistency</p>
          <p>• Events created here appear in your Google Calendar</p>
          <p>• Manual sync available for immediate updates</p>
        </div>
      </CardContent>
    </Card>
  )
}