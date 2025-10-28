# Mindbody Data Analysis SaaS Platform

## Overview

This platform is an enterprise-grade analytics solution for Mindbody data, encompassing students, classes, schedules, attendance, memberships, purchases, and income. It provides robust data synchronization, AI-powered natural language querying, real-time analytics dashboards, custom report generation, and role-based access control. The platform features a resumable background import system with cancellation handling to ensure accurate business intelligence for large datasets. Designed as a multi-tenancy SaaS platform for Heroku deployment, it supports multiple Mindbody site implementations with complete data isolation per organization. Its business vision is to empower fitness and wellness businesses with comprehensive, reliable, and accessible data insights, enabling informed decision-making and strategic growth.

## User Preferences

- Professional business intelligence interface
- Data clarity over decoration
- Real-time analytics with interactive visualizations
- AI-powered natural language query interface
- Multi-tenancy for multiple organizations
- Always use established React component libraries when possible (e.g., react-datepicker, react-table) instead of building custom components from scratch

## System Architecture

### Tech Stack

- **Frontend**: React, TypeScript, Wouter, TanStack Query, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Authentication**: Passport.js with session management
- **External APIs**: OpenAI (GPT-4 via Function Calling), Mindbody Public API

### Design System

- Modern SaaS aesthetic inspired by Linear/Vercel
- Primary color: Blue (hsl(217 91% 60%))
- Typography: Inter (sans-serif), JetBrains Mono (monospace)
- Dark mode support with theme toggle
- Responsive mobile-first design

### Core Features & Implementations

- **Resumable Background Import System**: Asynchronous, checkpointed data imports with real-time progress, session resilience, retry logic, and comprehensive history tracking. Includes memory optimization, watchdog for stalled jobs, and robust database connection resilience.
- **Skipped Records Tracking & Reporting**: Comprehensive system for logging, reporting, and exporting records that fail validation during imports, aiding data quality monitoring.
- **Scheduled Automatic Imports**: Node-cron powered scheduler for automated data imports with configurable schedules, "run now" triggers, and collision detection.
- **Real-Time Webhook Integration**: Supports Mindbody webhooks for instant data synchronization, with HMAC-SHA256 verification and asynchronous processing.
- **Automatic Pagination**: Generic helper for efficient retrieval of all records from the Mindbody API.
- **User Management**: Admin interface for CRUD operations, role-based access, and multi-tenancy support.
- **Dashboard & Analytics**: Displays real-time data with interactive charts for revenue, growth, and class attendance, including quick date range selectors.
- **AI-Powered Natural Language Queries**: OpenAI GPT-4o-mini with Function Calling for natural language questions, dynamic database querying, and data-driven insights using specialized functions. Features conversational interface with follow-up question support, chat-style message history, auto-scroll, and conversation management (Oct 27, 2025).
- **KPI Dashboard**: Tracks studio performance with KPIs like total revenue, active members, class utilization heatmap, conversion funnels, churn/retention, and class performance analysis, all with dynamic date filtering.
- **Reports System**: Four comprehensive report types (Revenue, Attendance, Class Performance, Monthly Summary) with CSV export and customizable date ranges.
- **Data Coverage Report**: Comprehensive diagnostics page (`/data-coverage`) showing record counts, date range coverage, monthly breakdowns for all data types, and data quality metrics including orphaned attendance records detection. Essential for identifying data integrity issues.
- **Quick Stats Dashboard Widget**: Real-time monitoring widget on main Dashboard showing at-a-glance totals for students, classes, attendance, revenue, and latest import dates. Features 60-second auto-refresh, proper error handling with retry functionality, and loading states.
- **Configurable Imports**: Allows users to specify date ranges and data types for selective data fetching.
- **Revenue Import Strategy**: Prioritizes CSV import for historical data due to Mindbody API limitations, with scheduled API imports configured for "Last 1 Day" for ongoing synchronization.
- **Students Data Management**: Comprehensive student roster management with advanced filtering and Excel export.
- **Authentication**: Multi-provider support (Email/Password, Google OAuth 2.0) with secure password reset.
- **Database Schema**: Comprehensive PostgreSQL schema optimized for multi-tenancy, with tables for users, organizations, students, classes, visits, sales, import jobs, and sessions.

### Deployment

- **Platform**: Replit Multi-Tenancy SaaS (custom domain: analysis.yhctime.com)
- **Deployment Type**: Autoscale for development, Reserved VM recommended for production.
- **Multi-Tenancy Design**: Complete data isolation per organization via `organizationId`, shared database with row-level separation.
- **Multi-Site Support**: Each organization can connect to a different Mindbody site.
- **Organization ID**: `1907753f-c82b-4228-bae0-380fb08a009a` (Yoga Health Centre)

## Recent Updates

### Enhancement: Background CSV Import with Chunked Student Matching (Oct 28, 2025)

**Feature:** Refactored CSV revenue import to use background job processing with chunked student matching, enabling reliable imports of large datasets with full student linkage for AI insights.

**Implementation Details:**

1. **Schema Changes** (`shared/schema.ts`):
   - Added `csvData` field to `import_jobs` table for storing base64-encoded CSV data

2. **Backend Architecture** (`server/routes/revenue.ts`):
   - **Async Job Pattern**: CSV upload creates import job and returns immediately with job ID
   - **Background Worker**: `processRevenueCSVBackground()` function processes CSV asynchronously:
     - Loads students in batches of 1000 to avoid memory exhaustion
     - Builds in-memory lookup maps (by Mindbody ID and email)
     - Processes CSV rows with automatic student matching
     - Updates progress every 100 rows, logs every 1000 rows
     - Handles errors gracefully with detailed error messages
   - **Progress Tracking**: `/api/revenue/import-progress` endpoint provides real-time updates

3. **Frontend Updates** (`client/src/components/CsvImportCard.tsx`):
   - Dual polling system: progress (500ms) + job status (2s)
   - Real-time progress display with percentage, rows/sec, elapsed time
   - Toast notifications on completion with error details
   - Simplified UI without blocking "completed" section

**Benefits:**
- ✅ No timeout issues for large CSV files (22K+ rows)
- ✅ Student matching works reliably (36K+ students)
- ✅ AI queries can now identify students and their class types
- ✅ Real-time progress tracking with detailed metrics
- ✅ Memory-efficient chunked processing

**Technical Decisions:**
- Base64 encoding for CSV storage (simple, upgradeable to gzip)
- 1000-student batch size balances memory and performance
- Two-tier polling prevents UI flicker while maintaining responsiveness

**Files Modified:**
- `shared/schema.ts`: Added csvData field to import_jobs
- `server/routes/revenue.ts`: Refactored to background job pattern
- `client/src/components/CsvImportCard.tsx`: Updated for async polling

### Critical Fix: Double-Login Authentication Issue - RESOLVED (Oct 27, 2025)

**Issue:** Users required two login attempts to successfully authenticate, blocking commercial release.

**Root Cause:** Race condition between login response and page navigation. The frontend immediately redirected to `/dashboard` after receiving login response, but the browser hadn't finished processing the `Set-Cookie` header. Subsequent API requests lacked the session cookie, causing 401 errors.

**Solution Implemented:**
1. **Frontend fix** (`client/src/lib/auth.tsx`): Added 100ms delay after successful login to allow browser to process Set-Cookie header before redirecting
2. **Session configuration** (`server/auth.ts`): 
   - Set `resave: true` for reliable session persistence
   - Set `rolling: true` to extend session on each request
   - Explicit `path: "/"` on cookie to ensure it's sent with all requests
   - Removed manual `req.session.save()` calls to prevent race conditions

**Impact:** Single-login authentication now works reliably, making the platform production-ready for commercial use.

**Files Modified:**
- `client/src/lib/auth.tsx`: Added post-login delay
- `server/auth.ts`: Optimized session configuration

### Enhancement: Conversational AI with Follow-up Question Support (Oct 27, 2025)

**Feature:** Upgraded AI query interface from single-question mode to full conversational interface supporting multi-turn dialogues.

**Implementation Details:**
1. **Backend Enhancements** (`server/routes/ai.ts`, `server/openai.ts`):
   - Added `conversationHistory` parameter to `/api/ai/query` endpoint
   - Comprehensive security validation: limits history to 20 messages, validates each entry has role ∈ {"user", "assistant"} only (prevents system message injection), enforces content length ≤2000 chars per message
   - OpenAI service threads conversation history into prompts, enabling context-aware follow-up responses

2. **Frontend Redesign** (`client/src/components/AIQueryInterface.tsx`):
   - Chat-style UI with message bubbles (user messages right-aligned blue, AI responses left-aligned with sparkle icon)
   - ScrollArea component for conversation history with auto-scroll to latest messages
   - Clear conversation button for starting fresh
   - Character counter and improved placeholder text
   - Maintains local conversation state and sends full history with each query

3. **Security Measures**:
   - Server-side validation prevents malicious clients from injecting system messages or overriding AI instructions
   - Content sanitization (trimming, length limits) before forwarding to OpenAI
   - Rate limiting through existing monthly query limit (1000 queries/month)

**User Experience:**
- Users can now ask follow-up questions like "What about last month?" or "Show me more details" without repeating context
- Conversation persists until cleared, enabling exploratory data analysis
- Natural chat interface familiar to ChatGPT users

**Files Modified:**
- `server/routes/ai.ts`: Added conversation history validation
- `server/openai.ts`: Updated generateInsight to accept and use conversation history
- `client/src/components/AIQueryInterface.tsx`: Complete redesign with chat UI

## Recent Bug Fixes

### Critical: Attendance Report "Unknown" Student Names - RESOLVED (Oct 26, 2025)

**Issue:** Attendance reports showed mostly "Unknown" instead of actual student names in CSV reports, despite database containing 36,517 students and 317,484 attendance records with zero orphaned records.

**Root Cause:** Loading 36,517 students into Node.js memory (using `storage.getStudents(organizationId, 1000000, 0)`) was timing out or exhausting memory limits in production environment. The in-memory Map approach of matching student IDs to names failed when the students array was incomplete due to timeout.

**Solution Implemented:**
1. **Replaced in-memory Map with SQL JOIN**: Created `getAttendanceWithDetails()` method in storage.ts that uses LEFT JOIN to fetch attendance records with student names and class names in a single database query, eliminating the need to load 36K+ students into Node memory.

2. **Efficient data quality checks**: Added SQL-based helper methods:
   - `getOrphanedAttendanceCount()`: Uses LEFT JOIN to count attendance records with invalid student IDs
   - `getStudentsWithoutAttendanceCount()`: Counts students who never attended
   - `getClassesWithoutSchedulesCount()`: Counts classes without schedules

3. **Fixed stack overflow**: Replaced `Math.max(...array)` with `reduce()` for finding latest dates to handle large datasets (317K+ records).

**Files Modified:**
- `server/storage.ts`: Added 4 new efficient query methods
- `server/routes/reports.ts`: Updated `/api/reports/attendance` and `/api/reports/data-coverage` to use JOIN queries

**Impact:** Attendance reports now correctly display all student names without memory/timeout issues. Solution is production-ready and scales to large datasets.

**Architecture Note:** For large datasets, always prefer SQL JOINs and aggregations over loading entire tables into Node memory. The database is optimized for these operations.

## External Dependencies

- **Mindbody Public API**: For importing client, class, visit, and sales data.
- **OpenAI API**: For AI-powered natural language querying.
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database.
- **Google OAuth 2.0**: For single sign-on authentication.
- **Brevo (SendinBlue)**: For transactional emails like password resets.