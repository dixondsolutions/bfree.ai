# B Free.AI Deployment Guide

This guide walks you through deploying B Free.AI to Vercel with all required configurations.

## Prerequisites

- Vercel account
- Supabase account (for database)
- OpenAI account (for AI features)
- Google Cloud Console account (for Gmail/Calendar integration)

## 1. Database Setup (Supabase)

### Create Supabase Project
1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to be ready (takes ~2 minutes)
3. Go to Settings > API to find your project URL and keys

### Run Database Migrations
1. In your Supabase project dashboard, go to SQL Editor
2. Copy and run the content from `src/lib/database/migrations/001_initial_schema.sql`
3. Copy and run the content from `src/lib/database/migrations/002_add_token_encryption.sql`
4. Verify tables are created by checking Database > Tables

### Configure Row Level Security
RLS policies are included in the migration files and should be automatically applied.

## 2. Google OAuth Setup

### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Gmail API
   - Google Calendar API
   - Google OAuth2 API

### Configure OAuth Consent Screen
1. Go to APIs & Services > OAuth consent screen
2. Choose "External" user type
3. Fill in required fields:
   - App name: "B Free.AI"
   - User support email: your email
   - Developer contact information: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### Create OAuth Credentials
1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Application type: "Web application"
4. Name: "B Free.AI Web Client"
5. Authorized redirect URIs:
   - `http://localhost:3000/api/gmail/callback` (for development)
   - `https://your-app.vercel.app/api/gmail/callback` (replace with your Vercel URL)
6. Save the Client ID and Client Secret

## 3. OpenAI API Setup

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create an API key in API Keys section
3. Note down the API key (starts with `sk-`)

## 4. Vercel Deployment

### Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Import the project
3. Vercel will auto-detect Next.js settings

### Configure Environment Variables
In your Vercel project dashboard, go to Settings > Environment Variables and add:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/gmail/callback

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Security Configuration
ENCRYPTION_KEY=your-32-character-secret-encryption-key
```

### Generate Encryption Key
Run this command to generate a secure encryption key:
```bash
openssl rand -base64 32
```

### Update vercel.json
1. Edit `vercel.json` and replace `https://your-app.vercel.app` with your actual Vercel URL
2. Commit and push changes

## 5. Final Configuration

### Update Google OAuth Redirect URI
1. Once deployed, get your Vercel URL
2. Go back to Google Cloud Console > Credentials
3. Edit your OAuth client
4. Update the authorized redirect URI to: `https://your-actual-vercel-url.vercel.app/api/gmail/callback`

### Test Health Check
Visit `https://your-app.vercel.app/health` to verify:
- Database connection
- Environment variables
- Encryption system

## 6. Post-Deployment Testing

### Test Authentication Flow
1. Visit your deployed app
2. Click "Sign up with Google"
3. Complete OAuth flow
4. Verify you're redirected to dashboard

### Test Gmail Integration
1. In dashboard, click "Connect Gmail"
2. Authorize Gmail access
3. Try fetching emails
4. Verify emails appear in dashboard

### Test AI Processing
1. After fetching emails, click "Analyze with AI"
2. Wait for processing to complete
3. Check AI suggestions page

### Test Calendar Features
1. Go to Calendar page
2. Try calendar sync
3. Test scheduling assistant

## 7. Monitoring and Maintenance

### Check Logs
- View function logs in Vercel dashboard
- Monitor for errors and performance issues

### Health Monitoring
- Set up uptime monitoring for `/health` endpoint
- Monitor API response times

### Security
- Regularly rotate API keys
- Monitor for unauthorized access attempts
- Review audit logs in Supabase

## Troubleshooting

### Common Issues

1. **"Unauthorized" errors**
   - Check Supabase environment variables
   - Verify RLS policies are applied

2. **Google OAuth failures**
   - Verify redirect URI matches exactly
   - Check OAuth consent screen status
   - Ensure APIs are enabled

3. **AI processing errors**
   - Verify OpenAI API key
   - Check API usage limits
   - Monitor function timeout limits

4. **Database errors**
   - Check Supabase connection
   - Verify migrations ran successfully
   - Check RLS policies

### Support Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## Security Checklist

- [ ] All API keys are set as environment variables
- [ ] Database has Row Level Security enabled
- [ ] OAuth tokens are encrypted in database
- [ ] HTTPS is enforced (automatic with Vercel)
- [ ] Security headers are configured in vercel.json
- [ ] Rate limiting is enabled on API routes
- [ ] Input validation is implemented
- [ ] Error messages don't expose sensitive information

## Performance Optimization

- [ ] API routes have appropriate timeouts
- [ ] Database queries are optimized
- [ ] Large operations use pagination
- [ ] Static assets are optimized
- [ ] Caching is implemented where appropriate

Your B Free.AI application is now ready for production use!