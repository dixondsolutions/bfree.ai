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
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailData {
  id: string
  from: {
    name: string
    email: string
    avatar?: string
  }
  to: Array<{
    name: string
    email: string
  }>
  cc?: Array<{
    name: string
    email: string
  }>
  bcc?: Array<{
    name: string
    email: string
  }>
  subject: string
  body: string
  html_body?: string
  date: string
  isRead: boolean
  isStarred: boolean
  hasAttachment: boolean
  attachments?: Array<{
    name: string
    size: number
    type: string
    url: string
  }>
  aiAnalysis?: {
    priority: 'high' | 'medium' | 'low'
    needsScheduling: boolean
    sentiment: 'positive' | 'neutral' | 'negative'
    suggestedActions: string[]
    extractedTasks?: Array<{
      title: string
      priority: string
      estimatedDuration: string
    }>
    categories: string[]
    confidence: number
  }
  labels?: string[]
}

interface EmailViewerProps {
  emailId: string | null
  isOpen: boolean
  onClose: () => void
}

export function EmailViewer({ emailId, isOpen, onClose }: EmailViewerProps) {
  const [email, setEmail] = useState<EmailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch email data when emailId changes
  useEffect(() => {
    if (!emailId || !isOpen) {
      setEmail(null)
      return
    }

    const fetchEmail = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/emails/${emailId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch email')
        }
        
        setEmail(data.email)
      } catch (err) {
        console.error('Error fetching email:', err)
        setError(err instanceof Error ? err.message : 'Failed to load email')
      } finally {
        setLoading(false)
      }
    }

    fetchEmail()
  }, [emailId, isOpen])

  // Mark email as read when opened
  useEffect(() => {
    if (email && !email.isRead) {
      fetch(`/api/emails/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      }).catch(console.error)
    }
  }, [email])

  const handleStarToggle = async () => {
    if (!email) return
    try {
      const response = await fetch(`/api/emails/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !email.isStarred })
      })
      
      if (response.ok) {
        setEmail(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null)
      }
    } catch (error) {
      console.error('Error toggling star:', error)
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

  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  }

  const sentimentIcons = {
    positive: <CheckCircle className="h-4 w-4 text-green-500" />,
    neutral: <Clock className="h-4 w-4 text-gray-500" />,
    negative: <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] p-0 gap-0">
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
                    {email.subject}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Email from {email.from.name} ({email.from.email}) received on {formatDate(email.date)}
                  </DialogDescription>
                  <div className="flex items-center gap-2 flex-wrap">
                    {email.aiAnalysis && (
                      <>
                        <Badge className={cn("text-xs", priorityColors[email.aiAnalysis.priority])}>
                          {email.aiAnalysis.priority} priority
                        </Badge>
                        <div className="flex items-center gap-1">
                          {sentimentIcons[email.aiAnalysis.sentiment]}
                          <span className="text-xs text-muted-foreground capitalize">
                            {email.aiAnalysis.sentiment}
                          </span>
                        </div>
                        {email.aiAnalysis.needsScheduling && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            Needs Scheduling
                          </Badge>
                        )}
                      </>
                    )}
                    {email.labels?.map((label) => (
                      <Badge key={label} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <DialogClose asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </DialogHeader>

            {/* Email Details */}
            <div className="border-b p-6 py-4 bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {email.from.avatar ? (
                      <img src={email.from.avatar} alt={email.from.name} className="h-10 w-10 rounded-full" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{email.from.name}</div>
                    <div className="text-xs text-muted-foreground">{email.from.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">{formatDate(email.date)}</div>
                </div>
              </div>

              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">To: </span>
                  {email.to.map((recipient, index) => (
                    <span key={index}>
                      {recipient.name} &lt;{recipient.email}&gt;
                      {index < email.to.length - 1 && ', '}
                    </span>
                  ))}
                </div>
                {email.cc && email.cc.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">CC: </span>
                    {email.cc.map((recipient, index) => (
                      <span key={index}>
                        {recipient.name} &lt;{recipient.email}&gt;
                        {index < email.cc.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-6 py-3 border-b bg-white">
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
                <Button variant="ghost" size="sm" onClick={handleStarToggle}>
                  <Star className={cn("h-4 w-4", email.isStarred && "fill-current text-yellow-500")} />
                </Button>
                <Button variant="ghost" size="sm">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {/* Email Body */}
                  <div className="prose max-w-none">
                    {email.html_body ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: email.html_body }}
                        className="email-content"
                      />
                    ) : (
                      <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {email.body}
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {email.attachments && email.attachments.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Attachments ({email.attachments.length})
                      </h4>
                      <div className="space-y-2">
                        {email.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                <Paperclip className="h-4 w-4 text-gray-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">{attachment.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {(attachment.size / 1024).toFixed(1)} KB • {attachment.type}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {email.aiAnalysis && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-purple-600" />
                        AI Analysis
                      </h4>
                      <div className="space-y-4">
                        {email.aiAnalysis.extractedTasks && email.aiAnalysis.extractedTasks.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Extracted Tasks</h5>
                            <div className="space-y-2">
                              {email.aiAnalysis.extractedTasks.map((task, index) => (
                                <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{task.title}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {task.priority}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Est. {task.estimatedDuration}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {email.aiAnalysis.suggestedActions.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Suggested Actions</h5>
                            <div className="space-y-1">
                              {email.aiAnalysis.suggestedActions.map((action, index) => (
                                <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  {action}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Categories: {email.aiAnalysis.categories.join(', ')}</span>
                          <span>Confidence: {(email.aiAnalysis.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
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