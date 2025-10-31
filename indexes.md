# Database Indexes Documentation

This document describes all database indexes in the Mindbody Data Analysis platform, organized by table. Indexes are used to speed up query performance, especially for AI-powered analytics and reporting.

## Table of Contents
- [Students](#students)
- [Classes](#classes)
- [Class Schedules](#class-schedules)
- [Attendance](#attendance)
- [Revenue (Sales/Purchases)](#revenue-salespurchases)
- [AI Queries](#ai-queries)
- [Sessions](#sessions)
- [Import Jobs](#import-jobs)
- [Uploaded Files](#uploaded-files)
- [AI Generated Files](#ai-generated-files)
- [Conversations](#conversations)
- [Conversation Messages](#conversation-messages)
- [Pricing Options](#pricing-options)

---

## Students

### `students_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Enable fast filtering of students by organization (multi-tenancy support)
- **Used by**: All student queries, user management, data isolation

---

## Classes

### `classes_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Fast filtering of classes by organization
- **Used by**: Class listing, analytics, reporting

---

## Class Schedules

### `schedules_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Filter schedules by organization
- **Used by**: Schedule queries, calendar views

### `schedules_class_idx`
- **Columns**: `classId`
- **Type**: B-tree index
- **Purpose**: Quickly find all schedules for a specific class
- **Used by**: Class detail views, schedule management

### `schedules_time_idx`
- **Columns**: `startTime`
- **Type**: B-tree index
- **Purpose**: Enable fast date range queries and chronological sorting
- **Used by**: Calendar views, upcoming classes queries

---

## Attendance

### `attendance_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Filter attendance records by organization
- **Used by**: All attendance queries

### `attendance_student_idx`
- **Columns**: `studentId`
- **Type**: B-tree index
- **Purpose**: Quickly find all classes attended by a specific student
- **Used by**: Student profile pages, attendance history

### `attendance_schedule_idx`
- **Columns**: `scheduleId`
- **Type**: B-tree index
- **Purpose**: Find all students who attended a specific class
- **Used by**: Class attendance reports

### `attendance_time_idx`
- **Columns**: `attendedAt`
- **Type**: B-tree index
- **Purpose**: Enable date range filtering and time-based analytics
- **Used by**: Attendance trends, date range reports

### `attendance_student_classes_idx` ⭐ *Composite Index*
- **Columns**: `organizationId`, `studentId`, `attendedAt`
- **Type**: B-tree composite index
- **Purpose**: **Optimized for AI queries** - Find all classes for specific students with date ordering
- **Used by**: 
  - "Show me all classes attended by student X"
  - "Which students who bought Intro Offers attended classes?"
  - AI-powered student engagement analysis
- **Performance**: Covers queries filtering by org + student + date range without additional lookups

### `attendance_class_attendance_idx` ⭐ *Composite Index*
- **Columns**: `organizationId`, `scheduleId`, `attendedAt`, `studentId`
- **Type**: B-tree composite index
- **Purpose**: **Optimized for AI queries** - Find which students attended specific classes in a date range
- **Used by**:
  - "Which students attended Yoga classes in October?"
  - Class popularity analysis
  - AI-powered class performance queries
- **Performance**: Index-only scan for class attendance queries

---

## Revenue (Sales/Purchases)

### `revenue_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Filter revenue by organization
- **Used by**: All revenue queries, financial reports

### `revenue_student_idx`
- **Columns**: `studentId`
- **Type**: B-tree index
- **Purpose**: Find all purchases made by a specific student
- **Used by**: Student purchase history, customer lifetime value

### `revenue_date_idx`
- **Columns**: `transactionDate`
- **Type**: B-tree index
- **Purpose**: Enable date range queries and time-series analysis
- **Used by**: Revenue reports, financial dashboards, trend analysis

### `revenue_unique_sale_item_idx` *Unique Index*
- **Columns**: `organizationId`, `mindbodySaleId`, `mindbodyItemId`
- **Type**: Unique B-tree composite index
- **Purpose**: Prevent duplicate revenue records from Mindbody API imports
- **Used by**: Data integrity during imports, deduplication

### `revenue_intro_offer_idx` ⭐ *Composite Index*
- **Columns**: `organizationId`, `description`, `studentId`
- **Type**: B-tree composite index
- **Purpose**: **Optimized for AI queries** - Find Intro Offer purchases and get student IDs
- **Used by**:
  - "Show me all students who purchased Intro Offers"
  - "How many Intro Offer sales this month?"
  - AI analysis of promotional offers
- **Query Pattern**: `WHERE description LIKE '%Intro%' OR description LIKE '%intro%'`
- **Performance**: Enables fast pattern matching on description + student lookup

### `revenue_student_purchase_idx` ⭐ *Composite Index*
- **Columns**: `organizationId`, `studentId`, `transactionDate`
- **Type**: B-tree composite index
- **Purpose**: **Optimized for AI queries** - Find what a student purchased and when
- **Used by**:
  - "Show purchase timeline for student X"
  - "Students who purchased in the last 30 days"
  - Customer retention analysis
- **Performance**: Index-only scan for student purchase history with date filtering

---

## AI Queries

### `ai_queries_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Filter AI queries by organization
- **Used by**: Usage tracking, AI query history

### `ai_queries_user_idx`
- **Columns**: `userId`
- **Type**: B-tree index
- **Purpose**: Find all queries made by a specific user
- **Used by**: User activity tracking, personalized query history

---

## Sessions

### `sessions_expire_idx`
- **Columns**: `expire`
- **Type**: B-tree index
- **Purpose**: Enable efficient cleanup of expired sessions
- **Used by**: Session garbage collection, authentication system

---

## Import Jobs

### `import_jobs_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Filter import jobs by organization
- **Used by**: Import history, job status tracking

### `import_jobs_status_idx`
- **Columns**: `status`
- **Type**: B-tree index
- **Purpose**: Quickly find active, pending, or failed import jobs
- **Used by**: Background worker (finding jobs to process), UI status display

---

## Uploaded Files

### `uploaded_files_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Filter uploaded files by organization
- **Used by**: File listing, AI query file attachments

### `uploaded_files_user_idx`
- **Columns**: `userId`
- **Type**: B-tree index
- **Purpose**: Find all files uploaded by a specific user
- **Used by**: User file management, permission checks

---

## AI Generated Files

### `ai_generated_files_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Filter AI-generated files by organization
- **Used by**: File listing, download endpoints

### `ai_generated_files_user_idx`
- **Columns**: `userId`
- **Type**: B-tree index
- **Purpose**: Find files generated for a specific user
- **Used by**: User's generated files list

### `ai_generated_files_filename_idx`
- **Columns**: `filename`
- **Type**: B-tree index
- **Purpose**: Quick lookup by filename
- **Used by**: File retrieval, duplicate detection

---

## Conversations

### `conversations_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Filter conversations by organization
- **Used by**: Conversation listing, AI query interface

### `conversations_user_idx`
- **Columns**: `userId`
- **Type**: B-tree index
- **Purpose**: Find all conversations for a specific user
- **Used by**: User conversation history

### `conversations_updated_idx`
- **Columns**: `updatedAt`
- **Type**: B-tree index
- **Purpose**: Sort conversations by most recent activity
- **Used by**: Conversation listing (showing most recent first)

---

## Conversation Messages

### `conversation_messages_conversation_idx`
- **Columns**: `conversationId`
- **Type**: B-tree index
- **Purpose**: Retrieve all messages in a conversation
- **Used by**: Conversation display, message loading

### `conversation_messages_created_idx`
- **Columns**: `createdAt`
- **Type**: B-tree index
- **Purpose**: Chronological ordering of messages
- **Used by**: Message history display

### `conversation_messages_status_idx`
- **Columns**: `status`
- **Type**: B-tree index
- **Purpose**: Find pending/failed messages for background processing
- **Used by**: Background AI worker, polling for query completion

---

## Pricing Options

### `pricing_options_org_idx`
- **Columns**: `organizationId`
- **Type**: B-tree index
- **Purpose**: Filter pricing options by organization
- **Used by**: Pricing option listing, service catalog

### `pricing_options_service_idx` *Unique Index*
- **Columns**: `organizationId`, `mindbodyServiceId`
- **Type**: Unique B-tree composite index
- **Purpose**: Prevent duplicate pricing options from Mindbody API, ensure one-to-one mapping
- **Used by**: Pricing option imports, service lookups

---

## Index Maintenance Notes

### Automatic Maintenance
- PostgreSQL automatically maintains all indexes through its autovacuum process
- Indexes are automatically used by the query planner when beneficial
- No manual maintenance required under normal operation

### Monitoring
To check index usage statistics:
```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Performance Impact
- Indexes speed up SELECT queries but slightly slow down INSERT/UPDATE/DELETE
- The composite indexes (marked with ⭐) provide the biggest performance gains for AI queries
- All indexes are B-tree type, optimal for range queries and equality comparisons

---

## AI Query Optimization Strategy

The indexes marked with ⭐ are specifically designed to accelerate common AI-powered analytics queries:

1. **Intro Offer Analysis**: `revenue_intro_offer_idx` + `attendance_student_classes_idx`
   - Fast identification of Intro Offer purchases
   - Quick lookup of classes attended by those students
   
2. **Student Engagement**: `revenue_student_purchase_idx` + `attendance_student_classes_idx`
   - Purchase timeline for any student
   - Class attendance history with dates
   
3. **Class Performance**: `attendance_class_attendance_idx`
   - Which students attended which classes
   - Date range filtering for trend analysis

These composite indexes enable **index-only scans**, where PostgreSQL can answer queries entirely from the index without touching the table data, providing massive performance improvements for AI analytics.

---

*Last updated: October 30, 2025*
