-- =====================================================
-- B Free.AI Calendar and Widget Data Fix
-- Migration 006: Fix missing components for Calendar and Widget functionality
-- =====================================================

-- Add missing enum values to task_status
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'pending_schedule';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'scheduled';

-- Ensure all required fields exist in ai_suggestions table
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS task_category task_category;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS estimated_duration INTEGER; -- in minutes
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS suggested_due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5);
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS suggested_tags TEXT[];
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS converted_to_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS location TEXT;

-- Add missing dependency count field to task_overview view
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
  (SELECT COUNT(*) FROM public.task_dependencies td WHERE td.task_id = t.id) as dependency_count,
  
  calculate_task_actual_duration(t.id) as calculated_actual_duration,
  
  -- Progress calculation
  CASE 
    WHEN (SELECT COUNT(*) FROM public.tasks subtasks WHERE subtasks.parent_task_id = t.id) = 0 THEN
      CASE WHEN t.status = 'completed' THEN 100 ELSE 0 END
    ELSE
      COALESCE(
        ROUND(
          (SELECT COUNT(*) FROM public.tasks subtasks WHERE subtasks.parent_task_id = t.id AND subtasks.status = 'completed')::DECIMAL / 
          (SELECT COUNT(*) FROM public.tasks subtasks WHERE subtasks.parent_task_id = t.id)::DECIMAL * 100
        ), 0
      )
  END as progress_percentage,
  
  -- Automation and source fields
  CASE WHEN t.ai_generated THEN 'AI' ELSE 'Manual' END as creation_source,
  CASE WHEN t.source_email_id IS NOT NULL THEN 'Email' ELSE 'Direct' END as task_origin

FROM public.tasks t;

-- Grant permissions on the updated view
GRANT SELECT ON public.task_overview TO authenticated;

-- Update RLS policy for the view
DROP POLICY IF EXISTS "Users can view own task overview" ON public.task_overview;
CREATE POLICY "Users can view own task overview" ON public.task_overview
  FOR SELECT USING (auth.uid() = user_id);

-- Ensure all required tables exist and are properly configured
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic task information
  title TEXT NOT NULL,
  description TEXT,
  category task_category DEFAULT 'other',
  
  -- Status and priority
  status task_status DEFAULT 'pending',
  priority task_priority DEFAULT 'medium',
  
  -- Timing information
  estimated_duration INTEGER, -- in minutes
  actual_duration INTEGER, -- in minutes (when completed)
  due_date TIMESTAMP WITH TIME ZONE,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- AI and source tracking
  ai_generated BOOLEAN DEFAULT false,
  source_email_id TEXT, -- Reference to email that generated this task
  source_suggestion_id UUID REFERENCES public.ai_suggestions(id) ON DELETE SET NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Task relationships
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id UUID, -- For future project management integration
  
  -- Additional metadata
  location TEXT,
  tags TEXT[], -- Array of tags for flexible categorization
  notes TEXT, -- Additional notes or context
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5), -- 1=low, 5=high energy required
  
  -- Recurrence information
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB, -- Store recurrence rules as JSON
  
  -- External integration
  external_id TEXT, -- For integration with other task management tools
  external_source TEXT, -- Source system (e.g., 'gmail', 'slack', 'manual')
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Constraints
  CHECK (scheduled_end IS NULL OR scheduled_start IS NULL OR scheduled_end > scheduled_start),
  CHECK (completed_at IS NULL OR status = 'completed'),
  CHECK (parent_task_id IS NULL OR parent_task_id != id) -- Prevent self-reference
);

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  depends_on_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT DEFAULT 'finish_to_start',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  file_type TEXT, -- MIME type
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  is_system_comment BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.task_time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in minutes, calculated field
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  CHECK (end_time IS NULL OR end_time > start_time)
);

-- Ensure RLS is enabled on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

-- Ensure all necessary indexes exist
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_start ON public.tasks(user_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_end ON public.tasks(user_id, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_tasks_ai_generated ON public.tasks(user_id, ai_generated);

-- Add indexes for ai_suggestions
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON public.ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON public.ai_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_converted ON public.ai_suggestions(converted_to_task_id);

-- Create or replace the task duration calculation function
CREATE OR REPLACE FUNCTION calculate_task_actual_duration(p_task_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_duration INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (end_time - start_time))/60
      ELSE 0
    END
  ), 0)::INTEGER
  INTO total_duration
  FROM public.task_time_entries
  WHERE task_id = p_task_id;
  
  RETURN total_duration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION calculate_task_actual_duration(UUID) TO authenticated;

-- Create a function specifically for task statistics that doesn't rely on task_overview
CREATE OR REPLACE FUNCTION get_task_stats_for_period(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
  total_tasks INTEGER,
  completed_tasks INTEGER,
  pending_tasks INTEGER,
  in_progress_tasks INTEGER,
  overdue_tasks INTEGER,
  ai_generated_tasks INTEGER,
  average_completion_time_hours DECIMAL,
  productivity_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH task_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total,
      COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed,
      COUNT(CASE WHEN status = 'pending' THEN 1 END)::INTEGER as pending,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::INTEGER as in_progress,
      COUNT(CASE WHEN due_date IS NOT NULL AND due_date < TIMEZONE('utc'::text, NOW()) AND status != 'completed' THEN 1 END)::INTEGER as overdue,
      COUNT(CASE WHEN ai_generated = true THEN 1 END)::INTEGER as ai_generated,
      AVG(CASE 
        WHEN status = 'completed' AND completed_at IS NOT NULL AND created_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (completed_at - created_at))/3600 -- Convert to hours
      END) as avg_completion_hours
    FROM public.tasks
    WHERE user_id = p_user_id 
    AND created_at >= p_start_date
    AND created_at <= p_end_date
  )
  SELECT 
    ts.total,
    ts.completed,
    ts.pending,
    ts.in_progress,
    ts.overdue,
    ts.ai_generated,
    ROUND(COALESCE(ts.avg_completion_hours, 0)::DECIMAL, 2),
    CASE 
      WHEN ts.total = 0 THEN 0
      ELSE ROUND(((ts.completed::DECIMAL / ts.total) * 0.7 + 
                 (CASE WHEN ts.overdue = 0 THEN 1.0 ELSE GREATEST(0, 1.0 - (ts.overdue::DECIMAL / ts.total)) END) * 0.3) * 100)::INTEGER
    END as productivity_score
  FROM task_stats ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_task_stats_for_period(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Ensure events table exists
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  calendar_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  attendees JSONB,
  ai_generated BOOLEAN DEFAULT false,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  CHECK (end_time > start_time)
);

-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for events
CREATE POLICY IF NOT EXISTS "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own events" ON public.events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own events" ON public.events
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON public.events(user_id, end_time);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.task_dependencies TO authenticated;
GRANT ALL ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_comments TO authenticated;
GRANT ALL ON public.task_time_entries TO authenticated;
GRANT ALL ON public.events TO authenticated;