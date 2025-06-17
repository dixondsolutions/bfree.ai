# 🗄️ Supabase Database Setup Guide

## 🚨 **URGENT: Database Tables Missing**

Your Vercel deployment is working perfectly, but the database tables haven't been created yet. This is why you're seeing the "relation does not exist" errors.

## 📋 **Quick Setup Steps**

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your B Free.AI project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"+ New query"**

### Step 2: Run Database Migration #1
Copy and paste **the entire contents** of `src/lib/database/migrations/001_initial_schema.sql` into the SQL editor and click **"Run"**.

This creates all the core tables:
- ✅ **users** - User profiles and settings  
- ✅ **email_accounts** - Gmail OAuth tokens
- ✅ **calendars** - Google Calendar connections
- ✅ **events** - Calendar events and meetings
- ✅ **ai_suggestions** - AI-generated suggestions
- ✅ **user_preferences** - User settings
- ✅ **processing_queue** - Background job processing

### Step 3: Run Database Migration #2  
Create a **new query** and copy the entire contents of `src/lib/database/migrations/002_add_token_encryption.sql` and click **"Run"**.

This adds security features:
- ✅ **Token encryption** for OAuth tokens
- ✅ **Audit logging** for security tracking  
- ✅ **Rate limiting** for API protection
- ✅ **Helper functions** for secure token access

### Step 4: Verify Setup
After running both migrations, go to **"Table Editor"** and confirm you see these tables:
- [x] users
- [x] email_accounts  
- [x] calendars
- [x] events
- [x] ai_suggestions
- [x] user_preferences
- [x] processing_queue
- [x] audit_logs
- [x] rate_limits

## 🔐 **Security Features Included**

### Row Level Security (RLS)
All tables have RLS enabled - users can only access their own data.

### Token Encryption  
OAuth tokens are encrypted before storage for maximum security.

### Audit Logging
All email account changes are automatically logged for security tracking.

### Rate Limiting
Built-in API rate limiting to prevent abuse.

## 🚀 **After Setup Complete**

Once the tables are created:

1. **Refresh your deployed app** at `https://bfree-ai.vercel.app`
2. **Try signing in with Google** - should work perfectly!
3. **Connect Gmail** - tokens will be securely encrypted
4. **Test calendar sync** - should load your Google Calendar

## 💡 **Troubleshooting**

### If you get "permission denied" errors:
1. Make sure you're running the SQL as the project owner
2. Check that RLS policies are properly created
3. Verify all functions have `SECURITY DEFINER` set

### If migrations fail:
1. Check for syntax errors in the SQL editor
2. Run migrations one table at a time if needed
3. Verify extensions (uuid-ossp, pgcrypto) are enabled

### If you need to reset:
```sql
-- DANGER: This will delete all data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then re-run both migrations
```

## ✅ **Success Indicators**

You'll know it's working when:
- ✅ No more "relation does not exist" errors in Vercel logs
- ✅ Login page loads without database errors  
- ✅ Google OAuth flow completes successfully
- ✅ Dashboard loads with user data
- ✅ Gmail connection works

## 🎯 **Next Steps**

After database setup:
1. **Test Gmail OAuth** - Connect your Gmail account
2. **Test Calendar Sync** - Verify Google Calendar integration  
3. **Test AI Features** - Try the AI-powered scheduling
4. **Review Security** - Check audit logs and rate limiting

Your app is production-ready once these tables are created! 🚀 