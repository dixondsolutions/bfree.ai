# Vercel Deployment Checklist

## Prerequisites Setup ✅

### 1. External Services Required
- [ ] **Supabase Account** - Database and authentication
- [ ] **Google Cloud Console** - Gmail/Calendar APIs
- [ ] **OpenAI Account** - AI processing
- [ ] **Vercel Account** - Deployment platform

### 2. API Keys and Credentials Needed
Before deploying, gather these credentials:

#### Supabase (Database)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

#### Google OAuth
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI` (will be your Vercel URL + `/api/gmail/callback`)

#### OpenAI
- [ ] `OPENAI_API_KEY`

#### Security
- [ ] `ENCRYPTION_KEY` (generate with: `openssl rand -base64 32`)

#### App Configuration
- [ ] `NEXT_PUBLIC_APP_URL` (will be your Vercel URL)

## Deployment Steps

### Step 1: Deploy to Vercel
1. **Connect GitHub Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

2. **Set Environment Variables**
   - In Vercel dashboard: Settings → Environment Variables
   - Add all the variables listed above
   - **Important**: Set for Production, Preview, and Development

### Step 2: Database Setup (Supabase)
1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note the URL and keys from Settings → API

2. **Run Database Migrations**
   - Go to SQL Editor in Supabase
   - Run `src/lib/database/migrations/001_initial_schema.sql`
   - Run `src/lib/database/migrations/002_add_token_encryption.sql`

### Step 3: Google OAuth Setup
1. **Create Google Cloud Project**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Enable Gmail API, Calendar API, OAuth2 API

2. **Configure OAuth Consent Screen**
   - Set app name: "B Free.AI"
   - Add required scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`

3. **Create OAuth Credentials**
   - Create OAuth 2.0 Client ID
   - Add redirect URI: `https://your-vercel-app.vercel.app/api/gmail/callback`

### Step 4: Post-Deployment Configuration
1. **Update Google OAuth**
   - Replace `your-vercel-app` with actual Vercel URL
   - Update redirect URI in Google Console

2. **Test Health Check**
   - Visit: `https://your-app.vercel.app/health`
   - Should show: Database ✅, Environment ✅, Encryption ✅

## Testing Checklist

### Authentication Flow
- [ ] Can access landing page
- [ ] "Sign up with Google" works
- [ ] Redirects to dashboard after login
- [ ] Can log out successfully

### Gmail Integration
- [ ] "Connect Gmail" button works
- [ ] OAuth flow completes successfully
- [ ] Can fetch emails
- [ ] Emails display in dashboard

### AI Processing
- [ ] "Analyze with AI" processes emails
- [ ] Suggestions page shows AI results
- [ ] Processing completes without errors

### Calendar Features
- [ ] Calendar page loads
- [ ] Calendar sync works
- [ ] Scheduling assistant functions
- [ ] Events can be created/managed

## Security Verification

### Environment Variables
- [ ] All sensitive data is in environment variables
- [ ] No API keys in source code
- [ ] Encryption key is properly set

### API Security
- [ ] Rate limiting is active
- [ ] All endpoints validate input
- [ ] Authentication is enforced
- [ ] HTTPS is enforced (automatic with Vercel)

### Database Security
- [ ] Row Level Security is enabled
- [ ] OAuth tokens are encrypted
- [ ] Audit logging is working

## Common Issues & Solutions

### "Unauthorized" Errors
- Check Supabase environment variables
- Verify RLS policies are applied
- Ensure service role key is correct

### Google OAuth Failures
- Verify redirect URI matches exactly
- Check OAuth consent screen status
- Ensure required APIs are enabled

### AI Processing Errors
- Verify OpenAI API key
- Check API usage limits
- Monitor function timeout limits

### Database Connection Issues
- Check Supabase URL and keys
- Verify migrations ran successfully
- Check network connectivity

## Monitoring Setup

### Health Monitoring
- [ ] Set up uptime monitoring for `/health`
- [ ] Monitor API response times
- [ ] Set up error alerts

### Performance Monitoring
- [ ] Monitor function execution times
- [ ] Track API usage patterns
- [ ] Monitor database performance

### Security Monitoring
- [ ] Monitor for unauthorized access attempts
- [ ] Review audit logs regularly
- [ ] Track rate limiting metrics

## Final Verification

### Production Readiness
- [ ] All features work in production
- [ ] Performance is acceptable
- [ ] Security measures are active
- [ ] Monitoring is in place
- [ ] Backups are configured
- [ ] Documentation is up to date

### User Experience
- [ ] App loads quickly
- [ ] All flows work smoothly
- [ ] Error messages are user-friendly
- [ ] Mobile experience is good

---

**Deployment Status**: ⏳ Ready to deploy once GitHub repository is connected

**Next Step**: Complete GitHub setup and provide repository details 