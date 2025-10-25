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
- **AI-Powered Natural Language Queries**: OpenAI GPT-4o-mini with Function Calling for natural language questions, dynamic database querying, and data-driven insights using specialized functions.
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

## External Dependencies

- **Mindbody Public API**: For importing client, class, visit, and sales data.
- **OpenAI API**: For AI-powered natural language querying.
- **Neon (PostgreSQL)**: Cloud-hosted PostgreSQL database.
- **Google OAuth 2.0**: For single sign-on authentication.
- **Brevo (SendinBlue)**: For transactional emails like password resets.