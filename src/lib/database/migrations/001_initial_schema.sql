-- =====================================================
-- B Free.AI Database Schema
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Create Users Table (extends auth.users)
-- =====================================================

CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  working_hours_start TIME DEFAULT '09:00:00',
  working_hours_end TIME DEFAULT '17:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- Create Email Accounts Table
-- =====================================================

CREATE TABLE public.email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gmail',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, email, provider)
);

-- Enable RLS on email_accounts table
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_accounts table
CREATE POLICY "Users can view own email accounts" ON public.email_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email accounts" ON public.email_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email accounts" ON public.email_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email accounts" ON public.email_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create Calendars Table
-- =====================================================

CREATE TABLE public.calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  provider_calendar_id TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, provider_calendar_id, provider)
);

-- Enable RLS on calendars table
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendars table
CREATE POLICY "Users can view own calendars" ON public.calendars
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendars" ON public.calendars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendars" ON public.calendars
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendars" ON public.calendars
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create Events Table
-- =====================================================

CREATE TYPE event_status AS ENUM ('pending', 'confirmed', 'cancelled', 'rejected');

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  ai_generated BOOLEAN DEFAULT false,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_email_id TEXT,
  status event_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (end_time > start_time)
);

-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS policies for events table
CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.events
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create AI Suggestions Table
-- =====================================================

CREATE TYPE suggestion_type AS ENUM ('meeting', 'task', 'deadline', 'reminder');
CREATE TYPE suggestion_status AS ENUM ('pending', 'approved', 'rejected', 'processed');

CREATE TABLE public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  source_email_id TEXT NOT NULL,
  suggestion_type suggestion_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  suggested_time TIMESTAMP WITH TIME ZONE,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status suggestion_status DEFAULT 'pending',
  feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on ai_suggestions table
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_suggestions table
CREATE POLICY "Users can view own AI suggestions" ON public.ai_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI suggestions" ON public.ai_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI suggestions" ON public.ai_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI suggestions" ON public.ai_suggestions
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create User Preferences Table
-- =====================================================

CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, preference_key)
);

-- Enable RLS on user_preferences table
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences table
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON public.user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create Processing Queue Table
-- =====================================================

CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying');

CREATE TABLE public.processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  email_id TEXT NOT NULL,
  status processing_status DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on processing_queue table
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for processing_queue table
CREATE POLICY "Users can view own processing queue" ON public.processing_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own processing queue" ON public.processing_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processing queue" ON public.processing_queue
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- Create Indexes for Performance
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_email ON public.users(email);

-- Email accounts table indexes
CREATE INDEX idx_email_accounts_user_id ON public.email_accounts(user_id);
CREATE INDEX idx_email_accounts_active ON public.email_accounts(user_id, is_active);

-- Calendars table indexes
CREATE INDEX idx_calendars_user_id ON public.calendars(user_id);
CREATE INDEX idx_calendars_primary ON public.calendars(user_id, is_primary);

-- Events table indexes
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_calendar_id ON public.events(calendar_id);
CREATE INDEX idx_events_time_range ON public.events(user_id, start_time, end_time);
CREATE INDEX idx_events_ai_generated ON public.events(user_id, ai_generated);
CREATE INDEX idx_events_status ON public.events(user_id, status);

-- AI suggestions table indexes
CREATE INDEX idx_ai_suggestions_user_id ON public.ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_status ON public.ai_suggestions(user_id, status);
CREATE INDEX idx_ai_suggestions_confidence ON public.ai_suggestions(user_id, confidence_score DESC);
CREATE INDEX idx_ai_suggestions_email ON public.ai_suggestions(source_email_id);

-- User preferences table indexes
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Processing queue table indexes
CREATE INDEX idx_processing_queue_user_id ON public.processing_queue(user_id);
CREATE INDEX idx_processing_queue_status ON public.processing_queue(status);
CREATE INDEX idx_processing_queue_email ON public.processing_queue(email_id);

-- =====================================================
-- Create Functions and Triggers
-- =====================================================

-- Function to automatically create user profile
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_calendars_updated_at
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_ai_suggestions_updated_at
  BEFORE UPDATE ON public.ai_suggestions
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_processing_queue_updated_at
  BEFORE UPDATE ON public.processing_queue
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();