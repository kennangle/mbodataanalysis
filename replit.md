# Mindbody Data Analysis SaaS Platform

## Overview

This platform is an enterprise-grade analytics solution for Mindbody data, covering students, classes, schedules, attendance, memberships, purchases, and income. Its core purpose is to provide robust data synchronization, AI-powered natural language querying, real-time analytics dashboards, custom report generation, and role-based access control. The platform solves the challenge of unreliable long-running data imports by implementing a resumable background import system with proper cancellation handling, ensuring accurate and comprehensive business intelligence for large datasets. It is designed as a multi-tenancy SaaS platform for deployment on Heroku, supporting multiple Mindbody site implementations with complete data isolation per organization.

## User Preferences

- Professional business intelligence interface
- Data clarity over decoration
- Real-time analytics with interactive visualizations
- AI-powered natural language query interface
- Multi-tenancy for multiple organizations
- **Always use established React component libraries when possible** (e.g., react-datepicker, react-table) instead of building custom components from scratch

## System Architecture

### Tech Stack

- **Frontend**: React, TypeScript, Wouter, TanStack Query, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Authentication**: Passport.js with session management
- **External APIs**: OpenAI (GPT-4 via Function Calling), Mindbody Public API

### Backend Architecture

- **Modular Route Structure**: Routes are organized into specialized modules for maintainability and scalability.

### Design System

- Modern SaaS aesthetic inspired by Linear/Vercel
- Primary color: Blue (hsl(217 91% 60%))
- Typography: Inter (sans-serif), JetBrains Mono (monospace)
- Dark mode support with theme toggle
- Responsive mobile-first design

### Data Quality & Integrity

- **Attendance Deduplication** (Oct 2025): Fixed critical data quality issue where 137,012 duplicate attendance records were inflating analytics across 4,224 students. Implemented unique constraint on (organizationId, studentId, scheduleId, attendedAt::date) with partial index for status='attended'. Updated storage.createAttendance() to use ON CONFLICT DO NOTHING, preventing future duplicates during imports. All AI queries now return accurate counts matching Mindbody source data.

### Core Features & Implementations

- **Resumable Background Import System**: Utilizes a database-backed job queue for asynchronous, checkpointed data imports with real-time progress tracking, session resilience, resume capabilities, proper cancellation, and auto-cleanup of stale jobs. Includes API call tracking, limit management, and memory usage logging. Optimized to process students in batches of 100 to prevent memory issues on large datasets (10,000+ students). Features automatic retry logic with exponential backoff (3 attempts: 1s, 2s, 4s) for transient Mindbody API 500/503 errors, and comprehensive import history tracking showing last 10 imports with status, date ranges, progress percentages, and error details. **Database Connection Resilience**: All database operations wrapped with automatic retry logic (`withDatabaseRetry`) to handle Neon connection terminations (error 57P01) during long-running imports. Includes connection pool optimization (30s idle timeout), exponential backoff retry strategy (1s, 2s, 4s), and comprehensive coverage of all read/write operations including shutdown handlers. Detects connection errors (57P01, ECONNRESET, connection terminated/closed/lost) and only retries connection-related failures while failing fast on other errors. **Critical Memory Optimization** (Oct 2025): Visit imports now cache 92,331 class schedules once per import run (loaded on first batch, reused for all subsequent batches) instead of reloading per batch, reducing memory allocations from ~5GB cumulative to ~50MB one-time load, enabling multi-month imports on Autoscale without crashes. **Watchdog Job Queue Fix** (Oct 2025): Fixed critical bug where watchdog incorrectly failed queued jobs waiting to be processed. Implemented proper job lifecycle: auto-resume/scheduler set jobs to 'pending' status when queuing, import worker transitions to 'running' when processing starts. Watchdog now only fails jobs with status='running' AND stale heartbeat (>5 min), preventing false positives while catching genuinely stalled jobs. Enables reliable processing of large job queues (75+ concurrent jobs) without premature failures. **HTTP Cache Fix for Cross-Browser Compatibility** (Oct 2025): Fixed critical browser-specific caching issue where Chromium browsers (Chrome, Edge, Brave) cached API responses showing stale import progress (0% / pending), while Safari correctly displayed real-time progress (22% / running). Root cause: Express routes lacked `Cache-Control: no-store` headers, causing Chromium to reuse first cached response indefinitely despite React Query polling every 5s. Safari's Upgraded Insecure Requests policy bypassed cache. Solution: Added `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, and `Expires: 0` headers to all import status endpoints (`/api/mindbody/import/active`, `/active-jobs`, `/history`, `/:id/status`). Ensures all browsers receive fresh data on every poll, enabling accurate real-time progress monitoring across all user browsers.
- **Scheduled Automatic Imports**: Node-cron powered scheduler that automatically imports data on user-configured schedules (daily at 2 AM by default). Features include per-organization cron jobs, manual "run now" triggers, automatic schedule updates, collision detection, and configurable date ranges and data types. Serves as a reliable alternative to webhooks for organizations without premium Mindbody accounts. **Critical Fix** (Oct 2025): Fixed dataTypes array handling and implemented job completion polling with 4-hour timeout, ensuring scheduled imports reliably transition to success/failed status instead of staying stuck at "running". Includes comprehensive edge case handling for timeouts, disappeared jobs, and unexpected states. **Recommended Configuration for Revenue**: Use "last 1 day" date range to import only recent sales (yesterday's data), avoiding Mindbody API limitations on historical queries. For historical revenue, use CSV import instead.
- **Real-Time Webhook Integration**: Supports Mindbody webhooks for instant data synchronization, including HMAC-SHA256 signature verification, deduplication, asynchronous event processing, and automatic attendance record creation.
- **Automatic Pagination**: Implements a generic helper to retrieve all records from the Mindbody API efficiently.
- **User Management**: Admin-only interface for managing users, including CRUD operations, role-based access, and multi-tenancy support.
- **Dashboard & Analytics**: Displays real-time data using live database queries for charts such as Revenue & Growth Trend and Class Attendance by Time. Includes quick date range selectors (Last Week, Last Month, Last Quarter, Last Year) for easy time-based filtering.
- **AI-Powered Natural Language Queries**: OpenAI GPT-4o-mini with Function Calling integration enables natural language questions about students, attendance, revenue, and classes. AI dynamically queries the database using 6 specialized functions (get_student_attendance, get_top_students_by_attendance, get_revenue_by_period, get_class_statistics, get_student_revenue, execute_custom_query), providing data-driven insights with accurate metrics.
- **KPI Dashboard**: Comprehensive key performance indicators tracking studio performance with six specialized endpoints and visualizations. Features include: (1) KPI Overview with total revenue, active members, avg class attendance, and total classes; (2) Class Utilization Heatmap showing 7-day x 24-hour grid with color-coded utilization percentages and 80% target threshold highlighting underperforming time slots; (3) Intro-to-Membership Conversion funnel tracking intro class attendees and conversion rates; (4) Churn & Retention Metrics displaying active/inactive member counts and monthly new member trends; (5) Class Performance Analysis identifying underperforming classes below 80% capacity; (6) Membership Trends with visual bar charts. All KPIs support dynamic date range filtering via quick selectors (Last Week/Month/Quarter/Year) or custom date pickers, with proper query parameter handling through custom queryFn implementations to ensure backend filtering accuracy.
- **Reports System**: Four comprehensive report types (Revenue, Attendance, Class Performance, Monthly Summary) with CSV export functionality and customizable date ranges. Features independent date selectors per report and quick range buttons for common time periods.
- **Configurable Imports**: Allows users to specify date ranges and data types for selective data fetching.
- **Revenue Import Strategy** (Critical - Mindbody API Limitation): 
  - **CSV Import (PRIMARY for Historical Data)**: The Mindbody `/sale/sales` API endpoint **ignores date range parameters** and only returns recent sales (~10-20 records), making it unreliable for historical data imports. CSV export from Mindbody Business Intelligence reports is the authoritative source for historical revenue data. To import historical revenue:
    1. Log into Mindbody Business (Studio side)
    2. Navigate to Reports → Sales by Category (or Sales report)
    3. Select desired date range and export to CSV
    4. In platform: Settings → Data Import → Revenue Import → Upload CSV
    5. CSV import features: flexible column mapping (Date/Description/Amount/Type), client matching by Mindbody ID/email/name, duplicate prevention, bulk processing with progress tracking. Successfully handles large datasets (22,000+ records).
  - **Scheduled API Import (For Ongoing Sync Only)**: **WARNING: Do NOT use scheduled imports for historical data** - the API will only return ~14 recent sales regardless of date range. Correct configuration:
    1. Settings → Scheduled Imports → Enable
    2. Select "Revenue" in data types
    3. **Set date range to "Last 1 Day" ONLY** (imports yesterday's sales each morning at 2 AM)
    4. This avoids API limitations and catches new daily sales automatically
    5. For backfilling historical data, use CSV import instead
  - **Webhooks (Real-Time)**: For organizations with premium Mindbody accounts, webhooks provide instant sale notifications without polling limitations.
- **Students Data Management**: Comprehensive student roster management with advanced filtering and Excel export functionality.
- **Authentication**: Multi-provider authentication supporting Email/Password and Google OAuth 2.0, with secure token-based password reset.
- **Database Schema**: Comprehensive PostgreSQL schema with tables for users, organizations, students, classes, visits, sales, import jobs, and sessions, designed for multi-tenancy and optimized with indexing.

### Deployment

- **Platform**: Replit Multi-Tenancy SaaS (custom domain: analysis.yhctime.com)
- **Deployment Type**: 
  - Development: Autoscale (default)
  - Production: Reserved VM recommended for large datasets and background jobs
- **Memory Optimization**: Import worker loads students in batches (100 at a time) instead of all at once, reducing memory footprint by 99% and preventing out-of-memory errors during large imports
- **Multi-Tenancy Design**: Complete data isolation per organization via `organizationId`, shared database with row-level separation, and users belonging to a single organization
- **Multi-Site Support**: Each organization can connect to a different Mindbody site, with site-specific webhooks and API call tracking
- **Import Best Practices**: 
  - Autoscale: Use 1-2 month date ranges
  - Reserved VM: Can handle 6+ month imports reliably
  - See DEPLOYMENT.md for detailed guidance

## External Dependencies

- **Mindbody Public API**: Used for importing client, class, visit, and sales data.
- **OpenAI API**: Integrated for AI-powered natural language querying.
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database service.
- **Google OAuth 2.0**: Provides single sign-on authentication.
- **Brevo (SendinBlue)**: Transactional email service used for password reset emails.
