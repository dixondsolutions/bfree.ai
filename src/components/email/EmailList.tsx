'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmailViewer } from './EmailViewer'
import { cn } from '@/lib/utils'
import {
  Mail,
  Search,
  Filter,
  Star,
  User,
  Calendar,
  Bot,
  Target,
  Brain,
  Paperclip,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react'

interface EmailData {
  email_id: string
  subject: string
  from_address: string
  from_name: string
  received_at: string
  snippet: string
  is_unread: boolean
  importance_level: 'low' | 'normal' | 'high'
  has_scheduling_content: boolean
  ai_analyzed: boolean
  task_count: number
  suggestion_count: number
  attachment_count: number
}

interface EmailListProps {
  className?: string
}

interface EmailFilters {
  unread_only?: boolean
  scheduling_only?: boolean
  importance_level?: 'low' | 'normal' | 'high'
  search_query?: string
  limit?: number
  offset?: number
}

export function EmailList({ className }: EmailListProps) {
  const [emails, setEmails] = useState<EmailData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [filters, setFilters] = useState<EmailFilters>({
    limit: 50,
    offset: 0
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    fetchEmails()
  }, [])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery !== filters.search_query) {
        setFilters(prev => ({ ...prev, search_query: searchQuery, offset: 0 }))
        fetchEmails()
      }
    }, 500)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery])

  const fetchEmails = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.unread_only) params.set('unread_only', 'true')
      if (filters.scheduling_only) params.set('scheduling_only', 'true')
      if (filters.importance_level) params.set('importance_level', filters.importance_level)
      if (filters.search_query) params.set('search_query', filters.search_query)
      if (filters.limit) params.set('limit', filters.limit.toString())
      if (filters.offset) params.set('offset', filters.offset.toString())

      const response = await fetch(`/api/emails?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails')
      }

      if (filters.offset === 0) {
        setEmails(data.emails)
      } else {
        setEmails(prev => [...prev, ...data.emails])
      }
      
      setHasMore(data.pagination.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    setFilters(prev => ({ ...prev, offset: (prev.offset || 0) + (prev.limit || 50) }))
    fetchEmails()
  }

  const applyFilter = (key: keyof EmailFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }))
    fetchEmails()
  }

  const resetFilters = () => {
    setFilters({ limit: 50, offset: 0 })
    setSearchQuery('')
    fetchEmails()
  }

  const markAsRead = async (emailId: string) => {
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_unread: false })
      })
      
      setEmails(prev => 
        prev.map(email => 
          email.email_id === emailId 
            ? { ...email, is_unread: false }
            : email
        )
      )
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const getImportanceColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200'
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    if (diffHours < 1) {
      return `${Math.round(diffMs / (1000 * 60))}m ago`
    } else if (diffHours < 24) {
      return `${Math.round(diffHours)}h ago`
    } else if (diffDays < 7) {
      return `${Math.round(diffDays)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (selectedEmailId) {
    return (
      <EmailViewer 
        emailId={selectedEmailId} 
        onClose={() => setSelectedEmailId(null)}
        className={className}
      />
    )
  }

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-500" />
              <h2 className="text-xl font-semibold">Email Inbox</h2>
              <Badge variant="outline" className="ml-2">
                {emails.length} emails
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchEmails}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.importance_level || 'all'}
              onValueChange={(value) => applyFilter('importance_level', value === 'all' ? undefined : value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Importance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Importance</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showFilters && (
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button
                variant={filters.unread_only ? "default" : "outline"}
                size="sm"
                onClick={() => applyFilter('unread_only', !filters.unread_only)}
              >
                <EyeOff className="h-4 w-4 mr-1" />
                Unread Only
              </Button>
              <Button
                variant={filters.scheduling_only ? "default" : "outline"}
                size="sm"
                onClick={() => applyFilter('scheduling_only', !filters.scheduling_only)}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Scheduling Content
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email List */}
      <Card>
        <CardContent className="p-0">
          {loading && emails.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading emails...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchEmails} variant="outline">
                Try Again
              </Button>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No emails found</h3>
              <p className="text-gray-600">Try adjusting your filters or check your email connection.</p>
            </div>
          ) : (
            <div className="divide-y">
              {emails.map((email) => (
                <div
                  key={email.email_id}
                  className={cn(
                    "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                    email.is_unread && "bg-blue-50 border-l-4 border-l-blue-500"
                  )}
                  onClick={() => setSelectedEmailId(email.email_id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="font-medium text-gray-900 truncate">
                              {email.from_name || email.from_address}
                            </span>
                          </div>
                          <Badge className={getImportanceColor(email.importance_level)}>
                            {email.importance_level}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(email.received_at)}</span>
                        </div>
                      </div>

                      {/* Subject */}
                      <h3 className={cn(
                        "text-sm mb-2 truncate",
                        email.is_unread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                      )}>
                        {email.subject || '(No Subject)'}
                      </h3>

                      {/* Snippet */}
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {email.snippet}
                      </p>

                      {/* Indicators */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {email.has_scheduling_content && (
                            <Badge className="text-purple-700 bg-purple-100 border-purple-200">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Scheduling
                            </Badge>
                          )}
                          {email.ai_analyzed && (
                            <Badge className="text-green-700 bg-green-100 border-green-200">
                              <Bot className="h-3 w-3 mr-1" />
                              AI Analyzed
                            </Badge>
                          )}
                          {email.attachment_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Paperclip className="h-3 w-3 mr-1" />
                              {email.attachment_count}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {email.suggestion_count > 0 && (
                            <Badge className="text-blue-700 bg-blue-100 border-blue-200">
                              <Brain className="h-3 w-3 mr-1" />
                              {email.suggestion_count} suggestions
                            </Badge>
                          )}
                          {email.task_count > 0 && (
                            <Badge className="text-green-700 bg-green-100 border-green-200">
                              <Target className="h-3 w-3 mr-1" />
                              {email.task_count} tasks
                            </Badge>
                          )}
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-start gap-2">
                      {email.is_unread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(email.email_id)
                          }}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="p-4 text-center">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Load More Emails
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}