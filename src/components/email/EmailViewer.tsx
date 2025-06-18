'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Mail,
  User,
  Calendar,
  Star,
  Paperclip,
  Brain,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Bot,
  FileText,
  Target,
  Zap
} from 'lucide-react'

interface EmailViewerProps {
  emailId: string
  onClose?: () => void
  className?: string
}

interface EmailData {
  id: string
  subject: string
  from_address: string
  from_name: string
  to_address: string
  content_text: string
  content_html: string
  snippet: string
  received_at: string
  sent_at: string
  is_unread: boolean
  is_starred: boolean
  importance_level: 'low' | 'normal' | 'high'
  has_scheduling_content: boolean
  ai_analyzed: boolean
  ai_analysis_at: string
  scheduling_keywords: string[]
  labels: string[]
  attachment_count: number
  email_attachments: Array<{
    id: string
    filename: string
    mime_type: string
    size_bytes: number
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    created_at: string
    ai_generated: boolean
    confidence_score: number
  }>
  ai_suggestions: Array<{
    id: string
    title: string
    description: string
    confidence_score: number
    status: string
    created_at: string
  }>
}

export function EmailViewer({ emailId, onClose, className }: EmailViewerProps) {
  const [email, setEmail] = useState<EmailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarred, setIsStarred] = useState(false)
  const [isUnread, setIsUnread] = useState(true)

  useEffect(() => {
    fetchEmail()
  }, [emailId])

  const fetchEmail = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/emails/${emailId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch email')
      }

      setEmail(data.email)
      setIsStarred(data.email.is_starred)
      setIsUnread(data.email.is_unread)

      // Mark as read when viewing
      if (data.email.is_unread) {
        markAsRead()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async () => {
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_unread: false })
      })
      setIsUnread(false)
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const toggleStar = async () => {
    try {
      const newStarred = !isStarred
      await fetch(`/api/emails/${emailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_starred: newStarred })
      })
      setIsStarred(newStarred)
    } catch (err) {
      console.error('Failed to toggle star:', err)
    }
  }

  const getImportanceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-700 bg-red-100 border-red-300'
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-300'
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-300'
      case 'low': return 'text-green-700 bg-green-100 border-green-300'
      default: return 'text-gray-700 bg-gray-100 border-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />
      default: return <Target className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-gray-600">Loading email...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load email</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchEmail} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!email) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="p-8">
          <div className="text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Email not found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="mr-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Mail className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-500">Email Details</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                {email.subject || '(No Subject)'}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{email.from_name || email.from_address}</span>
                  <span className="text-gray-400">({email.from_address})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(email.received_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getImportanceColor(email.importance_level)}>
                {email.importance_level} importance
              </Badge>
              {email.has_scheduling_content && (
                <Badge className="text-purple-700 bg-purple-100 border-purple-300">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Scheduling Content
                </Badge>
              )}
              {email.ai_analyzed && (
                <Badge className="text-green-700 bg-green-100 border-green-300">
                  <Bot className="h-3 w-3 mr-1" />
                  AI Analyzed
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleStar}
                className={cn("p-2", isStarred && "text-yellow-500")}
              >
                <Star className={cn("h-4 w-4", isStarred && "fill-current")} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Email Content */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Email Content
          </h3>
        </CardHeader>
        <CardContent>
          {email.content_html ? (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: email.content_html }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {email.content_text || email.snippet}
            </div>
          )}

          {/* Attachments */}
          {email.attachment_count > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({email.attachment_count})
              </h4>
              <div className="space-y-2">
                {email.email_attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{attachment.filename}</p>
                      <p className="text-xs text-gray-500">
                        {attachment.mime_type} • {Math.round(attachment.size_bytes / 1024)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scheduling Keywords */}
          {email.scheduling_keywords && email.scheduling_keywords.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Detected Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {email.scheduling_keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {email.ai_suggestions && email.ai_suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Suggestions ({email.ai_suggestions.length})
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {email.ai_suggestions.map((suggestion) => (
                <div key={suggestion.id} className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(suggestion.status)}>
                        {suggestion.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence_score * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                  {suggestion.description && (
                    <p className="text-sm text-gray-700 mb-2">{suggestion.description}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    Created: {formatDate(suggestion.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Tasks */}
      {email.tasks && email.tasks.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Generated Tasks ({email.tasks.length})
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {email.tasks.map((task) => (
                <div key={task.id} className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge className={task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>Created: {formatDate(task.created_at)}</span>
                      {task.ai_generated && (
                        <span className="flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          AI Generated
                        </span>
                      )}
                      {task.confidence_score && (
                        <span>{Math.round(task.confidence_score * 100)}% confidence</span>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Task
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Metadata */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Email Metadata</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-500">To:</span>
              <p className="text-gray-900">{email.to_address}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Received:</span>
              <p className="text-gray-900">{formatDate(email.received_at)}</p>
            </div>
            {email.sent_at && (
              <div>
                <span className="font-medium text-gray-500">Sent:</span>
                <p className="text-gray-900">{formatDate(email.sent_at)}</p>
              </div>
            )}
            {email.ai_analysis_at && (
              <div>
                <span className="font-medium text-gray-500">AI Analyzed:</span>
                <p className="text-gray-900">{formatDate(email.ai_analysis_at)}</p>
              </div>
            )}
            {email.labels && email.labels.length > 0 && (
              <div className="col-span-2">
                <span className="font-medium text-gray-500">Labels:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {email.labels.map((label, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}