-- =====================================================
-- B Free.AI Email Storage Enhancement
-- Migration 005: Add comprehensive email storage and viewing
-- =====================================================

-- Create emails table for full email content storage
CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Gmail integration fields
  gmail_id TEXT UNIQUE NOT NULL,
  thread_id TEXT,
  message_id TEXT,
  
  -- Email content
  subject TEXT NOT NULL,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_address TEXT NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  
  -- Content fields
  content_text TEXT,
  content_html TEXT,
  snippet TEXT,
  
  -- Metadata
  labels TEXT[],
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Processing status
  processed_at TIMESTAMP WITH TIME ZONE,
  ai_analyzed BOOLEAN DEFAULT false,
  ai_analysis_at TIMESTAMP WITH TIME ZONE,
  
  -- Attachments info
  has_attachments BOOLEAN DEFAULT false,
  attachment_count INTEGER DEFAULT 0,
  attachment_info JSONB,
  
  -- Scheduling relevance
  has_scheduling_content BOOLEAN DEFAULT false,
  scheduling_keywords TEXT[],
  
  -- Importance and priority
  importance_level TEXT CHECK (importance_level IN ('low', 'normal', 'high')) DEFAULT 'normal',
  is_unread BOOLEAN DEFAULT true,
  is_starred BOOLEAN DEFAULT false,
  
  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Constraints
  UNIQUE(user_id, gmail_id)
);

-- Enable RLS on emails table
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for emails table
CREATE POLICY "Users can view own emails" ON public.emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails" ON public.emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails" ON public.emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails" ON public.emails
  FOR DELETE USING (auth.uid() = user_id);

-- Create email attachments table
CREATE TABLE IF NOT EXISTS public.email_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Attachment info
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  attachment_id TEXT, -- Gmail attachment ID
  
  -- Processing status
  is_downloaded BOOLEAN DEFAULT false,
  download_url TEXT,
  local_path TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on email_attachments table
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_attachments table
CREATE POLICY "Users can view own email attachments" ON public.email_attachments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email attachments" ON public.email_attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_emails_user_id ON public.emails(user_id);
CREATE INDEX idx_emails_gmail_id ON public.emails(gmail_id);
CREATE INDEX idx_emails_thread_id ON public.emails(thread_id);
CREATE INDEX idx_emails_received_at ON public.emails(user_id, received_at DESC);
CREATE INDEX idx_emails_ai_analyzed ON public.emails(user_id, ai_analyzed);
CREATE INDEX idx_emails_scheduling_content ON public.emails(user_id, has_scheduling_content);
CREATE INDEX idx_emails_unread ON public.emails(user_id, is_unread) WHERE is_unread = true;
CREATE INDEX idx_emails_importance ON public.emails(user_id, importance_level);
CREATE INDEX idx_emails_labels ON public.emails USING GIN(labels);
CREATE INDEX idx_emails_keywords ON public.emails USING GIN(scheduling_keywords);

-- Email attachments indexes
CREATE INDEX idx_email_attachments_email_id ON public.email_attachments(email_id);
CREATE INDEX idx_email_attachments_user_id ON public.email_attachments(user_id);

-- Update processing_queue to link with emails table
ALTER TABLE public.processing_queue 
ADD COLUMN IF NOT EXISTS email_record_id UUID REFERENCES public.emails(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_processing_queue_email_record ON public.processing_queue(email_record_id);

-- Update ai_suggestions to link with emails table
ALTER TABLE public.ai_suggestions 
ADD COLUMN IF NOT EXISTS email_record_id UUID REFERENCES public.emails(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_email_record ON public.ai_suggestions(email_record_id);

-- Update tasks to link with emails table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS source_email_record_id UUID REFERENCES public.emails(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_source_email_record ON public.tasks(source_email_record_id);

-- Create email statistics view
CREATE VIEW public.email_statistics AS
SELECT 
  user_id,
  COUNT(*) as total_emails,
  COUNT(*) FILTER (WHERE ai_analyzed = true) as analyzed_emails,
  COUNT(*) FILTER (WHERE has_scheduling_content = true) as scheduling_emails,
  COUNT(*) FILTER (WHERE is_unread = true) as unread_emails,
  COUNT(*) FILTER (WHERE importance_level = 'high') as high_importance_emails,
  COUNT(*) FILTER (WHERE has_attachments = true) as emails_with_attachments,
  
  -- Recent activity (last 7 days)
  COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '7 days') as emails_last_7_days,
  COUNT(*) FILTER (WHERE ai_analyzed = true AND ai_analysis_at >= NOW() - INTERVAL '7 days') as analyzed_last_7_days,
  
  -- Processing efficiency
  CASE 
    WHEN COUNT(*) FILTER (WHERE has_scheduling_content = true) > 0 THEN
      ROUND(
        (COUNT(*) FILTER (WHERE ai_analyzed = true AND has_scheduling_content = true)::DECIMAL / 
         COUNT(*) FILTER (WHERE has_scheduling_content = true)) * 100, 
        2
      )
    ELSE 0
  END as processing_efficiency,
  
  MAX(received_at) as latest_email_time,
  MAX(ai_analysis_at) as latest_analysis_time

FROM public.emails
GROUP BY user_id;

-- Grant permissions on the view
GRANT SELECT ON public.email_statistics TO authenticated;

-- Create RLS policy for the view
ALTER VIEW public.email_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own email statistics" ON public.email_statistics
  FOR SELECT USING (auth.uid() = user_id);

-- Function to extract email domain
CREATE OR REPLACE FUNCTION get_email_domain(email_address TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(SPLIT_PART(email_address, '@', 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if email is from important sender
CREATE OR REPLACE FUNCTION is_important_sender(
  p_user_id UUID, 
  p_from_address TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  important_domains TEXT[] := ARRAY['@company.com', '@client.com', '@partner.com'];
  user_important_senders TEXT[];
BEGIN
  -- Get user's important senders from preferences
  SELECT COALESCE(
    (preference_value->>'important_senders')::TEXT[], 
    ARRAY[]::TEXT[]
  ) INTO user_important_senders
  FROM public.user_preferences 
  WHERE user_id = p_user_id 
  AND preference_key = 'email_settings';
  
  -- Check if sender is in user's important list
  IF p_from_address = ANY(user_important_senders) THEN
    RETURN true;
  END IF;
  
  -- Check if domain is in default important domains
  IF get_email_domain(p_from_address) = ANY(important_domains) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-categorize email importance
CREATE OR REPLACE FUNCTION auto_categorize_email_importance(
  p_user_id UUID,
  p_from_address TEXT,
  p_subject TEXT,
  p_labels TEXT[]
) RETURNS TEXT AS $$
DECLARE
  importance TEXT := 'normal';
  high_priority_keywords TEXT[] := ARRAY['urgent', 'asap', 'emergency', 'critical', 'deadline', 'important'];
  low_priority_keywords TEXT[] := ARRAY['newsletter', 'notification', 'no-reply', 'automated'];
BEGIN
  -- Check for important sender
  IF is_important_sender(p_user_id, p_from_address) THEN
    importance := 'high';
  END IF;
  
  -- Check subject for priority keywords
  IF EXISTS (
    SELECT 1 FROM unnest(high_priority_keywords) AS keyword 
    WHERE LOWER(p_subject) LIKE '%' || keyword || '%'
  ) THEN
    importance := 'high';
  END IF;
  
  -- Check for low priority indicators
  IF EXISTS (
    SELECT 1 FROM unnest(low_priority_keywords) AS keyword 
    WHERE LOWER(p_from_address) LIKE '%' || keyword || '%' 
    OR LOWER(p_subject) LIKE '%' || keyword || '%'
  ) THEN
    importance := 'low';
  END IF;
  
  -- Check Gmail labels for importance
  IF 'IMPORTANT' = ANY(p_labels) THEN
    importance := 'high';
  END IF;
  
  RETURN importance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to auto-update email fields
CREATE OR REPLACE FUNCTION update_email_auto_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-categorize importance
  NEW.importance_level := auto_categorize_email_importance(
    NEW.user_id, 
    NEW.from_address, 
    NEW.subject, 
    NEW.labels
  );
  
  -- Set snippet if not provided
  IF NEW.snippet IS NULL AND NEW.content_text IS NOT NULL THEN
    NEW.snippet := LEFT(NEW.content_text, 200) || '...';
  END IF;
  
  -- Extract from_name if not provided
  IF NEW.from_name IS NULL THEN
    NEW.from_name := SPLIT_PART(NEW.from_address, '@', 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating email fields
CREATE TRIGGER update_email_auto_fields_trigger
  BEFORE INSERT OR UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION update_email_auto_fields();

-- Add updated_at triggers
CREATE TRIGGER update_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Function to get emails with task and suggestion counts
CREATE OR REPLACE FUNCTION get_emails_with_counts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT false,
  p_scheduling_only BOOLEAN DEFAULT false
) RETURNS TABLE(
  email_id UUID,
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  snippet TEXT,
  is_unread BOOLEAN,
  importance_level TEXT,
  has_scheduling_content BOOLEAN,
  ai_analyzed BOOLEAN,
  task_count BIGINT,
  suggestion_count BIGINT,
  attachment_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as email_id,
    e.subject,
    e.from_address,
    e.from_name,
    e.received_at,
    e.snippet,
    e.is_unread,
    e.importance_level,
    e.has_scheduling_content,
    e.ai_analyzed,
    COALESCE(task_counts.task_count, 0) as task_count,
    COALESCE(suggestion_counts.suggestion_count, 0) as suggestion_count,
    e.attachment_count
  FROM public.emails e
  LEFT JOIN (
    SELECT source_email_record_id, COUNT(*) as task_count
    FROM public.tasks 
    WHERE user_id = p_user_id
    GROUP BY source_email_record_id
  ) task_counts ON e.id = task_counts.source_email_record_id
  LEFT JOIN (
    SELECT email_record_id, COUNT(*) as suggestion_count
    FROM public.ai_suggestions 
    WHERE user_id = p_user_id
    GROUP BY email_record_id
  ) suggestion_counts ON e.id = suggestion_counts.email_record_id
  WHERE e.user_id = p_user_id
  AND (NOT p_unread_only OR e.is_unread = true)
  AND (NOT p_scheduling_only OR e.has_scheduling_content = true)
  ORDER BY e.received_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_email_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_important_sender(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_categorize_email_importance(UUID, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_emails_with_counts(UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;

-- Grant permissions on new tables
GRANT ALL ON public.emails TO authenticated;
GRANT ALL ON public.email_attachments TO authenticated;