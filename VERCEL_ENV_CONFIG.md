# Vercel Environment Variables Configuration

## 🚨 CRITICAL: Fix OAuth Issues

Based on your current Vercel environment variables, here are the **required changes** to fix the OAuth callback failures:

## Required Environment Variables in Vercel

### 1. Fix the GOOGLE_REDIRECT_URI (CRITICAL)

**Current (WRONG):**
```
GOOGLE_REDIRECT_URI = https://bfree-dfs8pupuo-ddsol.../api/gmail/callback
```

**Must be changed to:**
```
GOOGLE_REDIRECT_URI = https://bfree-ai.vercel.app/api/gmail/callback
```

### 2. Verify these are correctly set:

```bash
NEXT_PUBLIC_APP_URL = https://bfree-ai.vercel.app
GOOGLE_CLIENT_ID = 203378854259-mdvq5q30d3ecj9m4...
GOOGLE_CLIENT_SECRET = G0CSPX-3-w_86b_CZu0T_9arb_24t...
ENCRYPTION_KEY = 2h74jdb59ls8cn5i0jjdn5jsyHY8S...
VERCEL_ENV = production
NODE_ENV = production
```

### 3. Required Supabase Variables (Add if missing):

```bash
SUPABASE_URL = your_supabase_project_url
SUPABASE_ANON_KEY = your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY = your_supabase_service_role_key
```

### 4. Optional but Recommended:

```bash
# For enhanced logging and monitoring
LOG_LEVEL = info

# For Calendar integration (if using)
GOOGLE_CALENDAR_SCOPES = https://www.googleapis.com/auth/calendar,https://www.googleapis.com/auth/gmail.readonly
```

## Google Cloud Console Configuration

**CRITICAL:** Update your Google Cloud Console OAuth configuration:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Find your OAuth 2.0 Client ID
4. **Update Authorized redirect URIs to include:**
   ```
   https://bfree-ai.vercel.app/api/gmail/callback
   ```
5. **Remove any old redirect URIs** pointing to `bfree-dfs8pupuo-ddsol` domains

## Steps to Apply Changes

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Update `GOOGLE_REDIRECT_URI` to the correct value
   - Add any missing Supabase variables

2. **In Google Cloud Console:**
   - Update the OAuth redirect URIs as shown above

3. **Redeploy:**
   - Vercel will automatically redeploy when you change environment variables
   - Or trigger a manual redeploy if needed

## Testing

After making these changes, test the OAuth flow:

1. Visit your app: `https://bfree-ai.vercel.app`
2. Try to connect Gmail
3. Check the logs for any remaining issues

## Why This Fixes the Issues

- **`invalid_request` error**: Fixed by matching redirect URI between Vercel and Google Cloud Console
- **`undefined/dashboard` error**: Fixed by the robust base URL construction in the callback route
- **OAuth token exchange failures**: Fixed by proper environment variable configuration

## Verification Checklist

- [ ] `GOOGLE_REDIRECT_URI` matches your domain exactly
- [ ] Google Cloud Console redirect URI is updated
- [ ] `NEXT_PUBLIC_APP_URL` is set correctly
- [ ] All Supabase variables are present
- [ ] Environment variables redeployed in Vercel
- [ ] OAuth flow tested successfully 