# Mindbody Data Analysis SaaS Platform

## Overview
Enterprise-grade analytics platform that imports and analyzes data from Mindbody (students, classes, schedules, attendance, memberships, purchases, income) with AI-powered natural language querying via OpenAI API, real-time analytics dashboard, custom report generation, role-based access control, and comprehensive business intelligence features.

## Recent Changes

### October 13, 2025 - Mindbody Integration Simplified
- **Switched from OAuth to API Key authentication** for Mindbody integration
  - OAuth access not available in user's account (requires manual enablement from Mindbody support)
  - Implemented direct API Key authentication using existing credentials
  - Simplified UI - removed OAuth connection flow
  - Users can now directly import data without authorization step
- **Configured Mindbody credentials:**
  - API Key: `437fe06dae7e40c2933f06d56edee009`
  - Site ID: `133` (Yoga Health Center)
  - Using Public API Source Credentials for authentication
- Updated MindbodyService to use header-based authentication (Api-Key, SiteId)
- Removed OAuth endpoints and redirect URI configuration requirements

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
1. Test Mindbody API data import with real credentials
2. Add data visualization components (revenue charts, attendance graphs)
3. Implement role-based access control and API rate limiting
4. Add scheduled reports and email notifications
5. Implement backup/recovery system
6. Add export functionality for all reports
7. Create admin dashboard for user management

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
