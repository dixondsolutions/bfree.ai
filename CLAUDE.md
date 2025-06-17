# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B Free.AI is an AI-powered scheduling assistant that automatically extracts tasks and events from emails, optimizing calendar management to give users more freedom. The application integrates Gmail, OpenAI GPT-4, and smart scheduling algorithms.

## Technology Stack

- **Frontend**: Next.js 15 with TypeScript, deployed on Vercel
- **Database**: Supabase PostgreSQL with built-in authentication
- **AI**: OpenAI GPT-4 API for natural language processing
- **Email**: Gmail API with OAuth2
- **Styling**: Tailwind CSS (recommended for rapid development)
- **State Management**: React Context or Zustand for client state

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

# Format code
npm run format

# Run tests
npm run test
npm run test:watch

# Database migrations (Supabase)
npx supabase migration new <migration_name>
npx supabase db push
```

## Architecture Overview

### Directory Structure
```
/app                    # Next.js 15 app directory
  /api                 # API routes for backend logic
    /auth             # Authentication endpoints
    /email            # Email processing endpoints
    /ai               # AI integration endpoints
    /schedule         # Scheduling algorithm endpoints
  /(auth)             # Authentication pages (login, signup)
  /(dashboard)        # Protected dashboard routes
    /calendar         # Calendar view with AI suggestions
    /emails           # Email processing status
    /settings         # User preferences
/components            # Reusable React components
  /ui                 # Basic UI components
  /calendar          # Calendar-specific components
  /email             # Email-related components
  /ai                # AI suggestion components
/lib                  # Core utilities and services
  /supabase          # Supabase client and utilities
  /openai            # OpenAI integration
  /gmail             # Gmail API integration
  /scheduling        # Scheduling algorithms
/types                # TypeScript type definitions
/hooks               # Custom React hooks
/utils               # General utility functions
```

### Core Services

1. **Email Processing Service** (`/lib/gmail/processor.ts`)
   - Fetches emails via Gmail API
   - Extracts scheduling-relevant content
   - Queues for AI processing

2. **AI Task Extraction** (`/lib/openai/extractor.ts`)
   - Processes email content with GPT-4
   - Generates confidence scores
   - Returns structured task/event data

3. **Schedule Optimizer** (`/lib/scheduling/optimizer.ts`)
   - Analyzes calendar conflicts
   - Suggests optimal time slots
   - Manages buffer times and priorities

4. **Supabase Integration** (`/lib/supabase/`)
   - Database schema for users, events, preferences
   - Row-level security policies
   - Real-time subscriptions for calendar updates

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Gmail OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# App Configuration
NEXT_PUBLIC_APP_URL=
```

## Database Schema

Key tables to implement in Supabase:

1. **users** - Extended user profiles
2. **calendars** - User calendar configurations
3. **events** - Calendar events with AI metadata
4. **email_accounts** - Connected email accounts
5. **ai_suggestions** - AI-generated suggestions with confidence scores
6. **user_preferences** - Scheduling preferences and rules
7. **processing_queue** - Email processing status

## AI Integration Guidelines

When working with OpenAI GPT-4:
- Use structured output format with JSON schema
- Implement retry logic with exponential backoff
- Cache responses to minimize API calls
- Track token usage for cost management
- Use system prompts optimized for scheduling context

## Security Considerations

- All API routes must verify authentication
- Gmail tokens stored encrypted in database
- AI processing happens server-side only
- Implement rate limiting on API endpoints
- Use Supabase RLS for data access control

## Color Scheme

- Primary: Success Green (#4A7C59) for AI suggestions
- Background: Light neutrals for calendar view
- Accent: Use for CTAs and important actions
- Error: Standard red for conflicts
- Warning: Amber for low-confidence suggestions

## Testing Strategy

- Unit tests for scheduling algorithms
- Integration tests for API routes
- E2E tests for critical user flows
- Mock external APIs (Gmail, OpenAI) in tests
- Test AI confidence thresholds

## Performance Optimization

- Use Next.js ISR for dashboard pages
- Implement virtual scrolling for long email lists
- Cache AI responses in database
- Use React Query for data fetching
- Optimize bundle size with dynamic imports