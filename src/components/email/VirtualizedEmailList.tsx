'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { EmailViewer } from './EmailViewer'
import { cn } from '@/lib/utils'
import {
  Mail,
  Search,
  Filter,
  User,
  Calendar,
  Bot,
  Target,
  Brain,
  Paperclip,
  Clock,
  ArrowRight,
  RefreshCw,
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

interface VirtualizedEmailListProps {
  className?: string
}

interface EmailFilters {
  unread_only?: boolean
  scheduling_only?: boolean
  importance_level?: 'low' | 'normal' | 'high'
  search_query?: string
  has_attachments?: boolean
  from_address?: string
  limit?: number
  offset?: number
}

// Virtual scrolling parameters
const ITEM_HEIGHT = 120 // Height of each email item in pixels
const BUFFER_SIZE = 5 // Number of items to render outside viewport
const INITIAL_LOAD_SIZE = 50
const INFINITE_SCROLL_THRESHOLD = 300 // Pixels from bottom to trigger load

export function VirtualizedEmailList({ className }: VirtualizedEmailListProps) {
  const [emails, setEmails] = useState<EmailData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [filters, setFilters] = useState<EmailFilters>({
    limit: INITIAL_LOAD_SIZE,
    offset: 0
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Virtual scrolling state
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadingTimeoutRef = useRef<NodeJS.Timeout>()

  // Calculate virtual scrolling parameters
  const totalHeight = emails.length * ITEM_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE)
  const endIndex = Math.min(
    emails.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
  )
  const visibleEmails = emails.slice(startIndex, endIndex)
  const offsetY = startIndex * ITEM_HEIGHT

  // Debounced search
  useEffect(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }
    
    loadingTimeoutRef.current = setTimeout(() => {
      if (searchQuery !== filters.search_query) {
        setFilters(prev => ({ ...prev, search_query: searchQuery, offset: 0 }))
        fetchEmails(true)
      }
    }, 300)

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Initial load
  useEffect(() => {
    fetchEmails(true)
  }, [])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (scrollContainerRef.current) {
        setContainerHeight(scrollContainerRef.current.clientHeight)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchEmails = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true)
        setError(null)
      } else {
        setIsLoadingMore(true)
      }

      const currentFilters = reset ? { ...filters, offset: 0 } : filters
      const params = new URLSearchParams()
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString())
        }
      })

      const response = await fetch(`/api/emails?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails')
      }

      if (reset) {
        setEmails(data.emails || [])
      } else {
        setEmails(prev => [...prev, ...(data.emails || [])])
      }
      
      setHasMore(data.pagination?.hasMore || false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails')
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setFilters(prev => ({ ...prev, offset: (prev.offset || 0) + (prev.limit || INITIAL_LOAD_SIZE) }))
      fetchEmails(false)
    }
  }, [isLoadingMore, hasMore])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    setScrollTop(target.scrollTop)

    // Infinite scroll detection
    const { scrollTop, scrollHeight, clientHeight } = target
    if (scrollHeight - scrollTop - clientHeight < INFINITE_SCROLL_THRESHOLD) {
      loadMore()
    }
  }, [loadMore])

  const applyFilter = useCallback((key: keyof EmailFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }))
    fetchEmails(true)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ limit: INITIAL_LOAD_SIZE, offset: 0 })
    setSearchQuery('')
    fetchEmails(true)
  }, [])

  const markAsRead = async (emailId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await fetch(`/api/emails`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailIds: [emailId],
          updates: { is_unread: false }
        })
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

  // Memoized email item component for performance
  const EmailItem = React.memo(({ email, index }: { email: EmailData; index: number }) => (
    <div
      key={email.email_id}
      className={cn(
        "p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors",
        email.is_unread && "bg-blue-50 border-l-4 border-l-blue-500"
      )}
      style={{ height: ITEM_HEIGHT }}
      onClick={() => setSelectedEmailId(email.email_id)}
    >
      <div className="flex items-start justify-between gap-4 h-full">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium text-gray-900 truncate text-sm">
                  {email.from_name || email.from_address}
                </span>
              </div>
              <Badge className={cn(getImportanceColor(email.importance_level), "text-xs")}>
                {email.importance_level}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{formatDate(email.received_at)}</span>
            </div>
          </div>

          {/* Subject */}
          <h3 className={cn(
            "text-sm mb-1 truncate",
            email.is_unread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
          )}>
            {email.subject || '(No Subject)'}
          </h3>

          {/* Snippet */}
          <p className="text-xs text-gray-600 mb-2 line-clamp-1">
            {email.snippet}
          </p>

          {/* Indicators */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {email.has_scheduling_content && (
                <Badge className="text-purple-700 bg-purple-100 border-purple-200 text-xs">
                  <Sparkles className="h-2 w-2 mr-1" />
                  Schedule
                </Badge>
              )}
              {email.ai_analyzed && (
                <Badge className="text-green-700 bg-green-100 border-green-200 text-xs">
                  <Bot className="h-2 w-2 mr-1" />
                  AI
                </Badge>
              )}
              {email.attachment_count > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Paperclip className="h-2 w-2 mr-1" />
                  {email.attachment_count}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {email.suggestion_count > 0 && (
                <Badge className="text-blue-700 bg-blue-100 border-blue-200 text-xs">
                  <Brain className="h-2 w-2 mr-1" />
                  {email.suggestion_count}
                </Badge>
              )}
              {email.task_count > 0 && (
                <Badge className="text-green-700 bg-green-100 border-green-200 text-xs">
                  <Target className="h-2 w-2 mr-1" />
                  {email.task_count}
                </Badge>
              )}
              {email.is_unread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => markAsRead(email.email_id, e)}
                  className="text-xs h-6 w-6 p-0"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              )}
              <ArrowRight className="h-3 w-3 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  ))

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
    <div className={cn("w-full space-y-4", className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
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
                onClick={() => fetchEmails(true)}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mt-4">
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
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Importance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
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
                Unread
              </Button>
              <Button
                variant={filters.scheduling_only ? "default" : "outline"}
                size="sm"
                onClick={() => applyFilter('scheduling_only', !filters.scheduling_only)}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Scheduling
              </Button>
              <Button
                variant={filters.has_attachments ? "default" : "outline"}
                size="sm"
                onClick={() => applyFilter('has_attachments', !filters.has_attachments)}
              >
                <Paperclip className="h-4 w-4 mr-1" />
                Attachments
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                Reset
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Virtualized Email List */}
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
              <Button onClick={() => fetchEmails(true)} variant="outline">
                Try Again
              </Button>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No emails found</h3>
              <p className="text-gray-600">Try adjusting your filters or sync your emails.</p>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="h-96 overflow-auto"
              onScroll={handleScroll}
            >
              <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                  {visibleEmails.map((email, index) => (
                    <EmailItem
                      key={email.email_id}
                      email={email}
                      index={startIndex + index}
                    />
                  ))}
                </div>
              </div>
              
              {/* Loading indicator for infinite scroll */}
              {isLoadingMore && (
                <div className="p-4 text-center border-t">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading more emails...</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}