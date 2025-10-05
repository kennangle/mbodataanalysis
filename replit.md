# Mindbody Data Analysis SaaS Platform

## Overview
Enterprise-grade analytics platform that imports and analyzes data from Mindbody (students, classes, schedules, attendance, memberships, purchases, income) with AI-powered natural language querying via OpenAI API, real-time analytics dashboard, custom report generation, role-based access control, and comprehensive business intelligence features.

## Recent Changes (October 5, 2025)

### Database & Backend Infrastructure
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

### Authentication & Security
- Implemented session-based authentication with Passport.js
- PostgreSQL session store for persistence
- Protected API routes with requireAuth middleware
- Password hashing with scrypt
- Login, registration, and logout endpoints

### API Routes
- `/api/auth/*` - Authentication endpoints (login, register, logout, me)
- `/api/students` - Student management with search and pagination
- `/api/classes` - Class management
- `/api/attendance` - Attendance tracking with date filtering
- `/api/revenue` - Revenue data and statistics
- `/api/dashboard/stats` - Aggregated dashboard metrics
- `/api/mindbody/*` - Mindbody OAuth integration (connect, import)

### Frontend Implementation
- Created ThemeProvider with light/dark mode support
- Implemented AuthProvider for global authentication state
- Connected dashboard components to backend APIs:
  - DashboardStats - Real-time statistics with loading states
  - StudentsTable - Paginated student list with search
  - Login/Register pages with proper error handling
- Protected routes with automatic redirect to login

### Mindbody Integration
- MindbodyService class for OAuth integration
- Methods for importing clients, classes, visits, and sales
- Token refresh mechanism
- Batch data import functionality

## Project Architecture

### Tech Stack
- **Frontend**: React, TypeScript, Wouter (routing), TanStack Query (data fetching), Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Authentication**: Passport.js with session management
- **External APIs**: OpenAI (GPT-4), Mindbody OAuth

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
Required secrets:
- DATABASE_URL - PostgreSQL connection string (configured)
- OPENAI_API_KEY - OpenAI API key for AI queries (configured)
- SESSION_SECRET - Session encryption key (auto-generated)
- MINDBODY_API_KEY - Mindbody API credentials (pending)

## Next Steps
1. Implement AI-powered query interface with OpenAI integration
2. Add analytics calculations and report generation endpoints
3. Implement role-based access control and API rate limiting
4. Add data visualization components (revenue charts, attendance graphs)
5. Complete Mindbody OAuth flow
6. Add scheduled reports and email notifications
7. Implement backup/recovery system

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
