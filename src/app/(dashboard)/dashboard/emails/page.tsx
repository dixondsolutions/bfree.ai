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
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emails</h1>
            <p className="text-gray-600 text-sm">
              Manage your emails and AI-powered task creation
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Tabs for different email functions */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-shrink-0 px-6 pt-4">
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-white border border-gray-200">
              <TabsTrigger value="emails" className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                Email Viewer
              </TabsTrigger>
              <TabsTrigger value="sync" className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4" />
                Sync & AI Process
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 text-sm">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="emails" className="h-full m-0 p-0">
              <ModernEmailInterface />
            </TabsContent>

            <TabsContent value="sync" className="h-full m-0 p-6">
              <ManualEmailSync />
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0 p-6">
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
          </div>
        </Tabs>
      </div>
    </div>
  )
}