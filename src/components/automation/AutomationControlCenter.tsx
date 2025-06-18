'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  Play, 
  Pause, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  Brain,
  AlertCircle,
  Plus,
  X,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutomationSettings {
  enabled: boolean
  autoCreateTasks: boolean
  confidenceThreshold: number
  autoScheduleTasks: boolean
  dailyProcessing: boolean
  webhookProcessing: boolean
  maxEmailsPerDay: number
  categories: string[]
  excludedSenders: string[]
  keywordFilters: string[]
  processingTimeWindow: {
    start: string
    end: string
  }
  prioritySettings: {
    urgentKeywords: string[]
    importantSenders: string[]
    highPriorityDomains: string[]
  }
  notificationSettings: {
    emailOnTaskCreation: boolean
    emailOnErrors: boolean
    dailySummary: boolean
    weeklyReport: boolean
  }
}

interface AutomationControlCenterProps {
  className?: string
}

interface TestResult {
  success: boolean
  testResults?: {
    passes: boolean
    reasons: string[]
    recommendations: string[]
  }
  priorityCalculation?: {
    finalPriority: string
    score: number
    factors: string[]
  }
  scheduleValidation?: {
    isValid: boolean
    duration: number
    recommendations: string[]
  }
  error?: string
}

export function AutomationControlCenter({ className }: AutomationControlCenterProps) {
  const [settings, setSettings] = useState<AutomationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [newSender, setNewSender] = useState('')
  const [newDomain, setNewDomain] = useState('')

  // Load automation settings
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/automation/settings')
      const data = await response.json()
      
      if (data.success) {
        setSettings(data.settings)
      } else {
        setError(data.error || 'Failed to load settings')
      }
    } catch (err) {
      setError('Network error loading settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch('/api/automation/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      const data = await response.json()
      
      if (!data.success) {
        setError(data.error || 'Failed to save settings')
      }
    } catch (err) {
      setError('Network error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const testFilters = async () => {
    if (!settings) return

    try {
      setTesting(true)
      setTestResults(null)
      
      const testEmail = {
        subject: 'Team Meeting Tomorrow',
        from: 'manager@company.com',
        body: 'Let\'s schedule a meeting for tomorrow at 2pm to discuss the project deadline.',
        received_at: new Date().toISOString()
      }

      const response = await fetch('/api/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-filters',
          testData: { email: testEmail, settings }
        })
      })
      
      const data = await response.json()
      setTestResults(data)
    } catch (err) {
      setTestResults({ success: false, error: 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  const testPriority = async () => {
    if (!settings) return

    try {
      setTesting(true)
      
      const testEmail = {
        subject: 'URGENT: Critical Bug Fix Needed ASAP',
        from: 'ceo@company.com',
        body: 'We have a critical issue that needs immediate attention. Please prioritize this task.'
      }

      const response = await fetch('/api/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-priority',
          testData: { email: testEmail, settings }
        })
      })
      
      const data = await response.json()
      setTestResults(data)
    } catch (err) {
      setTestResults({ success: false, error: 'Priority test failed' })
    } finally {
      setTesting(false)
    }
  }

  const validateSchedule = async () => {
    if (!settings) return

    try {
      setTesting(true)
      
      const response = await fetch('/api/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate-schedule',
          testData: { settings }
        })
      })
      
      const data = await response.json()
      setTestResults(data)
    } catch (err) {
      setTestResults({ success: false, error: 'Schedule validation failed' })
    } finally {
      setTesting(false)
    }
  }

  const updateSettings = (updates: Partial<AutomationSettings>) => {
    if (!settings) return
    setSettings({ ...settings, ...updates })
  }

  const addKeyword = () => {
    if (!settings || !newKeyword.trim()) return
    updateSettings({
      keywordFilters: [...settings.keywordFilters, newKeyword.trim()]
    })
    setNewKeyword('')
  }

  const removeKeyword = (index: number) => {
    if (!settings) return
    updateSettings({
      keywordFilters: settings.keywordFilters.filter((_, i) => i !== index)
    })
  }

  const addSender = () => {
    if (!settings || !newSender.trim()) return
    updateSettings({
      excludedSenders: [...settings.excludedSenders, newSender.trim()]
    })
    setNewSender('')
  }

  const removeSender = (index: number) => {
    if (!settings) return
    updateSettings({
      excludedSenders: settings.excludedSenders.filter((_, i) => i !== index)
    })
  }

  const addDomain = () => {
    if (!settings || !newDomain.trim()) return
    updateSettings({
      prioritySettings: {
        ...settings.prioritySettings,
        highPriorityDomains: [...settings.prioritySettings.highPriorityDomains, newDomain.trim()]
      }
    })
    setNewDomain('')
  }

  const removeDomain = (index: number) => {
    if (!settings) return
    updateSettings({
      prioritySettings: {
        ...settings.prioritySettings,
        highPriorityDomains: settings.prioritySettings.highPriorityDomains.filter((_, i) => i !== index)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Failed to load automation settings'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            settings.enabled ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
          )}>
            {settings.enabled ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Automation Control Center</h2>
            <p className="text-gray-600">
              {settings.enabled ? 'AI automation is active' : 'AI automation is paused'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadSettings}
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving}
            size="sm"
          >
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="priority">Priority</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Core Automation Settings
              </CardTitle>
              <CardDescription>
                Control how the AI processes your emails and creates tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Automation</Label>
                  <div className="text-sm text-gray-600">
                    Master switch for all AI automation features
                  </div>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Create Tasks</Label>
                  <div className="text-sm text-gray-600">
                    Automatically create tasks from high-confidence suggestions
                  </div>
                </div>
                <Switch
                  checked={settings.autoCreateTasks}
                  onCheckedChange={(checked) => updateSettings({ autoCreateTasks: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Confidence Threshold</Label>
                <div className="px-3">
                  <Slider
                    value={[settings.confidenceThreshold * 100]}
                    onValueChange={([value]) => updateSettings({ confidenceThreshold: value / 100 })}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>0%</span>
                  <span className="font-medium">{Math.round(settings.confidenceThreshold * 100)}%</span>
                  <span>100%</span>
                </div>
                <div className="text-sm text-gray-600">
                  Only suggestions above this confidence level will auto-create tasks
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Schedule Tasks</Label>
                  <div className="text-sm text-gray-600">
                    Automatically schedule tasks to your calendar
                  </div>
                </div>
                <Switch
                  checked={settings.autoScheduleTasks}
                  onCheckedChange={(checked) => updateSettings({ autoScheduleTasks: checked })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Processing Window Start</Label>
                  <Input
                    type="time"
                    value={settings.processingTimeWindow.start}
                    onChange={(e) => updateSettings({
                      processingTimeWindow: {
                        ...settings.processingTimeWindow,
                        start: e.target.value
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Processing Window End</Label>
                  <Input
                    type="time"
                    value={settings.processingTimeWindow.end}
                    onChange={(e) => updateSettings({
                      processingTimeWindow: {
                        ...settings.processingTimeWindow,
                        end: e.target.value
                      }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Emails Per Day</Label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={settings.maxEmailsPerDay}
                  onChange={(e) => updateSettings({ maxEmailsPerDay: parseInt(e.target.value) || 50 })}
                />
                <div className="text-sm text-gray-600">
                  Limit daily email processing to prevent overwhelming the system
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Email on Task Creation</Label>
                <Switch
                  checked={settings.notificationSettings.emailOnTaskCreation}
                  onCheckedChange={(checked) => updateSettings({
                    notificationSettings: {
                      ...settings.notificationSettings,
                      emailOnTaskCreation: checked
                    }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Email on Errors</Label>
                <Switch
                  checked={settings.notificationSettings.emailOnErrors}
                  onCheckedChange={(checked) => updateSettings({
                    notificationSettings: {
                      ...settings.notificationSettings,
                      emailOnErrors: checked
                    }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Daily Summary</Label>
                <Switch
                  checked={settings.notificationSettings.dailySummary}
                  onCheckedChange={(checked) => updateSettings({
                    notificationSettings: {
                      ...settings.notificationSettings,
                      dailySummary: checked
                    }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Weekly Report</Label>
                <Switch
                  checked={settings.notificationSettings.weeklyReport}
                  onCheckedChange={(checked) => updateSettings({
                    notificationSettings: {
                      ...settings.notificationSettings,
                      weeklyReport: checked
                    }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Filters</CardTitle>
              <CardDescription>
                Emails must contain these keywords to be processed by AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add keyword..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                />
                <Button onClick={addKeyword} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.keywordFilters.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {keyword}
                    <button onClick={() => removeKeyword(index)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Excluded Senders</CardTitle>
              <CardDescription>
                Emails from these sender patterns will be ignored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., noreply@, marketing@"
                  value={newSender}
                  onChange={(e) => setNewSender(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSender()}
                />
                <Button onClick={addSender} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.excludedSenders.map((sender, index) => (
                  <Badge key={index} variant="outline" className="gap-1">
                    {sender}
                    <button onClick={() => removeSender(index)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="priority" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Priority Keywords</CardTitle>
              <CardDescription>
                Keywords that indicate urgent or high-priority tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="urgent, asap, critical, emergency, deadline"
                value={settings.prioritySettings.urgentKeywords.join(', ')}
                onChange={(e) => updateSettings({
                  prioritySettings: {
                    ...settings.prioritySettings,
                    urgentKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                  }
                })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Important Senders</CardTitle>
              <CardDescription>
                Email addresses that should be treated as high priority
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="ceo@company.com, manager@company.com"
                value={settings.prioritySettings.importantSenders.join(', ')}
                onChange={(e) => updateSettings({
                  prioritySettings: {
                    ...settings.prioritySettings,
                    importantSenders: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }
                })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>High Priority Domains</CardTitle>
              <CardDescription>
                Domains that automatically get high priority treatment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="company.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addDomain()}
                />
                <Button onClick={addDomain} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.prioritySettings.highPriorityDomains.map((domain, index) => (
                  <Badge key={index} variant="default" className="gap-1">
                    {domain}
                    <button onClick={() => removeDomain(index)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Automation Settings
              </CardTitle>
              <CardDescription>
                Test your settings with sample data to ensure they work as expected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={testFilters}
                  disabled={testing}
                  className="h-20 flex-col"
                >
                  <Mail className="h-6 w-6 mb-2" />
                  Test Email Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={testPriority}
                  disabled={testing}
                  className="h-20 flex-col"
                >
                  <AlertCircle className="h-6 w-6 mb-2" />
                  Test Priority Rules
                </Button>
                <Button
                  variant="outline"
                  onClick={validateSchedule}
                  disabled={testing}
                  className="h-20 flex-col"
                >
                  <Clock className="h-6 w-6 mb-2" />
                  Validate Schedule
                </Button>
              </div>

              {testing && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Running tests...
                </div>
              )}

              {testResults && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {testResults.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      Test Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {testResults.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{testResults.error}</AlertDescription>
                      </Alert>
                    )}

                    {testResults.testResults && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {testResults.testResults.passes ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className="font-medium">
                            Email {testResults.testResults.passes ? 'passes' : 'fails'} filter test
                          </span>
                        </div>
                        <div className="space-y-1">
                          {testResults.testResults.reasons.map((reason, index) => (
                            <div key={index} className="text-sm text-gray-600">• {reason}</div>
                          ))}
                        </div>
                        {testResults.testResults.recommendations.length > 0 && (
                          <div className="space-y-1">
                            <div className="font-medium text-sm">Recommendations:</div>
                            {testResults.testResults.recommendations.map((rec, index) => (
                              <div key={index} className="text-sm text-blue-600">• {rec}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {testResults.priorityCalculation && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            testResults.priorityCalculation.finalPriority === 'urgent' ? 'destructive' :
                            testResults.priorityCalculation.finalPriority === 'high' ? 'default' :
                            testResults.priorityCalculation.finalPriority === 'medium' ? 'secondary' : 'outline'
                          }>
                            {testResults.priorityCalculation.finalPriority.toUpperCase()} PRIORITY
                          </Badge>
                          <span className="text-sm text-gray-600">
                            Score: {testResults.priorityCalculation.score}/100
                          </span>
                        </div>
                        <div className="space-y-1">
                          {testResults.priorityCalculation.factors.map((factor, index) => (
                            <div key={index} className="text-sm text-gray-600">• {factor}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {testResults.scheduleValidation && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {testResults.scheduleValidation.isValid ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className="font-medium">
                            Schedule {testResults.scheduleValidation.isValid ? 'is valid' : 'has issues'}
                          </span>
                          {testResults.scheduleValidation.isValid && (
                            <Badge variant="outline">
                              {testResults.scheduleValidation.duration}h processing window
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          {testResults.scheduleValidation.recommendations.map((rec, index) => (
                            <div key={index} className="text-sm text-gray-600">• {rec}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}