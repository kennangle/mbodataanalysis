# Mindbody Data Analysis SaaS Platform

## Overview
An enterprise-grade analytics platform designed to import and analyze data from Mindbody (covering students, classes, schedules, attendance, memberships, purchases, and income). It features AI-powered natural language querying via OpenAI API, a real-time analytics dashboard, custom report generation, role-based access control, and comprehensive business intelligence capabilities. The platform addresses the challenge of long-running data imports by implementing a robust, resumable background import system, ensuring reliable data synchronization for large datasets.

## Recent Changes

### October 16, 2025 - Student Count Accuracy Fix 🔢
**Problem Solved:** Dashboard showed total student count (6,523) as "Active Students" and AI queries only analyzed first 100 students, reporting "7 active" when actually 537 are active. Solution: Accurate count aggregates from database.

#### Root Causes Identified
1. **Dashboard Bug**: Called `getStudentCount()` (total) instead of filtering by status='active'
   - Displayed 6,523 total students labeled as "Active Students"
   - No status filtering applied
   
2. **AI Query Bug**: Fetched only first 100 students, then filtered for active
   - Only 7 of first 100 students were active
   - AI reported "7 active students" instead of actual 537
   - Caused misleading business insights

#### Implementation
- **Added `getActiveStudentCount()` method** to storage layer
  - Filters by organizationId AND status='active'
  - Returns accurate count via SQL aggregate (no row fetching)
  
- **Fixed dashboard endpoint** (`GET /api/dashboard/stats`)
  - Now uses `getActiveStudentCount()` instead of `getStudentCount()`
  - Correctly displays 537 active students
  
- **Fixed AI query service** (`server/openai.ts`)
  - Replaced 100-student fetch with count aggregates
  - Uses `getStudentCount()` + `getActiveStudentCount()` directly
  - AI now receives accurate context: "6,523 total, 537 active, 5,986 inactive"

#### Testing Results
✅ Dashboard shows 537 active students (was 6,523)  
✅ AI query reports 537 active students (was 7)  
✅ Both use same accurate data source  
✅ No performance regressions (aggregates faster than row fetches)

#### Architect Reviewed & Approved ✅
- Storage method correctly filters by organizationId and status
- Dashboard no longer mislabels total count as active
- AI insights now reflect full population (not just first 100 rows)
- No architectural or performance concerns

### October 16, 2025 - Resume Import Rate Limiting ⏰
**Problem Solved:** Resume button showed "resumed successfully" toast but job stayed paused when trying to resume too soon after last download. Solution: Smart 24-hour rate limit check with helpful error messages showing last download time.

#### Implementation
- **Smart Rate Limit Logic** in resume endpoint
  - Only enforces 24-hour wait if job made progress (fetched data) AND wasn't manually cancelled
  - Manually cancelled imports → Resume immediately (no wait)
  - Imports with progress that paused/failed → 24-hour wait required
  - Checks: `hasProgress && !wasManuallyCancelled`

- **Detailed Error Response (429 Too Many Requests)**
  ```json
  {
    "message": "Mindbody API has a 24-hour limit. Please wait 5 more hours.",
    "lastDownloadTime": "2025-10-16T10:00:00Z",
    "nextAvailableTime": "2025-10-17T10:00:00Z",
    "hoursRemaining": 5
  }
  ```

- **Enhanced Frontend Error Handling**
  - Parses 429 rate limit responses
  - Shows formatted error with timestamps in toast
  - Example: "Please wait 5 more hours. Last download at 10/16/2025, 10:00 AM. Next available at 10/17/2025, 10:00 AM."

#### Testing Results
✅ Manually cancelled imports resume immediately (no 24-hour wait)  
✅ Rate limit errors show helpful timestamps  
✅ Toast displays clear, actionable messages  
✅ Backend correctly transitions 'paused' → 'running'

#### Architect Reviewed & Approved ✅
- Two-part check correctly guards against premature restarts
- 429 payload includes actionable timing context
- Frontend parsing and toast display verified
- No security issues observed

### October 16, 2025 - Cancel Import Feature 🛑
**Problem Solved:** Users needed ability to stop long-running imports (especially when hitting API rate limits or importing wrong date ranges). Solution: Cancel button with comprehensive race condition protection.

#### Implementation
- **Cancel API endpoint** - `POST /api/mindbody/import/:id/cancel`
  - Sets job status to 'paused' with error 'Cancelled by user'
  - Preserves progress and offset for resumability
  - Authorization checks: auth + organization ownership
  
- **Triple race condition protection** in worker
  - **Pre-processing check**: Skips queued jobs that were cancelled before worker starts
  - **Batch-level checks**: Verifies job status before each batch, stops immediately if paused
  - **Data-type-level checks**: Checks status after each data type, prevents marking cancelled jobs as completed
  
- **UI/UX enhancements**
  - Cancel button appears during active imports
  - Resume button appears for cancelled/paused jobs
  - Toast notifications for cancel/resume actions
  - Polling stops when job is cancelled

#### Testing Results
✅ Cancel during active processing → Job stays 'paused', Resume button appears  
✅ Cancel doesn't mark job as 'completed' → Protection verified  
✅ Cancel queued job → Only minimal imports (1 record), job stays 'paused'

#### Architect Reviewed & Approved ✅
- All race conditions addressed
- Queued and in-flight jobs halt properly
- No jobs marked completed after cancellation
- Production-ready with low cancellation latency

### October 15, 2025 - Resumable Background Import System 🚀
**Problem Solved:** Replit's HTTP/2 proxy closes long-running connections, causing imports to fail with `ERR_CONNECTION_CLOSED`. Solution: Background job processing with checkpoint/resume.

#### Architecture Overhaul
- **Database-backed job queue** with PostgreSQL persistence
  - New `importJobs` table tracks status, progress, current offset, errors
  - Survives HTTP connection timeouts and page reloads
  - Multi-tenant safe with organization isolation
  
- **Background worker system** processes imports asynchronously
  - Jobs run in background, survive HTTP connection closes
  - Sequential job queue - processes jobs in order, never drops requests
  - Updates database after every batch with checkpoint data
  
- **Sequential batching strategy** for API rate limiting
  - Clients/Classes: 200 records per batch
  - Visits/Sales: 100 records per batch  
  - 200-250ms delays between batches
  - Replaced p-limit concurrent processing (caused timeouts)

#### API Endpoints (New)
- `POST /api/mindbody/import/start` - Create import job, start background worker
- `GET /api/mindbody/import/active` - Fetch active job for current org (page reload support)
- `GET /api/mindbody/import/:id/status` - Get real-time job status and progress
- `POST /api/mindbody/import/:id/resume` - Resume paused/failed jobs from checkpoint
- Legacy `/api/mindbody/import` kept for backward compatibility

#### Frontend Features
- **Real-time progress tracking** via polling (every 2 seconds)
  - Shows current data type being imported
  - Progress bar with percentage complete
  - Per-type progress details (clients, classes, visits, sales)
  
- **Session resilience** - page reload recovery
  - Fetches active job on mount using `/active` endpoint
  - Auto-resumes polling if import is running
  - Users can safely close browser while import continues
  
- **Resume capability** for failed/paused jobs
  - Resume button appears for failed imports
  - Picks up from last checkpoint (offset preserved)
  - Shows error message for debugging

#### Token Caching & Auth
- Caches Mindbody user token for 55 minutes (expires in 60)
- Eliminates hundreds of redundant `/usertoken/issue` calls
- Auto-retry with fresh token on 401 authentication errors

#### Performance Characteristics
- **No more connection timeouts** - imports run indefinitely in background
- 6,500 clients (6 months): ~15-25 minutes
- 20,000+ clients (6 months): ~27-45 minutes (40,000+ API calls)
- Safe for datasets of any size - checkpointed progress
- Respects Mindbody's 30 req/sec API rate limit

#### Architect Reviewed & Approved ✅
- Job queue prevents dropped requests
- Frontend restores active jobs on mount
- Checkpoint/resume logic verified
- Multi-tenant isolation confirmed
- Production-ready for large-scale imports

## User Preferences
- Professional business intelligence interface
- Data clarity over decoration
- Real-time analytics with interactive visualizations
- AI-powered natural language query interface
- Multi-tenancy for multiple organizations

## System Architecture

### Tech Stack
- **Frontend**: React, TypeScript, Wouter (routing), TanStack Query (data fetching), Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Authentication**: Passport.js with session management
- **External APIs**: OpenAI (GPT-4), Mindbody Public API (API Key auth)

### Design System
- Modern SaaS aesthetic inspired by Linear/Vercel
- Primary color: Blue (hsl(217 91% 60%))
- Typography: Inter (sans-serif), JetBrains Mono (monospace)
- Dark mode support with theme toggle
- Responsive mobile-first design

### Core Features & Implementations
- **Resumable Background Import System**: Addresses HTTP connection timeouts by using a database-backed job queue for asynchronous, checkpointed data imports. Features sequential batching for API rate limiting, real-time progress tracking, session resilience, resume capabilities for failed jobs, and cancel functionality with triple race condition protection to stop imports immediately without wasting API quota.
- **Automatic Pagination**: Implements a generic `fetchAllPages<T>()` helper to ensure all records are fetched from Mindbody API, regardless of volume. Includes performance optimizations for large datasets using in-memory lookups.
- **User Management**: Comprehensive admin-only interface for managing users within an organization, featuring add/edit/delete functionality, role-based access control (admin/user), and tenant isolation.
- **Dashboard & Analytics**: Replaces mock data with live database queries for charts like Revenue & Growth Trend and Class Attendance by Time. Optimized SQL queries for performance and handles empty states gracefully.
- **Configurable Imports**: Allows users to specify date ranges and data types (Clients, Classes, Visits, Sales) for imports, with backend support for selective fetching and dynamic success messages.
- **Authentication**: Session-based authentication using Passport.js with scrypt for password hashing. Mindbody API uses User Token authentication (staff-level access) with token caching.
- **Database Schema**: Comprehensive PostgreSQL schema with 10 tables (Users, Organizations, Students, Classes, ClassSchedules, Attendance, Revenue, AIQueries, Sessions, ImportJobs), supporting multi-tenancy via `organizationId` and optimized with indexing.

### API Endpoints
- `/api/auth/*`: Authentication (login, register, logout, me)
- `/api/students`: Student management (search, pagination)
- `/api/classes`: Class management
- `/api/attendance`: Attendance tracking
- `/api/revenue`: Revenue data and statistics
- `/api/dashboard/stats`: Aggregated dashboard metrics
- `/api/mindbody/import`: Direct Mindbody data import (legacy)
- `/api/mindbody/import/start`: Initiates a background import job
- `/api/mindbody/import/active`: Fetches active import job status for current organization
- `/api/mindbody/import/:id/status`: Retrieves real-time status of a specific import job
- `/api/mindbody/import/:id/resume`: Resumes a paused/failed import job
- `/api/mindbody/import/:id/cancel`: Cancels a running/pending import job
- `/api/dashboard/revenue-trend`: Returns 12 months of revenue and student counts
- `/api/dashboard/attendance-by-time`: Returns attendance by day/time slot

## Known Limitations

### Duplicate Prevention
- ✅ **Clients/Students**: Implemented upsert logic - updates existing records instead of creating duplicates
- ⚠️ **Visits/Attendance**: Still creates duplicates on re-import (needs upsert logic)
- ⚠️ **Sales/Revenue**: Still creates duplicates on re-import (needs upsert logic)

**Recommendation:** Clear attendance and revenue data before re-importing to avoid duplicates, or import only new date ranges.

## External Dependencies
- **Mindbody Public API**: Used for importing client, class, visit, and sales data. Authenticates using API Key and User Tokens (staff credentials `_YHC` with `MINDBODY_CLIENT_SECRET`).
- **OpenAI API**: Integrated for AI-powered natural language querying capabilities.
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database service for data persistence.

## Admin Credentials
- Email: ken@yogahealthcenter.com
- Password: Admin123!

## Environment Setup
Required secrets (all configured):
- DATABASE_URL - PostgreSQL connection string ✅
- OPENAI_API_KEY - OpenAI API key for AI queries ✅
- SESSION_SECRET - Session encryption key (auto-generated) ✅
- MINDBODY_API_KEY - Mindbody API Key authentication ✅
- MINDBODY_CLIENT_ID - Mindbody client identifier ✅
- MINDBODY_CLIENT_SECRET - Mindbody client secret ✅
