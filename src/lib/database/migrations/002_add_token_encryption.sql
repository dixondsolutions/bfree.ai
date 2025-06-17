-- =====================================================
-- B Free.AI Database Security Enhancement
-- Migration 002: Add Token Encryption and Additional Security
-- =====================================================

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a function to encrypt OAuth tokens
CREATE OR REPLACE FUNCTION encrypt_token(token TEXT, key TEXT DEFAULT 'default_encryption_key')
RETURNS TEXT AS $$
BEGIN
  RETURN encode(encrypt(token::bytea, key, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to decrypt OAuth tokens
CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT, key TEXT DEFAULT 'default_encryption_key')
RETURNS TEXT AS $$
BEGIN
  RETURN convert_from(decrypt(decode(encrypted_token, 'base64'), key, 'aes'), 'UTF8');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL; -- Return NULL if decryption fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add encryption status column to email_accounts
ALTER TABLE public.email_accounts 
ADD COLUMN IF NOT EXISTS tokens_encrypted BOOLEAN DEFAULT false;

-- Create audit log table for security tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on audit_logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit_logs (users can only see their own logs)
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Create function to automatically log email account changes
CREATE OR REPLACE FUNCTION log_email_account_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (NEW.user_id, 'INSERT', 'email_accounts', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (NEW.user_id, 'UPDATE', 'email_accounts', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (OLD.user_id, 'DELETE', 'email_accounts', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email account auditing
DROP TRIGGER IF EXISTS email_accounts_audit_trigger ON public.email_accounts;
CREATE TRIGGER email_accounts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION log_email_account_changes();

-- Add rate limiting table for API requests
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  requests_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, endpoint, window_start)
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policy for rate_limits
CREATE POLICY "Users can view own rate limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Index for rate limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- Add updated_at trigger for new tables
CREATE TRIGGER update_audit_logs_updated_at
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON public.rate_limits  
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Add helpful functions for token management
CREATE OR REPLACE FUNCTION get_active_email_account_tokens(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id,
    ea.email,
    CASE 
      WHEN ea.tokens_encrypted = true THEN decrypt_token(ea.access_token)
      ELSE ea.access_token
    END as access_token,
    CASE 
      WHEN ea.tokens_encrypted = true AND ea.refresh_token IS NOT NULL THEN decrypt_token(ea.refresh_token)
      ELSE ea.refresh_token
    END as refresh_token,
    ea.expires_at
  FROM public.email_accounts ea
  WHERE ea.user_id = p_user_id 
    AND ea.is_active = true
    AND auth.uid() = p_user_id; -- Additional security check
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;
GRANT ALL ON public.rate_limits TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_email_account_tokens(UUID) TO authenticated;