-- =====================================================
-- B Free.AI Email Performance Optimizations
-- Migration 008: Optimize email listing and search performance
-- =====================================================

-- Add composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_user_received_unread 
ON public.emails(user_id, received_at DESC, is_unread) 
WHERE is_unread = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_user_received_scheduling 
ON public.emails(user_id, received_at DESC, has_scheduling_content) 
WHERE has_scheduling_content = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_user_received_importance 
ON public.emails(user_id, received_at DESC, importance_level);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_user_ai_analyzed 
ON public.emails(user_id, received_at DESC, ai_analyzed) 
WHERE ai_analyzed = true;

-- Add full-text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_search_content 
ON public.emails USING gin(to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(content_text, '') || ' ' || coalesce(from_name, '') || ' ' || coalesce(from_address, '')));

-- Add index for attachment filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_user_attachments 
ON public.emails(user_id, received_at DESC, has_attachments) 
WHERE has_attachments = true;

-- Add index for from_address filtering (common for sender-specific searches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_user_from_address 
ON public.emails(user_id, from_address, received_at DESC);

-- Optimized function for getting emails with counts and advanced filtering
CREATE OR REPLACE FUNCTION get_emails_with_advanced_filtering(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT false,
  p_scheduling_only BOOLEAN DEFAULT false,
  p_importance_level TEXT DEFAULT NULL,
  p_has_attachments BOOLEAN DEFAULT NULL,
  p_from_address TEXT DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
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
  attachment_count INTEGER,
  labels TEXT[]
) AS $$
DECLARE
  base_query TEXT;
  where_conditions TEXT := '';
  order_clause TEXT := 'ORDER BY e.received_at DESC';
  full_query TEXT;
BEGIN
  -- Build base query with optimized joins
  base_query := '
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
      e.attachment_count,
      e.labels
    FROM public.emails e
    LEFT JOIN (
      SELECT source_email_record_id, COUNT(*) as task_count
      FROM public.tasks 
      WHERE user_id = $1
      GROUP BY source_email_record_id
    ) task_counts ON e.id = task_counts.source_email_record_id
    LEFT JOIN (
      SELECT email_record_id, COUNT(*) as suggestion_count
      FROM public.ai_suggestions 
      WHERE user_id = $1
      GROUP BY email_record_id
    ) suggestion_counts ON e.id = suggestion_counts.email_record_id';

  -- Build WHERE conditions
  where_conditions := 'WHERE e.user_id = $1';
  
  IF p_unread_only THEN
    where_conditions := where_conditions || ' AND e.is_unread = true';
  END IF;
  
  IF p_scheduling_only THEN
    where_conditions := where_conditions || ' AND e.has_scheduling_content = true';
  END IF;
  
  IF p_importance_level IS NOT NULL THEN
    where_conditions := where_conditions || ' AND e.importance_level = ''' || p_importance_level || '''';
  END IF;
  
  IF p_has_attachments IS NOT NULL THEN
    where_conditions := where_conditions || ' AND e.has_attachments = ' || p_has_attachments;
  END IF;
  
  IF p_from_address IS NOT NULL THEN
    where_conditions := where_conditions || ' AND e.from_address ILIKE ''%' || p_from_address || '%''';
  END IF;
  
  IF p_date_from IS NOT NULL THEN
    where_conditions := where_conditions || ' AND e.received_at >= ''' || p_date_from || '''';
  END IF;
  
  IF p_date_to IS NOT NULL THEN
    where_conditions := where_conditions || ' AND e.received_at <= ''' || p_date_to || '''';
  END IF;
  
  -- Full-text search if query provided
  IF p_search_query IS NOT NULL AND length(trim(p_search_query)) > 0 THEN
    where_conditions := where_conditions || 
      ' AND to_tsvector(''english'', coalesce(e.subject, '''') || '' '' || coalesce(e.content_text, '''') || '' '' || coalesce(e.from_name, '''') || '' '' || coalesce(e.from_address, '''')) @@ plainto_tsquery(''english'', ''' || p_search_query || ''')';
  END IF;

  -- Combine query parts
  full_query := base_query || ' ' || where_conditions || ' ' || order_clause || 
                ' LIMIT ' || p_limit || ' OFFSET ' || p_offset;

  -- Execute and return
  RETURN QUERY EXECUTE full_query USING p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Performance-optimized function for email counts only (for pagination)
CREATE OR REPLACE FUNCTION get_email_count_with_filters(
  p_user_id UUID,
  p_unread_only BOOLEAN DEFAULT false,
  p_scheduling_only BOOLEAN DEFAULT false,
  p_importance_level TEXT DEFAULT NULL,
  p_has_attachments BOOLEAN DEFAULT NULL,
  p_from_address TEXT DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  where_conditions TEXT := 'WHERE user_id = $1';
  count_query TEXT;
  result_count INTEGER;
BEGIN
  -- Build WHERE conditions (same logic as main function)
  IF p_unread_only THEN
    where_conditions := where_conditions || ' AND is_unread = true';
  END IF;
  
  IF p_scheduling_only THEN
    where_conditions := where_conditions || ' AND has_scheduling_content = true';
  END IF;
  
  IF p_importance_level IS NOT NULL THEN
    where_conditions := where_conditions || ' AND importance_level = ''' || p_importance_level || '''';
  END IF;
  
  IF p_has_attachments IS NOT NULL THEN
    where_conditions := where_conditions || ' AND has_attachments = ' || p_has_attachments;
  END IF;
  
  IF p_from_address IS NOT NULL THEN
    where_conditions := where_conditions || ' AND from_address ILIKE ''%' || p_from_address || '%''';
  END IF;
  
  IF p_date_from IS NOT NULL THEN
    where_conditions := where_conditions || ' AND received_at >= ''' || p_date_from || '''';
  END IF;
  
  IF p_date_to IS NOT NULL THEN
    where_conditions := where_conditions || ' AND received_at <= ''' || p_date_to || '''';
  END IF;
  
  IF p_search_query IS NOT NULL AND length(trim(p_search_query)) > 0 THEN
    where_conditions := where_conditions || 
      ' AND to_tsvector(''english'', coalesce(subject, '''') || '' '' || coalesce(content_text, '''') || '' '' || coalesce(from_name, '''') || '' '' || coalesce(from_address, '''')) @@ plainto_tsquery(''english'', ''' || p_search_query || ''')';
  END IF;

  count_query := 'SELECT COUNT(*) FROM public.emails ' || where_conditions;
  
  EXECUTE count_query INTO result_count USING p_user_id;
  
  RETURN result_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for getting email statistics with caching
CREATE OR REPLACE FUNCTION get_user_email_stats_cached(p_user_id UUID)
RETURNS TABLE(
  total_emails BIGINT,
  unread_emails BIGINT,
  scheduled_emails BIGINT,
  ai_analyzed_emails BIGINT,
  high_importance_emails BIGINT,
  emails_with_attachments BIGINT,
  recent_emails_7d BIGINT,
  recent_emails_24h BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_emails,
    COUNT(*) FILTER (WHERE is_unread = true) as unread_emails,
    COUNT(*) FILTER (WHERE has_scheduling_content = true) as scheduled_emails,
    COUNT(*) FILTER (WHERE ai_analyzed = true) as ai_analyzed_emails,
    COUNT(*) FILTER (WHERE importance_level = 'high') as high_importance_emails,
    COUNT(*) FILTER (WHERE has_attachments = true) as emails_with_attachments,
    COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '7 days') as recent_emails_7d,
    COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '1 day') as recent_emails_24h
  FROM public.emails
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create materialized view for frequently accessed sender statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.email_sender_stats AS
SELECT 
  user_id,
  from_address,
  from_name,
  COUNT(*) as email_count,
  COUNT(*) FILTER (WHERE is_unread = true) as unread_count,
  COUNT(*) FILTER (WHERE has_scheduling_content = true) as scheduling_count,
  COUNT(*) FILTER (WHERE importance_level = 'high') as high_importance_count,
  MAX(received_at) as latest_email_date,
  MIN(received_at) as earliest_email_date
FROM public.emails
GROUP BY user_id, from_address, from_name
HAVING COUNT(*) >= 2; -- Only include senders with 2+ emails

-- Index for sender stats materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sender_stats_user_from 
ON public.email_sender_stats(user_id, from_address);

-- Function to refresh sender stats (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_email_sender_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.email_sender_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create optimized view for email list display
CREATE OR REPLACE VIEW public.email_list_optimized AS
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
  e.attachment_count,
  e.user_id,
  COALESCE(task_counts.task_count, 0) as task_count,
  COALESCE(suggestion_counts.suggestion_count, 0) as suggestion_count
FROM public.emails e
LEFT JOIN (
  SELECT source_email_record_id, COUNT(*) as task_count
  FROM public.tasks 
  GROUP BY source_email_record_id
) task_counts ON e.id = task_counts.source_email_record_id
LEFT JOIN (
  SELECT email_record_id, COUNT(*) as suggestion_count
  FROM public.ai_suggestions 
  GROUP BY email_record_id
) suggestion_counts ON e.id = suggestion_counts.email_record_id;

-- Grant permissions on new functions and views
GRANT EXECUTE ON FUNCTION get_emails_with_advanced_filtering(UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN, TEXT, BOOLEAN, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_count_with_filters(UUID, BOOLEAN, BOOLEAN, TEXT, BOOLEAN, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email_stats_cached(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_email_sender_stats() TO authenticated;
GRANT SELECT ON public.email_sender_stats TO authenticated;
GRANT SELECT ON public.email_list_optimized TO authenticated;

-- Add RLS policies for new objects
ALTER MATERIALIZED VIEW public.email_sender_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sender stats" ON public.email_sender_stats
  FOR SELECT USING (auth.uid() = user_id);

ALTER VIEW public.email_list_optimized ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own email list" ON public.email_list_optimized
  FOR SELECT USING (auth.uid() = user_id);

-- Function to automatically update sender stats when emails are inserted/updated
CREATE OR REPLACE FUNCTION trigger_refresh_sender_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule a refresh of sender stats (in practice, you might want to batch this)
  -- For now, we'll just note that a refresh is needed
  -- In production, you'd implement this with a job queue
  PERFORM pg_notify('refresh_sender_stats', NEW.user_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic sender stats refresh
DROP TRIGGER IF EXISTS update_sender_stats_trigger ON public.emails;
CREATE TRIGGER update_sender_stats_trigger
  AFTER INSERT OR UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_sender_stats();

-- Update existing get_emails_with_counts function to use new optimizations
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
  -- Use the optimized view and more efficient approach
  RETURN QUERY
  SELECT 
    elo.email_id,
    elo.subject,
    elo.from_address,
    elo.from_name,
    elo.received_at,
    elo.snippet,
    elo.is_unread,
    elo.importance_level,
    elo.has_scheduling_content,
    elo.ai_analyzed,
    elo.task_count,
    elo.suggestion_count,
    elo.attachment_count
  FROM public.email_list_optimized elo
  WHERE elo.user_id = p_user_id
  AND (NOT p_unread_only OR elo.is_unread = true)
  AND (NOT p_scheduling_only OR elo.has_scheduling_content = true)
  ORDER BY elo.received_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;