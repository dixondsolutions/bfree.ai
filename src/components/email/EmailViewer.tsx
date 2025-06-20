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
  ChevronRight,
  Sparkles,
  Target,
  ListTodo,
  Mail
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Database email structure
interface DatabaseEmail {
  id: string
  subject: string
  from_address: string
  from_name: string | null
  to_address: string
  cc_addresses: string[] | null
  bcc_addresses: string[] | null
  content_text: string | null
  content_html: string | null
  snippet: string | null
  labels: string[] | null
  received_at: string
  sent_at: string | null
  is_unread: boolean
  is_starred: boolean
  has_attachments: boolean
  attachment_count: number
  importance_level: 'low' | 'normal' | 'high'
  ai_analyzed: boolean
  ai_analysis_at: string | null
}

interface AISuggestion {
  id: string
  suggestion_type: 'meeting' | 'task' | 'deadline' | 'reminder'
  title: string
  description: string
  suggested_time: string | null
  confidence_score: number
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'converted' | 'auto_converted'
  priority: 'low' | 'medium' | 'high' | 'urgent' | null
  task_category: string | null
  estimated_duration: number | null
  suggested_due_date: string | null
  energy_level: number | null
  suggested_tags: string[] | null
  location: string | null
}

interface EmailViewerProps {
  emailId: string | null
  isOpen: boolean
  onClose: () => void
}

export const EmailViewer: React.FC<EmailViewerProps> = ({ emailId, isOpen, onClose }) => {
  console.log('EmailViewer props:', { emailId, isOpen });
  const [email, setEmail] = useState<DatabaseEmail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [isValidEmailId, setIsValidEmailId] = useState(false)

  // Validate email ID when props change
  useEffect(() => {
    const isValid = emailId && emailId.trim() !== '' && isOpen;
    setIsValidEmailId(!!isValid);
    
    if (isValid) {
      console.log('Valid email ID detected, fetching email:', emailId);
    } else {
      console.log('Invalid or missing email ID:', { emailId, isOpen });
      // Reset state when no valid email ID
      setEmail(null);
      setError(null);
      setSuggestions([]);
      setTasks([]);
    }
  }, [emailId, isOpen]);

  // Fetch email data and mark as read
  useEffect(() => {
    if (isValidEmailId && emailId) {
      fetchEmail()
      markAsRead()
    }
  }, [isValidEmailId, emailId])

  const markAsRead = async () => {
    if (!emailId) return
    
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_unread: false })
      })
    } catch (err) {
      console.error('Error marking email as read:', err)
    }
  }

  const fetchEmail = async () => {
    if (!emailId) return
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/emails/${emailId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch email')
      }
      
      const data = await response.json()
      setEmail(data.email)
      
      // Also fetch existing suggestions and tasks
      await Promise.all([
        fetchSuggestions(),
        fetchTasks()
      ])
      
    } catch (err) {
      console.error('Error fetching email:', err)
      
      // Enhanced error handling for email viewing
      let errorMessage = 'Failed to load email'
      if (err instanceof Error) {
        if (err.message.includes('not found')) {
          errorMessage = 'Email not found. It may have been deleted or not synced yet.'
        } else if (err.message.includes('Unauthorized')) {
          errorMessage = 'You do not have permission to view this email'
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error - please try again'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    if (!emailId) return
    
    try {
      const response = await fetch(`/api/ai/suggestions?email_id=${emailId}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
        setShowSuggestions(data.suggestions?.length > 0)
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err)
    }
  }

  const fetchTasks = async () => {
    if (!emailId) return
    
    try {
      setLoadingTasks(true)
      const response = await fetch(`/api/tasks?source_email_id=${emailId}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoadingTasks(false)
    }
  }

  const handleAIAnalysis = async () => {
    if (!email) return
    
    setIsAnalyzing(true)
    
    try {
      // First, queue the email for processing
      const queueResponse = await fetch('/api/automation/process-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          priority: 'high'
        })
      })
      
      if (!queueResponse.ok) {
        throw new Error('Failed to queue email for processing')
      }
      
      // Then trigger AI processing
      const processResponse = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_record_id: email.id,
          content: email.content_text || email.snippet,
          subject: email.subject,
          from: email.from_address,
          received_at: email.received_at
        })
      })
      
      if (!processResponse.ok) {
        throw new Error('Failed to process email with AI')
      }
      
      // Update email as analyzed
      await fetch(`/api/emails/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_analyzed: true,
          ai_analysis_at: new Date().toISOString()
        })
      })
      
      // Refresh suggestions and tasks
      await Promise.all([
        fetchSuggestions(),
        fetchTasks()
      ])
      
      // Update email state
      setEmail(prev => prev ? { ...prev, ai_analyzed: true, ai_analysis_at: new Date().toISOString() } : null)
      
    } catch (err) {
      console.error('Error analyzing email:', err)
      setError('Failed to analyze email. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSuggestionAction = async (suggestionId: string, action: 'approve' | 'decline') => {
    setProcessingTaskId(suggestionId)
    
    try {
      if (action === 'approve') {
        // Create task from suggestion
        const suggestion = suggestions.find(s => s.id === suggestionId)
        if (!suggestion) return
        
        const createTaskResponse = await fetch('/api/ai/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestion_id: suggestionId,
            title: suggestion.title,
            description: suggestion.description,
            category: suggestion.task_category || 'other',
            priority: suggestion.priority || 'medium',
            estimated_duration: suggestion.estimated_duration,
            due_date: suggestion.suggested_due_date,
            energy_level: suggestion.energy_level,
            tags: suggestion.suggested_tags,
            location: suggestion.location
          })
        })
        
        if (!createTaskResponse.ok) {
          throw new Error('Failed to create task')
        }
      }
      
      // Update suggestion status
      const updateResponse = await fetch(`/api/ai/suggestions/${suggestionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'approved' : 'rejected',
          feedback: {
            user_notes: action === 'decline' ? 'User declined suggestion' : 'User approved suggestion'
          }
        })
      })
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update suggestion')
      }
      
      // Refresh suggestions and tasks
      await Promise.all([
        fetchSuggestions(),
        fetchTasks()
      ])
      
    } catch (err) {
      console.error('Error processing suggestion:', err)
      setError(`Failed to ${action} suggestion. Please try again.`)
    } finally {
      setProcessingTaskId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getImportanceColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getSuggestionTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return Calendar
      case 'task': return ListTodo
      case 'deadline': return Clock
      case 'reminder': return AlertTriangle
      default: return Target
    }
  }

  const getSuggestionTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-purple-100 text-purple-800'
      case 'task': return 'bg-green-100 text-green-800'
      case 'deadline': return 'bg-red-100 text-red-800'
      case 'reminder': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full max-h-[90vh] p-0 gap-0">
        {!isValidEmailId ? (
          <>
            <DialogTitle className="sr-only">Loading Email</DialogTitle>
            <DialogDescription className="sr-only">Please wait while the email is being loaded</DialogDescription>
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                {isOpen && !emailId ? (
                  <>
                    <Loader2 className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading email...</p>
                  </>
                ) : (
                  <>
                    <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">No email selected</p>
                  </>
                )}
              </div>
            </div>
          </>
        ) : loading ? (
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
            <DialogTitle className="sr-only">Error Loading Email</DialogTitle>
            <DialogDescription className="sr-only">There was an error loading the email content</DialogDescription>
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchEmail} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          </>
        ) : email ? (
          <div className="flex h-full">
            {/* Main Email Content */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <DialogHeader className="border-b p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl font-semibold mb-2 pr-8">
                      {email.subject}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Email from {email.from_name || email.from_address} received on {formatDate(email.received_at)}
                    </DialogDescription>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {email.from_name && email.from_name !== 'Unknown Sender' ? (
                            <>
                              <span className="font-medium">{email.from_name}</span>
                              <span className="text-gray-500"> &lt;{email.from_address}&gt;</span>
                            </>
                          ) : (
                            <span className="font-medium">{email.from_address}</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {formatDate(email.received_at)}
                        </span>
                      </div>
                      <Badge className={cn("text-xs", getImportanceColor(email.importance_level))}>
                        {email.importance_level.toUpperCase()}
                      </Badge>
                      {email.is_unread && (
                        <Badge variant="secondary" className="text-xs">
                          UNREAD
                        </Badge>
                      )}
                      {email.has_attachments && (
                        <Badge variant="outline" className="text-xs">
                          <Paperclip className="h-3 w-3 mr-1" />
                          {email.attachment_count} attachment{email.attachment_count !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleAIAnalysis}
                      disabled={isAnalyzing}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI Analysis
                        </>
                      )}
                    </Button>
                    <DialogClose asChild>
                      <Button variant="ghost" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              </DialogHeader>

              {/* Email Content */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    {/* Recipients */}
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-muted-foreground w-12">To:</span>
                        <span>{email.to_address}</span>
                      </div>
                      {email.cc_addresses && email.cc_addresses.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-muted-foreground w-12">CC:</span>
                          <span>{email.cc_addresses.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    <Separator className="my-4" />

                    {/* Email Body */}
                    <div className="prose prose-sm max-w-none">
                      {email.content_html && email.content_html.trim() ? (
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: email.content_html
                              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts for security
                              .replace(/<link[^>]*>/gi, '') // Remove external stylesheets
                              .replace(/on\w+="[^"]*"/gi, '') // Remove inline event handlers
                          }}
                          className="email-content [&>*]:max-w-none [&_img]:max-w-full [&_img]:h-auto [&_table]:w-full [&_table]:border-collapse [&_a]:text-blue-600 [&_a]:underline [&_p]:mb-3 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic"
                        />
                      ) : email.content_text && email.content_text.trim() ? (
                        <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800 bg-white p-4 rounded border">
                          {email.content_text}
                        </div>
                      ) : email.snippet && email.snippet.trim() ? (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Mail className="h-5 w-5 text-blue-600" />
                            <p className="text-sm font-medium text-blue-800">Email Preview</p>
                          </div>
                          <p className="text-gray-700 italic leading-relaxed">{email.snippet}</p>
                          <p className="text-xs text-blue-600 mt-3">Full content may be available after email sync</p>
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                          <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Available</h3>
                          <p className="text-gray-600 mb-4">This email doesn't have readable content.</p>
                          <div className="text-xs text-gray-500 bg-white px-3 py-2 rounded inline-block">
                            Email ID: {email.id}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Action Bar */}
              <div className="border-t p-4">
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
                  <div className="flex-1" />
                  <Button variant="ghost" size="sm">
                    <Star className={cn("h-4 w-4", email.is_starred && "fill-yellow-400 text-yellow-400")} />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Analysis Sidebar */}
            <div className="w-96 border-l bg-muted/30 flex flex-col">
              <div className="p-4 border-b bg-background">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">AI Analysis</h3>
                  {email.ai_analyzed && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Analyzed
                    </Badge>
                  )}
                </div>
                {email.ai_analysis_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last analyzed: {formatDate(email.ai_analysis_at)}
                  </p>
                )}
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {/* Existing Tasks Section */}
                  {tasks.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-green-700 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Generated Tasks ({tasks.length})
                      </h4>
                      
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="border rounded-lg p-3 bg-green-50 border-green-200 space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                                  TASK
                                </Badge>
                                <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                                  {task.priority?.toUpperCase() || 'MEDIUM'}
                                </Badge>
                                {task.ai_generated && (
                                  <Badge variant="outline" className="text-xs">
                                    <Sparkles className="h-2 w-2 mr-1" />
                                    AI
                                  </Badge>
                                )}
                              </div>
                              <h5 className="font-medium text-sm mb-1">{task.title}</h5>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                              )}
                              
                              {/* Task Details */}
                              <div className="space-y-1 text-xs text-muted-foreground">
                                {task.estimated_duration && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{task.estimated_duration} minutes</span>
                                  </div>
                                )}
                                {task.due_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>Due: {formatDate(task.due_date)}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                    Status: {task.status || 'pending'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending Suggestions Section */}
                  {suggestions.length === 0 && tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">
                        {email.ai_analyzed 
                          ? "No actionable items found in this email."
                          : "Click 'AI Analysis' to generate actionable tasks from this email."
                        }
                      </p>
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-orange-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Pending Suggestions ({suggestions.length})
                      </h4>
                      
                      {suggestions.map((suggestion) => {
                        const IconComponent = getSuggestionTypeIcon(suggestion.suggestion_type)
                        const isProcessing = processingTaskId === suggestion.id
                        
                        return (
                          <div
                            key={suggestion.id}
                            className="border rounded-lg p-3 bg-background space-y-3"
                          >
                            <div className="flex items-start gap-2">
                              <IconComponent className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={cn("text-xs", getSuggestionTypeColor(suggestion.suggestion_type))}>
                                    {suggestion.suggestion_type.toUpperCase()}
                                  </Badge>
                                  {suggestion.priority && (
                                    <Badge className={cn("text-xs", getPriorityColor(suggestion.priority))}>
                                      {suggestion.priority.toUpperCase()}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(suggestion.confidence_score * 100)}% confidence
                                  </span>
                                </div>
                                <h5 className="font-medium text-sm mb-1">{suggestion.title}</h5>
                                <p className="text-xs text-muted-foreground mb-2">{suggestion.description}</p>
                                
                                {/* Task Details */}
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  {suggestion.estimated_duration && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{suggestion.estimated_duration} minutes</span>
                                    </div>
                                  )}
                                  {suggestion.suggested_due_date && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>Due: {formatDate(suggestion.suggested_due_date)}</span>
                                    </div>
                                  )}
                                  {suggestion.energy_level && (
                                    <div className="flex items-center gap-1">
                                      <span>Energy: {suggestion.energy_level}/5</span>
                                    </div>
                                  )}
                                  {suggestion.suggested_tags && suggestion.suggested_tags.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <Tag className="h-3 w-3" />
                                      {suggestion.suggested_tags.map((tag, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {suggestion.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSuggestionAction(suggestion.id, 'approve')}
                                  disabled={isProcessing}
                                  className="flex-1"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSuggestionAction(suggestion.id, 'decline')}
                                  disabled={isProcessing}
                                  className="flex-1"
                                >
                                  <XIcon className="h-3 w-3 mr-1" />
                                  Decline
                                </Button>
                              </div>
                            )}

                            {/* Status Badge */}
                            {suggestion.status !== 'pending' && (
                              <div className="flex justify-center">
                                <Badge 
                                  variant={suggestion.status === 'approved' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {suggestion.status === 'approved' ? (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Task Created
                                    </>
                                  ) : (
                                    <>
                                      <XIcon className="h-3 w-3 mr-1" />
                                      Declined
                                    </>
                                  )}
                                </Badge>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
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