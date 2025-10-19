# Project Requirements Document

## Project Overview

**Project Name:** Mindbody Data Analysis

The Mindbody Data Analysis project aims to develop a web-based SaaS platform that enables users to import and analyze data from Mindbody. This includes data related to students, classes, schedules, attendance, memberships, class purchases, and training income. The platform will integrate ChatGPT via the API to facilitate English language queries, allowing users to generate custom reports and perform data analysis efficiently. The system is designed to handle tens of thousands of records, providing users with insightful analytics and visualizations.

## Tech Stack and Tools

- **Frontend:** React, JavaScript, Tailwind CSS, Vite
- **Backend:** Node.js, NextAuth.js, Drizzle ORM, BullMQ
- **Database:** Neon, PostgreSQL, Materialized views, Incremental tables
- **Data Handling:** GraphQL Subscriptions, TanStack Query, Recharts
- **Authentication:** Auth0, NextAuth.js, API Authentication
- **Caching and Queueing:** Upstash Redis, BullMQ
- **Storage and CDN:** Cloudflare R2, CDN Integration
- **API Integration:** OpenAI Chat Completions / Responses API, GraphQL API
- **Monitoring and Error Handling:** Sentry + OpenTelemetry
- **Testing:** Testing Library
- **Security:** Data Encryption, Privacy Controls
- **Others:** Progressive Web App capabilities, System Health Monitoring

## Target Audience

The target audience for this application includes:

- **Business Owners and Managers:** Those who manage scheduling, attendance, and memberships at fitness centers or similar businesses using Mindbody.
- **Data Analysts:** Professionals looking to extract insights from Mindbody data to optimize operations and increase revenue.
- **Technical Staff:** IT personnel responsible for managing and maintaining business databases and ensuring data integrity and security.

The primary needs of these users include seamless data import, intuitive query capabilities, detailed analytics, and customizable reporting.

## Features

- **User Authentication:** Secure sign-up and login processes, including password reset and two-factor authentication.
- **Role-Based Access Control:** Differentiate access and permissions based on user roles.
- **Account Management:** Manage user profiles, preferences, and settings.
- **Data Import and Export:** Import data from Mindbody and export custom reports.
- **Analytics Dashboard:** Visualize key metrics and insights using Recharts.
- **Custom Reports:** Generate bespoke reports using ChatGPT API for natural language queries.
- **Notifications:** Email and SMS notifications, with a centralized notification center.
- **Performance Metrics:** Monitor system performance and optimize for scalability.
- **Live Sync and Caching:** Ensure data consistency and improve performance with live updates and caching strategies.
- **Admin Dashboard:** Centralized control panel for system administrators.
- **Backup & Restore:** Regular data backups and restore functionalities.
- **System Configuration:** Customize system settings and configurations.
- **Database Management:** Efficiently manage and query large datasets.
- **Privacy Controls:** Ensure user data privacy and comply with data protection regulations.

## Authentication

- **User Sign-Up:** Users can register using their email address or social media accounts via Auth0.
- **Login:** Secure login with email/password or social media authentication.
- **Password Reset:** Users can request a password reset link via email.
- **Two-Factor Authentication:** Optional security feature to enhance account protection.

## New User Flow

1. **Registration:** User visits the sign-up page and creates an account using their email or social media.
2. **Email Verification:** User receives a verification email to confirm their account.
3. **Initial Login:** User logs in with verified credentials.
4. **Profile Setup:** User completes their profile and sets preferences.
5. **Data Import:** User imports data from Mindbody into the platform.
6. **Explore Features:** User navigates through the platform, explores the analytics dashboard, and generates custom reports.
7. **Receive Notifications:** User sets up email/SMS notifications for key events or reports.
8. **Ongoing Usage:** User continues to use the platform for data analysis and reporting needs.

## Constraints

- **Technical Limitations:** Ensure compatibility with modern web browsers; performance may degrade on outdated browsers.
- **Data Volume:** The system should efficiently handle tens of thousands of records without significant performance degradation.
- **API Rate Limits:** Adhere to rate limits imposed by the OpenAI API and other integrated services.

## Known Issues

- **Browser Support:** Limited support for older versions of Internet Explorer; recommend using modern browsers like Chrome, Firefox, or Edge.
- **Performance on Low-End Devices:** Potential slow performance on devices with limited processing power and memory.
- **Integration Dependencies:** Reliance on third-party APIs which can affect system reliability if external services face downtime or changes.

This document provides a comprehensive overview of the Mindbody Data Analysis project, detailing its purpose, technology stack, target users, features, authentication processes, user journey, constraints, and known issues.
