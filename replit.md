# Mindbody Data Analysis SaaS Platform

## Overview
This platform is an enterprise-grade analytics solution for Mindbody data, covering students, classes, schedules, attendance, memberships, purchases, and income. Its core purpose is to provide robust data synchronization, AI-powered natural language querying, real-time analytics dashboards, custom report generation, and role-based access control. The platform solves the challenge of unreliable long-running data imports by implementing a resumable background import system with proper cancellation handling, ensuring accurate and comprehensive business intelligence for large datasets.

**Deployment Architecture**: Multi-tenancy SaaS platform designed for deployment on Heroku, supporting multiple Mindbody site implementations with complete data isolation per organization.

## User Preferences
- Professional business intelligence interface
- Data clarity over decoration
- Real-time analytics with interactive visualizations
- AI-powered natural language query interface
- Multi-tenancy for multiple organizations

## System Architecture

### Tech Stack
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Authentication**: Passport.js with session management
- **External APIs**: OpenAI (GPT-4), Mindbody Public API

### Design System
- Modern SaaS aesthetic inspired by Linear/Vercel
- Primary color: Blue (hsl(217 91% 60%))
- Typography: Inter (sans-serif), JetBrains Mono (monospace)
- Dark mode support with theme toggle
- Responsive mobile-first design

### Core Features & Implementations
- **Resumable Background Import System**: Utilizes a database-backed job queue for asynchronous, checkpointed data imports to overcome HTTP connection timeouts. All imports use resumable methods only (`importClientsResumable`, `importClassesResumable`, `importVisitsResumable`, `importSalesResumable`). Legacy non-resumable methods have been removed. Features include:
  - Sequential batching for Mindbody API rate limiting
  - Real-time progress tracking with live polling
  - Session resilience (survives page reloads)
  - Resume capabilities for failed jobs
  - Proper cancellation with terminal 'cancelled' status
  - Auto-cleanup of stale jobs when starting new imports
  - Race condition protection between worker and cancel operations
  - Clean logging that retains failure/completion signals while eliminating per-batch noise
  - **API Call Tracking & Limit Management**: Tracks Mindbody API calls (1,000/day free tier limit) with real-time rate calculation and estimated time to reach daily limit, enabling users to schedule chunked imports strategically. Implementation updates `progress.apiCallCount` during batch processing (in progress callback and after each batch) to ensure real-time accuracy in both the database and UI
- **Real-Time Webhook Integration**: Mindbody webhook support for instant data synchronization without consuming API calls. After initial bulk import, webhooks provide continuous real-time updates for new bookings and visit changes. Features include:
  - HMAC-SHA256 signature verification for security
  - Raw request body preservation for authentic signature validation
  - Deduplication by messageId to prevent duplicate processing
  - Asynchronous event processing with error tracking
  - Support for `classVisit.created` and `classVisit.updated` events
  - Automatic attendance record creation from webhook payloads
  - Subscription management (create, list, delete) through API
  - Event history tracking in webhookEvents table
- **Automatic Pagination**: Implements a generic helper (`fetchAllPages<T>()`) to retrieve all records from the Mindbody API, optimized for large datasets.
- **User Management**: An admin-only interface for managing users within an organization, including CRUD operations, role-based access (admin/user), and multi-tenancy support.
- **Dashboard & Analytics**: Displays real-time data using live database queries for charts such as Revenue & Growth Trend and Class Attendance by Time, with optimized SQL for performance.
- **Configurable Imports**: Allows users to specify date ranges and data types (Clients, Classes, Visits, Sales) for selective data fetching.
- **Students Data Management**: Comprehensive student roster management with advanced filtering (status, date range) and Excel export functionality using xlsx library. Filters respect search queries and export includes all filtered results with columns: First Name, Last Name, Email, Status, Membership.
- **Authentication**: Multi-provider authentication system supporting:
  - **Email/Password**: Session-based authentication using Passport.js with scrypt for password hashing
  - **Google OAuth 2.0**: Single sign-on via Google with automatic account creation and organization setup
  - **Password Reset**: Secure token-based password reset flow using Brevo email service (1-hour token expiry)
  - Mindbody API authentication uses cached User Tokens for efficiency
- **Database Schema**: A comprehensive PostgreSQL schema with 11 tables (users, organizations, students, classes, visits, sales, importJobs, sessions, mindbodyTokenCache, passwordResetTokens), designed for multi-tenancy via `organizationId` and optimized with indexing. Users table supports both local and OAuth providers via `provider` and `providerId` fields, with nullable `passwordHash` for OAuth users.

### API Endpoints
- `/api/auth/login`: Email/password login
- `/api/auth/register`: User registration
- `/api/auth/logout`: User logout
- `/api/auth/me`: Get current user
- `/api/auth/google`: Google OAuth login
- `/api/auth/google/callback`: Google OAuth callback
- `/api/auth/forgot-password`: Request password reset email
- `/api/auth/reset-password`: Reset password with token
- `/api/students`: Student management and search.
- `/api/classes`: Class management.
- `/api/attendance`: Attendance tracking.
- `/api/revenue`: Revenue data.
- `/api/dashboard/stats`: Aggregated dashboard metrics.
- `/api/mindbody/import/start`: Initiates a background import job.
- `/api/mindbody/import/active`: Fetches active import job status.
- `/api/mindbody/import/:id/status`: Retrieves real-time status of an import job.
- `/api/mindbody/import/:id/resume`: Resumes a paused/failed import job.
- `/api/mindbody/import/:id/cancel`: Pauses an import job (can be resumed later).
- `/api/dashboard/revenue-trend`: Provides revenue and student count trends.
- `/api/dashboard/attendance-by-time`: Provides attendance by day/time.

## External Dependencies
- **Mindbody Public API**: Used for importing client, class, visit, and sales data, authenticated via API Key and User Tokens.
- **OpenAI API**: Integrated for AI-powered natural language querying.
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database service.
- **Google OAuth 2.0**: Provides single sign-on authentication for users.
- **Brevo (SendinBlue)**: Transactional email service used for password reset emails.

## User Documentation
- **DATA_IMPORT_GUIDE.md**: Comprehensive guide for data import sequence, dependencies, and troubleshooting. Critical reading for understanding the required import order: Students → Classes → Visits → Sales.
- **WEBHOOKS_AND_API_GUIDE.md**: Multi-day import strategies, webhook setup, and API tier upgrade guidance.

## Environment Variables

### Required for Core Functionality
- `DATABASE_URL`: PostgreSQL connection string (provided by Neon integration)
- `SESSION_SECRET`: Secret key for session encryption
- `MINDBODY_API_KEY`: Mindbody Public API key
- `MINDBODY_CLIENT_ID`: Mindbody OAuth client ID
- `MINDBODY_CLIENT_SECRET`: Mindbody OAuth client secret
- `OPENAI_API_KEY`: OpenAI API key for AI features

### Required for Google OAuth (Optional Feature)
- `GOOGLE_CLIENT_ID`: Google OAuth 2.0 client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 2.0 client secret

### Required for Password Reset (Optional Feature)
- `BREVO_API_KEY`: Brevo (SendinBlue) API key for transactional emails

Note: If Google OAuth credentials are not provided, the Google sign-in buttons will not be functional but the app will work with email/password authentication. Similarly, password reset requires Brevo API key to be configured.

## Deployment

### Platform: Heroku Multi-Tenancy SaaS

This application is designed as a **multi-site, multi-tenant SaaS platform** for deployment on Heroku with the following architecture:

**Multi-Tenancy Design:**
- Complete data isolation per organization via `organizationId` foreign keys
- Each organization can connect to a different Mindbody site
- Shared database with row-level organization separation
- Users belong to a single organization (set during registration)
- All data (students, classes, visits, sales, webhooks) scoped to organization

**Heroku Deployment Considerations:**
- Uses PostgreSQL add-on for production database
- Session-based authentication with connect-pg-simple for session store
- Environment variables configured via Heroku config vars
- Webhook URLs automatically configured using REPLIT_DOMAINS (Heroku domain in production)
- Resumable imports handle Heroku's 30-second request timeout via background jobs

**Multi-Site Support:**
- Each organization stores their unique `mindbodySiteId`
- Site ID configured automatically during first data import
- Webhooks use site-specific subscriptions
- API calls tracked per organization for accurate limit monitoring
- Multiple Mindbody sites can be served from single deployment

**Scaling Considerations:**
- Database indexes on organizationId for query performance
- Background job system for long-running imports
- Webhook-based real-time sync reduces API call volume
- Session management scaled via PostgreSQL session store