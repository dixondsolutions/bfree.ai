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
        "group relative flex items-start space-x-4 p-4 border-b hover:bg-blue-50/20 hover:shadow-sm transition-all cursor-pointer border-gray-100",
        !isRead && "bg-blue-50/40 border-l-4 border-l-blue-500 shadow-sm",
        isRead && "hover:bg-gray-50/80"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 relative">
        {from.avatar ? (
          <img src={from.avatar} alt={from.name} className="h-10 w-10 rounded-full ring-2 ring-white shadow-sm" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-2 ring-white shadow-sm">
            <User className="h-5 w-5 text-blue-600" />
          </div>
        )}
        {!isRead && (
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-white"></div>
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
            <span className="text-xs text-gray-500 font-medium">{time}</span>
            <ChevronRight className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
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
        <p className="text-sm text-gray-600 truncate leading-relaxed">{preview}</p>

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
    // Enhanced sender name extraction with better fallbacks
    let senderName = '';
    
    // Try from_name first
    if (rawEmail.from_name && rawEmail.from_name.trim() && rawEmail.from_name !== 'Unknown') {
      senderName = rawEmail.from_name.trim();
    }
    // Try to extract from email address
    else if (rawEmail.from_address) {
      const emailParts = rawEmail.from_address.split('@');
      if (emailParts[0] && emailParts[0].length > 0) {
        // Convert email username to readable name (e.g., "john.doe" -> "John Doe")
        const username = emailParts[0];
        if (username.includes('.') || username.includes('_') || username.includes('-')) {
          senderName = username
            .split(/[._-]/)
            .filter(part => part.length > 0)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
        } else {
          // Single word email username
          senderName = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
        }
      } else {
        // Use domain if username is empty
        const domain = emailParts[1]?.split('.')[0];
        if (domain) {
          senderName = domain.charAt(0).toUpperCase() + domain.slice(1);
        }
      }
    }
    
    // Enhanced preview extraction with better text cleaning
    let preview = '';
    
    // Try snippet first
    if (rawEmail.snippet && rawEmail.snippet.trim()) {
      preview = rawEmail.snippet.trim();
    }
    // Extract from plain text content
    else if (rawEmail.content_text && rawEmail.content_text.trim()) {
      preview = rawEmail.content_text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\r?\n/g, ' ') // Replace line breaks
        .trim()
        .substring(0, 150);
    }
    // Extract from HTML content
    else if (rawEmail.content_html && rawEmail.content_html.trim()) {
      preview = rawEmail.content_html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
        .replace(/<[^>]*>/g, ' ') // Strip HTML tags
        .replace(/&[^;]+;/g, ' ') // Remove HTML entities
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 150);
    }
    
    // Clean up preview
    if (preview) {
      preview = preview.replace(/^\W+/, '').replace(/\W+$/, ''); // Remove leading/trailing non-word chars
      if (preview.length > 100) {
        preview = preview.substring(0, 100) + '...';
      }
    }

    return {
      id: rawEmail.id,
      from: {
        name: senderName || rawEmail.from_address || 'Unknown Sender',
        email: rawEmail.from_address || '',
        avatar: undefined
      },
      subject: rawEmail.subject && rawEmail.subject.trim() ? rawEmail.subject.trim() : '(No Subject)',
      preview: preview || 'Click to view email content',
      time: formatEmailTime(rawEmail.received_at || rawEmail.sent_at || rawEmail.created_at),
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
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid date';
      }
      
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
      console.error('Error formatting date:', dateString, error);
      return 'Date error';
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

      // Check if emails are already transformed (have 'from' object structure AND 'id' field)
      const isAlreadyTransformed = data.emails?.[0]?.from && typeof data.emails[0].from === 'object' && data.emails[0]?.id;
      
      const emails = isAlreadyTransformed 
        ? data.emails 
        : data.emails?.map(transformEmailData) || [];

      if (reset) {
        setEmails(emails);
      } else {
        setEmails(prev => [...prev, ...emails]);
      }
      
      setTotalEmails(data.total || emails.length);
      setHasNextPage(data.hasNextPage || false);
      setCurrentPage(page);
      setError(null);
      
    } catch (err) {
      console.error('Error fetching emails:', err);
      
      // More specific error handling
      let errorMessage = 'Failed to fetch emails';
      if (err instanceof Error) {
        if (err.message.includes('Unauthorized')) {
          errorMessage = 'Please log in to view your emails';
        } else if (err.message.includes('Gmail account')) {
          errorMessage = 'Please connect your Gmail account to view emails';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error - please check your connection';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
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
    // Validate email ID before opening modal
    if (!emailId || emailId.trim() === '') {
      console.error('Invalid email ID provided:', emailId);
      return;
    }
    
    // Use functional updates to ensure state consistency
    setSelectedEmailId(emailId);
    // Use setTimeout to ensure state update completes before opening modal
    setTimeout(() => {
      setIsEmailModalOpen(true);
    }, 0);
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
            <div className="text-center max-w-lg px-4 mx-auto">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl border border-blue-200 shadow-sm">
                <Mail className="h-20 w-20 mx-auto mb-6 text-blue-400" />
                <h3 className="text-2xl font-bold mb-4 text-gray-900">
                  {activeFilter === 'all' ? 'Ready to Sync Your Emails' : 
                   activeFilter === 'ai-priority' ? 'No High Priority Emails Found' :
                   'No Scheduling-Required Emails'}
                </h3>
                <p className="text-gray-700 mb-6 leading-relaxed text-lg">
                  {activeFilter === 'all' 
                    ? 'Connect your Gmail account to start managing your emails with AI assistance. Your emails will be automatically analyzed, organized, and turned into actionable tasks.' 
                    : searchQuery 
                      ? `No emails match your search "${searchQuery}". Try adjusting your search terms or clearing filters.`
                      : 'Try switching to "All Mail" or adjusting your filters. New emails are processed automatically once your account is connected.'}
                </p>
                <div className="space-y-4">
                  {activeFilter === 'all' ? (
                    <Link 
                      href="/dashboard/emails?tab=sync"
                      className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Connect Gmail Account
                    </Link>
                  ) : (
                    <button 
                      onClick={() => setActiveFilter('all')}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      View All Emails
                    </button>
                  )}
                  <div className="text-sm text-gray-600 bg-white/60 px-4 py-2 rounded-lg">
                    <strong>🔒 Secure:</strong> Your emails are encrypted and processed with enterprise-grade security
                  </div>
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