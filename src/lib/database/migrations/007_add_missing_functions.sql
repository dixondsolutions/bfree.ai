-- =====================================================
-- B Free.AI Missing Database Functions
-- Migration 007: Add missing functions referenced in API routes
-- =====================================================

-- Function to get comprehensive email-task calendar data
CREATE OR REPLACE FUNCTION get_email_task_calendar_data(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS TABLE(
  email_id UUID,
  gmail_id TEXT,
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  importance_level TEXT,
  processing_status TEXT,
  task_id UUID,
  task_title TEXT,
  task_status TEXT,
  task_priority TEXT,
  task_category TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_duration INTEGER,
  ai_generated BOOLEAN,
  confidence_score DECIMAL,
  task_created_at TIMESTAMP WITH TIME ZONE,
  suggestion_id UUID,
  suggestion_status TEXT,
  suggested_time TIMESTAMP WITH TIME ZONE,
  suggestion_type TEXT,
  suggestion_confidence DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as email_id,
    e.gmail_id,
    e.subject,
    e.from_address,
    e.from_name,
    e.received_at,
    e.importance_level,
    
    -- Determine processing status
    CASE 
      WHEN t.id IS NOT NULL THEN 'task_created'
      WHEN s.id IS NOT NULL THEN 'suggestion_pending'
      WHEN e.ai_analyzed = true THEN 'no_action_needed'
      ELSE 'not_analyzed'
    END as processing_status,
    
    -- Task data
    t.id as task_id,
    t.title as task_title,
    t.status as task_status,
    t.priority as task_priority,
    t.category as task_category,
    t.scheduled_start,
    t.scheduled_end,
    t.due_date,
    t.estimated_duration,
    t.ai_generated,
    t.confidence_score,
    t.created_at as task_created_at,
    
    -- Suggestion data
    s.id as suggestion_id,
    s.status as suggestion_status,
    s.suggested_due_date as suggested_time,
    s.suggestion_type,
    s.confidence_score as suggestion_confidence
    
  FROM public.emails e
  LEFT JOIN public.tasks t ON e.id = t.source_email_record_id AND t.user_id = p_user_id
  LEFT JOIN public.ai_suggestions s ON e.id = s.email_record_id AND s.user_id = p_user_id
  WHERE e.user_id = p_user_id
  AND e.received_at BETWEEN p_start_date AND p_end_date
  ORDER BY e.received_at DESC, t.created_at ASC, s.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active email account tokens (referenced in migrations but may be missing)
CREATE OR REPLACE FUNCTION get_active_email_account_tokens(
  p_user_id UUID
) RETURNS TABLE(
  account_id UUID,
  email TEXT,
  provider TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id as account_id,
    ea.email,
    ea.provider,
    ea.access_token,
    ea.refresh_token,
    ea.expires_at,
    ea.last_sync
  FROM public.email_accounts ea
  WHERE ea.user_id = p_user_id
  AND ea.is_active = true
  AND ea.status = 'connected'
  ORDER BY ea.last_sync DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get processing queue statistics 
CREATE OR REPLACE FUNCTION get_processing_queue_stats(
  p_user_id UUID DEFAULT NULL
) RETURNS TABLE(
  user_id UUID,
  pending_count BIGINT,
  processing_count BIGINT,
  failed_count BIGINT,
  completed_count BIGINT,
  total_count BIGINT,
  avg_processing_time_minutes DECIMAL,
  oldest_pending_age_hours DECIMAL,
  error_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pq.user_id,
    COUNT(*) FILTER (WHERE pq.status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE pq.status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE pq.status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE pq.status = 'completed') as completed_count,
    COUNT(*) as total_count,
    
    -- Average processing time for completed items
    COALESCE(
      ROUND(
        AVG(EXTRACT(EPOCH FROM (pq.processed_at - pq.created_at)) / 60.0) 
        FILTER (WHERE pq.status = 'completed' AND pq.processed_at IS NOT NULL), 
        2
      ), 
      0
    ) as avg_processing_time_minutes,
    
    -- Age of oldest pending item in hours
    COALESCE(
      ROUND(
        EXTRACT(EPOCH FROM (NOW() - MIN(pq.created_at) FILTER (WHERE pq.status = 'pending'))) / 3600.0,
        2
      ),
      0
    ) as oldest_pending_age_hours,
    
    -- Error rate percentage
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE pq.status = 'failed')::DECIMAL / COUNT(*)) * 100, 2)
      ELSE 0
    END as error_rate
    
  FROM public.processing_queue pq
  WHERE (p_user_id IS NULL OR pq.user_id = p_user_id)
  GROUP BY pq.user_id
  ORDER BY pq.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old processing queue entries
CREATE OR REPLACE FUNCTION cleanup_old_processing_queue(
  p_days_old INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete completed entries older than specified days
  DELETE FROM public.processing_queue
  WHERE status = 'completed'
  AND processed_at < NOW() - INTERVAL '1 day' * p_days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also delete failed entries that are very old and have high retry counts
  DELETE FROM public.processing_queue
  WHERE status = 'failed'
  AND retry_count >= 3
  AND created_at < NOW() - INTERVAL '1 day' * (p_days_old / 2);
  
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to optimize email search with better text search
CREATE OR REPLACE FUNCTION search_emails_advanced(
  p_user_id UUID,
  p_search_query TEXT,
  p_search_fields TEXT[] DEFAULT ARRAY['subject', 'content_text', 'from_address'],
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE(
  email_id UUID,
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  snippet TEXT,
  importance_level TEXT,
  match_score REAL,
  match_field TEXT
) AS $$
DECLARE
  search_tsquery TSQUERY;
  base_query TEXT;
BEGIN
  -- Convert search query to tsquery for full-text search
  search_tsquery := websearch_to_tsquery('english', p_search_query);
  
  RETURN QUERY
  SELECT 
    e.id as email_id,
    e.subject,
    e.from_address,
    e.from_name,
    e.received_at,
    e.snippet,
    e.importance_level,
    
    -- Calculate relevance score based on which field matched
    CASE 
      WHEN 'subject' = ANY(p_search_fields) AND e.subject ILIKE '%' || p_search_query || '%' THEN 1.0
      WHEN 'from_address' = ANY(p_search_fields) AND e.from_address ILIKE '%' || p_search_query || '%' THEN 0.8
      WHEN 'content_text' = ANY(p_search_fields) AND e.content_text IS NOT NULL 
           AND to_tsvector('english', e.content_text) @@ search_tsquery THEN 0.6
      ELSE 0.3
    END as match_score,
    
    -- Identify which field matched
    CASE 
      WHEN 'subject' = ANY(p_search_fields) AND e.subject ILIKE '%' || p_search_query || '%' THEN 'subject'
      WHEN 'from_address' = ANY(p_search_fields) AND e.from_address ILIKE '%' || p_search_query || '%' THEN 'from_address'
      WHEN 'content_text' = ANY(p_search_fields) AND e.content_text IS NOT NULL 
           AND to_tsvector('english', e.content_text) @@ search_tsquery THEN 'content'
      ELSE 'partial_match'
    END as match_field
    
  FROM public.emails e
  WHERE e.user_id = p_user_id
  AND (
    ('subject' = ANY(p_search_fields) AND e.subject ILIKE '%' || p_search_query || '%') OR
    ('from_address' = ANY(p_search_fields) AND e.from_address ILIKE '%' || p_search_query || '%') OR
    ('content_text' = ANY(p_search_fields) AND e.content_text IS NOT NULL 
     AND to_tsvector('english', e.content_text) @@ search_tsquery)
  )
  ORDER BY match_score DESC, e.received_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_email_task_calendar_data(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_email_account_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_processing_queue_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_processing_queue(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_emails_advanced(UUID, TEXT, TEXT[], INTEGER, INTEGER) TO authenticated;

-- Create indexes for better performance of new functions
CREATE INDEX IF NOT EXISTS idx_emails_received_at_range ON public.emails(user_id, received_at) 
WHERE received_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_source_email_record_user ON public.tasks(user_id, source_email_record_id) 
WHERE source_email_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_email_record_user ON public.ai_suggestions(user_id, email_record_id) 
WHERE email_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processing_queue_status_user ON public.processing_queue(user_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_email_accounts_active_user ON public.email_accounts(user_id, is_active, status) 
WHERE is_active = true;