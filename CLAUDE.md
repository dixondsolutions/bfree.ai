# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B Free.AI is an AI-powered scheduling assistant that automatically extracts tasks and events from emails, optimizing calendar management to give users more freedom. The application integrates Gmail, OpenAI GPT-4o, and smart scheduling algorithms.

## Technology Stack

- **Frontend**: Next.js 15 with App Router and TypeScript
- **Database**: Supabase PostgreSQL with built-in authentication and RLS
- **AI**: OpenAI GPT-4o API for email content analysis
- **Email**: Gmail API with OAuth2
- **UI**: Tailwind CSS with shadcn/ui components and glass morphism effects
- **Deployment**: Vercel with custom build configuration

## Key Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start

# Type checking
npm run type-check

# Linting
npm run lint

# Database verification scripts
node scripts/verify-database-setup.js
node scripts/verify-bulletproof-system.js
```

## Architecture Overview

### App Router Structure (Next.js 15)
- `app/(auth)/` - Authentication pages using route groups
- `app/(dashboard)/dashboard/` - Protected dashboard with calendar, emails, settings, suggestions
- `app/api/` - API routes for auth, AI processing, calendar operations, Gmail integration

### Core Services Architecture

**Database Layer** (`/src/lib/database/`)
- Comprehensive RLS policies for all tables
- Token encryption using pgcrypto extension
- Audit logging for sensitive operations
- UUID primary keys and timestamp tracking

**Authentication** (`/src/lib/auth/`)
- Supabase Auth with server-side validation
- Custom user profiles and middleware-based session management
- Encrypted OAuth token storage in database

**AI Integration** (`/src/lib/openai/`)
- GPT-4o with structured JSON responses
- Email analysis pipeline with confidence scoring
- Conservative approach to avoid false positives
- Token usage optimization

**Gmail Integration** (`/src/lib/gmail/`)
- OAuth2 flow with encrypted credential storage
- Email content extraction and analysis
- Calendar event creation from email insights

**Scheduling Engine** (`/src/lib/calendar/`)
- Calendar conflict detection
- Optimal time slot suggestions
- Buffer time management

### Component Patterns

- Client components clearly marked with 'use client'
- Glass morphism design system with custom Tailwind configuration
- Responsive sidebar navigation with collapsible states
- Error boundaries for robust error handling

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# App Configuration
NEXT_PUBLIC_APP_URL=
```

## Database Setup

Run these migrations in order:
1. `001_initial_schema.sql` - Core tables and RLS policies
2. `002_add_token_encryption.sql` - Security enhancements

Key tables: users, user_profiles, gmail_accounts, calendar_events, ai_suggestions, rate_limits, audit_logs

## Security Implementation

- Row Level Security (RLS) enforced on all tables
- Encrypted token storage using pgcrypto
- Rate limiting infrastructure
- Security headers configured in Vercel
- Server-side authentication validation

## AI Integration Guidelines

- Use structured output format with JSON schema validation
- Implement confidence scoring for all AI suggestions
- Conservative email analysis to avoid false positives
- Server-side processing only for security
- Token usage tracking and optimization

## Build Configuration Notes

- TypeScript errors temporarily ignored for deployment (`tsc --noEmit || true`)
- Webpack fallbacks configured for Node.js modules (fs, net, tls, crypto)
- API timeout extended to 60 seconds for AI operations
- Image optimization disabled for Vercel compatibility
- ESLint errors ignored during builds for deployment
- Experimental webpack build worker disabled for stability

## Testing & Quality Assurance

- No formal test framework currently configured
- Database verification scripts available in `/scripts/` directory
- Type checking with `npm run type-check` before deployment
- Manual testing through API routes in `/src/app/api/test/`
- Debug endpoints available for AI processing and integration testing

## Important Implementation Patterns

- All client components explicitly marked with 'use client' directive
- Server-side components handle authentication and database operations
- API routes use consistent error handling and response patterns
- Database operations use Supabase client with RLS enforcement
- AI processing isolated to server-side for security
- Email processing pipeline with confidence scoring to avoid false positives