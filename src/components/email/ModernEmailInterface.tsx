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
        "group relative flex items-start space-x-4 p-4 border-b hover:bg-accent/50 transition-all cursor-pointer",
        !isRead && "bg-primary/5 border-l-4 border-l-primary"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {from.avatar ? (
          <img src={from.avatar} alt={from.name} className="h-10 w-10 rounded-full" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>

      {/* Email Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <h3 className={cn(
              "text-sm font-medium truncate",
              isRead ? "text-foreground" : "text-foreground font-semibold"
            )}>
              {from.name}
            </h3>
            {aiAnalysis && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                priorityColors[aiAnalysis.priority]
              )}>
                {aiAnalysis.priority}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">{time}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Subject */}
        <div className="flex items-center space-x-2">
          <h4 className={cn(
            "text-sm truncate",
            isRead ? "text-muted-foreground" : "text-foreground font-medium"
          )}>
            {subject}
          </h4>
          <div className="flex items-center space-x-1">
            {hasAttachment && <Paperclip className="h-3 w-3 text-muted-foreground" />}
            {isStarred && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
            {aiAnalysis?.sentiment && sentimentIcons[aiAnalysis.sentiment]}
          </div>
        </div>

        {/* Preview */}
        <p className="text-sm text-muted-foreground truncate">{preview}</p>

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="flex items-center space-x-4 text-xs">
            {aiAnalysis.needsScheduling && (
              <div className="flex items-center space-x-1 text-blue-600">
                <Calendar className="h-3 w-3" />
                <span>Scheduling needed</span>
              </div>
            )}
            <div className="flex items-center space-x-1 text-purple-600">
              <Brain className="h-3 w-3" />
              <span>AI analyzed</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-2 rounded-lg hover:bg-accent/80 text-muted-foreground hover:text-foreground">
          <Archive className="h-4 w-4" />
        </button>
        <button className="p-2 rounded-lg hover:bg-accent/80 text-muted-foreground hover:text-foreground">
          <Star className="h-4 w-4" />
        </button>
        <button className="p-2 rounded-lg hover:bg-accent/80 text-muted-foreground hover:text-foreground">
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
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {/* Filters and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setActiveFilter('all')}
            className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'all' 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>Needs Scheduling</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {totalEmails} email{totalEmails !== 1 ? 's' : ''}
          </span>
          <button 
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>
    </div>
  );
};

// AI Suggestions Panel
const AISuggestionsPanel: React.FC = () => {
  const suggestions = [
    {
      type: 'schedule',
      title: 'Schedule Meeting with Alice',
      description: 'AI detected meeting request in email from Alice Johnson',
      action: 'Schedule',
      priority: 'high' as const
    },
    {
      type: 'reply',
      title: 'Draft Reply to Budget Review',
      description: 'Suggested response based on previous conversations',
      action: 'Draft',
      priority: 'medium' as const
    },
    {
      type: 'reminder',
      title: 'Follow up on Project Status',
      description: 'No response received after 3 days',
      action: 'Remind',
      priority: 'low' as const
    }
  ];

  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700'
  };

  return (
    <div className="w-80 border-l bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Suggestions</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Smart actions based on your emails
        </p>
      </div>

      <div className="p-4 space-y-4">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="p-3 rounded-lg border bg-background/50 hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">{suggestion.title}</h4>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                priorityColors[suggestion.priority]
              )}>
                {suggestion.priority}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{suggestion.description}</p>
            <button className="w-full px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
              {suggestion.action}
            </button>
          </div>
        ))}
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
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalEmails, setTotalEmails] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch emails function
  const fetchEmails = async (page: number = 1, reset: boolean = true) => {
    try {
      if (reset) setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        filter: activeFilter,
        ...(searchQuery && { query: searchQuery })
      });

      const response = await fetch(`/api/emails/list?${params}`);
      const data: EmailsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails');
      }

      // Transform API response to match EmailProps interface
      const transformedEmails: EmailProps[] = data.emails.map(email => ({
        id: email.id,
        from: email.from,
        subject: email.subject,
        preview: email.preview,
        time: email.time,
        isRead: email.isRead,
        isStarred: email.isStarred,
        hasAttachment: email.hasAttachment,
        aiAnalysis: email.aiAnalysis
      }));

      if (reset) {
        setEmails(transformedEmails);
      } else {
        setEmails(prev => [...prev, ...transformedEmails]);
      }
      
      setTotalEmails(data.total);
      setHasNextPage(data.hasNextPage);
      setCurrentPage(page);
      setError(data.error || null);
      
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
    <div className="flex h-full bg-background">
      {/* Email List */}
      <div className={cn("flex flex-col", selectedEmail ? "w-1/2" : "flex-1")}>
        <EmailListHeader 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          totalEmails={totalEmails}
          isLoading={loading || isRefreshing}
          onRefresh={refreshEmails}
        />
        
        <div className="flex-1 overflow-auto">
          {loading && emails.length === 0 ? (
            // Loading state
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading emails...</p>
              </div>
            </div>
          ) : error && emails.length === 0 ? (
            // Error state
            <div className="flex items-center justify-center h-64">
              <div className="text-center max-w-md">
                <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Unable to Load Emails</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <div className="space-y-2">
                  <button 
                    onClick={refreshEmails}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : emails.length === 0 ? (
            // Empty state
            <div className="flex items-center justify-center h-64">
              <div className="text-center max-w-md">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  {activeFilter === 'all' ? 'No Emails Found' : 
                   activeFilter === 'ai-priority' ? 'No High Priority Emails' :
                   'No Emails Need Scheduling'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeFilter === 'all' 
                    ? 'Connect your Gmail account to start managing your emails with AI assistance.' 
                    : 'Try adjusting your filters or check back later.'}
                </p>
                <div className="space-y-2">
                  <Link href="/dashboard/settings">
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                      <Settings className="h-4 w-4 mr-2 inline" />
                      Connect Gmail
                    </button>
                  </Link>
                  {activeFilter !== 'all' && (
                    <button 
                      onClick={() => setActiveFilter('all')}
                      className="block px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors mx-auto"
                    >
                      View All Emails
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {emails.map((email) => (
                <EmailItem
                  key={email.id}
                  {...email}
                  onClick={() => setSelectedEmail(email.id)}
                />
              ))}
              
              {/* Load More Button */}
              {hasNextPage && (
                <div className="p-4 text-center border-t">
                  <button
                    onClick={loadMoreEmails}
                    disabled={loading}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2 inline" />
                        Load More Emails
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Email Viewer */}
      {selectedEmail && (
        <div className="w-1/2 border-l border-border flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur">
            <h2 className="text-sm font-medium">Email Details</h2>
            <button
              onClick={() => setSelectedEmail(null)}
              className="p-2 rounded-lg hover:bg-accent/80 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <EmailViewer emailId={selectedEmail} />
          </div>
        </div>
      )}

      {/* AI Suggestions Sidebar - only show if no email selected */}
      {!selectedEmail && <AISuggestionsPanel />}
    </div>
  );
};

export default ModernEmailInterface; 