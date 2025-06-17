# B Free.AI Deployment Checklist

## Pre-Deployment Checklist

### Database Setup
- [ ] Supabase project created
- [ ] Migration 001_initial_schema.sql executed
- [ ] Migration 002_add_token_encryption.sql executed
- [ ] All tables verified to exist (7 core + 2 security tables)
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Database indexes created and verified
- [ ] Test user profile creation trigger

### Environment Configuration
- [ ] Production environment variables set in Vercel
- [ ] Supabase URL and keys configured
- [ ] OpenAI API key configured
- [ ] Google OAuth credentials configured (production URLs)
- [ ] JWT secrets generated and set
- [ ] NextAuth configuration completed

### OAuth Configuration
- [ ] Google Cloud Console project configured
- [ ] Gmail API enabled
- [ ] Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] Production redirect URIs added:
  - [ ] `https://your-domain.com/api/gmail/callback`
  - [ ] `https://your-domain.com/api/auth/callback`
- [ ] OAuth scopes verified:
  - [ ] `https://www.googleapis.com/auth/gmail.readonly`
  - [ ] `https://www.googleapis.com/auth/calendar`
  - [ ] `openid profile email`

### Security Configuration
- [ ] Strong JWT secret generated
- [ ] NextAuth secret configured
- [ ] Token encryption key set (replace default)
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] CORS headers configured

### Application Testing
- [ ] Local development working
- [ ] Database connections successful
- [ ] Authentication flow working
- [ ] Google OAuth working
- [ ] Email processing working
- [ ] AI suggestions working
- [ ] Calendar sync working

## Deployment Steps

### 1. Environment Setup
```bash
# Set all production environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENAI_API_KEY production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add GOOGLE_REDIRECT_URI production
vercel env add GOOGLE_CALENDAR_REDIRECT_URI production
vercel env add JWT_SECRET production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
```

### 2. Deploy Application
```bash
# Deploy to production
vercel --prod

# Verify deployment
curl -I https://your-domain.com
```

### 3. Post-Deployment Verification
- [ ] Application loads successfully
- [ ] Database connections working
- [ ] Authentication working
- [ ] API endpoints responding
- [ ] OAuth flows working
- [ ] Error monitoring active

## Post-Deployment Checklist

### Monitoring Setup
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured
- [ ] Database monitoring enabled
- [ ] Performance monitoring active

### Security Verification
- [ ] HTTPS enforced
- [ ] Environment variables secured
- [ ] API rate limiting working
- [ ] User data protection verified
- [ ] OAuth security verified

### Functionality Testing
- [ ] User registration working
- [ ] Email connection working
- [ ] AI processing working
- [ ] Calendar integration working
- [ ] Event creation working
- [ ] Suggestions display working

## Rollback Plan

If deployment fails:

1. **Immediate Rollback**
   ```bash
   # Rollback to previous deployment
   vercel --prod --rollback
   ```

2. **Database Rollback** (if needed)
   ```sql
   -- Rollback migration 002 if needed
   DROP TABLE IF EXISTS public.rate_limits;
   DROP TABLE IF EXISTS public.audit_logs;
   DROP FUNCTION IF EXISTS encrypt_token;
   DROP FUNCTION IF EXISTS decrypt_token;
   ```

3. **Environment Reset**
   - Restore previous environment variables
   - Update OAuth redirect URIs
   - Verify all services working

## Maintenance Tasks

### Weekly
- [ ] Monitor error logs
- [ ] Check database performance
- [ ] Review security logs
- [ ] Monitor API usage

### Monthly
- [ ] Update dependencies
- [ ] Review security policies
- [ ] Backup database
- [ ] Performance optimization review

## Support Information

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Google Cloud Console**: https://console.cloud.google.com
- **OpenAI API Dashboard**: https://platform.openai.com/account/api-keys

## Emergency Contacts

- Database Issues: Supabase Support
- Deployment Issues: Vercel Support
- API Issues: OpenAI Support
- OAuth Issues: Google Cloud Support