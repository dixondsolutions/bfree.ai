-- =====================================================
-- B Free.AI Task Management Enhancement
-- Migration 003: Add Comprehensive Task Management System
-- =====================================================

-- Create task status enum
CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress', 
  'completed',
  'cancelled',
  'blocked',
  'deferred'
);

-- Create task priority enum
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create task category enum
CREATE TYPE task_category AS ENUM (
  'work',
  'personal', 
  'health',
  'finance',
  'education',
  'social',
  'household',
  'travel',
  'project',
  'other'
);

-- =====================================================
-- Create Tasks Table
-- =====================================================

CREATE TABLE public.tasks (
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

-- =====================================================
-- Create Task Dependencies Table
-- =====================================================

CREATE TABLE public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  depends_on_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Prevent duplicate dependencies and self-dependencies
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

-- =====================================================
-- Create Task Attachments Table
-- =====================================================

CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  file_type TEXT, -- MIME type
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =====================================================
-- Create Task Comments/Updates Table
-- =====================================================

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  is_system_comment BOOLEAN DEFAULT false, -- For AI-generated updates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =====================================================
-- Create Task Time Tracking Table
-- =====================================================

CREATE TABLE public.task_time_entries (
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

-- =====================================================
-- Enable RLS on all new tables
-- =====================================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS Policies
-- =====================================================

-- Tasks table policies
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Task dependencies policies
CREATE POLICY "Users can view dependencies for own tasks" ON public.task_dependencies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_dependencies.task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can insert dependencies for own tasks" ON public.task_dependencies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_dependencies.task_id AND tasks.user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_dependencies.depends_on_task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can update dependencies for own tasks" ON public.task_dependencies
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_dependencies.task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can delete dependencies for own tasks" ON public.task_dependencies
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_dependencies.task_id AND tasks.user_id = auth.uid())
  );

-- Task attachments policies
CREATE POLICY "Users can view attachments for own tasks" ON public.task_attachments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_attachments.task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can insert attachments for own tasks" ON public.task_attachments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_attachments.task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can update attachments for own tasks" ON public.task_attachments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_attachments.task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can delete attachments for own tasks" ON public.task_attachments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_attachments.task_id AND tasks.user_id = auth.uid())
  );

-- Task comments policies
CREATE POLICY "Users can view comments for own tasks" ON public.task_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_comments.task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can insert comments for own tasks" ON public.task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_comments.task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can update own comments" ON public.task_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.task_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Task time entries policies
CREATE POLICY "Users can view time entries for own tasks" ON public.task_time_entries
  FOR SELECT USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_time_entries.task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can insert time entries for own tasks" ON public.task_time_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_time_entries.task_id AND tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can update own time entries" ON public.task_time_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries" ON public.task_time_entries
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create Indexes for Performance
-- =====================================================

-- Tasks table indexes
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_priority ON public.tasks(user_id, priority);
CREATE INDEX idx_tasks_category ON public.tasks(user_id, category);
CREATE INDEX idx_tasks_due_date ON public.tasks(user_id, due_date);
CREATE INDEX idx_tasks_scheduled_start ON public.tasks(user_id, scheduled_start);
CREATE INDEX idx_tasks_ai_generated ON public.tasks(user_id, ai_generated);
CREATE INDEX idx_tasks_source_email ON public.tasks(source_email_id);
CREATE INDEX idx_tasks_parent_task ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_tags ON public.tasks USING GIN(tags);

-- Task dependencies indexes
CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);

-- Task attachments indexes
CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);

-- Task comments indexes
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);

-- Task time entries indexes
CREATE INDEX idx_task_time_entries_task_id ON public.task_time_entries(task_id);
CREATE INDEX idx_task_time_entries_user_id ON public.task_time_entries(user_id);
CREATE INDEX idx_task_time_entries_start_time ON public.task_time_entries(start_time);

-- =====================================================
-- Create Functions and Triggers
-- =====================================================

-- Function to calculate task duration from time entries
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

-- Function to update task duration trigger
CREATE OR REPLACE FUNCTION update_task_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the actual_duration in tasks table
  UPDATE public.tasks 
  SET actual_duration = calculate_task_actual_duration(COALESCE(NEW.task_id, OLD.task_id))
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update task duration
CREATE TRIGGER task_time_entry_duration_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.task_time_entries
  FOR EACH ROW EXECUTE FUNCTION update_task_duration();

-- Function to auto-complete parent tasks when all subtasks are completed
CREATE OR REPLACE FUNCTION check_parent_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- If this task has a parent and is now completed
  IF NEW.parent_task_id IS NOT NULL AND NEW.status = 'completed' THEN
    -- Check if all sibling tasks are completed
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE parent_task_id = NEW.parent_task_id 
      AND status != 'completed' 
      AND id != NEW.id
    ) THEN
      -- Auto-complete parent task
      UPDATE public.tasks 
      SET status = 'completed', completed_at = TIMEZONE('utc'::text, NOW())
      WHERE id = NEW.parent_task_id AND status != 'completed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for parent task completion
CREATE TRIGGER task_parent_completion_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION check_parent_task_completion();

-- Function to prevent circular dependencies
CREATE OR REPLACE FUNCTION prevent_circular_dependency()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if adding this dependency would create a cycle
  IF EXISTS (
    WITH RECURSIVE dependency_chain AS (
      -- Start with the new dependency
      SELECT NEW.depends_on_task_id as task_id, NEW.task_id as depends_on
      
      UNION ALL
      
      -- Follow the chain
      SELECT td.depends_on_task_id, dc.depends_on
      FROM public.task_dependencies td
      JOIN dependency_chain dc ON td.task_id = dc.task_id
      WHERE td.depends_on_task_id = dc.depends_on -- This would create a cycle
    )
    SELECT 1 FROM dependency_chain LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Circular dependency detected. Cannot add this dependency.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent circular dependencies
CREATE TRIGGER prevent_task_circular_dependency
  BEFORE INSERT OR UPDATE ON public.task_dependencies
  FOR EACH ROW EXECUTE FUNCTION prevent_circular_dependency();

-- Add updated_at triggers to new tables
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_task_time_entries_updated_at
  BEFORE UPDATE ON public.task_time_entries
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- =====================================================
-- Create Helpful Views
-- =====================================================

-- View for task overview with computed fields
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
  
  calculate_task_actual_duration(t.id) as calculated_actual_duration

FROM public.tasks t;

-- Grant permissions on the view
GRANT SELECT ON public.task_overview TO authenticated;

-- Create RLS policy for the view
ALTER VIEW public.task_overview ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own task overview" ON public.task_overview
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- Create Task Analytics Functions
-- =====================================================

-- Function to get task completion statistics
CREATE OR REPLACE FUNCTION get_task_completion_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_tasks INTEGER,
  completed_tasks INTEGER,
  completion_rate DECIMAL,
  avg_completion_time_days DECIMAL,
  tasks_by_priority JSONB,
  tasks_by_category JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH task_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total,
      COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed,
      AVG(CASE 
        WHEN status = 'completed' AND completed_at IS NOT NULL AND created_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (completed_at - created_at))/86400 -- Convert to days
      END) as avg_days
    FROM public.tasks
    WHERE user_id = p_user_id 
    AND created_at >= TIMEZONE('utc'::text, NOW()) - (p_days || ' days')::INTERVAL
  ),
  priority_stats AS (
    SELECT jsonb_object_agg(priority, count) as priority_breakdown
    FROM (
      SELECT priority, COUNT(*)::INTEGER as count
      FROM public.tasks
      WHERE user_id = p_user_id 
      AND created_at >= TIMEZONE('utc'::text, NOW()) - (p_days || ' days')::INTERVAL
      GROUP BY priority
    ) ps
  ),
  category_stats AS (
    SELECT jsonb_object_agg(category, count) as category_breakdown
    FROM (
      SELECT category, COUNT(*)::INTEGER as count
      FROM public.tasks
      WHERE user_id = p_user_id 
      AND created_at >= TIMEZONE('utc'::text, NOW()) - (p_days || ' days')::INTERVAL
      GROUP BY category
    ) cs
  )
  SELECT 
    ts.total,
    ts.completed,
    CASE WHEN ts.total > 0 THEN ROUND((ts.completed::DECIMAL / ts.total) * 100, 2) ELSE 0 END,
    ROUND(ts.avg_days::DECIMAL, 2),
    ps.priority_breakdown,
    cs.category_breakdown
  FROM task_stats ts, priority_stats ps, category_stats cs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_task_completion_stats(UUID, INTEGER) TO authenticated;

-- =====================================================
-- Update AI Suggestions table to support tasks
-- =====================================================

-- Add task-specific fields to ai_suggestions table
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS task_category task_category;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS estimated_duration INTEGER; -- in minutes
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS suggested_due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5);
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS suggested_tags TEXT[];

-- Add index for new fields
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_task_category ON public.ai_suggestions(user_id, task_category);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_suggested_due_date ON public.ai_suggestions(user_id, suggested_due_date);

-- =====================================================
-- Create Initial Data and Configuration
-- =====================================================

-- Insert default task categories into user preferences for new users
CREATE OR REPLACE FUNCTION setup_default_task_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default task management preferences
  INSERT INTO public.user_preferences (user_id, preference_key, preference_value)
  VALUES (
    NEW.id,
    'task_preferences',
    jsonb_build_object(
      'default_category', 'work',
      'default_priority', 'medium',
      'default_estimated_duration', 30,
      'auto_schedule_tasks', true,
      'preferred_task_times', jsonb_build_array('09:00', '14:00'),
      'energy_level_mapping', jsonb_build_object(
        'high', jsonb_build_array('09:00', '10:00', '14:00', '15:00'),
        'medium', jsonb_build_array('11:00', '13:00', '16:00'),
        'low', jsonb_build_array('12:00', '17:00', '18:00')
      ),
      'task_categories', jsonb_build_array(
        'work', 'personal', 'health', 'finance', 'education', 
        'social', 'household', 'travel', 'project'
      )
    )
  ) ON CONFLICT (user_id, preference_key) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing user creation trigger to include task preferences
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.task_dependencies TO authenticated;
GRANT ALL ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_comments TO authenticated;
GRANT ALL ON public.task_time_entries TO authenticated;