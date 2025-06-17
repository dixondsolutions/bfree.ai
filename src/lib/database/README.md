# B Free.AI Database Schema

This directory contains the database schema and utilities for the B Free.AI application.

## Schema Overview

The database is designed to support an AI-powered email scheduling assistant with the following key features:

### Tables

1. **users** - Extended user profiles beyond `auth.users`
   - Stores user preferences like timezone and working hours
   - Linked to Supabase Auth via foreign key

2. **email_accounts** - Connected email accounts (Gmail OAuth)
   - Encrypted storage of OAuth tokens
   - Support for multiple email accounts per user

3. **calendars** - User's calendar configurations
   - Support for multiple calendar providers
   - Primary calendar designation

4. **events** - Calendar events with AI metadata
   - AI-generated events with confidence scores
   - Links to source emails for traceability

5. **ai_suggestions** - AI-generated scheduling suggestions
   - Different suggestion types (meeting, task, deadline, reminder)
   - User feedback tracking for model improvement

6. **user_preferences** - Flexible user settings storage
   - JSON-based preference values
   - Key-value store for application settings

7. **processing_queue** - Email processing status tracking
   - Async job management for email analysis
   - Error handling and retry logic

### Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Automatic user profile creation via triggers
- Encrypted token storage for OAuth credentials

### Performance Features

- Comprehensive indexing strategy
- Optimized queries for common access patterns
- Automatic timestamp management
- Efficient time-range queries for calendar data

## Setup Instructions

### Local Development Setup

1. **Create Supabase Project**
   ```bash
   # Visit https://supabase.com and create a new project
   # Note your project URL and API keys
   ```

2. **Run Database Migrations**
   ```sql
   -- Execute migrations in order in the Supabase SQL Editor:
   -- 1. migrations/001_initial_schema.sql (Core schema)
   -- 2. migrations/002_add_token_encryption.sql (Security enhancements)
   ```

3. **Configure Environment**
   ```bash
   # Copy environment template
   cp .env.local.example .env.local
   
   # Add your actual keys to .env.local:
   # - Supabase project URL and keys
   # - OpenAI API key
   # - Google OAuth credentials
   ```

4. **Enable OAuth Providers**
   - Go to Authentication > Providers in Supabase Dashboard
   - Enable Google OAuth with these scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/calendar`
     - `openid profile email`

### Production Deployment (Vercel)

1. **Environment Variables**
   ```bash
   # Set these in Vercel Dashboard or via CLI:
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add OPENAI_API_KEY
   vercel env add GOOGLE_CLIENT_ID
   vercel env add GOOGLE_CLIENT_SECRET
   vercel env add GOOGLE_REDIRECT_URI
   vercel env add JWT_SECRET
   vercel env add NEXTAUTH_SECRET
   ```

2. **Update OAuth Redirects**
   ```bash
   # Update Google OAuth settings with production URLs:
   # - https://your-domain.com/api/gmail/callback
   # - https://your-domain.com/api/auth/callback
   ```

3. **Database Security**
   ```sql
   -- Update encryption key in production:
   -- Replace 'default_encryption_key' with a strong secret
   -- Store the key securely in your environment variables
   ```

4. **Deploy**
   ```bash
   # Deploy to Vercel
   vercel --prod
   ```

### Database Migration Verification

```sql
-- Verify all tables exist:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify RLS is enabled:
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check indexes:
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Usage

```typescript
import { getUserProfile, getUserEvents } from '@/lib/database/utils'

// Get current user profile
const profile = await getUserProfile()

// Get events for this week
const events = await getUserEvents(
  new Date().toISOString(),
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
)
```

## Type Safety

The schema is fully typed using the generated `database.types.ts` file. All database operations are type-safe and provide excellent developer experience with autocompletion.