'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  X, 
  Star, 
  Archive, 
  Trash2, 
  Reply, 
  ReplyAll, 
  Forward, 
  Calendar, 
  Brain, 
  Clock, 
  User, 
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Tag,
  Download,
  MoreHorizontal,
  Check,
  XIcon,
  Loader2,
  Plus,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Raw email data from API
interface RawEmailData {
  id: string
  gmail_id: string
  subject: string
  from_address: string
  from_name?: string
  to_address: string
  cc_addresses?: string[]
  bcc_addresses?: string[]
  content_text?: string
  content_html?: string
  snippet?: string
  received_at: string
  sent_at?: string
  is_unread: boolean
  is_starred: boolean
  has_attachments: boolean
  attachment_count?: number
  ai_analyzed: boolean
  has_scheduling_content?: boolean
  scheduling_keywords?: string[]
  labels?: string[]
  // Related data from joins
  tasks?: Array<{
    id: string
    title: string
    status: string
    priority: string
    ai_generated: boolean
    confidence_score: number
    created_at: string
  }>
  ai_suggestions?: Array<{
    id: string
    title: string
    description: string
    confidence_score: number
    status: string
    created_at: string
    suggestion_type: string
  }>
  email_attachments?: Array<{
    id: string
    filename: string
    mime_type: string
    size_bytes: number
  }>
}

// AI Analysis result
interface AIAnalysisResult {
  suggestions: Array<{
    id: string
    type: string
    title: string
    description: string
    confidence: number
    status: string
    reasoning?: string
    participants?: string[]
    location?: string
    duration?: number
    priority?: string
    created_at: string
  }>
  tasks_created: Array<{
    id: string
    title: string
    status: string
    priority: string
    confidence: number
    ai_generated: boolean
    created_at: string
  }>
  summary: {
    total_suggestions: number
    total_tasks_created: number
    avg_confidence: number
    high_confidence_suggestions: number
  }
}

interface EmailViewerProps {
  emailId: string | null
  isOpen: boolean
  onClose: () => void
}

export function EmailViewer({ emailId, isOpen, onClose }: EmailViewerProps) {
  const [email, setEmail] = useState<RawEmailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set())

  // Fetch email data when emailId changes
  useEffect(() => {
    if (!emailId || !isOpen) {
      setEmail(null)
      setAnalysisResult(null)
      return
    }

    const fetchEmail = async () => {
      setLoading(true)
      setError(null)
      try {
        console.log('Fetching email with ID:', emailId)
        const response = await fetch(`/api/emails/${emailId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch email')
        }
        
        console.log('Email data received:', data.email)
        setEmail(data.email)

        // If email is already analyzed, fetch analysis results
        if (data.email?.ai_analyzed) {
          fetchAnalysisResults()
        }
      } catch (err) {
        console.error('Error fetching email:', err)
        setError(err instanceof Error ? err.message : 'Failed to load email')
      } finally {
        setLoading(false)
      }
    }

    fetchEmail()
  }, [emailId, isOpen])

  const fetchAnalysisResults = async () => {
    if (!emailId) return
    
    try {
      const response = await fetch(`/api/emails/${emailId}/analysis`)
      const data = await response.json()
      
      if (response.ok) {
        setAnalysisResult(data.analysis)
      }
    } catch (err) {
      console.error('Error fetching analysis results:', err)
    }
  }

  // Mark email as read when opened
  useEffect(() => {
    if (email && email.is_unread) {
      fetch(`/api/emails/${email.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_unread: false })
      }).catch(console.error)
    }
  }, [email])

  const handleStarToggle = async () => {
    if (!email) return
    try {
      const response = await fetch(`/api/emails/${email.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_starred: !email.is_starred })
      })
      
      if (response.ok) {
        setEmail(prev => prev ? { ...prev, is_starred: !prev.is_starred } : null)
      }
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  const handleAIAnalysis = async () => {
    if (!email || analyzing) return
    
    setAnalyzing(true)
    try {
      // First, add email to processing queue
      const queueResponse = await fetch('/api/automation/process-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: email.id })
      })

      if (!queueResponse.ok) {
        throw new Error('Failed to queue email for processing')
      }

      // Then trigger AI processing
      const processResponse = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!processResponse.ok) {
        throw new Error('Failed to process email with AI')
      }

      // Fetch updated email data and analysis results
      const emailResponse = await fetch(`/api/emails/${email.id}`)
      const emailData = await emailResponse.json()
      
      if (emailResponse.ok) {
        setEmail(emailData.email)
      }

      // Fetch analysis results
      await fetchAnalysisResults()

    } catch (err) {
      console.error('Error during AI analysis:', err)
      setError(err instanceof Error ? err.message : 'AI analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleTaskApproval = async (suggestionId: string, approve: boolean) => {
    if (processingTasks.has(suggestionId)) return
    
    setProcessingTasks(prev => new Set(prev).add(suggestionId))
    
    try {
      if (approve) {
        // Create task from suggestion
        const response = await fetch('/api/ai/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestionId })
        })

        if (!response.ok) {
          throw new Error('Failed to create task')
        }

        const result = await response.json()
        console.log('Task created:', result)
      } else {
        // Decline suggestion
        const response = await fetch(`/api/ai/suggestions/${suggestionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'declined' })
        })

        if (!response.ok) {
          throw new Error('Failed to decline suggestion')
        }
      }

      // Refresh analysis results
      await fetchAnalysisResults()
      
    } catch (err) {
      console.error('Error processing task approval:', err)
    } finally {
      setProcessingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(suggestionId)
        return newSet
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-700 border-green-200'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  const parseEmailAddresses = (addressString: string) => {
    if (!addressString) return []
    return addressString.split(',').map(addr => {
      const match = addr.trim().match(/^(.+?)\s*<(.+)>$/)
      if (match) {
        return { name: match[1].trim(), email: match[2].trim() }
      }
      return { name: addr.trim(), email: addr.trim() }
    })
  }

  const renderEmailContent = () => {
    if (!email) return null

    // Try to render HTML content first, fallback to text
    const content = email.content_html || email.content_text || email.snippet || 'No content available'
    
    if (email.content_html) {
      return (
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )
    }
    
    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {content}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] p-0 gap-0">
        {loading ? (
          <>
            <DialogTitle className="sr-only">Loading Email</DialogTitle>
            <DialogDescription className="sr-only">Please wait while the email is being loaded</DialogDescription>
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading email...</p>
              </div>
            </div>
          </>
        ) : error ? (
          <>
            <DialogTitle className="sr-only">Email Load Error</DialogTitle>
            <DialogDescription className="sr-only">An error occurred while loading the email</DialogDescription>
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            </div>
          </>
        ) : email ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <DialogHeader className="border-b p-6 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl font-semibold mb-2 pr-8">
                    {email.subject || 'No Subject'}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Email from {email.from_name || email.from_address} received on {formatDate(email.received_at)}
                  </DialogDescription>
                  <div className="flex items-center gap-2 flex-wrap">
                    {email.ai_analyzed && (
                      <Badge variant="secondary" className="text-xs">
                        <Brain className="h-3 w-3 mr-1" />
                        AI Analyzed
                      </Badge>
                    )}
                    {email.has_scheduling_content && (
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        Scheduling Content
                      </Badge>
                    )}
                    {email.has_attachments && (
                      <Badge variant="outline" className="text-xs">
                        <Paperclip className="h-3 w-3 mr-1" />
                        {email.attachment_count || 1} Attachment{(email.attachment_count || 1) > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {email.labels?.map((label) => (
                      <Badge key={label} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStarToggle}
                    className={cn(
                      "h-8 w-8 p-0",
                      email.is_starred && "text-yellow-500"
                    )}
                  >
                    <Star className={cn("h-4 w-4", email.is_starred && "fill-current")} />
                  </Button>
                  <DialogClose asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </DialogHeader>

            {/* Email Details */}
            <div className="border-b p-6 py-4 bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{email.from_name || email.from_address}</div>
                    <div className="text-xs text-muted-foreground">{email.from_address}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">{formatDate(email.received_at)}</div>
                </div>
              </div>

              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">To: </span>
                  {parseEmailAddresses(email.to_address).map((recipient, index) => (
                    <span key={index}>
                      {recipient.name !== recipient.email ? `${recipient.name} <${recipient.email}>` : recipient.email}
                      {index < parseEmailAddresses(email.to_address).length - 1 && ', '}
                    </span>
                  ))}
                </div>
                {email.cc_addresses && email.cc_addresses.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">CC: </span>
                    {email.cc_addresses.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex">
              {/* Email Content */}
              <div className="flex-1 flex flex-col">
                {/* Action Bar */}
                <div className="border-b p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                      <Button variant="outline" size="sm">
                        <ReplyAll className="h-4 w-4 mr-2" />
                        Reply All
                      </Button>
                      <Button variant="outline" size="sm">
                        <Forward className="h-4 w-4 mr-2" />
                        Forward
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={email.ai_analyzed ? "secondary" : "default"}
                        size="sm"
                        onClick={handleAIAnalysis}
                        disabled={analyzing}
                      >
                        {analyzing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Brain className="h-4 w-4 mr-2" />
                        )}
                        {analyzing ? 'Analyzing...' : email.ai_analyzed ? 'Re-analyze' : 'AI Analysis'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <ScrollArea className="flex-1 p-6">
                  {renderEmailContent()}
                </ScrollArea>
              </div>

              {/* AI Analysis Sidebar */}
              {(email.ai_analyzed || analyzing) && (
                <div className="w-96 border-l bg-gray-50/50 flex flex-col">
                  <div className="p-4 border-b bg-white">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      AI Analysis
                    </h3>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    {analyzing ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-sm text-muted-foreground">Analyzing email content...</p>
                      </div>
                    ) : analysisResult ? (
                      <div className="space-y-4">
                        {/* Summary */}
                        <div className="bg-white rounded-lg p-4 border">
                          <h4 className="font-medium text-sm mb-2">Analysis Summary</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Suggestions:</span>
                              <div className="font-medium">{analysisResult.summary.total_suggestions}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tasks Created:</span>
                              <div className="font-medium">{analysisResult.summary.total_tasks_created}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg Confidence:</span>
                              <div className="font-medium">{Math.round(analysisResult.summary.avg_confidence * 100)}%</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">High Confidence:</span>
                              <div className="font-medium">{analysisResult.summary.high_confidence_suggestions}</div>
                            </div>
                          </div>
                        </div>

                        {/* AI Suggestions */}
                        {analysisResult.suggestions.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border">
                            <h4 className="font-medium text-sm mb-3">Suggested Tasks</h4>
                            <div className="space-y-3">
                              {analysisResult.suggestions.map((suggestion) => (
                                <div key={suggestion.id} className="border rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-sm">{suggestion.title}</h5>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {suggestion.description}
                                      </p>
                                    </div>
                                    <Badge className={cn("text-xs ml-2", getConfidenceColor(suggestion.confidence))}>
                                      {Math.round(suggestion.confidence * 100)}%
                                    </Badge>
                                  </div>
                                  
                                  {suggestion.status === 'pending' && (
                                    <div className="flex items-center gap-2 mt-3">
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="flex-1 h-8"
                                        onClick={() => handleTaskApproval(suggestion.id, true)}
                                        disabled={processingTasks.has(suggestion.id)}
                                      >
                                        {processingTasks.has(suggestion.id) ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <Check className="h-3 w-3 mr-1" />
                                            Approve
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 h-8"
                                        onClick={() => handleTaskApproval(suggestion.id, false)}
                                        disabled={processingTasks.has(suggestion.id)}
                                      >
                                        <XIcon className="h-3 w-3 mr-1" />
                                        Decline
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {suggestion.status === 'processed' && (
                                    <Badge variant="secondary" className="text-xs mt-2">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Task Created
                                    </Badge>
                                  )}
                                  
                                  {suggestion.status === 'declined' && (
                                    <Badge variant="outline" className="text-xs mt-2">
                                      <XIcon className="h-3 w-3 mr-1" />
                                      Declined
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Created Tasks */}
                        {analysisResult.tasks_created.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border">
                            <h4 className="font-medium text-sm mb-3">Created Tasks</h4>
                            <div className="space-y-2">
                              {analysisResult.tasks_created.map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-2 bg-green-50 rounded border">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{task.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {task.priority} priority • {Math.round(task.confidence * 100)}% confidence
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {task.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No analysis results available</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <DialogTitle className="sr-only">Email Dialog</DialogTitle>
            <DialogDescription className="sr-only">No email selected</DialogDescription>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}