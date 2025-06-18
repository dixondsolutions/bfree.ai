'use client'

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
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
  Sparkles
} from 'lucide-react';

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
const EmailListHeader: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

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
          <button className="flex items-center space-x-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
            <MessageSquare className="h-4 w-4" />
            <span>All Mail</span>
          </button>
          <button className="flex items-center space-x-2 px-3 py-1.5 text-muted-foreground hover:text-foreground rounded-lg text-sm">
            <Brain className="h-4 w-4" />
            <span>AI Priority</span>
          </button>
          <button className="flex items-center space-x-2 px-3 py-1.5 text-muted-foreground hover:text-foreground rounded-lg text-sm">
            <Calendar className="h-4 w-4" />
            <span>Needs Scheduling</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">247 emails</span>
          <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
            <Filter className="h-4 w-4" />
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

// Main Email Interface Component
export const ModernEmailInterface: React.FC = () => {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  // Sample email data
  const emails: EmailProps[] = [
    {
      id: '1',
      from: { name: 'Alice Johnson', email: 'alice@company.com' },
      subject: 'Q4 Planning Meeting Discussion',
      preview: 'Hi there! I wanted to follow up on our Q4 planning session. Could we schedule a meeting next week to discuss...',
      time: '2 min ago',
      isRead: false,
      isStarred: true,
      hasAttachment: false,
      aiAnalysis: {
        priority: 'high',
        needsScheduling: true,
        sentiment: 'positive',
        suggestedActions: ['Schedule meeting', 'Send availability']
      }
    },
    {
      id: '2',
      from: { name: 'Bob Smith', email: 'bob@client.com' },
      subject: 'Project Update Required',
      preview: 'Hope you are doing well. I need an update on the current project status. When can we expect the next deliverable...',
      time: '15 min ago',
      isRead: false,
      isStarred: false,
      hasAttachment: true,
      aiAnalysis: {
        priority: 'medium',
        needsScheduling: false,
        sentiment: 'neutral',
        suggestedActions: ['Draft response', 'Check project status']
      }
    },
    {
      id: '3',
      from: { name: 'Carol Williams', email: 'carol@vendor.com' },
      subject: 'Budget Review Schedule',
      preview: 'Thank you for your email. I have reviewed the budget proposal and would like to schedule a call to discuss...',
      time: '1 hour ago',
      isRead: true,
      isStarred: false,
      hasAttachment: false,
      aiAnalysis: {
        priority: 'low',
        needsScheduling: true,
        sentiment: 'positive',
        suggestedActions: ['Schedule call', 'Prepare budget docs']
      }
    }
  ];

  return (
    <div className="flex h-full bg-background">
      {/* Email List */}
      <div className="flex-1 flex flex-col">
        <EmailListHeader />
        
        <div className="flex-1 overflow-auto">
          {emails.map((email) => (
            <EmailItem
              key={email.id}
              {...email}
              onClick={() => setSelectedEmail(email.id)}
            />
          ))}
        </div>
      </div>

      {/* AI Suggestions Sidebar */}
      <AISuggestionsPanel />
    </div>
  );
};

export default ModernEmailInterface; 