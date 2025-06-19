'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/ui/Loading'
import { User, Mail, Calendar, Bell, Shield, Palette, Plus, ExternalLink, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailAccount {
  id: string
  email: string
  provider: string
  status: 'connected' | 'disconnected' | 'error'
  last_sync: string
}

interface CalendarData {
  id: string
  name: string
  provider: string
  status: 'connected' | 'syncing' | 'error'
  last_sync: string
  sync_enabled: boolean
}

interface UserPreferences {
  id: string
  user_id: string
  timezone: string
  email_notifications: boolean
  meeting_reminders: boolean
  ai_suggestions: boolean
  theme: 'light' | 'dark' | 'system'
  default_meeting_duration: number
  working_hours_start: string
  working_hours_end: string
}

interface SettingsClientProps {
  user: any
  emailAccounts: EmailAccount[]
  calendars: CalendarData[]
  preferences: UserPreferences | null
}

export function SettingsClient({ user, emailAccounts, calendars, preferences }: SettingsClientProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [formData, setFormData] = useState({
    full_name: user.user_metadata?.full_name || '',
    timezone: preferences?.timezone || 'America/Los_Angeles',
    email_notifications: preferences?.email_notifications ?? true,
    meeting_reminders: preferences?.meeting_reminders ?? true,
    ai_suggestions: preferences?.ai_suggestions ?? true,
    theme: preferences?.theme || 'system',
    default_meeting_duration: preferences?.default_meeting_duration || 30,
    working_hours_start: preferences?.working_hours_start || '09:00',
    working_hours_end: preferences?.working_hours_end || '17:00'
  })

  const handleSaveGeneral = async () => {
    setLoading(true)
    try {
      // Save user profile and preferences
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        // Show success feedback
        console.log('Settings saved successfully')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectGmail = async () => {
    try {
      const response = await fetch('/api/gmail/connect', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Gmail')
      }
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl
    } catch (error) {
      console.error('Error connecting Gmail:', error)
      // Could add user-facing error handling here
    }
  }

  const connectCalendar = async () => {
    try {
      const response = await fetch('/api/calendar/connect', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect calendar')
      }
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl
    } catch (error) {
      console.error('Error connecting calendar:', error)
      // Could add user-facing error handling here
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your account details and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter your full name" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={user.email}
                disabled 
                className="bg-neutral-50 text-neutral-500"
              />
              <p className="text-xs text-neutral-500">
                Email cannot be changed. Contact support if you need to update this.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Time Zone</Label>
              <select 
                id="timezone" 
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            {/* Working Hours */}
            <div className="space-y-2">
              <Label>Working Hours</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time" className="text-sm text-neutral-600">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.working_hours_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, working_hours_start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end-time" className="text-sm text-neutral-600">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.working_hours_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, working_hours_end: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-duration">Default Meeting Duration (minutes)</Label>
              <select 
                id="meeting-duration" 
                value={formData.default_meeting_duration}
                onChange={(e) => setFormData(prev => ({ ...prev, default_meeting_duration: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>

            <Button onClick={handleSaveGeneral} disabled={loading}>
              {loading && <LoadingSpinner size="xs" className="mr-2" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="integrations" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Manage your email and calendar integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email Accounts */}
            <div className="space-y-3">
              <h4 className="font-medium text-neutral-900">Email Accounts</h4>
              {emailAccounts.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-neutral-200 rounded-lg">
                  <Mail className="h-8 w-8 text-neutral-400 mx-auto mb-3" />
                  <h5 className="font-medium text-neutral-900 mb-2">No email accounts connected</h5>
                  <p className="text-sm text-neutral-600 mb-4">
                    Connect your Gmail account to start analyzing emails for scheduling opportunities.
                  </p>
                  <Button onClick={connectGmail} variant="default">
                    <Mail className="h-4 w-4 mr-2" />
                    Connect Gmail
                  </Button>
                </div>
              ) : (
                emailAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-neutral-500" />
                      <div>
                        <p className="font-medium">{account.provider}</p>
                        <p className="text-sm text-neutral-500">{account.email}</p>
                        {account.last_sync && (
                          <p className="text-xs text-neutral-400">
                            Last sync: {new Date(account.last_sync).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          account.status === 'connected' && "bg-green-50 text-green-700 border-green-200",
                          account.status === 'error' && "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        {account.status === 'connected' && '✅ Connected'}
                        {account.status === 'error' && '❌ Error'}
                        {account.status === 'disconnected' && '⏸️ Disconnected'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calendar Integrations */}
            <div className="space-y-3">
              <h4 className="font-medium text-neutral-900">Calendar Integrations</h4>
              {calendars.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-neutral-200 rounded-lg">
                  <Calendar className="h-8 w-8 text-neutral-400 mx-auto mb-3" />
                  <h5 className="font-medium text-neutral-900 mb-2">No calendars connected</h5>
                  <p className="text-sm text-neutral-600 mb-4">
                    Connect your Google Calendar to view events and schedule meetings seamlessly.
                  </p>
                  <Button onClick={connectCalendar} variant="default">
                    <Calendar className="h-4 w-4 mr-2" />
                    Connect Google Calendar
                  </Button>
                </div>
              ) : (
                calendars.map((calendar) => (
                  <div key={calendar.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-neutral-500" />
                      <div>
                        <p className="font-medium">{calendar.name}</p>
                        <p className="text-sm text-neutral-500">{calendar.provider}</p>
                        {calendar.last_sync && (
                          <p className="text-xs text-neutral-400">
                            Last sync: {new Date(calendar.last_sync).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          calendar.status === 'connected' && "bg-green-50 text-green-700 border-green-200",
                          calendar.status === 'syncing' && "bg-blue-50 text-blue-700 border-blue-200",
                          calendar.status === 'error' && "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        {calendar.status === 'connected' && '✅ Connected'}
                        {calendar.status === 'syncing' && '🔄 Syncing'}
                        {calendar.status === 'error' && '❌ Error'}
                      </Badge>
                      <Switch checked={calendar.sync_enabled} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add New Integration */}
            {(emailAccounts.length > 0 || calendars.length > 0) && (
              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  {emailAccounts.length === 0 && (
                    <Button onClick={connectGmail} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Gmail
                    </Button>
                  )}
                  {calendars.length === 0 && (
                    <Button onClick={connectCalendar} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Calendar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose how and when you want to be notified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-neutral-500">Receive email updates about your schedule</p>
                </div>
                <Switch 
                  checked={formData.email_notifications}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, email_notifications: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Meeting Reminders</p>
                  <p className="text-sm text-neutral-500">Get notified before meetings start</p>
                </div>
                <Switch 
                  checked={formData.meeting_reminders}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, meeting_reminders: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">AI Suggestions</p>
                  <p className="text-sm text-neutral-500">Notify when AI finds scheduling opportunities</p>
                </div>
                <Switch 
                  checked={formData.ai_suggestions}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ai_suggestions: checked }))}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button onClick={handleSaveGeneral} disabled={loading}>
                {loading && <LoadingSpinner size="xs" className="mr-2" />}
                Save Notification Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>
              Keep your account secure and manage access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">Security Features Coming Soon</h4>
                  <p className="text-sm text-amber-700 mb-3">
                    Password changes and two-factor authentication are currently managed through Supabase Auth.
                    Advanced security features will be available in a future update.
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" disabled>
                      <Shield className="h-4 w-4 mr-2" />
                      Change Password (Coming Soon)
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      <Shield className="h-4 w-4 mr-2" />
                      Enable 2FA (Coming Soon)
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="space-y-3">
              <h4 className="font-medium">Account Information</h4>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-700">Account Created</p>
                    <p className="text-sm text-neutral-600">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-700">Last Sign In</p>
                    <p className="text-sm text-neutral-600">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appearance" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how B Free.AI looks for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={formData.theme === 'light' ? 'default' : 'outline'} 
                  className="justify-start"
                  onClick={() => setFormData(prev => ({ ...prev, theme: 'light' }))}
                >
                  <div className="w-4 h-4 bg-white border rounded mr-2" />
                  Light
                </Button>
                <Button 
                  variant={formData.theme === 'dark' ? 'default' : 'outline'} 
                  className="justify-start"
                  onClick={() => setFormData(prev => ({ ...prev, theme: 'dark' }))}
                >
                  <div className="w-4 h-4 bg-gray-900 rounded mr-2" />
                  Dark
                </Button>
                <Button 
                  variant={formData.theme === 'system' ? 'default' : 'outline'} 
                  className="justify-start"
                  onClick={() => setFormData(prev => ({ ...prev, theme: 'system' }))}
                >
                  <div className="w-4 h-4 bg-gradient-to-br from-white to-gray-900 rounded mr-2" />
                  System
                </Button>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button onClick={handleSaveGeneral} disabled={loading}>
                {loading && <LoadingSpinner size="xs" className="mr-2" />}
                Save Appearance Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
} 