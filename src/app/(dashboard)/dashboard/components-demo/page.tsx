'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectOption } from '@/components/ui/Select'
import { Modal, ModalHeader, ModalContent, ModalFooter, ConfirmDialog } from '@/components/ui/Modal'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { LoadingSpinner, LoadingOverlay, Progress, Skeleton, SkeletonCard } from '@/components/ui/Loading'
import { MonthlyCalendar, WeeklyCalendar, DailyCalendar } from '@/components/ui/Calendar'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const sampleEvents = [
  {
    id: '1',
    title: 'Team Standup',
    start: new Date(2024, 11, 18, 9, 0),
    end: new Date(2024, 11, 18, 9, 30),
    color: 'blue',
    type: 'meeting' as const,
    aiGenerated: true
  },
  {
    id: '2',
    title: 'Project Review',
    start: new Date(2024, 11, 18, 14, 0),
    end: new Date(2024, 11, 18, 15, 0),
    color: 'purple',
    type: 'meeting' as const
  },
  {
    id: '3',
    title: 'Client Call',
    start: new Date(2024, 11, 19, 10, 0),
    end: new Date(2024, 11, 19, 11, 0),
    color: 'green',
    type: 'event' as const
  }
]

const selectOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1', description: 'First option' },
  { value: 'option2', label: 'Option 2', description: 'Second option' },
  { value: 'option3', label: 'Option 3', description: 'Third option', disabled: true },
  { 
    value: 'option4', 
    label: 'Option with Icon', 
    icon: <span className="text-primary">🚀</span>,
    description: 'Option with icon'
  },
]

function ComponentsDemoContent() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(30)
  const [selectedCalendarView, setSelectedCalendarView] = useState<'month' | 'week' | 'day'>('month')
  
  const { success, error, warning, info } = useToast()

  const handleToastTest = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        success('Success!', 'This is a success message')
        break
      case 'error':
        error('Error!', 'This is an error message')
        break
      case 'warning':
        warning('Warning!', 'This is a warning message')
        break
      case 'info':
        info('Info!', 'This is an info message')
        break
    }
  }

  const handleLoadingDemo = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsLoading(false)
    success('Loading Complete', 'Demo loading finished!')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">UI Components Demo</h1>
        <p className="mt-2 text-gray-600">
          Showcase of all the enhanced UI components for B Free.AI scheduling application.
        </p>
      </div>

      {/* Form Components */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Form Components</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Text Input"
              placeholder="Enter some text..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helpText="This is a help text"
            />
            
            <Input
              label="Email Input"
              type="email"
              placeholder="email@example.com"
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
            
            <Input
              label="Password Input"
              type="password"
              placeholder="Enter password"
              error="Password must be at least 8 characters"
              variant="error"
            />
            
            <Input
              label="Success Input"
              placeholder="Valid input"
              variant="success"
            />
          </div>

          <Select
            label="Single Select"
            options={selectOptions}
            value={selectedValues[0] || ''}
            onValueChange={(value) => setSelectedValues([value as string])}
            placeholder="Choose an option..."
            searchable
            clearable
          />

          <Select
            label="Multi Select"
            options={selectOptions}
            value={selectedValues}
            onValueChange={(value) => setSelectedValues(value as string[])}
            placeholder="Choose multiple options..."
            multiple
            searchable
            clearable
          />
        </CardContent>
      </Card>

      {/* Button Variants */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Buttons & Actions</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          
          <div className="mt-4 space-x-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>

          <div className="mt-4 space-x-4">
            <Button onClick={() => setIsModalOpen(true)}>
              Open Modal
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmOpen(true)}
            >
              Confirm Dialog
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Toast Notifications */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Toast Notifications</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              onClick={() => handleToastTest('success')}
              className="text-success-600"
            >
              Success Toast
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleToastTest('error')}
              className="text-error-600"
            >
              Error Toast
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleToastTest('warning')}
              className="text-warning-600"
            >
              Warning Toast
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleToastTest('info')}
              className="text-info-600"
            >
              Info Toast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Loading States</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
          </div>

          <Button onClick={handleLoadingDemo} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Test Loading'}
          </Button>

          <LoadingOverlay isLoading={isLoading} message="Processing your request...">
            <div className="bg-gray-100 p-8 rounded-lg text-center">
              <p>This content will be overlaid with loading spinner when button is clicked</p>
            </div>
          </LoadingOverlay>

          <div>
            <label className="block text-sm font-medium mb-2">Progress Example</label>
            <Progress value={progress} showLabel />
            <div className="mt-2 space-x-2">
              <Button size="sm" onClick={() => setProgress(Math.max(0, progress - 20))}>
                Decrease
              </Button>
              <Button size="sm" onClick={() => setProgress(Math.min(100, progress + 20))}>
                Increase
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-4">Skeleton Loading</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton rows={3} />
              <SkeletonCard />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Components */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Calendar Views</h2>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant={selectedCalendarView === 'month' ? 'primary' : 'outline'}
                onClick={() => setSelectedCalendarView('month')}
              >
                Month
              </Button>
              <Button 
                size="sm" 
                variant={selectedCalendarView === 'week' ? 'primary' : 'outline'}
                onClick={() => setSelectedCalendarView('week')}
              >
                Week
              </Button>
              <Button 
                size="sm" 
                variant={selectedCalendarView === 'day' ? 'primary' : 'outline'}
                onClick={() => setSelectedCalendarView('day')}
              >
                Day
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedCalendarView === 'month' && (
            <MonthlyCalendar
              events={sampleEvents}
              onDateClick={(date) => info('Date Clicked', date.toLocaleDateString())}
              onEventClick={(event) => info('Event Clicked', event.title)}
            />
          )}
          
          {selectedCalendarView === 'week' && (
            <WeeklyCalendar
              events={sampleEvents}
              onDateClick={(date) => info('Time Slot Clicked', date.toLocaleString())}
              onEventClick={(event) => info('Event Clicked', event.title)}
            />
          )}
          
          {selectedCalendarView === 'day' && (
            <DailyCalendar
              date={new Date()}
              events={sampleEvents}
              onEventClick={(event) => info('Event Clicked', event.title)}
            />
          )}
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Badges & Status</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader onClose={() => setIsModalOpen(false)}>
          <h3 className="text-lg font-semibold">Example Modal</h3>
        </ModalHeader>
        <ModalContent>
          <p className="text-gray-600">
            This is an example modal dialog. It can contain any content including forms, 
            images, or other components.
          </p>
          <div className="mt-4">
            <Input 
              label="Sample Input"
              placeholder="Type something..."
            />
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsModalOpen(false)}>
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => success('Confirmed!', 'Action was confirmed')}
        title="Confirm Action"
        message="Are you sure you want to perform this action? This cannot be undone."
        variant="warning"
        confirmText="Yes, Continue"
        cancelText="Cancel"
      />
    </div>
  )
}

export default function ComponentsDemoPage() {
  return (
    <ToastProvider>
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <ComponentsDemoContent />
        </div>
      </DashboardLayout>
    </ToastProvider>
  )
}