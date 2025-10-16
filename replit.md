# Mindbody Data Analysis SaaS Platform

## Overview
This platform is an enterprise-grade analytics solution for Mindbody data, covering students, classes, schedules, attendance, memberships, purchases, and income. Its core purpose is to provide robust data synchronization, AI-powered natural language querying, real-time analytics dashboards, custom report generation, and role-based access control. The platform solves the challenge of unreliable long-running data imports by implementing a resumable background import system with proper cancellation handling, ensuring accurate and comprehensive business intelligence for large datasets.

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
- **Resumable Background Import System**: Utilizes a database-backed job queue for asynchronous, checkpointed data imports to overcome HTTP connection timeouts. Features include:
  - Sequential batching for Mindbody API rate limiting
  - Real-time progress tracking with live polling
  - Session resilience (survives page reloads)
  - Resume capabilities for failed jobs
  - Proper cancellation with terminal 'cancelled' status
  - Auto-cleanup of stale jobs when starting new imports
  - Race condition protection between worker and cancel operations
- **Automatic Pagination**: Implements a generic helper (`fetchAllPages<T>()`) to retrieve all records from the Mindbody API, optimized for large datasets.
- **User Management**: An admin-only interface for managing users within an organization, including CRUD operations, role-based access (admin/user), and multi-tenancy support.
- **Dashboard & Analytics**: Displays real-time data using live database queries for charts such as Revenue & Growth Trend and Class Attendance by Time, with optimized SQL for performance.
- **Configurable Imports**: Allows users to specify date ranges and data types (Clients, Classes, Visits, Sales) for selective data fetching.
- **Authentication**: Session-based authentication using Passport.js with scrypt for password hashing. Mindbody API authentication uses cached User Tokens for efficiency.
- **Database Schema**: A comprehensive PostgreSQL schema with 10 tables, designed for multi-tenancy via `organizationId` and optimized with indexing.

### API Endpoints
- `/api/auth/*`: Authentication endpoints.
- `/api/students`: Student management and search.
- `/api/classes`: Class management.
- `/api/attendance`: Attendance tracking.
- `/api/revenue`: Revenue data.
- `/api/dashboard/stats`: Aggregated dashboard metrics.
- `/api/mindbody/import/start`: Initiates a background import job.
- `/api/mindbody/import/active`: Fetches active import job status.
- `/api/mindbody/import/:id/status`: Retrieves real-time status of an import job.
- `/api/mindbody/import/:id/resume`: Resumes a paused/failed import job.
- `/api/mindbody/import/:id/cancel`: Cancels an import job.
- `/api/dashboard/revenue-trend`: Provides revenue and student count trends.
- `/api/dashboard/attendance-by-time`: Provides attendance by day/time.

## External Dependencies
- **Mindbody Public API**: Used for importing client, class, visit, and sales data, authenticated via API Key and User Tokens.
- **OpenAI API**: Integrated for AI-powered natural language querying.
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database service.