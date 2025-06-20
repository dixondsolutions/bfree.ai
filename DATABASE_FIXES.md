# Database Fixes Log

## 2025-06-20 - Email ID Field Fix

**Issue**: Email clicking not working due to database function returning incorrect field name

**Root Cause**: 
- Database functions `get_emails_with_advanced_filtering` and `get_emails_with_counts` were returning `email_id` field
- Frontend code expected `id` field
- This caused `email.id` to be `undefined` when clicking emails

**Fix Applied**:
- Dropped and recreated both database functions
- Changed return field from `email_id` to `id` 
- Updated function signatures to match

**Migration Names**:
- `drop_and_recreate_email_function`
- `fix_get_emails_with_counts`

**Verification**:
- Database now returns proper `id` fields
- Email clicking should work correctly
- No code changes required