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
- **External APIs**: OpenAI (GPT-4), Mindbody Public API

### Backend Architecture

- **Modular Route Structure**: Routes are organized into specialized modules for maintainability and scalability.

### Design System

- Modern SaaS aesthetic inspired by Linear/Vercel
- Primary color: Blue (hsl(217 91% 60%))
- Typography: Inter (sans-serif), JetBrains Mono (monospace)
- Dark mode support with theme toggle
- Responsive mobile-first design

### Core Features & Implementations

- **Resumable Background Import System**: Utilizes a database-backed job queue for asynchronous, checkpointed data imports with real-time progress tracking, session resilience, resume capabilities, proper cancellation, and auto-cleanup of stale jobs. Includes API call tracking, limit management, and memory usage logging. Optimized to process students in batches of 100 to prevent memory issues on large datasets (10,000+ students). Features automatic retry logic with exponential backoff (3 attempts: 1s, 2s, 4s) for transient Mindbody API 500/503 errors, and comprehensive import history tracking showing last 10 imports with status, date ranges, progress percentages, and error details. **Database Connection Resilience**: All database operations wrapped with automatic retry logic (`withDatabaseRetry`) to handle Neon connection terminations (error 57P01) during long-running imports. Includes connection pool optimization (30s idle timeout), exponential backoff retry strategy (1s, 2s, 4s), and comprehensive coverage of all read/write operations including shutdown handlers. Detects connection errors (57P01, ECONNRESET, connection terminated/closed/lost) and only retries connection-related failures while failing fast on other errors. **Critical Memory Optimization** (Oct 2025): Visit imports now cache 92,331 class schedules once per import run (loaded on first batch, reused for all subsequent batches) instead of reloading per batch, reducing memory allocations from ~5GB cumulative to ~50MB one-time load, enabling multi-month imports on Autoscale without crashes.
- **Scheduled Automatic Imports**: Node-cron powered scheduler that automatically imports data on user-configured schedules (daily at 2 AM by default). Features include per-organization cron jobs, manual "run now" triggers, automatic schedule updates, collision detection, and configurable date ranges and data types. Serves as a reliable alternative to webhooks for organizations without premium Mindbody accounts. **Critical Fix** (Oct 2025): Fixed dataTypes array handling and implemented job completion polling with 4-hour timeout, ensuring scheduled imports reliably transition to success/failed status instead of staying stuck at "running". Includes comprehensive edge case handling for timeouts, disappeared jobs, and unexpected states.
- **Real-Time Webhook Integration**: Supports Mindbody webhooks for instant data synchronization, including HMAC-SHA256 signature verification, deduplication, asynchronous event processing, and automatic attendance record creation.
- **Automatic Pagination**: Implements a generic helper to retrieve all records from the Mindbody API efficiently.
- **User Management**: Admin-only interface for managing users, including CRUD operations, role-based access, and multi-tenancy support.
- **Dashboard & Analytics**: Displays real-time data using live database queries for charts such as Revenue & Growth Trend and Class Attendance by Time. Includes quick date range selectors (Last Week, Last Month, Last Quarter, Last Year) for easy time-based filtering.
- **KPI Dashboard**: Comprehensive key performance indicators tracking studio performance with six specialized endpoints and visualizations. Features include: (1) KPI Overview with total revenue, active members, avg class attendance, and total classes; (2) Class Utilization Heatmap showing 7-day x 24-hour grid with color-coded utilization percentages and 80% target threshold highlighting underperforming time slots; (3) Intro-to-Membership Conversion funnel tracking intro class attendees and conversion rates; (4) Churn & Retention Metrics displaying active/inactive member counts and monthly new member trends; (5) Class Performance Analysis identifying underperforming classes below 80% capacity; (6) Membership Trends with visual bar charts. All KPIs support dynamic date range filtering via quick selectors (Last Week/Month/Quarter/Year) or custom date pickers, with proper query parameter handling through custom queryFn implementations to ensure backend filtering accuracy.
- **Reports System**: Four comprehensive report types (Revenue, Attendance, Class Performance, Monthly Summary) with CSV export functionality and customizable date ranges. Features independent date selectors per report and quick range buttons for common time periods.
- **Configurable Imports**: Allows users to specify date ranges and data types for selective data fetching.
- **Revenue Import with Fallback Strategy**: Imports sales data from Mindbody API, attempting detailed line-item data and falling back to transaction data when necessary, with duplicate prevention and historical range support.
- **CSV Revenue Import**: Manual import feature for historical revenue data from Mindbody Business Intelligence CSV exports, featuring flexible column mapping, client matching, duplicate prevention, bulk processing, and validation.
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
