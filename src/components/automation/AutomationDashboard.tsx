'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/switch'
import { 
  Settings,
  PlayCircle,
  PauseCircle,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Zap,
  BarChart3
} from 'lucide-react'

interface AutomationSettings {
  enabled: boolean
  autoCreateTasks: boolean
  confidenceThreshold: number
  autoScheduleTasks: boolean
  dailyProcessing: boolean
  webhookProcessing: boolean
  maxEmailsPerDay: number
}

interface AutomationStats {
  totalEmailsProcessed: number
  totalTasksCreated: number
  totalUsersProcessed: number
  automationRuns: number
  lastRunTime: string | null
}

export function AutomationDashboard() {
  const [settings, setSettings] = useState<AutomationSettings | null>(null)
  const [stats, setStats] = useState<AutomationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/automation/settings')
      const data = await response.json()
      
      if (response.ok) {
        setSettings(data.settings)
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError('Failed to fetch automation settings')
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/automation/daily-process')
      const data = await response.json()
      
      if (response.ok) {
        setStats(data.statistics)
      }
    } catch (error) {
      console.error('Failed to fetch automation stats:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchSettings(), fetchStats()])
      setIsLoading(false)
    }
    
    loadData()
  }, [])

  const updateSetting = async (key: keyof AutomationSettings, value: any) => {
    if (!settings) return

    const updatedSettings = { ...settings, [key]: value }
    
    try {
      const response = await fetch('/api/automation/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      })

      if (response.ok) {
        setSettings(updatedSettings)
      } else {
        const data = await response.json()
        setError(data.error)
      }
    } catch (error) {
      setError('Failed to update settings')
    }
  }

  const runTest = async (testType: string) => {
    setIsTesting(true)
    setTestResults(null)
    
    try {
      const response = await fetch(`/api/automation/settings/test?test=${testType}`, {
        method: 'POST'
      })
      
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      setTestResults({
        success: false,
        error: 'Test failed to execute'
      })
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings?.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                {settings?.enabled ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium">Automation Status</p>
                <p className="text-xs text-muted-foreground">
                  {settings?.enabled ? 'Active' : 'Paused'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Tasks Created</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalTasksCreated || 0} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Automation Runs</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.automationRuns || 0} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Last Run</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.lastRunTime ? new Date(stats.lastRunTime).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Settings
          </CardTitle>
          <CardDescription>
            Configure how AI processes your emails and creates tasks automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Enable/Disable */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Enable Automation</h4>
              <p className="text-sm text-muted-foreground">
                Master switch for all automated email processing and task creation
              </p>
            </div>
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={(value) => updateSetting('enabled', value)}
            />
          </div>

          {/* Settings Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-Create Tasks</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically create tasks from high-confidence AI suggestions
                  </p>
                </div>
                <Switch
                  checked={settings?.autoCreateTasks || false}
                  onCheckedChange={(value) => updateSetting('autoCreateTasks', value)}
                  disabled={!settings?.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-Schedule Tasks</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically schedule created tasks on your calendar
                  </p>
                </div>
                <Switch
                  checked={settings?.autoScheduleTasks || false}
                  onCheckedChange={(value) => updateSetting('autoScheduleTasks', value)}
                  disabled={!settings?.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Daily Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    Run automated processing daily at 9 AM
                  </p>
                </div>
                <Switch
                  checked={settings?.dailyProcessing || false}
                  onCheckedChange={(value) => updateSetting('dailyProcessing', value)}
                  disabled={!settings?.enabled}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Confidence Threshold</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Minimum AI confidence for auto-creating tasks ({Math.round((settings?.confidenceThreshold || 0.7) * 100)}%)
                </p>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.1"
                  value={settings?.confidenceThreshold || 0.7}
                  onChange={(e) => updateSetting('confidenceThreshold', parseFloat(e.target.value))}
                  className="w-full"
                  disabled={!settings?.enabled}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Emails Per Day</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Limit automated processing to prevent overload
                </p>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={settings?.maxEmailsPerDay || 50}
                  onChange={(e) => updateSetting('maxEmailsPerDay', parseInt(e.target.value))}
                  className="w-full px-3 py-1 border rounded text-sm"
                  disabled={!settings?.enabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Test Automation
          </CardTitle>
          <CardDescription>
            Test your automation settings with real data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => runTest('email-processing')}
              disabled={isTesting || !settings?.enabled}
              size="sm"
              variant="outline"
            >
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Test Email Processing
            </Button>
            <Button
              onClick={() => runTest('task-scheduling')}
              disabled={isTesting || !settings?.enabled}
              size="sm"
              variant="outline"
            >
              Test Task Scheduling
            </Button>
          </div>

          {testResults && (
            <div className={`p-4 rounded-lg border ${testResults.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {testResults.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <h4 className={`font-medium ${testResults.success ? 'text-green-800' : 'text-red-800'}`}>
                  Test Results
                </h4>
              </div>
              <p className={`text-sm ${testResults.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResults.message}
              </p>
              {testResults.results && (
                <div className="mt-2 text-sm text-gray-700">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(testResults.results, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}