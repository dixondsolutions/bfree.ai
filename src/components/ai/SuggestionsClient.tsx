'use client'

import { useState, useEffect } from 'react'
import { SuggestionCard } from '@/components/ai/SuggestionCard'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AIAnalysisLoader, LoadingSpinner } from '@/components/ui/Loading'
import { PageGrid, PageSection } from '@/components/layout/PageLayout'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/Select'

interface Suggestion {
  id: string
  title: string
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'converted'
  suggestion_type: string
  confidence_score: number
  suggested_time: string | null
  created_at: string
  source_email_id: string
  feedback?: any
}

interface SuggestionsClientProps {
  initialSuggestions: Suggestion[]
}

export function SuggestionsClient({ initialSuggestions }: SuggestionsClientProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions)
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>(initialSuggestions)
  const [loading, setLoading] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'success' | 'error' | 'info'
    message: string
    timestamp: Date
  }>>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [processingStats, setProcessingStats] = useState<{
    emailsProcessed: number
    suggestionsGenerated: number
    isProcessing: boolean
  }>({ emailsProcessed: 0, suggestionsGenerated: 0, isProcessing: false })

  // Check AI processing status
  useEffect(() => {
    const checkProcessingStatus = async () => {
      try {
        const response = await fetch('/api/ai/process')
        if (response.ok) {
          const data = await response.json()
          setProcessingStats(data)
          setAiProcessing(data.isProcessing)
        }
      } catch (error) {
        console.error('Error checking processing status:', error)
        setAiProcessing(false)
      }
    }

    checkProcessingStatus()
    
    // Poll every 5 seconds if processing
    const interval = setInterval(() => {
      if (aiProcessing) {
        checkProcessingStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [aiProcessing])

  // Filter suggestions based on status
  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredSuggestions(suggestions)
    } else {
      setFilteredSuggestions(suggestions.filter(s => s.status === filterStatus))
    }
  }, [suggestions, filterStatus])

  // Auto-refresh suggestions periodically
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      if (!loading && !bulkProcessing && processingIds.size === 0) {
        refreshSuggestions()
      }
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [autoRefresh, loading, bulkProcessing, processingIds.size])

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    }
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep only 5 latest
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }

  const refreshSuggestions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/suggestions')
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions)
      }
    } catch (error) {
      console.error('Error refreshing suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (suggestionId: string) => {
    setProcessingIds(prev => new Set(prev).add(suggestionId))
    
    try {
      // First, approve the suggestion
      const approveResponse = await fetch('/api/ai/suggestions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId,
          status: 'approved'
        }),
      })

      if (!approveResponse.ok) {
        throw new Error('Failed to approve suggestion')
      }

      // Then automatically create a task from the approved suggestion
      const createTaskResponse = await fetch('/api/ai/create-task?action=from-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId,
          customizations: {} // Use default values from suggestion
        }),
      })

      if (createTaskResponse.ok) {
        const taskResult = await createTaskResponse.json()
        
        // Update the suggestion status to show it's been converted
        setSuggestions(prev => 
          prev.map(s => 
            s.id === suggestionId 
              ? { ...s, status: 'converted' as const }
              : s
          )
        )

        // Show success notification
        addNotification('success', `✅ Task created: ${taskResult.task.title}`)
        if (taskResult.task.auto_scheduled) {
          addNotification('info', `📅 Scheduled for: ${new Date(taskResult.task.schedule_result.scheduled_start).toLocaleString()}`)
        } else {
          addNotification('info', `⏳ Task created but needs manual scheduling`)
        }
      } else {
        // If task creation fails, still show approved status
        setSuggestions(prev => 
          prev.map(s => 
            s.id === suggestionId 
              ? { ...s, status: 'approved' as const }
              : s
          )
        )
        addNotification('error', 'Failed to create task, but suggestion was approved')
      }
    } catch (error) {
      console.error('Error in approval process:', error)
      addNotification('error', 'Failed to process suggestion approval')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(suggestionId)
        return next
      })
    }
  }

  const handleReject = async (suggestionId: string) => {
    setProcessingIds(prev => new Set(prev).add(suggestionId))
    
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId,
          status: 'rejected'
        }),
      })

      if (response.ok) {
        setSuggestions(prev => 
          prev.map(s => 
            s.id === suggestionId 
              ? { ...s, status: 'rejected' as const }
              : s
          )
        )
      } else {
        console.error('Failed to reject suggestion')
      }
    } catch (error) {
      console.error('Error rejecting suggestion:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(suggestionId)
        return next
      })
    }
  }

  const generateMoreSuggestions = async () => {
    setLoading(true)
    setAiProcessing(true)
    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        // Refresh suggestions after processing
        await refreshSuggestions()
      }
    } catch (error) {
      console.error('Error generating suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkApprove = async () => {
    if (selectedSuggestions.size === 0) return
    
    setBulkProcessing(true)
    const suggestionIds = Array.from(selectedSuggestions)
    
    try {
      // Batch create tasks from selected suggestions
      const response = await fetch('/api/ai/create-task?action=batch-from-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionIds,
          bulkCustomizations: {
            // Can add default bulk settings here
          }
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update suggestions status to converted
        setSuggestions(prev => 
          prev.map(s => 
            selectedSuggestions.has(s.id) 
              ? { ...s, status: 'converted' as const }
              : s
          )
        )
        
        // Clear selection
        setSelectedSuggestions(new Set())
        
        addNotification('success', `✅ Created ${result.tasks.length} tasks from ${suggestionIds.length} suggestions`)
        
        // Show scheduling summary
        const autoScheduled = result.tasks.filter((t: any) => t.auto_scheduled).length
        if (autoScheduled > 0) {
          addNotification('info', `📅 ${autoScheduled} tasks were auto-scheduled`)
        }
        const needsScheduling = result.tasks.length - autoScheduled
        if (needsScheduling > 0) {
          addNotification('info', `⏳ ${needsScheduling} tasks need manual scheduling`)
        }
      } else {
        addNotification('error', 'Failed to bulk create tasks')
      }
    } catch (error) {
      console.error('Error in bulk approval:', error)
      addNotification('error', 'Bulk approval failed')
    } finally {
      setBulkProcessing(false)
    }
  }

  const toggleSuggestionSelection = (suggestionId: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev)
      if (next.has(suggestionId)) {
        next.delete(suggestionId)
      } else {
        next.add(suggestionId)
      }
      return next
    })
  }

  const selectAllPending = () => {
    const pendingIds = filteredSuggestions
      .filter(s => s.status === 'pending')
      .map(s => s.id)
    setSelectedSuggestions(new Set(pendingIds))
  }

  const clearSelection = () => {
    setSelectedSuggestions(new Set())
  }

  return (
    <>
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg shadow-lg border transition-all duration-300 ${
                notification.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : notification.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{notification.message}</span>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="ml-2 text-current opacity-50 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center space-x-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter suggestions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📊 All Suggestions</SelectItem>
            <SelectItem value="pending">⏳ Pending Review</SelectItem>
            <SelectItem value="approved">✅ Approved</SelectItem>
            <SelectItem value="converted">🎯 Converted to Tasks</SelectItem>
            <SelectItem value="rejected">❌ Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          size="default"
          onClick={refreshSuggestions}
          disabled={loading}
        >
          {loading ? (
            <LoadingSpinner size="xs" className="mr-2" />
          ) : (
            <span className="mr-2">🔄</span>
          )}
          Refresh
        </Button>
        <Button 
          variant="default" 
          size="default"
          onClick={generateMoreSuggestions}
          disabled={loading || aiProcessing}
        >
          <span className="mr-2">🤖</span>
          Generate More
        </Button>
        
        {/* Bulk Operations - Show when there are pending suggestions */}
        {filteredSuggestions.some(s => s.status === 'pending') && (
          <>
            <Button 
              variant="outline" 
              size="default"
              onClick={selectAllPending}
              disabled={bulkProcessing}
            >
              <span className="mr-2">☑️</span>
              Select All Pending
            </Button>
            
            {selectedSuggestions.size > 0 && (
              <>
                <Button 
                  variant="default" 
                  size="default"
                  onClick={handleBulkApprove}
                  disabled={bulkProcessing || selectedSuggestions.size === 0}
                >
                  <span className="mr-2">⚡</span>
                  {bulkProcessing ? 'Creating Tasks...' : `Approve & Create ${selectedSuggestions.size} Tasks`}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="default"
                  onClick={clearSelection}
                  disabled={bulkProcessing}
                >
                  Clear Selection
                </Button>
              </>
            )}
          </>
        )}
        
        {/* Auto-refresh toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-refresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="auto-refresh" className="text-sm text-gray-600">
            Auto-refresh
          </label>
        </div>
      </div>

      {/* AI Processing Status */}
      <PageSection title="AI Processing Status" description="Real-time analysis of your email content">
        <Card className="border border-neutral-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">AI Processing Status</h2>
              {aiProcessing ? (
                <LoadingSpinner size="xs" variant="primary" />
              ) : (
                <span className="text-success-600 text-sm font-medium">✅ Ready</span>
              )}
            </div>
            <p className="text-sm text-neutral-500 mt-1">Real-time analysis of your email content</p>
          </CardHeader>
          <CardContent>
            {aiProcessing ? (
              <AIAnalysisLoader />
            ) : (
              <div className="p-4 bg-success-50 rounded-lg border border-success-200">
                <div className="flex items-center space-x-3">
                  <span className="text-success-600 text-xl">✅</span>
                  <div>
                    <p className="text-sm font-medium text-success-900">
                      Analysis Complete
                    </p>
                    <p className="text-xs text-success-700">
                      Processed {processingStats.emailsProcessed} emails, generated {processingStats.suggestionsGenerated} suggestions
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {/* Suggestions Content */}
      {filteredSuggestions.length === 0 ? (
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-success-100 to-success-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-success-600 text-3xl">🤖</span>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              {filterStatus === 'all' ? 'No AI Suggestions Yet' : `No ${filterStatus} suggestions`}
            </h3>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              {filterStatus === 'all' 
                ? "Connect Gmail and process emails to start getting AI-powered scheduling suggestions. Our AI will analyze your emails and suggest optimal meeting times."
                : `No suggestions with status "${filterStatus}" found. Try adjusting the filter or generating more suggestions.`
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="default" size="default" onClick={generateMoreSuggestions} disabled={loading || aiProcessing}>
                <span className="mr-2">🚀</span>
                Start AI Analysis
              </Button>
              <Button variant="outline" size="default">
                <span className="mr-2">📎</span>
                View Setup Guide
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <PageSection title="Summary Stats">
            {/* Summary Stats */}
            <PageGrid columns={5}>
              <Card className="border border-neutral-200 hover:border-success-300 transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl">📊</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900">{suggestions.length}</div>
                  <div className="text-sm text-neutral-500">Total Suggestions</div>
                </CardContent>
              </Card>
              
              <Card className="border border-neutral-200 hover:border-warning-300 transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl">⏳</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900">
                    {suggestions.filter(s => s.status === 'pending').length}
                  </div>
                  <div className="text-sm text-neutral-500">Pending Review</div>
                </CardContent>
              </Card>
              
              <Card className="border border-neutral-200 hover:border-blue-300 transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl">✅</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900">
                    {suggestions.filter(s => s.status === 'approved').length}
                  </div>
                  <div className="text-sm text-neutral-500">Approved</div>
                </CardContent>
              </Card>
              
              <Card className="border border-neutral-200 hover:border-green-300 transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl">🎯</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900">
                    {suggestions.filter(s => s.status === 'converted').length}
                  </div>
                  <div className="text-sm text-neutral-500">Converted to Tasks</div>
                </CardContent>
              </Card>
              
              <Card className="border border-neutral-200 hover:border-error-300 transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-error-500 to-error-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl">🎯</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900">
                    {suggestions.length > 0 
                      ? Math.round((suggestions.reduce((sum, s) => sum + s.confidence_score, 0) / suggestions.length) * 100) 
                      : 0}%
                    </div>
                  <div className="text-sm text-neutral-500">Avg Confidence</div>
                </CardContent>
              </Card>
            </PageGrid>
          </PageSection>

          {/* Suggestions List */}
          <PageSection title="Recent Suggestions" headerActions={
            <div className="flex items-center space-x-2">
                <Badge className="bg-success-100 text-success-800 border-success-200">
                  <span className="mr-1">🤖</span>
                  AI Powered
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <span className="mr-1">⚡</span>
                  Real-time
                </Badge>
              </div>
            }>
            
            <div className="space-y-4">
              {filteredSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6">
                    {/* Selection checkbox for pending suggestions */}
                    {suggestion.status === 'pending' && (
                      <div className="mb-4 flex items-center">
                        <input
                          type="checkbox"
                          id={`select-${suggestion.id}`}
                          checked={selectedSuggestions.has(suggestion.id)}
                          onChange={() => toggleSuggestionSelection(suggestion.id)}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                          disabled={bulkProcessing || processingIds.has(suggestion.id)}
                        />
                        <label htmlFor={`select-${suggestion.id}`} className="ml-2 text-sm text-gray-600">
                          Include in bulk operations
                        </label>
                      </div>
                    )}
                    
                    <SuggestionCard
                      suggestion={suggestion}
                      onApprove={processingIds.has(suggestion.id) ? undefined : handleApprove}
                      onReject={processingIds.has(suggestion.id) ? undefined : handleReject}
                    />
                    {processingIds.has(suggestion.id) && (
                      <div className="mt-4 flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2 text-sm text-neutral-600">Processing...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </PageSection>
        </>
      )}
    </>
  )
} 