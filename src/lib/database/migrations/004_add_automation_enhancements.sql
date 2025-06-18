-- =====================================================
-- B Free.AI Automation Enhancement
-- Migration 004: Add automation and integration enhancements
-- =====================================================

-- Update processing_queue table to store email content
ALTER TABLE public.processing_queue 
ADD COLUMN IF NOT EXISTS content JSONB,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS data_type TEXT DEFAULT 'email';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processing_queue_content ON public.processing_queue USING GIN(content);
CREATE INDEX IF NOT EXISTS idx_processing_queue_metadata ON public.processing_queue USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_processing_queue_data_type ON public.processing_queue(data_type);

-- Update ai_suggestions table for better task conversion tracking
ALTER TABLE public.ai_suggestions 
ADD COLUMN IF NOT EXISTS converted_to_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS location TEXT;

-- Update ai_suggestions status enum to include new statuses
ALTER TYPE suggestion_status ADD VALUE IF NOT EXISTS 'auto_converted';
ALTER TYPE suggestion_status ADD VALUE IF NOT EXISTS 'converted';

-- Add index for conversion tracking
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_converted ON public.ai_suggestions(converted_to_task_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_converted_at ON public.ai_suggestions(converted_at);

-- Create automation_logs table for tracking automation activities
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  automation_type TEXT NOT NULL, -- 'daily_process', 'webhook', 'manual'
  trigger_source TEXT, -- 'cron', 'webhook', 'user'
  
  -- Input/Output metrics
  emails_processed INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  suggestions_generated INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  
  -- Processing details
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Results and metadata
  results JSONB,
  error_details JSONB,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on automation_logs table
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_logs table
CREATE POLICY "Users can view own automation logs" ON public.automation_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert automation logs" ON public.automation_logs
  FOR INSERT WITH CHECK (true); -- Allow system inserts

-- Indexes for automation_logs
CREATE INDEX idx_automation_logs_user_id ON public.automation_logs(user_id);
CREATE INDEX idx_automation_logs_type ON public.automation_logs(automation_type);
CREATE INDEX idx_automation_logs_status ON public.automation_logs(status);
CREATE INDEX idx_automation_logs_start_time ON public.automation_logs(start_time);
CREATE INDEX idx_automation_logs_results ON public.automation_logs USING GIN(results);

-- Create automation statistics view
CREATE OR REPLACE VIEW public.automation_statistics AS
SELECT 
  user_id,
  automation_type,
  COUNT(*) as total_runs,
  SUM(emails_processed) as total_emails_processed,
  SUM(tasks_created) as total_tasks_created,
  SUM(suggestions_generated) as total_suggestions_generated,
  SUM(errors_count) as total_errors,
  AVG(duration_seconds) as avg_duration_seconds,
  MAX(start_time) as last_run_time,
  
  -- Success rate
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 
    2
  ) as success_rate,
  
  -- Recent performance (last 7 days)
  COUNT(*) FILTER (WHERE start_time >= NOW() - INTERVAL '7 days') as runs_last_7_days,
  SUM(tasks_created) FILTER (WHERE start_time >= NOW() - INTERVAL '7 days') as tasks_created_last_7_days

FROM public.automation_logs
WHERE start_time >= NOW() - INTERVAL '90 days' -- Last 90 days only
GROUP BY user_id, automation_type;

-- Grant permissions on the view
GRANT SELECT ON public.automation_statistics TO authenticated;

-- Add updated_at trigger to automation_logs
CREATE TRIGGER update_automation_logs_updated_at
  BEFORE UPDATE ON public.automation_logs
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Function to clean up old automation logs (older than 90 days)
CREATE OR REPLACE FUNCTION clean_old_automation_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.automation_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get automation health status
CREATE OR REPLACE FUNCTION get_automation_health(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  overall_health TEXT,
  issues JSONB,
  recommendations JSONB,
  last_successful_run TIMESTAMP WITH TIME ZONE,
  failure_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_logs AS (
    SELECT 
      al.user_id,
      al.status,
      al.start_time,
      al.automation_type,
      ROW_NUMBER() OVER (PARTITION BY al.user_id ORDER BY al.start_time DESC) as rn
    FROM public.automation_logs al
    WHERE (p_user_id IS NULL OR al.user_id = p_user_id)
    AND al.start_time >= NOW() - INTERVAL '7 days'
  ),
  user_stats AS (
    SELECT 
      rl.user_id,
      COUNT(*) as total_runs,
      COUNT(*) FILTER (WHERE rl.status = 'failed') as failed_runs,
      MAX(rl.start_time) FILTER (WHERE rl.status = 'completed') as last_success,
      COUNT(DISTINCT rl.automation_type) as automation_types
    FROM recent_logs rl
    WHERE rn <= 10 -- Last 10 runs per user
    GROUP BY rl.user_id
  )
  SELECT 
    us.user_id,
    CASE 
      WHEN us.failed_runs::DECIMAL / us.total_runs > 0.5 THEN 'poor'
      WHEN us.failed_runs::DECIMAL / us.total_runs > 0.2 THEN 'fair'
      WHEN us.last_success < NOW() - INTERVAL '2 days' THEN 'stale'
      ELSE 'good'
    END as overall_health,
    
    jsonb_build_object(
      'high_failure_rate', us.failed_runs::DECIMAL / us.total_runs > 0.2,
      'no_recent_success', us.last_success IS NULL OR us.last_success < NOW() - INTERVAL '2 days',
      'low_activity', us.total_runs < 3
    ) as issues,
    
    jsonb_build_object(
      'check_email_connection', us.failed_runs > us.total_runs / 2,
      'verify_api_limits', us.failed_runs > 2,
      'review_automation_settings', us.last_success < NOW() - INTERVAL '3 days'
    ) as recommendations,
    
    us.last_success as last_successful_run,
    ROUND(us.failed_runs::DECIMAL / us.total_runs, 3) as failure_rate
  FROM user_stats us;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION clean_old_automation_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_automation_health(UUID) TO authenticated;

-- Create indexes for the new task fields
CREATE INDEX IF NOT EXISTS idx_tasks_ai_generated_created ON public.tasks(ai_generated, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_source_email ON public.tasks(source_email_id) WHERE source_email_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_confidence_score ON public.tasks(confidence_score) WHERE confidence_score IS NOT NULL;

-- Update task_overview view to include automation metrics
DROP VIEW IF EXISTS public.task_overview;
CREATE VIEW public.task_overview AS
SELECT 
  t.*,
  CASE 
    WHEN t.due_date IS NOT NULL AND t.due_date < TIMEZONE('utc'::text, NOW()) AND t.status != 'completed' 
    THEN true 
    ELSE false 
  END as is_overdue,
  
  CASE 
    WHEN t.due_date IS NOT NULL AND t.due_date < TIMEZONE('utc'::text, NOW()) + INTERVAL '24 hours' AND t.status != 'completed'
    THEN true 
    ELSE false 
  END as is_due_soon,
  
  (SELECT COUNT(*) FROM public.tasks subtasks WHERE subtasks.parent_task_id = t.id) as subtask_count,
  (SELECT COUNT(*) FROM public.tasks subtasks WHERE subtasks.parent_task_id = t.id AND subtasks.status = 'completed') as completed_subtask_count,
  
  (SELECT COUNT(*) FROM public.task_comments tc WHERE tc.task_id = t.id) as comment_count,
  (SELECT COUNT(*) FROM public.task_attachments ta WHERE ta.task_id = t.id) as attachment_count,
  
  calculate_task_actual_duration(t.id) as calculated_actual_duration,
  
  -- Automation fields
  CASE WHEN t.ai_generated THEN 'AI' ELSE 'Manual' END as creation_source,
  CASE WHEN t.source_email_id IS NOT NULL THEN 'Email' ELSE 'Direct' END as task_origin

FROM public.tasks t;

-- Grant permissions on the updated view
GRANT SELECT ON public.task_overview TO authenticated;

-- Update RLS policy for the view
DROP POLICY IF EXISTS "Users can view own task overview" ON public.task_overview;
CREATE POLICY "Users can view own task overview" ON public.task_overview
  FOR SELECT USING (auth.uid() = user_id);

-- Add automation preferences to default user setup
CREATE OR REPLACE FUNCTION setup_default_automation_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default automation preferences
  INSERT INTO public.user_preferences (user_id, preference_key, preference_value)
  VALUES (
    NEW.id,
    'automation_settings',
    jsonb_build_object(
      'enabled', true,
      'autoCreateTasks', true,
      'confidenceThreshold', 0.7,
      'autoScheduleTasks', true,
      'dailyProcessing', true,
      'webhookProcessing', true,
      'maxEmailsPerDay', 50,
      'categories', jsonb_build_array('work', 'personal', 'project'),
      'excludedSenders', jsonb_build_array('noreply@', 'no-reply@', 'donotreply@'),
      'keywordFilters', jsonb_build_array(
        'meeting', 'schedule', 'appointment', 'call', 'conference',
        'task', 'todo', 'action item', 'deadline', 'due'
      )
    )
  ) ON CONFLICT (user_id, preference_key) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing user creation function
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Setup default task preferences
  PERFORM setup_default_task_preferences() FROM (SELECT NEW.id) as t(id);
  
  -- Setup default automation preferences
  PERFORM setup_default_automation_preferences() FROM (SELECT NEW.id) as t(id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.automation_logs TO authenticated;