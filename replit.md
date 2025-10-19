# Mindbody Data Analysis SaaS Platform

## Overview
This platform is an enterprise-grade analytics solution for Mindbody data, covering students, classes, schedules, attendance, memberships, purchases, and income. Its core purpose is to provide robust data synchronization, AI-powered natural language querying, real-time analytics dashboards, custom report generation, and role-based access control. The platform solves the challenge of unreliable long-running data imports by implementing a resumable background import system with proper cancellation handling, ensuring accurate and comprehensive business intelligence for large datasets. It is designed as a multi-tenancy SaaS platform for deployment on Heroku, supporting multiple Mindbody site implementations with complete data isolation per organization.

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

### Backend Architecture
- **Modular Route Structure**: Routes are organized into specialized modules for maintainability and scalability.

### Design System
- Modern SaaS aesthetic inspired by Linear/Vercel
- Primary color: Blue (hsl(217 91% 60%))
- Typography: Inter (sans-serif), JetBrains Mono (monospace)
- Dark mode support with theme toggle
- Responsive mobile-first design

### Core Features & Implementations
- **Resumable Background Import System**: Utilizes a database-backed job queue for asynchronous, checkpointed data imports with real-time progress tracking, session resilience, resume capabilities, proper cancellation, and auto-cleanup of stale jobs. Includes API call tracking and limit management.
- **Real-Time Webhook Integration**: Supports Mindbody webhooks for instant data synchronization, including HMAC-SHA256 signature verification, deduplication, asynchronous event processing, and automatic attendance record creation.
- **Automatic Pagination**: Implements a generic helper to retrieve all records from the Mindbody API efficiently.
- **User Management**: Admin-only interface for managing users, including CRUD operations, role-based access, and multi-tenancy support.
- **Dashboard & Analytics**: Displays real-time data using live database queries for charts such as Revenue & Growth Trend and Class Attendance by Time.
- **Configurable Imports**: Allows users to specify date ranges and data types for selective data fetching.
- **Revenue Import with Fallback Strategy**: Imports sales data from Mindbody API, attempting detailed line-item data and falling back to transaction data when necessary, with duplicate prevention and historical range support.
- **CSV Revenue Import**: Manual import feature for historical revenue data from Mindbody Business Intelligence CSV exports, featuring flexible column mapping, client matching, duplicate prevention, bulk processing, and validation.
- **Students Data Management**: Comprehensive student roster management with advanced filtering and Excel export functionality.
- **Authentication**: Multi-provider authentication supporting Email/Password and Google OAuth 2.0, with secure token-based password reset.
- **Database Schema**: Comprehensive PostgreSQL schema with tables for users, organizations, students, classes, visits, sales, import jobs, and sessions, designed for multi-tenancy and optimized with indexing.

### Deployment
- **Platform**: Heroku Multi-Tenancy SaaS
- **Multi-Tenancy Design**: Complete data isolation per organization via `organizationId`, shared database with row-level separation, and users belonging to a single organization.
- **Multi-Site Support**: Each organization can connect to a different Mindbody site, with site-specific webhooks and API call tracking.

## External Dependencies
- **Mindbody Public API**: Used for importing client, class, visit, and sales data.
- **OpenAI API**: Integrated for AI-powered natural language querying.
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database service.
- **Google OAuth 2.0**: Provides single sign-on authentication.
- **Brevo (SendinBlue)**: Transactional email service used for password reset emails.