'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Mail, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Activity,
  Download,
  Zap,
  Settings,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncStats {
  totalFetched: number
  schedulingRelevant: number
  aiAnalyzed: boolean
  tasksCreated: number
  emails: Array<{
    id: string
    subject: string
    from: string
    date: string
    snippet: string
  }>
  statistics?: {
    emails_processed: number
    ai_suggestions: number
    auto_created_tasks: number
    high_confidence_conversions: number
  }
}

interface GmailAccount {
  id: string
  email: string
  provider: string
  is_active: boolean
  last_sync?: string
  expires_at?: string
}

interface GmailSyncManagerProps {
  className?: string
  showFullInterface?: boolean
  onSyncComplete?: (stats: SyncStats) => void
  compact?: boolean
}

export function GmailSyncManager({ 
  className, 
  showFullInterface = true, 
  onSyncComplete,
  compact = false 
}: GmailSyncManagerProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [accounts, setAccounts] = useState<GmailAccount[]>([])
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  
  useEffect(() => {
    fetchGmailAccounts()
  }, [])

  const fetchGmailAccounts = async () => {
    try {
      const response = await fetch('/api/user/email-accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
        if (data.accounts?.length > 0) {
          setLastSyncTime(data.accounts[0].last_sync)
        }
      }
    } catch (err) {
      console.error('Error fetching Gmail accounts:', err)
    }
  }

  const handleConnectGmail = async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/gmail/connect', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Gmail')
      }
      
      // Redirect to Gmail OAuth
      window.location.href = data.authUrl
    } catch (err) {
      console.error('Error connecting Gmail:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect Gmail')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSyncEmails = async (enableAI = true, maxResults = 50) => {
    if (accounts.length === 0) {
      setError('No Gmail account connected. Please connect your Gmail account first.')
      return
    }

    setIsSyncing(true)
    setError(null)
    setSyncStats(null)
    
    try {
      const response = await fetch('/api/gmail/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxResults,
          enableAI,
          query: 'in:inbox'
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync emails')
      }
      
      setSyncStats(data)
      setLastSyncTime(new Date().toISOString())
      
      // Update accounts to reflect new sync time
      await fetchGmailAccounts()
      
      onSyncComplete?.(data)
    } catch (err) {
      console.error('Error syncing emails:', err)
      setError(err instanceof Error ? err.message : 'Failed to sync emails')
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never'
    
    const now = new Date()
    const syncDate = new Date(lastSync)
    const diffMs = now.getTime() - syncDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    
    return syncDate.toLocaleDateString()
  }

  const hasActiveConnection = accounts.some(acc => acc.is_active)

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {hasActiveConnection ? (
          <>
            <Button
              onClick={() => handleSyncEmails(true, 25)}
              disabled={isSyncing}
              size="sm"
              variant="outline"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Last: {formatLastSync(lastSyncTime)}
            </span>
          </>
        ) : (
          <Button
            onClick={handleConnectGmail}
            disabled={isConnecting}
            size="sm"
          >
            {isConnecting ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Connect Gmail
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Integration
            </CardTitle>
            <CardDescription>
              Connect and sync your Gmail account to enable AI-powered email processing
            </CardDescription>
          </div>
          {hasActiveConnection && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        {accounts.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg">
            <Mail className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">No Gmail Account Connected</h3>
            <p className="text-sm text-gray-600 mb-4">
              Connect your Gmail account to start processing emails for scheduling and task creation.
            </p>
            <Button onClick={handleConnectGmail} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Gmail
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected Account Info */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{accounts[0].email}</p>
                  <p className="text-sm text-gray-500">
                    Last sync: {formatLastSync(lastSyncTime)}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => window.open('/dashboard/settings', '_blank')}
                variant="ghost"
                size="sm"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            {/* Sync Controls */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Sync Options</h4>
              
              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={() => handleSyncEmails(true, 50)}
                  disabled={isSyncing}
                  className="justify-start"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Full Sync with AI Analysis
                  <span className="ml-auto text-xs opacity-75">(50 emails)</span>
                </Button>
                
                <Button
                  onClick={() => handleSyncEmails(false, 25)}
                  disabled={isSyncing}
                  variant="outline"
                  className="justify-start"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Quick Sync (No AI)
                  <span className="ml-auto text-xs opacity-75">(25 emails)</span>
                </Button>
              </div>
            </div>

            {/* Sync Progress */}
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 animate-pulse text-blue-600" />
                  <span className="text-sm font-medium">Syncing emails...</span>
                </div>
                <Progress value={65} className="h-2" />
                <p className="text-xs text-gray-500">
                  Fetching emails from Gmail and processing with AI...
                </p>
              </div>
            )}

            {/* Sync Results */}
            {syncStats && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Sync Complete!
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-700 font-medium">
                      {syncStats.totalFetched} emails fetched
                    </p>
                    <p className="text-xs text-green-600">
                      {syncStats.schedulingRelevant} with scheduling content
                    </p>
                  </div>
                  
                  {syncStats.statistics && (
                    <div>
                      <p className="text-sm text-green-700 font-medium">
                        {syncStats.statistics.auto_created_tasks} tasks created
                      </p>
                      <p className="text-xs text-green-600">
                        {syncStats.statistics.ai_suggestions} AI suggestions
                      </p>
                    </div>
                  )}
                </div>

                {syncStats.emails.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-green-600 mb-2">Recent emails:</p>
                    <div className="space-y-1">
                      {syncStats.emails.slice(0, 3).map((email) => (
                        <p key={email.id} className="text-xs text-green-700 truncate">
                          • {email.subject}
                        </p>
                      ))}
                      {syncStats.emails.length > 3 && (
                        <p className="text-xs text-green-600">
                          ...and {syncStats.emails.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showFullInterface && hasActiveConnection && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Auto-sync every 15 minutes</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('/dashboard/automation', '_blank')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Configure
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
} 