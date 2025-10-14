# Mindbody Data Analysis SaaS Platform

## Overview
Enterprise-grade analytics platform that imports and analyzes data from Mindbody (students, classes, schedules, attendance, memberships, purchases, income) with AI-powered natural language querying via OpenAI API, real-time analytics dashboard, custom report generation, role-based access control, and comprehensive business intelligence features.

## Recent Changes

### October 14, 2025 - Dashboard Charts Connected to Real Data
- **Replaced mock data with live database queries**
  - Revenue & Growth Trend chart now fetches real revenue and student data
  - Class Attendance by Time chart now fetches real attendance patterns
  - Both charts show proper loading states and empty states
- **Optimized SQL performance for chart data**
  - Revenue trend: Single GROUP BY query instead of 24 sequential queries
  - Attendance by time: SQL JOIN with aggregation instead of loading all data
  - Month labels include year when spanning multiple years (e.g., "Jan 2025", "Feb")
- **Added new API endpoints**
  - GET `/api/dashboard/revenue-trend` - Returns 12 months of revenue and student counts
  - GET `/api/dashboard/attendance-by-time` - Returns attendance by day/time slot
- **Empty state handling**
  - Revenue chart shows "No revenue data available" when revenue is 0 (even if students exist)
  - Attendance chart shows "No attendance data available" when no visits imported
  - Both include helper text to guide users to import data
- **Architect reviewed and approved** ✅
  - All performance concerns addressed
  - Unique month labeling verified
  - Security reviewed (no issues found)

### October 14, 2025 - Configurable Import Filters
- **Added date range and data type filters to import UI**
  - Date range picker with start/end dates (default: last 12 months)
  - Checkboxes to select data types: Clients, Classes, Visits, Sales
  - Default selections: Clients ✅, Classes ✅, Visits ❌, Sales ❌
  - UI preserves user selections between imports
- **Backend support for configurable imports**
  - Updated API to accept optional config parameter with date ranges and data types
  - MindbodyService uses provided dates or falls back to defaults
  - Selective import: only fetches checked data types
  - Dynamic success messages show exactly what was imported
- **End-to-end tested and verified**
  - Tested custom date range (6 months) with only Clients enabled
  - Successfully imported 200 clients, 0 classes as expected
  - All UI controls and backend logic working correctly

### October 14, 2025 - User Token Authentication & Import Foundation
- **Implemented User Token authentication** for Mindbody API v6
  - Added `/usertoken/issue` endpoint call using Source Credentials
  - Username: `_YHC` (underscore prefix required for source credentials)
  - Password: From `MINDBODY_CLIENT_SECRET` environment variable
  - All API requests now include `Authorization: Bearer {token}` header for staff-level access
- **Fixed API parameter case sensitivity issues**
  - Mindbody v6 API requires PascalCase parameters (LastModifiedDate, StartDateTime, Limit)
  - Added diagnostic logging for 4xx errors showing exact request URLs
- Import confirmed working: 200 response in ~35 seconds with real Mindbody data

### October 13, 2025 - Mindbody Integration Foundation
- **Switched from OAuth to API Key authentication** for Mindbody integration
  - OAuth access not available in user's account (requires manual enablement from Mindbody support)
  - Implemented direct API Key authentication using existing credentials
  - Simplified UI - removed OAuth connection flow
- **Configured Mindbody credentials:**
  - API Key: `437fe06dae7e40c2933f06d56edee009`
  - Site ID: `133` (Yoga Health Center)
  - Source Credentials: `_YHC` with password
- Updated MindbodyService to use header-based authentication (Api-Key, SiteId, Authorization)

### October 5, 2025 - Initial Platform Setup

#### Database & Backend Infrastructure
- Implemented comprehensive PostgreSQL schema with 9 tables:
  - Users, Organizations, Students, Classes, ClassSchedules, Attendance, Revenue, AIQueries, Sessions
  - Added proper indexing for performance optimization
  - Multi-tenancy support via organizationId
  
- Created DbStorage interface with methods for:
  - User authentication and management
  - Organization management
  - Student CRUD operations with pagination
  - Class and schedule management
  - Attendance tracking
  - Revenue analytics with date filtering
  - AI query logging

#### Authentication & Security
- Implemented session-based authentication with Passport.js
- PostgreSQL session store for persistence
- Protected API routes with requireAuth middleware
- Password hashing with scrypt
- Login, registration, and logout endpoints

#### API Routes
- `/api/auth/*` - Authentication endpoints (login, register, logout, me)
- `/api/students` - Student management with search and pagination
- `/api/classes` - Class management
- `/api/attendance` - Attendance tracking with date filtering
- `/api/revenue` - Revenue data and statistics
- `/api/dashboard/stats` - Aggregated dashboard metrics
- `/api/mindbody/import` - Direct Mindbody data import (API Key auth)

#### Frontend Implementation
- Created ThemeProvider with light/dark mode support
- Implemented AuthProvider for global authentication state
- Connected dashboard components to backend APIs:
  - DashboardStats - Real-time statistics with loading states
  - StudentsTable - Paginated student list with search
  - Login/Register pages with proper error handling
- Protected routes with automatic redirect to login

#### Mindbody Integration
- MindbodyService class with API Key authentication
- Methods for importing clients, classes, visits, and sales
- Direct HTTP requests using Api-Key and SiteId headers
- Simplified import flow without OAuth complexity

## Project Architecture

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

## User Preferences
- Professional business intelligence interface
- Data clarity over decoration
- Real-time analytics with interactive visualizations
- AI-powered natural language query interface
- Multi-tenancy for multiple organizations

## Environment Setup
Required secrets (all configured):
- DATABASE_URL - PostgreSQL connection string ✅
- OPENAI_API_KEY - OpenAI API key for AI queries ✅
- SESSION_SECRET - Session encryption key (auto-generated) ✅
- MINDBODY_API_KEY - Mindbody API Key authentication ✅
- MINDBODY_CLIENT_ID - Mindbody client identifier ✅
- MINDBODY_CLIENT_SECRET - Mindbody client secret ✅

## Admin Credentials
- Email: ken@yogahealthcenter.com
- Password: Admin123!

## Next Steps
1. ✅ ~~Test Mindbody API data import with real credentials~~ - COMPLETED
2. Add configurable import settings (data types, date ranges, limits)
3. Implement per-client import for Visits/Sales data (if needed in future)
4. Add data visualization components (revenue charts, attendance graphs)
5. Implement role-based access control and API rate limiting
6. Add scheduled reports and email notifications
7. Implement backup/recovery system
8. Create admin dashboard for user management
9. Cache user tokens to reduce redundant /usertoken/issue calls
10. Support multi-site deployments with per-organization SiteId

## Development Commands
- `npm run dev` - Start development server (port 5000)
- `npm run db:push` - Apply database migrations
- `npx drizzle-kit generate` - Generate migration files
- `npx drizzle-kit studio` - Open database GUI

## Notes
- All API routes are prefixed with `/api`
- Frontend and backend served on same port (5000)
- Session cookies configured for secure authentication
- Database includes proper indexes for query optimization
- Multi-tenancy isolated by organizationId
