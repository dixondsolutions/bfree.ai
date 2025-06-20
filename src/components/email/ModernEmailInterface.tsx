'use client'

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { EmailViewer } from './EmailViewer';
import { 
  Search, 
  Filter, 
  Star, 
  Archive, 
  Trash2, 
  Calendar, 
  Brain, 
  Clock, 
  User, 
  Paperclip,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Loader2,
  RefreshCw,
  Mail,
  Settings,
  Plus,
  X
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

// Email Item Component
interface EmailProps {
  id: string;
  from: {
    name: string;
    email: string;
    avatar?: string;
  };
  subject: string;
  preview: string;
  time: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
  aiAnalysis?: {
    priority: 'high' | 'medium' | 'low';
    needsScheduling: boolean;
    sentiment: 'positive' | 'neutral' | 'negative';
    suggestedActions: string[];
  };
}

const EmailItem: React.FC<EmailProps & { onClick: () => void }> = ({ 
  from, 
  subject, 
  preview, 
  time, 
  isRead, 
  isStarred, 
  hasAttachment, 
  aiAnalysis,
  onClick 
}) => {
  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  };

  const sentimentIcons = {
    positive: <CheckCircle className="h-3 w-3 text-green-500" />,
    neutral: <Clock className="h-3 w-3 text-gray-500" />,
    negative: <AlertTriangle className="h-3 w-3 text-red-500" />
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative flex items-start space-x-4 p-4 border-b hover:bg-gray-50 transition-all cursor-pointer",
        !isRead && "bg-blue-50/30 border-l-4 border-l-blue-500"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {from.avatar ? (
          <img src={from.avatar} alt={from.name} className="h-10 w-10 rounded-full" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="h-5 w-5 text-gray-600" />
          </div>
        )}
      </div>

      {/* Email Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <h3 className={cn(
              "text-sm font-medium truncate",
              isRead ? "text-gray-900" : "text-gray-900 font-semibold"
            )}>
              {from.name}
            </h3>
            {aiAnalysis && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0",
                priorityColors[aiAnalysis.priority]
              )}>
                {aiAnalysis.priority}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="text-xs text-gray-500">{time}</span>
            <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Subject */}
        <div className="flex items-center space-x-2">
          <h4 className={cn(
            "text-sm truncate flex-1",
            isRead ? "text-gray-600" : "text-gray-900 font-medium"
          )}>
            {subject}
          </h4>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {hasAttachment && <Paperclip className="h-3 w-3 text-gray-400" />}
            {isStarred && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
            {aiAnalysis?.sentiment && sentimentIcons[aiAnalysis.sentiment]}
          </div>
        </div>

        {/* Preview */}
        <p className="text-sm text-gray-500 truncate">{preview}</p>

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="flex items-center space-x-4 text-xs">
            {aiAnalysis.needsScheduling && (
              <div className="flex items-center space-x-1 text-blue-600">
                <Calendar className="h-3 w-3" />
                <span>Scheduling needed</span>
              </div>
            )}
            {aiAnalysis.isAnalyzed ? (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>AI analyzed</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-gray-500">
                <Brain className="h-3 w-3" />
                <span>Ready for analysis</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button 
          onClick={(e) => { e.stopPropagation(); /* Add archive logic */ }}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          <Archive className="h-4 w-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); /* Add star logic */ }}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          <Star className="h-4 w-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); /* Add delete logic */ }}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Email List Header with Search and Filters
interface EmailListHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  totalEmails: number;
  isLoading: boolean;
  onRefresh: () => void;
}

const EmailListHeader: React.FC<EmailListHeaderProps> = ({ 
  searchQuery, 
  setSearchQuery, 
  activeFilter, 
  setActiveFilter, 
  totalEmails,
  isLoading,
  onRefresh 
}) => {
  return (
    <div className="border-b bg-white p-4 space-y-4 flex-shrink-0">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setActiveFilter('all')}
            className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'all' 
                ? "bg-blue-600 text-white" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            <span>All Mail</span>
          </button>
          <button 
            onClick={() => setActiveFilter('ai-priority')}
            className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'ai-priority' 
                ? "bg-blue-600 text-white" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <Brain className="h-4 w-4" />
            <span>AI Priority</span>
          </button>
          <button 
            onClick={() => setActiveFilter('needs-scheduling')}
            className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'needs-scheduling' 
                ? "bg-blue-600 text-white" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>Needs Scheduling</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {totalEmails} email{totalEmails !== 1 ? 's' : ''}
          </span>
          <button 
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Email state management interfaces
interface EmailsResponse {
  emails: EmailProps[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  totalFetched?: number;
  aiSuggestionsCount?: number;
  fallbackMode?: boolean;
  error?: string;
  message?: string;
}

// Main Email Interface Component
export const ModernEmailInterface: React.FC = () => {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emails, setEmails] = useState<EmailProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalEmails, setTotalEmails] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Transform database email data to component format
  const transformEmailData = (rawEmail: any): EmailProps => {
    // Better sender name extraction
    let senderName = rawEmail.from_name;
    if (!senderName && rawEmail.from_address) {
      // Extract name from email address if no name provided
      const emailParts = rawEmail.from_address.split('@');
      if (emailParts[0]) {
        // Convert email username to readable name (e.g., "john.doe" -> "John Doe")
        senderName = emailParts[0]
          .split(/[._-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
      }
    }
    
    // Better preview extraction
    let preview = rawEmail.snippet;
    if (!preview && rawEmail.content_text) {
      // Extract meaningful preview from content
      preview = rawEmail.content_text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 150);
    }
    if (!preview && rawEmail.content_html) {
      // Extract text from HTML if available
      preview = rawEmail.content_html
        .replace(/<[^>]*>/g, ' ') // Strip HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 150);
    }

    return {
      id: rawEmail.id,
      from: {
        name: senderName || rawEmail.from_address || 'Unknown Sender',
        email: rawEmail.from_address || '',
        avatar: undefined
      },
      subject: rawEmail.subject || '(No Subject)',
      preview: preview || 'No preview available',
      time: formatEmailTime(rawEmail.received_at || rawEmail.created_at),
      isRead: !rawEmail.is_unread,
      isStarred: rawEmail.is_starred || false,
      hasAttachment: (rawEmail.attachment_count || 0) > 0,
      aiAnalysis: rawEmail.ai_analyzed ? {
        priority: rawEmail.importance_level === 'high' ? 'high' : 
                  rawEmail.importance_level === 'low' ? 'low' : 'medium',
        needsScheduling: rawEmail.has_scheduling_content || false,
        sentiment: 'neutral',
        suggestedActions: [],
        isAnalyzed: true
      } : {
        priority: 'medium',
        needsScheduling: false,
        sentiment: 'neutral',
        suggestedActions: [],
        isAnalyzed: false
      }
    };
  };

  const formatEmailTime = (dateString: string): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      // Handle future dates (shouldn't happen but just in case)
      if (diffInMs < 0) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      // Less than an hour ago
      if (diffInMinutes < 60) {
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes === 1) return '1 min ago';
        return `${diffInMinutes} min ago`;
      }
      
      // Less than a day ago (show time)
      if (diffInHours < 24) {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
      }
      
      // Less than a week ago (show day)
      if (diffInDays < 7) {
        if (diffInDays === 1) return 'Yesterday';
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      }
      
      // This year (show month and day)
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      // Different year (show month, day, year)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  // Fetch emails function
  const fetchEmails = async (page: number = 1, reset: boolean = true) => {
    try {
      if (reset) setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(searchQuery && { search: searchQuery })
      });

      // Add filter-specific parameters
      if (activeFilter === 'ai-priority') {
        params.append('ai_analyzed', 'true');
        params.append('importance', 'high');
      } else if (activeFilter === 'needs-scheduling') {
        params.append('has_scheduling_content', 'true');
      }

      const response = await fetch(`/api/emails/list?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails');
      }

      // Transform the raw email data
      const transformedEmails = data.emails?.map(transformEmailData) || [];

      if (reset) {
        setEmails(transformedEmails);
      } else {
        setEmails(prev => [...prev, ...transformedEmails]);
      }
      
      setTotalEmails(data.total || transformedEmails.length);
      setHasNextPage(data.hasMore || false);
      setCurrentPage(page);
      setError(null);
      
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
      if (reset) setEmails([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load more emails (pagination)
  const loadMoreEmails = () => {
    if (!loading && hasNextPage) {
      fetchEmails(currentPage + 1, false);
    }
  };

  // Refresh emails
  const refreshEmails = async () => {
    setIsRefreshing(true);
    await fetchEmails(1, true);
  };

  // Handle email click
  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId);
    setIsEmailModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsEmailModalOpen(false);
    setSelectedEmailId(null);
    // Refresh the list to update read status
    refreshEmails();
  };

  // Initial load and filter/search effects
  useEffect(() => {
    fetchEmails(1, true);
  }, [activeFilter]);

  // Search debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        fetchEmails(1, true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Clear search effect
  useEffect(() => {
    if (searchQuery === '') {
      fetchEmails(1, true);
    }
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Email List Header */}
      <EmailListHeader 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        totalEmails={totalEmails}
        isLoading={loading || isRefreshing}
        onRefresh={refreshEmails}
      />
      
      {/* Email List Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading && emails.length === 0 ? (
          // Loading state with skeletons
          <div className="space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4 p-4 border-b">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : error && emails.length === 0 ? (
          // Error state
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md px-4">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium mb-2 text-gray-900">Unable to Load Emails</h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <div className="space-y-2">
                <button 
                  onClick={refreshEmails}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : emails.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-96">
            <div className="text-center max-w-md px-4 mx-auto">
              <Mail className="h-16 w-16 mx-auto mb-6 text-gray-300" />
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                {activeFilter === 'all' ? 'No Emails Found' : 
                 activeFilter === 'ai-priority' ? 'No High Priority Emails' :
                 'No Emails Need Scheduling'}
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {activeFilter === 'all' 
                  ? 'Connect your Gmail account to start managing your emails with AI assistance. Once connected, your emails will be automatically analyzed and organized.' 
                  : 'Try adjusting your filters or check back later. New emails are processed automatically once your account is connected.'}
              </p>
              <div className="space-y-3">
                <Link 
                  href="/dashboard/emails?tab=sync"
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Gmail Account
                </Link>
                <div className="text-xs text-gray-500">
                  Your emails will be encrypted and processed securely
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Email list
          <div>
            {emails.map((email) => (
              <EmailItem
                key={email.id}
                {...email}
                onClick={() => handleEmailClick(email.id)}
              />
            ))}
            
            {/* Load More Button */}
            {hasNextPage && (
              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={loadMoreEmails}
                  disabled={loading}
                  className="w-full py-2 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : (
                    `Load More (${totalEmails - emails.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email Viewer Modal */}
      <EmailViewer 
        emailId={selectedEmailId}
        isOpen={isEmailModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default ModernEmailInterface; 