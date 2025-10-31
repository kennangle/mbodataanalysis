# Mindbody Data Analysis SaaS Platform

## Overview

This platform is an enterprise-grade analytics solution for Mindbody data, covering students, classes, schedules, attendance, memberships, purchases, pricing options, and income. It offers robust data synchronization, AI-powered natural language querying, real-time analytics dashboards, custom report generation, and role-based access control. Key features include a resumable background import system with cancellation handling and multi-tenancy support with data isolation per organization. The platform's vision is to empower fitness and wellness businesses with comprehensive, reliable data insights for informed decision-making and strategic growth.

## User Preferences

- Professional business intelligence interface
- Data clarity over decoration
- Real-time analytics with interactive visualizations
- AI-powered natural language query interface
- Multi-tenancy for multiple organizations
- **Component Library Preference**: In all cases where there is an existing widget, React component, or third-party library available, it is preferable to use it rather than building from scratch. This includes UI components (react-datepicker, react-timezone-select, react-table), charts (recharts), and utility libraries. Custom implementations should only be considered when no suitable existing solution exists

## System Architecture

### Tech Stack

- **Frontend**: React, TypeScript, Wouter, TanStack Query, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Authentication**: Passport.js with session management
- **File Storage**: Google Cloud Storage via Replit Object Storage
- **Mindbody Credentials**: Configurable per organization in Settings (admin-only), stored in database with API response masking. Supports multi-tenancy with per-org token caching.

### Design System

- Modern SaaS aesthetic inspired by Linear/Vercel
- Primary color: Blue (hsl(217 91% 60%))
- Typography: Inter (sans-serif), JetBrains Mono (monospace)
- Dark mode support with theme toggle
- Responsive mobile-first design

### Core Features & Implementations

- **Resumable Background Import System**: Asynchronous, checkpointed data imports with real-time progress, session resilience, and history tracking. Visit imports optimized to query by date range instead of per-student iteration, reducing 3-day imports from 10+ hours to under 30 minutes.
- **Skipped Records Tracking & Reporting**: Logs, reports, and exports records failing validation during imports.
- **Scheduled Automatic Imports**: Node-cron powered scheduler for automated imports with configurable schedules.
- **Real-Time Webhook Integration**: Supports Mindbody webhooks for instant data synchronization with HMAC-SHA256 verification.
- **User Management**: Admin interface for CRUD, role-based access, and multi-tenancy.
- **Dashboard & Analytics**: Real-time interactive charts for revenue, growth, and class attendance.
- **AI-Powered Natural Language Queries**: OpenAI GPT-4o-mini with Function Calling for dynamic database querying, featuring a conversational interface with follow-up question support and message history. Background asynchronous processing allows users to navigate away while queries complete, with automatic recovery of pending queries after server restarts. Supports file uploads (CSV, Excel, PDF, TXT) with automatic text extraction for AI-powered analysis. Files stored securely in Google Cloud Storage with multi-tenant isolation. Multi-query concurrency support with Set-based polling for multiple simultaneous pending queries.
- **KPI Dashboard**: Tracks studio performance with key metrics like total revenue, active members, and class performance analysis, with dynamic date filtering.
- **Reports System**: Four comprehensive report types (Revenue, Attendance, Class Performance, Monthly Summary) with CSV export.
- **Data Coverage Report**: Diagnostics page showing record counts, date range coverage, and data quality metrics.
- **Quick Stats Dashboard Widget**: Real-time monitoring widget with at-a-glance totals and latest import dates.
- **Configurable Imports**: Users can specify date ranges and data types for selective data fetching.
- **Revenue Import Strategy**: Prioritizes CSV for historical data, scheduled API imports for ongoing synchronization.
- **Students Data Management**: Comprehensive student roster with filtering and Excel export.
- **Pricing Options Management**: Complete service and pricing catalog from Mindbody with one-click import, search/filter capabilities, and Excel export. Integrated with AI for natural language queries about pricing and services.
- **Authentication**: Multi-provider support (Email/Password, Google OAuth 2.0) with secure password reset.
- **User Timezone Preferences**: Comprehensive timezone support throughout the application, displaying all date/time-related information in the user's selected timezone.
- **Database Schema**: Optimized PostgreSQL schema for multi-tenancy, with row-level data isolation via `organizationId`.

## External Dependencies

- **Mindbody Public API**: For importing client, class, visit, sales, and pricing options data.
- **OpenAI API**: For AI-powered natural language querying with file analysis.
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database.
- **Google OAuth 2.0**: For single sign-on authentication.
- **Brevo (SendinBlue)**: For transactional emails.
- **Google Cloud Storage**: For secure file storage via Replit Object Storage integration.