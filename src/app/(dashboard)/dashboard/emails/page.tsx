'use client'

import { useState, useEffect } from 'react'
import { ModernEmailInterface } from '@/components/email/ModernEmailInterface'
import { ManualEmailSync } from '@/components/email/ManualEmailSync'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Settings, Zap } from 'lucide-react'

export default function EmailsPage() {
  const [activeTab, setActiveTab] = useState('emails')

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8 bg-gray-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emails</h1>
          <p className="text-gray-600">
            Manage your emails and AI-powered task creation
          </p>
        </div>
      </div>

      {/* Tabs for different email functions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Viewer
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Sync & AI Process
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emails" className="space-y-4">
          <ModernEmailInterface />
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <ManualEmailSync />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Email Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Email automation settings will be available here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}