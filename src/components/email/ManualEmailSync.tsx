'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Mail, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Zap,
  BarChart3
} from 'lucide-react'

interface SyncStats {
  totalMessages: number
  newEmails: number
  skippedDuplicates: number
  timestamp: string
}

interface ProcessingStats {
  emailsProcessed: number
  suggestionsCreated: number
  tasksCreated: number
  automationSettings: any
}

export function ManualEmailSync() {
  const [syncing, setSyncing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      setSyncStats(null)

      console.log('Starting manual email sync...')

      const response = await fetch('/api/gmail/sync-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          maxResults: 100
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (data.success) {
        setSyncStats(data.stats)
        console.log('Email sync completed:', data.stats)
        
        // Auto-trigger AI processing if we got new emails
        if (data.stats.newEmails > 0) {
          setTimeout(() => {
            handleAIProcessing()
          }, 1000)
        }
      } else {
        throw new Error(data.error || 'Sync failed')
      }

    } catch (err) {
      console.error('Email sync error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setSyncing(false)
    }
  }

  const handleAIProcessing = async () => {
    try {
      setProcessing(true)
      setError(null)

      console.log('Starting AI processing...')

      // Get auth token
      const token = localStorage.getItem('sb-auth-token') || 
                   document.cookie.split('; ')
                     .find(row => row.startsWith('sb-auth-token='))
                     ?.split('=')[1]

      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          maxEmails: 20
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (data.success) {
        setProcessingStats(data.stats)
        console.log('AI processing completed:', data.stats)
      } else {
        throw new Error(data.error || 'AI processing failed')
      }

    } catch (err) {
      console.error('AI processing error:', err)
      setError(err instanceof Error ? err.message : 'AI processing failed')
    } finally {
      setProcessing(false)
    }
  }

  const triggerEdgeFunction = async () => {
    try {
      setProcessing(true)
      setError(null)

      // Call the Supabase Edge Function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-email-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          maxEmails: 20
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (data.success) {
        setProcessingStats(data.stats)
        console.log('Edge function processing completed:', data.stats)
      } else {
        throw new Error(data.error || 'Edge function processing failed')
      }

    } catch (err) {
      console.error('Edge function error:', err)
      setError(err instanceof Error ? err.message : 'Edge function processing failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sync Emails */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Sync New Emails</h3>
              <p className="text-sm text-muted-foreground">
                Import the latest 100 emails from Gmail (skips duplicates)
              </p>
            </div>
            <Button 
              onClick={handleSync} 
              disabled={syncing || processing}
              variant="default"
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Sync Emails
                </>
              )}
            </Button>
          </div>

          {/* AI Processing */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">AI Analysis & Task Creation</h3>
              <p className="text-sm text-muted-foreground">
                Analyze emails and auto-create tasks using Supabase Edge Functions
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleAIProcessing} 
                disabled={syncing || processing}
                variant="outline"
              >
                {processing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Process (API)
                  </>
                )}
              </Button>
              <Button 
                onClick={triggerEdgeFunction} 
                disabled={syncing || processing}
                variant="default"
              >
                {processing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Process (Edge)
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Sync Stats */}
      {syncStats && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600 mb-3">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Email Sync Completed</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium text-green-700">{syncStats.totalMessages}</div>
                <div className="text-green-600">Total Messages</div>
              </div>
              <div>
                <div className="font-medium text-green-700">{syncStats.newEmails}</div>
                <div className="text-green-600">New Emails</div>
              </div>
              <div>
                <div className="font-medium text-green-700">{syncStats.skippedDuplicates}</div>
                <div className="text-green-600">Skipped Duplicates</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-green-600">
              Completed at {new Date(syncStats.timestamp).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Stats */}
      {processingStats && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-600 mb-3">
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">AI Processing Completed</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-700">{processingStats.emailsProcessed}</div>
                <div className="text-blue-600">Emails Processed</div>
              </div>
              <div>
                <div className="font-medium text-blue-700">{processingStats.suggestionsCreated}</div>
                <div className="text-blue-600">AI Suggestions</div>
              </div>
              <div>
                <div className="font-medium text-blue-700">{processingStats.tasksCreated}</div>
                <div className="text-blue-600">Tasks Created</div>
              </div>
            </div>
            
            {processingStats.automationSettings && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-xs text-blue-600 mb-2">Automation Settings:</div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={processingStats.automationSettings.autoCreateTasks ? 'default' : 'secondary'} className="text-xs">
                    Auto Create: {processingStats.automationSettings.autoCreateTasks ? 'On' : 'Off'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Threshold: {(processingStats.automationSettings.confidenceThreshold * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <h3 className="font-medium text-foreground mb-2">How it works:</h3>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5">1</div>
              <div>Click "Sync Emails" to import your latest Gmail messages</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5">2</div>
              <div>Use "Process (Edge)" to run AI analysis via Supabase Edge Functions</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5">3</div>
              <div>Tasks will be automatically created from high-confidence suggestions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 