var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aiGeneratedFiles: () => aiGeneratedFiles,
  aiQueries: () => aiQueries,
  attendance: () => attendance,
  classSchedules: () => classSchedules,
  classes: () => classes,
  conversationMessages: () => conversationMessages,
  conversations: () => conversations,
  importJobs: () => importJobs,
  insertAIQuerySchema: () => insertAIQuerySchema,
  insertAiGeneratedFileSchema: () => insertAiGeneratedFileSchema,
  insertAttendanceSchema: () => insertAttendanceSchema,
  insertClassScheduleSchema: () => insertClassScheduleSchema,
  insertClassSchema: () => insertClassSchema,
  insertConversationMessageSchema: () => insertConversationMessageSchema,
  insertConversationSchema: () => insertConversationSchema,
  insertImportJobSchema: () => insertImportJobSchema,
  insertOrganizationSchema: () => insertOrganizationSchema,
  insertPasswordResetTokenSchema: () => insertPasswordResetTokenSchema,
  insertRevenueSchema: () => insertRevenueSchema,
  insertScheduledImportSchema: () => insertScheduledImportSchema,
  insertSkippedImportRecordSchema: () => insertSkippedImportRecordSchema,
  insertStudentSchema: () => insertStudentSchema,
  insertUploadedFileSchema: () => insertUploadedFileSchema,
  insertUserSchema: () => insertUserSchema,
  insertWebhookEventSchema: () => insertWebhookEventSchema,
  insertWebhookSubscriptionSchema: () => insertWebhookSubscriptionSchema,
  organizations: () => organizations,
  passwordResetTokens: () => passwordResetTokens,
  revenue: () => revenue,
  scheduledImports: () => scheduledImports,
  sessions: () => sessions,
  skippedImportRecords: () => skippedImportRecords,
  students: () => students,
  uploadedFiles: () => uploadedFiles,
  users: () => users,
  webhookEvents: () => webhookEvents,
  webhookSubscriptions: () => webhookSubscriptions
});
import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  uuid,
  index,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users, insertUserSchema, organizations, insertOrganizationSchema, students, insertStudentSchema, classes, insertClassSchema, classSchedules, insertClassScheduleSchema, attendance, insertAttendanceSchema, revenue, insertRevenueSchema, aiQueries, insertAIQuerySchema, sessions, importJobs, insertImportJobSchema, skippedImportRecords, insertSkippedImportRecordSchema, passwordResetTokens, insertPasswordResetTokenSchema, webhookSubscriptions, insertWebhookSubscriptionSchema, webhookEvents, insertWebhookEventSchema, scheduledImports, insertScheduledImportSchema, uploadedFiles, insertUploadedFileSchema, aiGeneratedFiles, insertAiGeneratedFileSchema, conversations, insertConversationSchema, conversationMessages, insertConversationMessageSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: uuid("id").defaultRandom().primaryKey(),
      email: text("email").notNull().unique(),
      passwordHash: text("password_hash"),
      // Nullable for OAuth users
      name: text("name").notNull(),
      role: text("role").notNull().default("user"),
      organizationId: uuid("organization_id"),
      provider: text("provider").notNull().default("local"),
      // "local", "google"
      providerId: text("provider_id"),
      // OAuth provider user ID
      timezone: text("timezone").notNull().default("UTC"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true
    });
    organizations = pgTable("organizations", {
      id: uuid("id").defaultRandom().primaryKey(),
      name: text("name").notNull(),
      mindbodyAccessToken: text("mindbody_access_token"),
      mindbodyRefreshToken: text("mindbody_refresh_token"),
      mindbodySiteId: text("mindbody_site_id"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertOrganizationSchema = createInsertSchema(organizations).omit({
      id: true,
      createdAt: true
    });
    students = pgTable(
      "students",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        mindbodyClientId: text("mindbody_client_id"),
        firstName: text("first_name").notNull(),
        lastName: text("last_name").notNull(),
        email: text("email"),
        phone: text("phone"),
        status: text("status").notNull().default("active"),
        membershipType: text("membership_type"),
        joinDate: timestamp("join_date"),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("students_org_idx").on(table.organizationId)
      })
    );
    insertStudentSchema = createInsertSchema(students).omit({
      id: true,
      createdAt: true
    });
    classes = pgTable(
      "classes",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        mindbodyClassId: text("mindbody_class_id"),
        name: text("name").notNull(),
        description: text("description"),
        instructorName: text("instructor_name"),
        capacity: integer("capacity"),
        duration: integer("duration"),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("classes_org_idx").on(table.organizationId)
      })
    );
    insertClassSchema = createInsertSchema(classes).omit({
      id: true,
      createdAt: true
    });
    classSchedules = pgTable(
      "class_schedules",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        classId: uuid("class_id").notNull(),
        mindbodyScheduleId: text("mindbody_schedule_id"),
        startTime: timestamp("start_time").notNull(),
        endTime: timestamp("end_time").notNull(),
        location: text("location"),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("schedules_org_idx").on(table.organizationId),
        classIdx: index("schedules_class_idx").on(table.classId),
        timeIdx: index("schedules_time_idx").on(table.startTime)
      })
    );
    insertClassScheduleSchema = createInsertSchema(classSchedules).omit({
      id: true,
      createdAt: true
    });
    attendance = pgTable(
      "attendance",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        studentId: uuid("student_id").notNull(),
        scheduleId: uuid("schedule_id").notNull(),
        attendedAt: timestamp("attended_at").notNull(),
        status: text("status").notNull().default("attended"),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("attendance_org_idx").on(table.organizationId),
        studentIdx: index("attendance_student_idx").on(table.studentId),
        scheduleIdx: index("attendance_schedule_idx").on(table.scheduleId),
        timeIdx: index("attendance_time_idx").on(table.attendedAt)
        // Note: Unique constraint attendance_unique_student_schedule_date_idx exists in database
        // Created via raw SQL to prevent duplicates: (organizationId, studentId, scheduleId, attendedAt::date)
        // Not defined here because Drizzle can't generate proper migration SQL for partial indexes with date casting
      })
    );
    insertAttendanceSchema = createInsertSchema(attendance).omit({
      id: true,
      createdAt: true
    });
    revenue = pgTable(
      "revenue",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        studentId: uuid("student_id"),
        mindbodySaleId: text("mindbody_sale_id"),
        mindbodyItemId: text("mindbody_item_id"),
        amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
        type: text("type").notNull(),
        description: text("description"),
        transactionDate: timestamp("transaction_date").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("revenue_org_idx").on(table.organizationId),
        studentIdx: index("revenue_student_idx").on(table.studentId),
        dateIdx: index("revenue_date_idx").on(table.transactionDate),
        uniqueSaleItem: uniqueIndex("revenue_unique_sale_item_idx").on(
          table.organizationId,
          table.mindbodySaleId,
          table.mindbodyItemId
        )
      })
    );
    insertRevenueSchema = createInsertSchema(revenue).omit({
      id: true,
      createdAt: true
    });
    aiQueries = pgTable(
      "ai_queries",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        userId: uuid("user_id").notNull(),
        query: text("query").notNull(),
        response: text("response"),
        tokensUsed: integer("tokens_used"),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("ai_queries_org_idx").on(table.organizationId),
        userIdx: index("ai_queries_user_idx").on(table.userId)
      })
    );
    insertAIQuerySchema = createInsertSchema(aiQueries).omit({
      id: true,
      createdAt: true
    });
    sessions = pgTable(
      "sessions",
      {
        sid: text("sid").primaryKey(),
        sess: text("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => ({
        expireIdx: index("sessions_expire_idx").on(table.expire)
      })
    );
    importJobs = pgTable(
      "import_jobs",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        status: text("status").notNull().default("pending"),
        // pending, running, completed, failed, paused, cancelled
        dataTypes: text("data_types").array().notNull(),
        // ["clients", "classes", "visits", "sales"]
        startDate: timestamp("start_date").notNull(),
        endDate: timestamp("end_date").notNull(),
        progress: text("progress").notNull().default("{}"),
        // JSON: {clients: {current: 0, total: 0}, ...}
        currentDataType: text("current_data_type"),
        // Which data type is currently processing
        currentOffset: integer("current_offset").default(0),
        // Current pagination offset
        error: text("error"),
        // Error message if failed
        csvData: text("csv_data"),
        // Compressed CSV data for background processing
        pausedAt: timestamp("paused_at"),
        // When the import was paused
        heartbeatAt: timestamp("heartbeat_at"),
        // Last worker heartbeat - updated every minute
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("import_jobs_org_idx").on(table.organizationId),
        statusIdx: index("import_jobs_status_idx").on(table.status)
      })
    );
    insertImportJobSchema = createInsertSchema(importJobs).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    skippedImportRecords = pgTable(
      "skipped_import_records",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        importJobId: uuid("import_job_id"),
        dataType: text("data_type").notNull(),
        // "client", "class", "visit", "sale"
        mindbodyId: text("mindbody_id").notNull(),
        // Mindbody record ID
        reason: text("reason").notNull(),
        // Why it was skipped
        rawData: text("raw_data"),
        // JSON of the raw Mindbody record
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("skipped_import_records_org_idx").on(table.organizationId),
        jobIdx: index("skipped_import_records_job_idx").on(table.importJobId),
        dataTypeIdx: index("skipped_import_records_data_type_idx").on(table.dataType)
      })
    );
    insertSkippedImportRecordSchema = createInsertSchema(skippedImportRecords).omit({
      id: true,
      createdAt: true
    });
    passwordResetTokens = pgTable(
      "password_reset_tokens",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id").notNull(),
        token: text("token").notNull().unique(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        userIdx: index("password_reset_tokens_user_idx").on(table.userId),
        tokenIdx: index("password_reset_tokens_token_idx").on(table.token),
        expiresIdx: index("password_reset_tokens_expires_idx").on(table.expiresAt)
      })
    );
    insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
      id: true,
      createdAt: true
    });
    webhookSubscriptions = pgTable(
      "webhook_subscriptions",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        eventType: text("event_type").notNull(),
        // e.g., "classVisit.created"
        webhookUrl: text("webhook_url").notNull(),
        status: text("status").notNull().default("active"),
        // active, inactive
        mindbodySubscriptionId: text("mindbody_subscription_id"),
        // ID from Mindbody
        messageSignatureKey: text("message_signature_key"),
        // For HMAC verification
        referenceId: text("reference_id"),
        eventSchemaVersion: integer("event_schema_version").notNull().default(1),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("webhook_subscriptions_org_idx").on(table.organizationId),
        statusIdx: index("webhook_subscriptions_status_idx").on(table.status)
      })
    );
    insertWebhookSubscriptionSchema = createInsertSchema(webhookSubscriptions).omit({
      id: true,
      createdAt: true
    });
    webhookEvents = pgTable(
      "webhook_events",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        subscriptionId: uuid("subscription_id"),
        // Link to subscription
        messageId: text("message_id").notNull().unique(),
        // For deduplication
        eventType: text("event_type").notNull(),
        eventData: text("event_data").notNull(),
        // JSON payload
        processed: boolean("processed").notNull().default(false),
        processedAt: timestamp("processed_at"),
        error: text("error"),
        // Error message if processing failed
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("webhook_events_org_idx").on(table.organizationId),
        messageIdx: index("webhook_events_message_idx").on(table.messageId),
        processedIdx: index("webhook_events_processed_idx").on(table.processed)
      })
    );
    insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
      id: true,
      createdAt: true
    });
    scheduledImports = pgTable(
      "scheduled_imports",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        enabled: boolean("enabled").notNull().default(false),
        schedule: text("schedule").notNull().default("0 2 * * *"),
        // Cron expression (2am daily)
        dataTypes: text("data_types").notNull().default("students,classes,visits,sales"),
        // Comma-separated
        daysToImport: integer("days_to_import").notNull().default(7),
        // Import last N days
        lastRunAt: timestamp("last_run_at"),
        lastRunStatus: text("last_run_status"),
        // "success" | "failed" | "running"
        lastRunError: text("last_run_error"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: uniqueIndex("scheduled_imports_org_idx").on(table.organizationId)
      })
    );
    insertScheduledImportSchema = createInsertSchema(scheduledImports).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    uploadedFiles = pgTable(
      "uploaded_files",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        userId: uuid("user_id").notNull(),
        fileName: text("file_name").notNull(),
        originalName: text("original_name").notNull(),
        fileType: text("file_type").notNull(),
        // mime type
        fileSize: integer("file_size").notNull(),
        // bytes
        storagePath: text("storage_path").notNull(),
        // path in object storage
        extractedText: text("extracted_text"),
        // parsed content for AI analysis
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("uploaded_files_org_idx").on(table.organizationId),
        userIdx: index("uploaded_files_user_idx").on(table.userId)
      })
    );
    insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
      id: true,
      createdAt: true
    });
    aiGeneratedFiles = pgTable(
      "ai_generated_files",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        userId: uuid("user_id").notNull(),
        filename: text("filename").notNull(),
        // UUID-prefixed filename
        originalFilename: text("original_filename").notNull(),
        // User-friendly name
        storagePath: text("storage_path").notNull(),
        // Full path in object storage
        fileType: text("file_type").notNull().default("excel"),
        // File type
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("ai_generated_files_org_idx").on(table.organizationId),
        userIdx: index("ai_generated_files_user_idx").on(table.userId),
        filenameIdx: index("ai_generated_files_filename_idx").on(table.filename)
      })
    );
    insertAiGeneratedFileSchema = createInsertSchema(aiGeneratedFiles).omit({
      id: true,
      createdAt: true
    });
    conversations = pgTable(
      "conversations",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        organizationId: uuid("organization_id").notNull(),
        userId: uuid("user_id").notNull(),
        title: text("title").notNull(),
        // Auto-generated from first message or user-provided
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull()
      },
      (table) => ({
        orgIdx: index("conversations_org_idx").on(table.organizationId),
        userIdx: index("conversations_user_idx").on(table.userId),
        updatedIdx: index("conversations_updated_idx").on(table.updatedAt)
      })
    );
    insertConversationSchema = createInsertSchema(conversations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    conversationMessages = pgTable(
      "conversation_messages",
      {
        id: uuid("id").defaultRandom().primaryKey(),
        conversationId: uuid("conversation_id").notNull(),
        role: text("role").notNull(),
        // "user" or "assistant"
        content: text("content").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        conversationIdx: index("conversation_messages_conversation_idx").on(table.conversationId),
        createdIdx: index("conversation_messages_created_idx").on(table.createdAt)
      })
    );
    insertConversationMessageSchema = createInsertSchema(conversationMessages).omit({
      id: true,
      createdAt: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      // Maximum number of clients in the pool (increased for concurrent imports + user requests)
      idleTimeoutMillis: 3e4,
      // Close idle clients after 30 seconds (increased from default 10s)
      connectionTimeoutMillis: 1e4
      // Timeout for establishing new connection
    });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/storage.ts
import { eq, and, desc, gte, lt, lte, sql } from "drizzle-orm";
import { addDays } from "date-fns";
async function withDatabaseRetry(operation, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isConnectionError = error?.code === "57P01" || // Connection terminated
      error?.code === "ECONNRESET" || error?.message?.includes("connection terminated") || error?.message?.includes("connection closed") || error?.message?.includes("connection lost");
      if (attempt === maxRetries || !isConnectionError) {
        throw error;
      }
      const delayMs = Math.pow(2, attempt) * 1e3;
      console.warn(
        `[DB Retry] Connection error (${error?.code || "unknown"}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Unreachable code");
}
var DbStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_db();
    init_schema();
    DbStorage = class {
      async getUserById(id) {
        const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return result[0];
      }
      async getUserByEmail(email) {
        const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return result[0];
      }
      async getUserByProvider(provider, providerId) {
        const result = await db.select().from(users).where(and(eq(users.provider, provider), eq(users.providerId, providerId))).limit(1);
        return result[0];
      }
      async getUsers(organizationId) {
        return await db.select().from(users).where(eq(users.organizationId, organizationId));
      }
      async createUser(user) {
        const result = await db.insert(users).values(user).returning();
        return result[0];
      }
      async updateUser(id, user) {
        await db.update(users).set(user).where(eq(users.id, id));
      }
      async deleteUser(id) {
        await db.delete(users).where(eq(users.id, id));
      }
      async createPasswordResetToken(userId, token, expiresAt) {
        const result = await db.insert(passwordResetTokens).values({
          userId,
          token,
          expiresAt
        }).returning();
        return result[0];
      }
      async getPasswordResetToken(token) {
        const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
        return result[0];
      }
      async deletePasswordResetToken(token) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
      }
      async deleteExpiredPasswordResetTokens() {
        await db.delete(passwordResetTokens).where(lte(passwordResetTokens.expiresAt, /* @__PURE__ */ new Date()));
      }
      async getOrganization(id) {
        const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
        return result[0];
      }
      async createOrganization(org) {
        const result = await db.insert(organizations).values(org).returning();
        return result[0];
      }
      async updateOrganizationTokens(id, accessToken, refreshToken) {
        await db.update(organizations).set({ mindbodyAccessToken: accessToken, mindbodyRefreshToken: refreshToken }).where(eq(organizations.id, id));
      }
      async updateOrganizationSiteId(id, siteId) {
        await db.update(organizations).set({ mindbodySiteId: siteId }).where(eq(organizations.id, id));
      }
      async getStudents(organizationId, limit = 100, offset = 0, status, startDate, endDate) {
        const conditions = [eq(students.organizationId, organizationId)];
        if (status) {
          conditions.push(eq(students.status, status));
        }
        if (startDate) {
          conditions.push(gte(students.joinDate, startDate));
        }
        if (endDate) {
          conditions.push(lte(students.joinDate, endDate));
        }
        const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
        return await db.select().from(students).where(whereClause).limit(limit).offset(offset);
      }
      async getStudentById(id) {
        const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
        return result[0];
      }
      async createStudent(student) {
        return await withDatabaseRetry(async () => {
          const result = await db.insert(students).values(student).returning();
          return result[0];
        });
      }
      async updateStudent(id, student) {
        await withDatabaseRetry(async () => {
          await db.update(students).set(student).where(eq(students.id, id));
        });
      }
      async deleteStudent(id) {
        await db.delete(students).where(eq(students.id, id));
      }
      async getStudentCount(organizationId, status, startDate, endDate) {
        const conditions = [eq(students.organizationId, organizationId)];
        if (status) {
          conditions.push(eq(students.status, status));
        }
        if (startDate) {
          conditions.push(gte(students.joinDate, startDate));
        }
        if (endDate) {
          conditions.push(lte(students.joinDate, endDate));
        }
        const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
        const result = await db.select({ count: sql`count(*)` }).from(students).where(whereClause);
        return Number(result[0].count);
      }
      async getActiveStudentCount(organizationId) {
        const result = await db.select({ count: sql`count(*)` }).from(students).where(and(eq(students.organizationId, organizationId), eq(students.status, "active")));
        return Number(result[0].count);
      }
      async getClasses(organizationId) {
        return await db.select().from(classes).where(eq(classes.organizationId, organizationId));
      }
      async getClassById(id) {
        const result = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
        return result[0];
      }
      async createClass(classData) {
        return await withDatabaseRetry(async () => {
          const result = await db.insert(classes).values(classData).returning();
          return result[0];
        });
      }
      async updateClass(id, classData) {
        await db.update(classes).set(classData).where(eq(classes.id, id));
      }
      async deleteClass(id) {
        await db.delete(classes).where(eq(classes.id, id));
      }
      async getClassesCount(organizationId) {
        const result = await db.select({ count: sql`count(*)` }).from(classes).where(eq(classes.organizationId, organizationId));
        return Number(result[0].count);
      }
      async getClassSchedules(organizationId, startDate, endDate) {
        if (startDate && endDate) {
          return await db.select().from(classSchedules).where(
            and(
              eq(classSchedules.organizationId, organizationId),
              gte(classSchedules.startTime, startDate),
              lte(classSchedules.startTime, endDate)
            )
          );
        }
        return await db.select().from(classSchedules).where(eq(classSchedules.organizationId, organizationId));
      }
      async createClassSchedule(schedule) {
        return await withDatabaseRetry(async () => {
          const result = await db.insert(classSchedules).values(schedule).returning();
          return result[0];
        });
      }
      async getAttendance(organizationId, startDate, endDate) {
        if (startDate && endDate) {
          return await db.select().from(attendance).where(
            and(
              eq(attendance.organizationId, organizationId),
              gte(attendance.attendedAt, startDate),
              lte(attendance.attendedAt, endDate)
            )
          ).orderBy(desc(attendance.attendedAt));
        }
        return await db.select().from(attendance).where(eq(attendance.organizationId, organizationId)).orderBy(desc(attendance.attendedAt));
      }
      async getAttendanceByStudent(studentId) {
        return await db.select().from(attendance).where(eq(attendance.studentId, studentId)).orderBy(desc(attendance.attendedAt));
      }
      async createAttendance(attendanceData) {
        return await withDatabaseRetry(async () => {
          const result = await db.insert(attendance).values(attendanceData).onConflictDoNothing().returning();
          if (result.length === 0) {
            const existing = await db.select().from(attendance).where(
              and(
                eq(attendance.organizationId, attendanceData.organizationId),
                eq(attendance.studentId, attendanceData.studentId),
                eq(attendance.scheduleId, attendanceData.scheduleId),
                eq(attendance.status, "attended"),
                // Match the partial index predicate
                sql`${attendance.attendedAt}::date = ${attendanceData.attendedAt}::date`
              )
            ).limit(1);
            return existing[0];
          }
          return result[0];
        });
      }
      async getAttendanceCount(organizationId) {
        const result = await db.select({ count: sql`count(*)` }).from(attendance).where(eq(attendance.organizationId, organizationId));
        return Number(result[0].count);
      }
      async deleteAllAttendance(organizationId) {
        await db.delete(attendance).where(eq(attendance.organizationId, organizationId));
      }
      async getAttendanceWithDetails(organizationId, startDate, endDate) {
        const conditions = [eq(attendance.organizationId, organizationId)];
        if (startDate) {
          conditions.push(gte(attendance.attendedAt, startDate));
        }
        if (endDate) {
          conditions.push(lte(attendance.attendedAt, endDate));
        }
        const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
        const result = await db.select({
          attendedAt: attendance.attendedAt,
          status: attendance.status,
          studentFirstName: students.firstName,
          studentLastName: students.lastName,
          className: classes.name
        }).from(attendance).leftJoin(students, eq(attendance.studentId, students.id)).leftJoin(classSchedules, eq(attendance.scheduleId, classSchedules.id)).leftJoin(classes, eq(classSchedules.classId, classes.id)).where(whereClause).orderBy(desc(attendance.attendedAt));
        return result;
      }
      async getOrphanedAttendanceCount(organizationId) {
        const result = await db.select({ count: sql`count(*)` }).from(attendance).leftJoin(students, eq(attendance.studentId, students.id)).where(
          and(
            eq(attendance.organizationId, organizationId),
            sql`${students.id} IS NULL`
          )
        );
        return Number(result[0].count);
      }
      async getStudentsWithoutAttendanceCount(organizationId) {
        const result = await db.select({ count: sql`count(*)` }).from(students).leftJoin(attendance, eq(students.id, attendance.studentId)).where(
          and(
            eq(students.organizationId, organizationId),
            sql`${attendance.id} IS NULL`
          )
        );
        return Number(result[0].count);
      }
      async getClassesWithoutSchedulesCount(organizationId) {
        const result = await db.select({ count: sql`count(*)` }).from(classes).leftJoin(classSchedules, eq(classes.id, classSchedules.classId)).where(
          and(
            eq(classes.organizationId, organizationId),
            sql`${classSchedules.id} IS NULL`
          )
        );
        return Number(result[0].count);
      }
      async getRevenue(organizationId, startDate, endDate) {
        if (startDate && endDate) {
          return await db.select().from(revenue).where(
            and(
              eq(revenue.organizationId, organizationId),
              gte(revenue.transactionDate, startDate),
              lte(revenue.transactionDate, endDate)
            )
          ).orderBy(desc(revenue.transactionDate));
        }
        return await db.select().from(revenue).where(eq(revenue.organizationId, organizationId)).orderBy(desc(revenue.transactionDate));
      }
      async createRevenue(revenueData) {
        const result = await db.insert(revenue).values(revenueData).returning();
        return result[0];
      }
      async upsertRevenue(revenueData) {
        return await withDatabaseRetry(async () => {
          if (!revenueData.mindbodyItemId && revenueData.mindbodySaleId) {
            const existing = await db.select().from(revenue).where(
              and(
                eq(revenue.organizationId, revenueData.organizationId),
                eq(revenue.mindbodySaleId, revenueData.mindbodySaleId),
                sql`${revenue.mindbodyItemId} IS NULL`
              )
            ).limit(1);
            if (existing.length > 0) {
              const updated = await db.update(revenue).set({
                studentId: revenueData.studentId,
                amount: revenueData.amount,
                type: revenueData.type,
                description: revenueData.description,
                transactionDate: revenueData.transactionDate
              }).where(eq(revenue.id, existing[0].id)).returning();
              return updated[0];
            }
          }
          if (revenueData.mindbodyItemId) {
            const result2 = await db.insert(revenue).values(revenueData).onConflictDoUpdate({
              target: [revenue.organizationId, revenue.mindbodySaleId, revenue.mindbodyItemId],
              set: {
                studentId: revenueData.studentId,
                amount: revenueData.amount,
                type: revenueData.type,
                description: revenueData.description,
                transactionDate: revenueData.transactionDate
              }
            }).returning();
            return result2[0];
          }
          const result = await db.insert(revenue).values(revenueData).returning();
          return result[0];
        });
      }
      async getSalesCount(organizationId) {
        const result = await db.select({ count: sql`count(*)` }).from(revenue).where(eq(revenue.organizationId, organizationId));
        return Number(result[0].count);
      }
      async getRevenueStats(organizationId, startDate, endDate) {
        const nextDay = addDays(endDate, 1);
        const result = await db.select({
          total: sql`sum(CAST(${revenue.amount} AS NUMERIC))`,
          count: sql`count(*)`
        }).from(revenue).where(
          and(
            eq(revenue.organizationId, organizationId),
            gte(revenue.transactionDate, startDate),
            lt(revenue.transactionDate, nextDay)
          )
        );
        return {
          total: Number(result[0].total || 0),
          count: Number(result[0].count || 0)
        };
      }
      async getAllTimeRevenueStats(organizationId) {
        const result = await db.select({
          total: sql`sum(CAST(${revenue.amount} AS NUMERIC))`,
          count: sql`count(*)`
        }).from(revenue).where(eq(revenue.organizationId, organizationId));
        return {
          total: Number(result[0].total || 0),
          count: Number(result[0].count || 0)
        };
      }
      async getMonthlyRevenueTrend(organizationId, startDate, endDate) {
        const now = /* @__PURE__ */ new Date();
        const effectiveStartDate = startDate || new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const effectiveEndDate = endDate || now;
        const nextDay = addDays(effectiveEndDate, 1);
        const daysDiff = Math.floor((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1e3 * 60 * 60 * 24));
        const useDaily = daysDiff <= 45;
        const whereConditions = [
          eq(revenue.organizationId, organizationId),
          gte(revenue.transactionDate, effectiveStartDate),
          lt(revenue.transactionDate, nextDay)
        ];
        if (useDaily) {
          const revenueByDay = await db.select({
            day: sql`to_char(${revenue.transactionDate} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
            total: sql`sum(CAST(${revenue.amount} AS NUMERIC))`
          }).from(revenue).where(and(...whereConditions)).groupBy(sql`to_char(${revenue.transactionDate} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`);
          const activeStudentsByDay = await db.select({
            day: sql`to_char(${attendance.attendedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
            count: sql`count(distinct ${attendance.studentId})`
          }).from(attendance).where(
            and(
              eq(attendance.organizationId, organizationId),
              gte(attendance.attendedAt, effectiveStartDate),
              lt(attendance.attendedAt, nextDay)
            )
          ).groupBy(sql`to_char(${attendance.attendedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`);
          const revenueMap = new Map(
            revenueByDay.map((r) => [r.day, Number(r.total || 0)])
          );
          const studentsMap = new Map(
            activeStudentsByDay.map((s) => [s.day, Number(s.count || 0)])
          );
          const dailyData = [];
          let currentDate = new Date(effectiveStartDate);
          while (currentDate <= effectiveEndDate) {
            const dateKey = currentDate.toISOString().split("T")[0];
            const displayDate = currentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric"
            });
            dailyData.push({
              month: displayDate,
              // Reusing "month" field for consistency with frontend
              revenue: revenueMap.get(dateKey) || 0,
              students: studentsMap.get(dateKey) || 0
            });
            currentDate = addDays(currentDate, 1);
          }
          return dailyData;
        } else {
          const revenueByMonth = await db.select({
            monthNum: sql`extract(month from ${revenue.transactionDate})`,
            yearNum: sql`extract(year from ${revenue.transactionDate})`,
            total: sql`sum(CAST(${revenue.amount} AS NUMERIC))`
          }).from(revenue).where(and(...whereConditions)).groupBy(
            sql`extract(month from ${revenue.transactionDate})`,
            sql`extract(year from ${revenue.transactionDate})`
          );
          const activeStudentsByMonth = await db.select({
            monthNum: sql`extract(month from ${attendance.attendedAt})`,
            yearNum: sql`extract(year from ${attendance.attendedAt})`,
            count: sql`count(distinct ${attendance.studentId})`
          }).from(attendance).where(
            and(
              eq(attendance.organizationId, organizationId),
              gte(attendance.attendedAt, effectiveStartDate),
              lt(attendance.attendedAt, nextDay)
            )
          ).groupBy(
            sql`extract(month from ${attendance.attendedAt})`,
            sql`extract(year from ${attendance.attendedAt})`
          );
          const revenueMap = new Map(
            revenueByMonth.map((r) => [`${r.yearNum}-${r.monthNum}`, Number(r.total || 0)])
          );
          const studentsMap = new Map(
            activeStudentsByMonth.map((s) => [`${s.yearNum}-${s.monthNum}`, Number(s.count || 0)])
          );
          const monthsData = [];
          const startMonth = new Date(effectiveStartDate.getFullYear(), effectiveStartDate.getMonth(), 1);
          const endMonth = new Date(effectiveEndDate.getFullYear(), effectiveEndDate.getMonth(), 1);
          if (!startDate && !endDate) {
            for (let i = 11; i >= 0; i--) {
              const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const year = monthDate.getFullYear();
              const month = monthDate.getMonth() + 1;
              const key = `${year}-${month}`;
              const monthName = monthDate.toLocaleString("en-US", { month: "short" });
              const displayMonth = `${monthName} ${year}`;
              monthsData.push({
                month: displayMonth,
                revenue: revenueMap.get(key) || 0,
                students: studentsMap.get(key) || 0
              });
            }
          } else {
            let currentMonth = new Date(startMonth);
            while (currentMonth <= endMonth) {
              const year = currentMonth.getFullYear();
              const month = currentMonth.getMonth() + 1;
              const key = `${year}-${month}`;
              const monthName = currentMonth.toLocaleString("en-US", { month: "short" });
              const displayMonth = `${monthName} ${year}`;
              monthsData.push({
                month: displayMonth,
                revenue: revenueMap.get(key) || 0,
                students: studentsMap.get(key) || 0
              });
              currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
            }
          }
          return monthsData;
        }
      }
      async getAttendanceByTimeSlot(organizationId, startDate, endDate) {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const whereConditions = [
          eq(attendance.organizationId, organizationId),
          eq(classSchedules.organizationId, organizationId)
        ];
        if (startDate) {
          whereConditions.push(gte(classSchedules.startTime, startDate));
        }
        if (endDate) {
          whereConditions.push(lte(classSchedules.startTime, endDate));
        }
        const result = await db.select({
          dayOfWeek: sql`extract(dow from ${classSchedules.startTime})`,
          timeSlot: sql`
        CASE 
          WHEN extract(hour from ${classSchedules.startTime}) < 12 THEN 'morning'
          WHEN extract(hour from ${classSchedules.startTime}) < 17 THEN 'afternoon'
          ELSE 'evening'
        END
      `,
          count: sql`count(*)`
        }).from(attendance).innerJoin(classSchedules, eq(attendance.scheduleId, classSchedules.id)).where(and(...whereConditions)).groupBy(
          sql`extract(dow from ${classSchedules.startTime})`,
          sql`
        CASE 
          WHEN extract(hour from ${classSchedules.startTime}) < 12 THEN 'morning'
          WHEN extract(hour from ${classSchedules.startTime}) < 17 THEN 'afternoon'
          ELSE 'evening'
        END
      `
        );
        const dayData = daysOfWeek.map((day) => ({
          day,
          morning: 0,
          afternoon: 0,
          evening: 0
        }));
        result.forEach((r) => {
          const dayIndex = Number(r.dayOfWeek);
          const timeSlot = r.timeSlot;
          const count = Number(r.count);
          if (dayIndex >= 0 && dayIndex < 7 && timeSlot) {
            dayData[dayIndex][timeSlot] = count;
          }
        });
        return dayData;
      }
      async createAIQuery(query) {
        const result = await db.insert(aiQueries).values(query).returning();
        return result[0];
      }
      async getAIQueries(organizationId, limit = 10) {
        return await db.select().from(aiQueries).where(eq(aiQueries.organizationId, organizationId)).orderBy(desc(aiQueries.createdAt)).limit(limit);
      }
      async createImportJob(job) {
        const result = await db.insert(importJobs).values(job).returning();
        return result[0];
      }
      async getImportJob(id) {
        const result = await db.select().from(importJobs).where(eq(importJobs.id, id)).limit(1);
        return result[0];
      }
      async getImportJobs(organizationId, limit = 10) {
        return await db.select().from(importJobs).where(eq(importJobs.organizationId, organizationId)).orderBy(desc(importJobs.createdAt)).limit(limit);
      }
      async updateImportJob(id, job) {
        await db.update(importJobs).set({ ...job, updatedAt: /* @__PURE__ */ new Date() }).where(eq(importJobs.id, id));
      }
      async getActiveImportJob(organizationId) {
        const result = await db.select().from(importJobs).where(
          and(
            eq(importJobs.organizationId, organizationId),
            sql`${importJobs.status} IN ('pending', 'running', 'paused')`
          )
        ).orderBy(desc(importJobs.createdAt)).limit(1);
        return result[0];
      }
      async getActiveImportJobs(organizationId) {
        return await db.select().from(importJobs).where(
          and(
            eq(importJobs.organizationId, organizationId),
            sql`${importJobs.status} IN ('pending', 'running')`
          )
        ).orderBy(desc(importJobs.createdAt));
      }
      async getStalledImportJobs(staleMinutes) {
        const staleThreshold = new Date(Date.now() - staleMinutes * 60 * 1e3);
        const result = await db.select().from(importJobs).where(
          and(
            eq(importJobs.status, "running"),
            // Only fail jobs that have started processing (non-null heartbeat)
            // Jobs with null heartbeat are queued, not stalled
            sql`${importJobs.heartbeatAt} IS NOT NULL`,
            sql`${importJobs.heartbeatAt} < ${staleThreshold}`
          )
        );
        return result;
      }
      async updateImportJobHeartbeat(id) {
        try {
          await db.update(importJobs).set({ heartbeatAt: /* @__PURE__ */ new Date() }).where(eq(importJobs.id, id));
        } catch (error) {
          if (error?.message?.includes("column") || error?.message?.includes("heartbeat_at")) {
            return;
          }
          throw error;
        }
      }
      async keepConnectionAlive() {
        await db.execute(sql`SELECT 1`);
      }
      async createSkippedImportRecord(record) {
        const result = await db.insert(skippedImportRecords).values(record).returning();
        return result[0];
      }
      async getSkippedImportRecords(organizationId, dataType, limit = 100) {
        const whereConditions = dataType ? and(
          eq(skippedImportRecords.organizationId, organizationId),
          eq(skippedImportRecords.dataType, dataType)
        ) : eq(skippedImportRecords.organizationId, organizationId);
        return await db.select().from(skippedImportRecords).where(whereConditions).orderBy(desc(skippedImportRecords.createdAt)).limit(limit);
      }
      async getSkippedImportRecordsCount(organizationId, dataType) {
        const whereConditions = dataType ? and(
          eq(skippedImportRecords.organizationId, organizationId),
          eq(skippedImportRecords.dataType, dataType)
        ) : eq(skippedImportRecords.organizationId, organizationId);
        const result = await db.select({ count: sql`count(*)` }).from(skippedImportRecords).where(whereConditions);
        return Number(result[0]?.count || 0);
      }
      async createWebhookSubscription(subscription) {
        const result = await db.insert(webhookSubscriptions).values(subscription).returning();
        return result[0];
      }
      async getWebhookSubscriptions(organizationId) {
        return await db.select().from(webhookSubscriptions).where(eq(webhookSubscriptions.organizationId, organizationId)).orderBy(desc(webhookSubscriptions.createdAt));
      }
      async getWebhookSubscription(id) {
        const result = await db.select().from(webhookSubscriptions).where(eq(webhookSubscriptions.id, id)).limit(1);
        return result[0];
      }
      async updateWebhookSubscription(id, subscription) {
        await db.update(webhookSubscriptions).set(subscription).where(eq(webhookSubscriptions.id, id));
      }
      async deleteWebhookSubscription(id) {
        await db.delete(webhookSubscriptions).where(eq(webhookSubscriptions.id, id));
      }
      async createWebhookEvent(event) {
        const result = await db.insert(webhookEvents).values(event).returning();
        return result[0];
      }
      async getWebhookEvent(messageId) {
        const result = await db.select().from(webhookEvents).where(eq(webhookEvents.messageId, messageId)).limit(1);
        return result[0];
      }
      async getWebhookEvents(organizationId, limit = 50) {
        return await db.select().from(webhookEvents).where(eq(webhookEvents.organizationId, organizationId)).orderBy(desc(webhookEvents.createdAt)).limit(limit);
      }
      async updateWebhookEvent(id, event) {
        await db.update(webhookEvents).set(event).where(eq(webhookEvents.id, id));
      }
      async getScheduledImport(organizationId) {
        const result = await db.select().from(scheduledImports).where(eq(scheduledImports.organizationId, organizationId)).limit(1);
        return result[0];
      }
      async upsertScheduledImport(scheduledImport) {
        const existing = await this.getScheduledImport(scheduledImport.organizationId);
        if (existing) {
          await db.update(scheduledImports).set({ ...scheduledImport, updatedAt: /* @__PURE__ */ new Date() }).where(eq(scheduledImports.organizationId, scheduledImport.organizationId));
          const updated = await this.getScheduledImport(scheduledImport.organizationId);
          return updated;
        }
        const result = await db.insert(scheduledImports).values(scheduledImport).returning();
        return result[0];
      }
      async updateScheduledImport(organizationId, scheduledImport) {
        await db.update(scheduledImports).set({ ...scheduledImport, updatedAt: /* @__PURE__ */ new Date() }).where(eq(scheduledImports.organizationId, organizationId));
      }
      async createUploadedFile(file) {
        const result = await db.insert(uploadedFiles).values(file).returning();
        return result[0];
      }
      async getUploadedFile(id) {
        const result = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id)).limit(1);
        return result[0];
      }
      async getUploadedFiles(organizationId, userId) {
        if (userId) {
          return await db.select().from(uploadedFiles).where(and(eq(uploadedFiles.organizationId, organizationId), eq(uploadedFiles.userId, userId))).orderBy(desc(uploadedFiles.createdAt));
        }
        return await db.select().from(uploadedFiles).where(eq(uploadedFiles.organizationId, organizationId)).orderBy(desc(uploadedFiles.createdAt));
      }
      async deleteUploadedFile(id) {
        await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id));
      }
      async createAiGeneratedFile(file) {
        const result = await db.insert(aiGeneratedFiles).values(file).returning();
        return result[0];
      }
      async getAiGeneratedFileByFilename(filename) {
        const result = await db.select().from(aiGeneratedFiles).where(eq(aiGeneratedFiles.filename, filename)).limit(1);
        return result[0];
      }
      async getAiGeneratedFiles(organizationId, userId) {
        if (userId) {
          return await db.select().from(aiGeneratedFiles).where(
            and(
              eq(aiGeneratedFiles.organizationId, organizationId),
              eq(aiGeneratedFiles.userId, userId)
            )
          ).orderBy(desc(aiGeneratedFiles.createdAt));
        }
        return await db.select().from(aiGeneratedFiles).where(eq(aiGeneratedFiles.organizationId, organizationId)).orderBy(desc(aiGeneratedFiles.createdAt));
      }
      async deleteAiGeneratedFile(id) {
        await db.delete(aiGeneratedFiles).where(eq(aiGeneratedFiles.id, id));
      }
      async createConversation(conversation) {
        const result = await db.insert(conversations).values(conversation).returning();
        return result[0];
      }
      async getConversation(id) {
        const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
        return result[0];
      }
      async getConversations(organizationId, userId) {
        return await db.select().from(conversations).where(
          and(
            eq(conversations.organizationId, organizationId),
            eq(conversations.userId, userId)
          )
        ).orderBy(desc(conversations.updatedAt));
      }
      async updateConversation(id, conversation) {
        await db.update(conversations).set({ ...conversation, updatedAt: /* @__PURE__ */ new Date() }).where(eq(conversations.id, id));
      }
      async deleteConversation(id) {
        await db.delete(conversationMessages).where(eq(conversationMessages.conversationId, id));
        await db.delete(conversations).where(eq(conversations.id, id));
      }
      async createConversationMessage(message) {
        const result = await db.insert(conversationMessages).values(message).returning();
        return result[0];
      }
      async getConversationMessages(conversationId) {
        return await db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, conversationId)).orderBy(conversationMessages.createdAt);
      }
      async deleteConversationMessages(conversationId) {
        await db.delete(conversationMessages).where(eq(conversationMessages.conversationId, conversationId));
      }
    };
    storage = new DbStorage();
  }
});

// server/mindbody.ts
function getRedirectUri() {
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(",");
    return `https://${domains[0]}/api/mindbody/callback`;
  }
  return "http://localhost:5000/api/mindbody/callback";
}
var MINDBODY_API_BASE, MindbodyService, mindbodyService;
var init_mindbody = __esm({
  "server/mindbody.ts"() {
    "use strict";
    init_storage();
    MINDBODY_API_BASE = "https://api.mindbodyonline.com/public/v6";
    MindbodyService = class {
      cachedUserToken = null;
      tokenExpiryTime = 0;
      apiCallCounter = 0;
      async exchangeCodeForTokens(code, organizationId) {
        const redirectUri = getRedirectUri();
        const params = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: process.env.MINDBODY_CLIENT_ID || "",
          client_secret: process.env.MINDBODY_CLIENT_SECRET || "",
          redirect_uri: redirectUri,
          scope: "email profile openid offline_access Mindbody.Api.Public.v6"
        });
        const response = await fetch("https://signin.mindbodyonline.com/connect/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: params.toString()
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Token exchange failed:", errorText);
          throw new Error(`Failed to exchange authorization code: ${response.status}`);
        }
        const data = await response.json();
        await storage.updateOrganizationTokens(organizationId, data.access_token, data.refresh_token);
      }
      async refreshAccessToken(organizationId) {
        const org = await storage.getOrganization(organizationId);
        if (!org || !org.mindbodyRefreshToken) {
          throw new Error("No refresh token available");
        }
        const response = await fetch(`${MINDBODY_API_BASE}/usertoken/issue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Api-Key": process.env.MINDBODY_API_KEY || ""
          },
          body: JSON.stringify({
            refresh_token: org.mindbodyRefreshToken,
            grant_type: "refresh_token"
          })
        });
        if (!response.ok) {
          throw new Error("Failed to refresh access token");
        }
        const data = await response.json();
        await storage.updateOrganizationTokens(organizationId, data.access_token, data.refresh_token);
        return data.access_token;
      }
      async getUserToken() {
        const now = Date.now();
        if (this.cachedUserToken && now < this.tokenExpiryTime) {
          return this.cachedUserToken;
        }
        const apiKey = process.env.MINDBODY_API_KEY;
        const clientSecret = process.env.MINDBODY_CLIENT_SECRET;
        const siteId = "133";
        if (!apiKey || !clientSecret) {
          throw new Error("MINDBODY_API_KEY and MINDBODY_CLIENT_SECRET required");
        }
        console.log(`[getUserToken] Requesting user token for site ${siteId} with username _YHC`);
        const response = await fetch(`${MINDBODY_API_BASE}/usertoken/issue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Api-Key": apiKey,
            SiteId: siteId
          },
          body: JSON.stringify({
            Username: "_YHC",
            // Source name with underscore prefix
            Password: clientSecret
          })
        });
        console.log(`[getUserToken] Response status: ${response.status}`);
        const responseText = await response.text();
        if (!response.ok) {
          console.error(`[getUserToken] Failed to get user token: ${response.status}`);
          throw new Error(`Failed to authenticate with Mindbody (${response.status})`);
        }
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`[getUserToken] Failed to parse Mindbody response as JSON`);
          throw new Error(`Mindbody auth returned invalid JSON`);
        }
        this.cachedUserToken = data.AccessToken;
        this.tokenExpiryTime = now + 55 * 60 * 1e3;
        return data.AccessToken;
      }
      async makeAuthenticatedRequest(organizationId, endpoint, options = {}, retryCount = 0) {
        const apiKey = process.env.MINDBODY_API_KEY;
        const siteId = "133";
        const MAX_RETRIES = 3;
        const REQUEST_TIMEOUT = 6e4;
        if (!apiKey) {
          throw new Error("MINDBODY_API_KEY not configured");
        }
        const userToken = await this.getUserToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        console.log(`[Mindbody API] Requesting: ${endpoint}`);
        try {
          const response = await fetch(`${MINDBODY_API_BASE}${endpoint}`, {
            ...options,
            headers: {
              ...options.headers,
              "Content-Type": "application/json",
              "Api-Key": apiKey,
              SiteId: siteId,
              Authorization: `Bearer ${userToken}`
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          this.apiCallCounter++;
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Mindbody API error: ${response.status} - ${errorText}`);
            console.error(`Request URL: ${MINDBODY_API_BASE}${endpoint}`);
            if (response.status === 401) {
              console.log("Authentication error detected, clearing token cache and retrying...");
              this.cachedUserToken = null;
              this.tokenExpiryTime = 0;
              const newToken = await this.getUserToken();
              const retryResponse = await fetch(`${MINDBODY_API_BASE}${endpoint}`, {
                ...options,
                headers: {
                  ...options.headers,
                  "Content-Type": "application/json",
                  "Api-Key": apiKey,
                  SiteId: siteId,
                  Authorization: `Bearer ${newToken}`
                }
              });
              if (!retryResponse.ok) {
                const retryErrorText = await retryResponse.text();
                console.error(`Mindbody API retry failed: ${retryResponse.status} - ${retryErrorText}`);
                throw new Error(`Mindbody API error: ${retryResponse.statusText}`);
              }
              this.apiCallCounter++;
              return await retryResponse.json();
            }
            if ((response.status === 500 || response.status === 503) && retryCount < MAX_RETRIES) {
              const backoffMs = Math.pow(2, retryCount) * 1e3;
              console.log(
                `Mindbody API ${response.status} error, retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`
              );
              await new Promise((resolve) => setTimeout(resolve, backoffMs));
              return this.makeAuthenticatedRequest(organizationId, endpoint, options, retryCount + 1);
            }
            throw new Error(`Mindbody API error: ${response.statusText}`);
          }
          return await response.json();
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === "AbortError") {
            console.error(`[Mindbody API] Request timeout after ${REQUEST_TIMEOUT / 1e3}s: ${endpoint}`);
            throw new Error(`Mindbody API request timeout (${REQUEST_TIMEOUT / 1e3}s): ${endpoint}`);
          }
          throw error;
        }
      }
      // API call tracking methods
      getApiCallCount() {
        return this.apiCallCounter;
      }
      resetApiCallCount() {
        this.apiCallCounter = 0;
      }
      async fetchAllPages(organizationId, baseEndpoint, resultsKey, pageSize = 200) {
        let allResults = [];
        let offset = 0;
        let hasMorePages = true;
        let apiCallCount = 0;
        while (hasMorePages) {
          const separator = baseEndpoint.includes("?") ? "&" : "?";
          const endpoint = `${baseEndpoint}${separator}Limit=${pageSize}&Offset=${offset}`;
          const data = await this.makeAuthenticatedRequest(organizationId, endpoint);
          apiCallCount++;
          const results = data[resultsKey] || [];
          allResults = allResults.concat(results);
          const pagination = data.PaginationResponse;
          if (pagination) {
            if (offset >= pagination.TotalResults) {
              console.warn(
                `Offset ${offset} exceeds TotalResults ${pagination.TotalResults}, stopping pagination`
              );
              hasMorePages = false;
            } else if (allResults.length >= pagination.TotalResults || results.length === 0) {
              hasMorePages = false;
            } else {
              const actualPageSize = results.length > 0 ? results.length : pagination.RequestedLimit || pageSize;
              if (pagination.PageSize > results.length && results.length > 0) {
                console.warn(
                  `PageSize (${pagination.PageSize}) > actual results (${results.length}), using results.length`
                );
              }
              offset += actualPageSize;
            }
          } else {
            hasMorePages = false;
          }
        }
        return { results: allResults, apiCalls: apiCallCount };
      }
      async fetchPage(organizationId, baseEndpoint, resultsKey, offset, pageSize = 200) {
        const separator = baseEndpoint.includes("?") ? "&" : "?";
        const endpoint = `${baseEndpoint}${separator}Limit=${pageSize}&Offset=${offset}`;
        const data = await this.makeAuthenticatedRequest(organizationId, endpoint);
        const results = data[resultsKey] || [];
        const pagination = data.PaginationResponse;
        const totalResults = pagination?.TotalResults || 0;
        const hasMore = pagination ? offset + results.length < totalResults && results.length > 0 : false;
        return { results, totalResults, hasMore };
      }
      async importClientsResumable(organizationId, startDate, endDate, onProgress, startOffset = 0, jobId) {
        const BATCH_SIZE = 200;
        const BATCH_DELAY = 0;
        const endpoint = `/client/clients?LastModifiedDate=${startDate.toISOString()}&Limit=${BATCH_SIZE}&Offset=${startOffset}`;
        const data = await this.makeAuthenticatedRequest(organizationId, endpoint);
        const pagination = data.PaginationResponse;
        const totalResults = pagination?.TotalResults || 0;
        const clients = data.Clients || [];
        if (clients.length === 0) {
          return { imported: 0, updated: 0, nextOffset: startOffset, completed: true };
        }
        const existingStudents = await storage.getStudents(organizationId, 1e5);
        const studentMap = new Map(existingStudents.map((s) => [s.mindbodyClientId, s]));
        let imported = 0;
        let updated = 0;
        for (const client of clients) {
          try {
            if (!client.FirstName || !client.LastName) {
              const reason = `Missing name (FirstName: ${client.FirstName || "null"}, LastName: ${client.LastName || "null"})`;
              console.warn(`Skipping client ${client.Id}: ${reason}`);
              try {
                await storage.createSkippedImportRecord({
                  organizationId,
                  importJobId: jobId || null,
                  dataType: "client",
                  mindbodyId: client.Id,
                  reason,
                  rawData: JSON.stringify(client)
                });
              } catch (dbError) {
                console.error(`Failed to log skipped client ${client.Id}:`, dbError);
              }
              continue;
            }
            const existingStudent = studentMap.get(client.Id);
            if (existingStudent) {
              await storage.updateStudent(existingStudent.id, {
                firstName: client.FirstName,
                lastName: client.LastName,
                email: client.Email || null,
                phone: client.MobilePhone || null,
                status: client.Status === "Active" ? "active" : "inactive",
                joinDate: client.CreationDate ? new Date(client.CreationDate) : null
              });
              updated++;
            } else {
              const newStudent = await storage.createStudent({
                organizationId,
                mindbodyClientId: client.Id,
                firstName: client.FirstName,
                lastName: client.LastName,
                email: client.Email || null,
                phone: client.MobilePhone || null,
                status: client.Status === "Active" ? "active" : "inactive",
                joinDate: client.CreationDate ? new Date(client.CreationDate) : null,
                membershipType: null
              });
              studentMap.set(client.Id, newStudent);
              imported++;
            }
          } catch (error) {
            console.error(`Failed to import client ${client.Id}:`, error);
          }
        }
        const nextOffset = startOffset + clients.length;
        const completed = nextOffset >= totalResults;
        await onProgress(nextOffset, totalResults);
        if (!completed) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
        return { imported, updated, nextOffset, completed };
      }
      async importClassesResumable(organizationId, startDate, endDate, onProgress, startOffset = 0) {
        const BATCH_SIZE = 200;
        const BATCH_DELAY = 0;
        const endpoint = `/class/classes?StartDateTime=${startDate.toISOString()}&EndDateTime=${endDate.toISOString()}&Limit=${BATCH_SIZE}&Offset=${startOffset}`;
        const data = await this.makeAuthenticatedRequest(organizationId, endpoint);
        const pagination = data.PaginationResponse;
        const totalResults = pagination?.TotalResults || 0;
        const classes2 = data.Classes || [];
        if (classes2.length === 0) {
          return { imported: 0, nextOffset: startOffset, completed: true };
        }
        const existingClasses = await storage.getClasses(organizationId);
        const classMap = new Map(existingClasses.map((c) => [c.mindbodyClassId, c]));
        let imported = 0;
        for (const mbClass of classes2) {
          try {
            if (!mbClass.ClassDescription?.Id || !mbClass.ClassScheduleId || !mbClass.StartDateTime || !mbClass.EndDateTime) {
              continue;
            }
            let classRecord = classMap.get(mbClass.ClassDescription.Id.toString());
            if (!classRecord) {
              classRecord = await storage.createClass({
                organizationId,
                mindbodyClassId: mbClass.ClassDescription.Id.toString(),
                name: mbClass.ClassDescription.Name || "Unknown Class",
                description: mbClass.ClassDescription.Description || null,
                instructorName: mbClass.Staff?.Name || null,
                capacity: mbClass.MaxCapacity || null,
                duration: null
              });
              classMap.set(classRecord.mindbodyClassId, classRecord);
            }
            await storage.createClassSchedule({
              organizationId,
              classId: classRecord.id,
              mindbodyScheduleId: mbClass.ClassScheduleId.toString(),
              startTime: new Date(mbClass.StartDateTime),
              endTime: new Date(mbClass.EndDateTime),
              location: mbClass.Location?.Name || null
            });
            imported++;
          } catch (error) {
            console.error(`Failed to import class ${mbClass.ClassScheduleId}:`, error);
          }
        }
        const nextOffset = startOffset + classes2.length;
        const completed = nextOffset >= totalResults;
        await onProgress(nextOffset, totalResults);
        if (!completed) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
        return { imported, nextOffset, completed };
      }
      async importVisitsResumable(organizationId, startDate, endDate, onProgress, startOffset = 0, schedulesByTime) {
        console.log(`[Visits Optimized] Starting import for ${startDate.toISOString()} to ${endDate.toISOString()}`);
        if (!schedulesByTime) {
          try {
            console.log(`[Visits] Loading class schedules for organization ${organizationId}...`);
            const schedules = await storage.getClassSchedules(organizationId);
            console.log(`[Visits] Retrieved ${schedules.length} schedules from database`);
            schedulesByTime = new Map(schedules.map((s) => [s.startTime.toISOString(), s]));
            console.log(`[Visits] Loaded ${schedules.length} schedules into memory (one-time load)`);
          } catch (error) {
            console.error(`[Visits] CRITICAL ERROR loading schedules:`, error);
            throw new Error(`Failed to load class schedules: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        console.log(`[Visits] Loading students for organization ${organizationId}...`);
        const allStudents = await storage.getStudents(organizationId, 1e5);
        const studentsByMindbodyId = new Map(
          allStudents.filter((s) => s.mindbodyClientId).map((s) => [s.mindbodyClientId, s])
        );
        console.log(`[Visits] Loaded ${studentsByMindbodyId.size} students into lookup map`);
        const PAGE_SIZE = 200;
        const startDateStr = startDate.toISOString().split("T")[0];
        const endDateStr = endDate.toISOString().split("T")[0];
        const { results: visits, totalResults, hasMore } = await this.fetchPage(
          organizationId,
          `/class/classvisits?StartDate=${startDateStr}&EndDate=${endDateStr}`,
          "ClassVisits",
          startOffset,
          PAGE_SIZE
        );
        console.log(`[Visits] Fetched ${visits.length} visits (offset ${startOffset}, total ${totalResults})`);
        let imported = 0;
        let skippedNoStudent = 0;
        let skippedNoSchedule = 0;
        for (const visit of visits) {
          try {
            if (!visit.ClientId || !visit.StartDateTime) {
              continue;
            }
            const student = studentsByMindbodyId.get(visit.ClientId);
            if (!student) {
              skippedNoStudent++;
              continue;
            }
            const visitStartTime = new Date(visit.StartDateTime).toISOString();
            const schedule = schedulesByTime.get(visitStartTime);
            if (!schedule) {
              skippedNoSchedule++;
              continue;
            }
            await storage.createAttendance({
              organizationId,
              studentId: student.id,
              scheduleId: schedule.id,
              attendedAt: new Date(visit.StartDateTime),
              status: visit.SignedIn ? "attended" : "noshow"
            });
            imported++;
          } catch (error) {
            console.error(`[Visits] Failed to import visit:`, error);
          }
        }
        const nextOffset = startOffset + visits.length;
        const completed = !hasMore || nextOffset >= totalResults;
        await onProgress(nextOffset, totalResults);
        console.log(`[Visits] Batch complete: imported ${imported}, skipped ${skippedNoStudent} (no student), ${skippedNoSchedule} (no schedule)`);
        console.log(`[Visits] Progress: ${nextOffset}/${totalResults} visits processed, completed=${completed}`);
        return { imported, nextStudentIndex: nextOffset, completed, schedulesByTime };
      }
      async importSalesResumable(organizationId, startDate, endDate, onProgress, startOffset = 0, cachedStudents) {
        const SALES_BATCH_SIZE = 200;
        const BATCH_DELAY = 0;
        const allStudents = cachedStudents || await storage.getStudents(organizationId, 1e5);
        const studentMap = new Map(allStudents.map((s) => [s.mindbodyClientId, s.id]));
        const dateFormat = startDate.toISOString().split("T")[0];
        const endDateFormat = endDate.toISOString().split("T")[0];
        console.log(
          `[Sales Import] Fetching site-level sales, date range: ${dateFormat} to ${endDateFormat}`
        );
        try {
          const testEndpoint = `/sale/sales?StartDate=${dateFormat}&EndDate=${endDateFormat}&Limit=10&Offset=0`;
          console.log(`[Sales Import] Test endpoint: ${testEndpoint}`);
          console.log(`[Sales Import] Requested date range: ${dateFormat} to ${endDateFormat}`);
          const testData = await this.makeAuthenticatedRequest(organizationId, testEndpoint);
          console.log(
            `[Sales Import] PaginationResponse:`,
            JSON.stringify(testData.PaginationResponse)
          );
          const totalResults = testData.PaginationResponse?.TotalResults || 0;
          if (totalResults === 0) {
            console.log(
              `[Sales Import] /sale/sales returned 0 results, falling back to /sale/transactions`
            );
            const startDateTime = startDate.toISOString();
            const endDateTime = endDate.toISOString();
            let imported2 = 0;
            let skipped = 0;
            let transactionOffset = 0;
            let hasMoreTransactions = true;
            let totalProcessed2 = 0;
            console.log(`[Sales Import] Processing transactions page-by-page from /sale/transactions`);
            while (hasMoreTransactions) {
              const { results: transactions, totalResults: totalResults2, hasMore } = await this.fetchPage(
                organizationId,
                `/sale/transactions?StartSaleDateTime=${startDateTime}&EndSaleDateTime=${endDateTime}`,
                "Transactions",
                transactionOffset,
                SALES_BATCH_SIZE
              );
              if (transactions.length === 0) {
                break;
              }
              hasMoreTransactions = hasMore;
              if (transactionOffset === 0 && transactions.length > 0) {
                console.log(`[Sales Import] Total transactions: ${totalResults2}`);
                console.log(`[Sales Import] Sample transaction fields:`, Object.keys(transactions[0]));
              }
              for (const transaction of transactions) {
                try {
                  const dateStr = transaction.SaleDateTime || transaction.CreatedDateTime || transaction.TransactionDate || transaction.CompletedDate || transaction.SettlementDate || transaction.SettlementDateTime || // Handle nested date objects (e.g., {DateTime: "2025-10-22..."})
                  transaction.TransactionTime?.DateTime || transaction.TransactionTime || transaction.AuthTime?.DateTime || transaction.AuthTime;
                  if (!dateStr) {
                    if (skipped === 0) {
                      console.log(
                        `[Sales Import] First skipped transaction structure:`,
                        JSON.stringify(transaction, null, 2)
                      );
                    }
                    console.log(
                      `[Sales Import] Transaction ${transaction.TransactionId || transaction.Id} has no valid date field, skipping`
                    );
                    skipped++;
                    continue;
                  }
                  const transactionDate = new Date(dateStr);
                  if (isNaN(transactionDate.getTime())) {
                    console.log(
                      `[Sales Import] Transaction ${transaction.TransactionId || transaction.Id} has invalid date "${dateStr}", skipping`
                    );
                    skipped++;
                    continue;
                  }
                  const studentId = studentMap.get(transaction.ClientId?.toString());
                  const saleId = transaction.SaleId?.toString();
                  if (saleId) {
                    try {
                      const saleEndpoint = `/sale/sales/${saleId}`;
                      const saleData = await this.makeAuthenticatedRequest(organizationId, saleEndpoint);
                      if (saleData && saleData.Sale) {
                        const sale = saleData.Sale;
                        const purchasedItems = Array.isArray(sale.PurchasedItems) ? sale.PurchasedItems : sale.PurchasedItems ? [sale.PurchasedItems] : [];
                        if (purchasedItems.length > 0) {
                          for (const item of purchasedItems) {
                            const itemAmount = item.Amount ?? (item.UnitPrice && item.Quantity ? item.UnitPrice * item.Quantity : null);
                            if (!itemAmount && itemAmount !== 0) continue;
                            if (itemAmount === 0) continue;
                            let itemDescription = item.Name || item.Description || "Unknown item";
                            if (item.Quantity && item.Quantity > 1) {
                              itemDescription = `${itemDescription} (Qty: ${item.Quantity})`;
                            }
                            await storage.upsertRevenue({
                              organizationId,
                              studentId: studentId || null,
                              mindbodySaleId: saleId,
                              mindbodyItemId: item.Id?.toString() || item.SaleDetailId?.toString() || null,
                              amount: itemAmount.toString(),
                              type: item.IsService ? "Service" : item.Type || "Product",
                              description: itemDescription,
                              transactionDate
                            });
                            imported2++;
                          }
                        } else {
                          throw new Error("No purchased items in sale");
                        }
                      } else {
                        throw new Error("Sale data not found");
                      }
                    } catch (saleError) {
                      console.log(`[Sales Import] Could not fetch sale details for ${saleId}, using transaction data`);
                      const paymentMethod = transaction.Method || transaction.CardType || "Payment";
                      const lastFour = transaction.CCLastFour || transaction.LastFour || "";
                      const status = transaction.Status || "Completed";
                      const description = lastFour ? `${paymentMethod} ending in ${lastFour} (${status})` : `${paymentMethod} (${status})`;
                      await storage.upsertRevenue({
                        organizationId,
                        studentId: studentId || null,
                        mindbodySaleId: saleId || transaction.TransactionId?.toString() || null,
                        mindbodyItemId: null,
                        amount: transaction.Amount?.toString() || "0",
                        type: paymentMethod,
                        description,
                        transactionDate
                      });
                      imported2++;
                    }
                  } else {
                    const paymentMethod = transaction.Method || transaction.CardType || "Payment";
                    const lastFour = transaction.CCLastFour || transaction.LastFour || "";
                    const status = transaction.Status || "Completed";
                    const description = lastFour ? `${paymentMethod} ending in ${lastFour} (${status})` : `${paymentMethod} (${status})`;
                    await storage.upsertRevenue({
                      organizationId,
                      studentId: studentId || null,
                      mindbodySaleId: transaction.TransactionId?.toString() || null,
                      mindbodyItemId: null,
                      amount: transaction.Amount?.toString() || "0",
                      type: paymentMethod,
                      description,
                      transactionDate
                    });
                    imported2++;
                  }
                } catch (error) {
                  console.error(`Failed to import transaction ${transaction.TransactionId || transaction.Id}:`, error);
                  skipped++;
                }
              }
              transactionOffset += transactions.length;
              totalProcessed2 += transactions.length;
              await onProgress(totalProcessed2, totalResults2);
              await new Promise((resolve) => setImmediate(resolve));
            }
            console.log(
              `[Sales Import] Results: ${imported2} imported, ${skipped} skipped (invalid dates)`
            );
            console.log(
              `[Sales Import] Completed - imported ${imported2} revenue records from ${totalProcessed2} transactions`
            );
            return { imported: imported2, nextStudentIndex: totalProcessed2, completed: true };
          }
          let imported = 0;
          let matchedClients = 0;
          let unmatchedClients = 0;
          let salesOffset = 0;
          let hasMoreSales = true;
          let totalProcessed = 0;
          let totalFilteredOut = 0;
          console.log(`[Sales Import] Processing sales page-by-page from /sale/sales`);
          while (hasMoreSales) {
            const { results: sales, totalResults: totalResults2, hasMore } = await this.fetchPage(
              organizationId,
              `/sale/sales?StartDate=${dateFormat}&EndDate=${endDateFormat}`,
              "Sales",
              salesOffset,
              SALES_BATCH_SIZE
            );
            if (sales.length === 0) {
              break;
            }
            hasMoreSales = hasMore;
            if (salesOffset === 0) {
              console.log(`[Sales Import] Total sales: ${totalResults2}`);
            }
            let filteredOutThisPage = 0;
            for (const sale of sales) {
              try {
                if (!sale.SaleDateTime) {
                  console.log(`Sale ${sale.Id} missing SaleDateTime, skipping`);
                  continue;
                }
                const saleDate = new Date(sale.SaleDateTime);
                const nextDay = new Date(endDate);
                nextDay.setDate(nextDay.getDate() + 1);
                if (saleDate < startDate || saleDate >= nextDay) {
                  filteredOutThisPage++;
                  continue;
                }
                const studentId = studentMap.get(sale.ClientId?.toString()) || null;
                if (studentId) {
                  matchedClients++;
                } else {
                  unmatchedClients++;
                }
                const purchasedItems = Array.isArray(sale.PurchasedItems) ? sale.PurchasedItems : sale.PurchasedItems ? [sale.PurchasedItems] : [];
                if (purchasedItems.length === 0) {
                  continue;
                }
                for (const item of purchasedItems) {
                  try {
                    const amount = item.Amount ?? (item.UnitPrice && item.Quantity ? item.UnitPrice * item.Quantity : null);
                    if (!amount && amount !== 0) continue;
                    if (amount === 0) continue;
                    let description = item.Name || item.Description || "Unknown item";
                    if (item.Quantity && item.Quantity > 1) {
                      description = `${description} (Qty: ${item.Quantity})`;
                    }
                    await storage.upsertRevenue({
                      organizationId,
                      studentId,
                      mindbodySaleId: sale.Id?.toString() || null,
                      mindbodyItemId: item.Id?.toString() || item.SaleDetailId?.toString() || null,
                      amount: amount.toString(),
                      type: item.IsService ? "Service" : item.Type || "Product",
                      description,
                      transactionDate: new Date(sale.SaleDateTime)
                    });
                    imported++;
                  } catch (error) {
                    console.error(`Failed to import purchased item from sale ${sale.Id}:`, error);
                  }
                }
              } catch (error) {
                console.error(`Failed to process sale ${sale.Id}:`, error);
              }
            }
            totalFilteredOut += filteredOutThisPage;
            salesOffset += sales.length;
            totalProcessed += sales.length;
            await onProgress(totalProcessed, totalResults2);
            await new Promise((resolve) => setImmediate(resolve));
          }
          console.log(
            `[Sales Import] Completed - imported ${imported} revenue records from ${totalProcessed} sales`
          );
          if (totalFilteredOut > 0) {
            console.log(
              `[Sales Import] Filtered out ${totalFilteredOut} sales outside date range (${dateFormat} to ${endDateFormat})`
            );
          }
          console.log(
            `[Sales Import] Client matching: ${matchedClients} matched, ${unmatchedClients} unmatched (linked to null studentId)`
          );
          return { imported, nextStudentIndex: totalProcessed, completed: true };
        } catch (error) {
          console.error(`Failed to fetch site-level sales:`, error);
          throw error;
        }
      }
      async createWebhookSubscription(organizationId, eventType, webhookUrl, referenceId) {
        const userToken = await this.getUserToken();
        const WEBHOOKS_API_BASE = "https://api.mindbodyonline.com/webhooks/v6";
        const org = await storage.getOrganization(organizationId);
        if (!org?.mindbodySiteId) {
          throw new Error("Mindbody site ID not configured");
        }
        const requestBody = {
          eventType,
          webhookUrl,
          eventSchemaVersion: 1,
          referenceId: referenceId || organizationId,
          siteIds: [parseInt(org.mindbodySiteId)]
        };
        console.log(`[Webhook] Creating subscription with payload:`, JSON.stringify(requestBody, null, 2));
        console.log(`[Webhook] Using webhook URL: ${webhookUrl}`);
        const response = await fetch(`${WEBHOOKS_API_BASE}/subscriptions`, {
          method: "POST",
          headers: {
            "Api-Key": process.env.MINDBODY_API_KEY || "",
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });
        console.log(`[Webhook] Response status: ${response.status}`);
        console.log(`[Webhook] Response headers:`, Object.fromEntries(response.headers.entries()));
        const responseText = await response.text();
        console.log(`[Webhook] Response body (first 1000 chars):`, responseText.substring(0, 1e3));
        if (!response.ok) {
          console.error(`Mindbody webhook subscription failed: ${response.status} - ${responseText}`);
          throw new Error(`Failed to create webhook subscription (${response.status}): ${responseText.substring(0, 300)}`);
        }
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`Failed to parse webhook subscription response as JSON: ${responseText.substring(0, 500)}`);
          throw new Error(`Mindbody returned invalid JSON response for webhook subscription: ${responseText.substring(0, 200)}`);
        }
        return {
          subscriptionId: data.id,
          messageSignatureKey: data.messageSignatureKey
        };
      }
      async deleteWebhookSubscription(organizationId, mindbodySubscriptionId) {
        const userToken = await this.getUserToken();
        const WEBHOOKS_API_BASE = "https://api.mindbodyonline.com/webhooks/v6";
        const response = await fetch(`${WEBHOOKS_API_BASE}/subscriptions/${mindbodySubscriptionId}`, {
          method: "DELETE",
          headers: {
            "Api-Key": process.env.MINDBODY_API_KEY || "",
            Authorization: `Bearer ${userToken}`
          }
        });
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to delete webhook subscription: ${error}`);
        }
      }
      verifyWebhookSignature(payload, signatureHeader, signatureKey) {
        const crypto = __require("crypto");
        const hmac = crypto.createHmac("sha256", signatureKey);
        const hash = hmac.update(payload).digest("base64");
        const computedSignature = `sha256=${hash}`;
        const expected = Buffer.from(computedSignature, "utf8");
        const received = Buffer.from(signatureHeader || "", "utf8");
        if (expected.length !== received.length) {
          return false;
        }
        return crypto.timingSafeEqual(expected, received);
      }
    };
    mindbodyService = new MindbodyService();
  }
});

// server/import-worker.ts
var import_worker_exports = {};
__export(import_worker_exports, {
  ImportWorker: () => ImportWorker,
  importWorker: () => importWorker
});
function logMemoryUsage(context) {
  const usage = process.memoryUsage();
  const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);
  console.log(
    `[Memory] ${context} - RSS: ${formatMB(usage.rss)}MB, Heap Used: ${formatMB(usage.heapUsed)}MB / ${formatMB(usage.heapTotal)}MB`
  );
}
function safeJsonParse(value, fallback = {}) {
  if (value === null || value === void 0) {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function isDatabaseConnectionError(error) {
  if (!error) return false;
  const errorStr = error.toString().toLowerCase();
  const message = error.message?.toLowerCase() || "";
  const code = error.code?.toLowerCase() || "";
  return (
    // Neon connection termination
    code === "57p01" || message.includes("terminating connection") || // General connection errors
    message.includes("connection terminated") || message.includes("connection closed") || message.includes("connection lost") || message.includes("econnreset") || errorStr.includes("econnreset")
  );
}
async function keepAliveAndHeartbeat(jobId, context) {
  try {
    await withDatabaseRetry2(
      async () => {
        await storage.keepConnectionAlive();
        await storage.updateImportJobHeartbeat(jobId);
      },
      `Keep-alive and heartbeat (${context})`
    );
  } catch (error) {
    console.warn(`[Keep-Alive] Warning for job ${jobId} at ${context}:`, error);
  }
}
async function withDatabaseRetry2(operation, context = "Database operation", maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isDatabaseConnectionError(error)) {
        throw error;
      }
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1e3;
        console.log(
          `[DB Retry] ${context} failed (attempt ${attempt}/${maxRetries}): ${error}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`[DB Retry] ${context} failed after ${maxRetries} attempts`);
      }
    }
  }
  throw lastError;
}
var shutdownHandlersRegistered, ImportWorker, importWorker;
var init_import_worker = __esm({
  "server/import-worker.ts"() {
    "use strict";
    init_storage();
    init_mindbody();
    shutdownHandlersRegistered = false;
    ImportWorker = class {
      jobQueue = [];
      isProcessing = false;
      currentJobId = null;
      watchdogInterval = null;
      constructor() {
        this.registerShutdownHandlers();
        this.startWatchdog();
      }
      startWatchdog() {
        this.watchdogInterval = setInterval(async () => {
          try {
            await this.checkForStalledJobs();
          } catch (error) {
            console.error("[Watchdog] Error checking for stalled jobs:", error);
          }
        }, 12e4);
      }
      async checkForStalledJobs() {
        try {
          const stalledJobs = await storage.getStalledImportJobs(10);
          for (const job of stalledJobs) {
            console.log(`[Watchdog] Detected stalled job ${job.id} - last heartbeat: ${job.heartbeatAt}`);
            await withDatabaseRetry2(
              () => storage.updateImportJob(job.id, {
                status: "failed",
                error: "Import worker stopped responding (connection timeout). Please try a smaller date range or contact support."
              }),
              `Mark stalled job ${job.id} as failed`
            );
            console.log(`[Watchdog] Marked job ${job.id} as failed`);
          }
        } catch (error) {
          console.error("[Watchdog] Failed to check for stalled jobs:", error);
        }
      }
      registerShutdownHandlers() {
        if (shutdownHandlersRegistered) return;
        shutdownHandlersRegistered = true;
        const handleShutdown = async (signal) => {
          console.log(`[ImportWorker] Received ${signal} signal, leaving job in resumable state...`);
          if (this.watchdogInterval) {
            clearInterval(this.watchdogInterval);
          }
          if (this.currentJobId) {
            try {
              const job = await withDatabaseRetry2(
                () => storage.getImportJob(this.currentJobId),
                "Get import job during shutdown"
              );
              if (job && job.status === "running") {
                await withDatabaseRetry2(
                  () => storage.updateImportJob(this.currentJobId, {
                    error: null
                  }),
                  "Clear error during shutdown"
                );
                console.log(`[ImportWorker] Job ${this.currentJobId} left in resumable state for auto-resume`);
              }
            } catch (error) {
              console.error(`[ImportWorker] Failed to update job during shutdown:`, error);
            }
          }
          if (signal === "SIGTERM" || signal === "SIGINT") {
            process.exit(0);
          }
        };
        process.on("SIGTERM", () => handleShutdown("SIGTERM"));
        process.on("SIGINT", () => handleShutdown("SIGINT"));
        process.on("uncaughtException", async (error) => {
          console.error("[ImportWorker] Uncaught exception:", error);
          await handleShutdown("uncaughtException");
          process.exit(1);
        });
        process.on("unhandledRejection", async (reason) => {
          console.error("[ImportWorker] Unhandled rejection:", reason);
          await handleShutdown("unhandledRejection");
          process.exit(1);
        });
      }
      async processJob(jobId) {
        if (!this.jobQueue.includes(jobId)) {
          this.jobQueue.push(jobId);
        }
        if (!this.isProcessing) {
          this.processQueue();
        }
      }
      async processQueue() {
        while (this.jobQueue.length > 0) {
          const jobId = this.jobQueue.shift();
          await this.processJobInternal(jobId);
        }
      }
      async processJobInternal(jobId) {
        this.isProcessing = true;
        this.currentJobId = jobId;
        logMemoryUsage(`Starting job ${jobId}`);
        let heartbeatInterval = null;
        try {
          const job = await withDatabaseRetry2(
            () => storage.getImportJob(jobId),
            "Get import job"
          );
          if (!job) {
            console.error(`Job ${jobId} not found`);
            return;
          }
          if (job.status === "paused" || job.status === "cancelled") {
            return;
          }
          const startDate = new Date(job.startDate);
          const endDate = new Date(job.endDate);
          const dataTypes = job.dataTypes;
          const progress = safeJsonParse(job.progress, {});
          if (!progress.apiCallCount) {
            progress.apiCallCount = 0;
          }
          if (!progress.importStartTime) {
            progress.importStartTime = (/* @__PURE__ */ new Date()).toISOString();
          }
          const baselineApiCallCount = progress.apiCallCount || 0;
          mindbodyService.resetApiCallCount();
          await withDatabaseRetry2(
            () => storage.updateImportJob(jobId, {
              status: "running",
              progress: JSON.stringify(progress),
              heartbeatAt: /* @__PURE__ */ new Date()
              // Set initial heartbeat
            }),
            "Set job status to running"
          );
          console.log(`[Import] Starting periodic heartbeat for job ${jobId}`);
          heartbeatInterval = setInterval(async () => {
            try {
              await keepAliveAndHeartbeat(jobId, "periodic heartbeat");
            } catch (error) {
              console.warn(`[Import] Heartbeat failed for job ${jobId}:`, error);
            }
          }, 6e4);
          if (dataTypes.includes("clients") && !progress.clients?.completed) {
            logMemoryUsage("Before processing clients");
            await this.processClients(job, startDate, endDate, progress, baselineApiCallCount);
            logMemoryUsage("After processing clients");
            const updatedJob = await withDatabaseRetry2(
              () => storage.getImportJob(jobId),
              "Check job status after clients"
            );
            if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
              return;
            }
          }
          if (dataTypes.includes("classes") && !progress.classes?.completed) {
            logMemoryUsage("Before processing classes");
            await this.processClasses(job, startDate, endDate, progress, baselineApiCallCount);
            logMemoryUsage("After processing classes");
            const updatedJob = await withDatabaseRetry2(
              () => storage.getImportJob(jobId),
              "Check job status after classes"
            );
            if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
              return;
            }
          }
          if (dataTypes.includes("visits") && !progress.visits?.completed) {
            logMemoryUsage("Before processing visits");
            await this.processVisits(job, startDate, endDate, progress, baselineApiCallCount);
            logMemoryUsage("After processing visits");
            const updatedJob = await withDatabaseRetry2(
              () => storage.getImportJob(jobId),
              "Check job status after visits"
            );
            if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
              return;
            }
          }
          if (dataTypes.includes("sales") && !progress.sales?.completed) {
            logMemoryUsage("Before processing sales");
            await this.processSales(job, startDate, endDate, progress, baselineApiCallCount);
            logMemoryUsage("After processing sales");
            const updatedJob = await withDatabaseRetry2(
              () => storage.getImportJob(jobId),
              "Check job status after sales"
            );
            if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
              return;
            }
          }
          await withDatabaseRetry2(
            () => storage.updateImportJob(jobId, {
              status: "completed",
              progress: JSON.stringify(progress)
            }),
            "Mark job as completed"
          );
          logMemoryUsage(`Job ${jobId} completed successfully`);
          console.log(`Import job ${jobId} completed successfully`);
        } catch (error) {
          console.error(`Error processing job ${jobId}:`, error);
          logMemoryUsage(`Job ${jobId} failed with error`);
          let errorMessage = error instanceof Error ? error.message : "Unknown error";
          const failedJob = await withDatabaseRetry2(
            () => storage.getImportJob(jobId),
            "Get failed job details"
          ).catch(() => null);
          if (failedJob?.currentDataType) {
            const dataTypeNames = {
              clients: "Students",
              classes: "Classes",
              visits: "Visits",
              sales: "Sales"
            };
            const displayName = dataTypeNames[failedJob.currentDataType] || failedJob.currentDataType;
            errorMessage = `Failed while importing ${displayName}: ${errorMessage}`;
          }
          const lowerError = errorMessage.toLowerCase();
          if (lowerError.includes("timeout") || lowerError.includes("etimedout") || lowerError.includes("408") || lowerError.includes("504")) {
            errorMessage += " (Network timeout - this is common for large imports. Resume to continue.)";
          } else if (lowerError.includes("429") || lowerError.includes("rate limit")) {
            errorMessage += " (API rate limit reached. Wait a few minutes, then resume.)";
          } else if (lowerError.includes("401") || lowerError.includes("403") || lowerError.includes("unauthorized") || lowerError.includes("forbidden") || lowerError.includes("permission")) {
            errorMessage += " (Authentication/permission issue. Check your Mindbody connection.)";
          } else if (lowerError.includes("memory")) {
            errorMessage += " (Out of memory. Try importing smaller date ranges.)";
          }
          await withDatabaseRetry2(
            () => storage.updateImportJob(jobId, {
              status: "failed",
              error: errorMessage
            }),
            "Mark job as failed"
          ).catch((err) => {
            console.error(`Failed to mark job ${jobId} as failed:`, err);
          });
        } finally {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            console.log(`[Import] Stopped periodic heartbeat for job ${jobId}`);
          }
          this.isProcessing = false;
          this.currentJobId = null;
        }
      }
      async processClients(job, startDate, endDate, progress, baselineApiCallCount = 0) {
        if (!progress.clients) {
          progress.clients = { current: 0, total: 0, imported: 0, updated: 0, completed: false };
        }
        let batchResult;
        do {
          const currentJob = await withDatabaseRetry2(
            () => storage.getImportJob(job.id),
            "Check job status before clients batch"
          );
          if (currentJob?.status === "paused" || currentJob?.status === "cancelled") {
            return;
          }
          batchResult = await mindbodyService.importClientsResumable(
            job.organizationId,
            startDate,
            endDate,
            async (current, total) => {
              progress.clients.current = current;
              progress.clients.total = total;
              progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
              await withDatabaseRetry2(
                () => storage.updateImportJob(job.id, {
                  progress: JSON.stringify(progress),
                  currentDataType: "clients",
                  currentOffset: current
                }),
                "Update import progress (clients)"
              );
            },
            progress.clients.current || 0,
            job.id
            // Pass jobId for skipped record tracking
          );
          progress.clients.imported += batchResult.imported;
          progress.clients.updated += batchResult.updated;
          progress.clients.current = batchResult.nextOffset;
          progress.clients.completed = batchResult.completed;
          progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
          await withDatabaseRetry2(
            () => storage.updateImportJob(job.id, {
              progress: JSON.stringify(progress)
            }),
            "Update import progress after batch (clients)"
          );
        } while (!batchResult.completed);
      }
      async processClasses(job, startDate, endDate, progress, baselineApiCallCount = 0) {
        if (!progress.classes) {
          progress.classes = { current: 0, total: 0, imported: 0, completed: false };
        }
        let batchResult;
        do {
          const currentJob = await withDatabaseRetry2(
            () => storage.getImportJob(job.id),
            "Check job status before classes batch"
          );
          if (currentJob?.status === "paused" || currentJob?.status === "cancelled") {
            return;
          }
          batchResult = await mindbodyService.importClassesResumable(
            job.organizationId,
            startDate,
            endDate,
            async (current, total) => {
              progress.classes.current = current;
              progress.classes.total = total;
              progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
              await withDatabaseRetry2(
                () => storage.updateImportJob(job.id, {
                  progress: JSON.stringify(progress),
                  currentDataType: "classes",
                  currentOffset: current
                }),
                "Update import progress (classes)"
              );
            },
            progress.classes.current || 0
          );
          progress.classes.imported += batchResult.imported;
          progress.classes.current = batchResult.nextOffset;
          progress.classes.completed = batchResult.completed;
          progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
          await withDatabaseRetry2(
            () => storage.updateImportJob(job.id, {
              progress: JSON.stringify(progress)
            }),
            "Update import progress after batch (classes)"
          );
        } while (!batchResult.completed);
      }
      async processVisits(job, startDate, endDate, progress, baselineApiCallCount = 0) {
        if (!progress.visits) {
          progress.visits = { current: 0, total: 0, imported: 0, completed: false };
        }
        let schedulesByTime = void 0;
        let batchResult;
        do {
          await keepAliveAndHeartbeat(job.id, `visits batch ${progress.visits.current || 0}`);
          console.log(`[Import] Processing visits batch: student ${progress.visits.current || 0}/${progress.visits.total || 0}`);
          const currentJob = await withDatabaseRetry2(
            () => storage.getImportJob(job.id),
            "Check job status before visits batch"
          );
          if (currentJob?.status === "paused" || currentJob?.status === "cancelled") {
            console.log(`[Import] Job ${job.id} has been cancelled, stopping visits import`);
            return;
          }
          batchResult = await mindbodyService.importVisitsResumable(
            job.organizationId,
            startDate,
            endDate,
            async (current, total) => {
              progress.visits.current = current;
              progress.visits.total = total;
              progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
              await withDatabaseRetry2(
                () => storage.updateImportJob(job.id, {
                  progress: JSON.stringify(progress),
                  currentDataType: "visits",
                  currentOffset: current
                }),
                "Update import progress (visits)"
              );
            },
            progress.visits.current || 0,
            schedulesByTime
            // Pass cached schedules
          );
          if (!schedulesByTime && batchResult.schedulesByTime) {
            schedulesByTime = batchResult.schedulesByTime;
          }
          progress.visits.imported += batchResult.imported;
          progress.visits.current = batchResult.nextStudentIndex;
          progress.visits.completed = batchResult.completed;
          progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
          await withDatabaseRetry2(
            () => storage.updateImportJob(job.id, {
              progress: JSON.stringify(progress)
            }),
            "Update import progress after batch (visits)"
          );
          logMemoryUsage(`Visits batch completed: ${progress.visits.current}/${progress.visits.total} students`);
        } while (!batchResult.completed);
      }
      async processSales(job, startDate, endDate, progress, baselineApiCallCount = 0) {
        if (!progress.sales) {
          progress.sales = { current: 0, total: 0, imported: 0, completed: false };
        }
        const allStudents = await withDatabaseRetry2(
          () => storage.getStudents(job.organizationId, 1e5),
          "Load all students for sales import"
        );
        let batchResult;
        do {
          const currentJob = await withDatabaseRetry2(
            () => storage.getImportJob(job.id),
            "Check job status before sales batch"
          );
          if (currentJob?.status === "paused" || currentJob?.status === "cancelled") {
            console.log(`Job ${job.id} has been cancelled, stopping sales import`);
            return;
          }
          batchResult = await mindbodyService.importSalesResumable(
            job.organizationId,
            startDate,
            endDate,
            async (current, total) => {
              progress.sales.current = current;
              progress.sales.total = total;
              progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
              await withDatabaseRetry2(
                () => storage.updateImportJob(job.id, {
                  progress: JSON.stringify(progress),
                  currentDataType: "sales",
                  currentOffset: current
                }),
                "Update import progress (sales)"
              );
            },
            progress.sales.current || 0,
            allStudents
            // Pass cached students to avoid reloading
          );
          progress.sales.imported += batchResult.imported;
          progress.sales.current = batchResult.nextStudentIndex;
          progress.sales.completed = batchResult.completed;
          progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
          await withDatabaseRetry2(
            () => storage.updateImportJob(job.id, {
              progress: JSON.stringify(progress)
            }),
            "Update import progress after batch (sales)"
          );
        } while (!batchResult.completed);
      }
      isJobProcessing() {
        return this.isProcessing;
      }
      getCurrentJobId() {
        return this.currentJobId;
      }
    };
    importWorker = new ImportWorker();
  }
});

// server/scheduler.ts
var scheduler_exports = {};
__export(scheduler_exports, {
  importScheduler: () => importScheduler
});
import cron from "node-cron";
import { subDays } from "date-fns";
var ImportScheduler, importScheduler;
var init_scheduler = __esm({
  "server/scheduler.ts"() {
    "use strict";
    init_storage();
    ImportScheduler = class {
      scheduledJobs = /* @__PURE__ */ new Map();
      async startScheduler() {
        console.log("[Scheduler] Starting import scheduler...");
        await this.syncScheduledJobs();
        cron.schedule("*/5 * * * *", async () => {
          await this.syncScheduledJobs();
        });
      }
      async syncScheduledJobs() {
        try {
          const db2 = await Promise.resolve().then(() => (init_db(), db_exports));
          const { scheduledImports: scheduledImports2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq3 } = await import("drizzle-orm");
          const allScheduled = await db2.db.select().from(scheduledImports2).where(eq3(scheduledImports2.enabled, true));
          const activeOrgs = /* @__PURE__ */ new Set();
          for (const scheduled of allScheduled) {
            activeOrgs.add(scheduled.organizationId);
            if (!cron.validate(scheduled.schedule)) {
              console.error(`[Scheduler] Invalid cron expression for org ${scheduled.organizationId}: ${scheduled.schedule}`);
              continue;
            }
            const existingJobInfo = this.scheduledJobs.get(scheduled.organizationId);
            const scheduleChanged = existingJobInfo && existingJobInfo.schedule !== scheduled.schedule;
            if (!existingJobInfo || scheduleChanged) {
              if (existingJobInfo) {
                existingJobInfo.task.stop();
                this.scheduledJobs.delete(scheduled.organizationId);
                if (scheduleChanged) {
                  console.log(`[Scheduler] Schedule changed for org ${scheduled.organizationId} from "${existingJobInfo.schedule}" to "${scheduled.schedule}"`);
                }
              }
              const task = cron.schedule(scheduled.schedule, async () => {
                console.log(`[Scheduler] Cron triggered for org ${scheduled.organizationId}`);
                await this.runScheduledImport(scheduled.organizationId, false);
              });
              this.scheduledJobs.set(scheduled.organizationId, {
                task,
                schedule: scheduled.schedule
              });
              console.log(`[Scheduler] Created cron job for org ${scheduled.organizationId} with schedule: ${scheduled.schedule}`);
            }
          }
          for (const [orgId, jobInfo] of Array.from(this.scheduledJobs.entries())) {
            if (!activeOrgs.has(orgId)) {
              jobInfo.task.stop();
              this.scheduledJobs.delete(orgId);
              console.log(`[Scheduler] Removed cron job for org ${orgId} (no longer enabled)`);
            }
          }
        } catch (error) {
          console.error("[Scheduler] Error syncing scheduled jobs:", error);
        }
      }
      async runScheduledImport(organizationId, isManual = false) {
        try {
          const scheduledImport = await storage.getScheduledImport(organizationId);
          if (!scheduledImport || !scheduledImport.enabled) {
            console.log(`[Scheduler] Skipping import for org ${organizationId} - not enabled`);
            return;
          }
          const activeJob = await storage.getActiveImportJob(organizationId);
          if (activeJob) {
            console.log(`[Scheduler] Skipping import for org ${organizationId} - active job already exists`);
            return;
          }
          if (!isManual && scheduledImport.lastRunAt) {
            const timeSinceLastRun = Date.now() - scheduledImport.lastRunAt.getTime();
            const minInterval = 10 * 60 * 1e3;
            if (timeSinceLastRun < minInterval) {
              console.log(`[Scheduler] Skipping import for org ${organizationId} - ran ${Math.floor(timeSinceLastRun / 6e4)} minutes ago`);
              return;
            }
          }
          console.log(`[Scheduler] Starting ${isManual ? "manual" : "scheduled"} import for org ${organizationId}`);
          await storage.updateScheduledImport(organizationId, {
            lastRunAt: /* @__PURE__ */ new Date(),
            lastRunStatus: "running",
            lastRunError: null
          });
          const endDate = /* @__PURE__ */ new Date();
          const startDate = subDays(endDate, scheduledImport.daysToImport);
          const dataTypesString = scheduledImport.dataTypes || "students,classes,visits,sales";
          const dataTypes = dataTypesString.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
          if (dataTypes.length === 0) {
            throw new Error("No data types configured for scheduled import");
          }
          const importJob = await storage.createImportJob({
            organizationId,
            status: "pending",
            dataTypes,
            // Pass the array, not the string
            startDate,
            endDate,
            progress: "{}"
          });
          this.runImportInBackground(importJob.id, organizationId, dataTypes, startDate, endDate);
        } catch (error) {
          console.error(`[Scheduler] Error running scheduled import for org ${organizationId}:`, error);
          try {
            await storage.updateScheduledImport(organizationId, {
              lastRunStatus: "failed",
              lastRunError: error instanceof Error ? error.message : String(error)
            });
          } catch (updateError) {
            console.error("[Scheduler] Error updating scheduled import status:", updateError);
          }
        }
      }
      async runImportInBackground(jobId, organizationId, dataTypes, startDate, endDate) {
        try {
          const { importWorker: importWorker2 } = await Promise.resolve().then(() => (init_import_worker(), import_worker_exports));
          await importWorker2.processJob(jobId);
          let finalJob = await storage.getImportJob(jobId);
          const maxWaitTime = 4 * 60 * 60 * 1e3;
          const pollInterval = 1e4;
          const startTime = Date.now();
          while (finalJob && finalJob.status !== "completed" && finalJob.status !== "failed" && finalJob.status !== "cancelled") {
            if (Date.now() - startTime > maxWaitTime) {
              const errorMsg = `Import exceeded ${maxWaitTime / 36e5} hour timeout. The job may still be running in the background.`;
              console.error(`[Scheduler] ${errorMsg}`);
              await storage.updateScheduledImport(organizationId, {
                lastRunStatus: "failed",
                lastRunError: errorMsg
              });
              return;
            }
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            finalJob = await storage.getImportJob(jobId);
          }
          if (!finalJob) {
            await storage.updateScheduledImport(organizationId, {
              lastRunStatus: "failed",
              lastRunError: "Import job disappeared from database"
            });
            return;
          }
          if (finalJob.status === "completed") {
            await storage.updateScheduledImport(organizationId, {
              lastRunStatus: "success",
              lastRunError: null
            });
            console.log(`[Scheduler] Scheduled import completed for org ${organizationId}`);
          } else if (finalJob.status === "failed") {
            await storage.updateScheduledImport(organizationId, {
              lastRunStatus: "failed",
              lastRunError: finalJob.error || "Import failed"
            });
          } else if (finalJob.status === "cancelled") {
            await storage.updateScheduledImport(organizationId, {
              lastRunStatus: "failed",
              lastRunError: "Import was cancelled"
            });
          } else {
            await storage.updateScheduledImport(organizationId, {
              lastRunStatus: "failed",
              lastRunError: `Unexpected job status: ${finalJob.status}`
            });
          }
        } catch (error) {
          console.error(`[Scheduler] Error in background import:`, error);
          await storage.updateImportJob(jobId, {
            status: "failed",
            error: error instanceof Error ? error.message : String(error)
          });
          await storage.updateScheduledImport(organizationId, {
            lastRunStatus: "failed",
            lastRunError: error instanceof Error ? error.message : String(error)
          });
        }
      }
    };
    importScheduler = new ImportScheduler();
  }
});

// server/index.ts
import express2 from "express";

// server/routes/index.ts
import { createServer } from "http";

// server/routes/users.ts
init_storage();

// server/auth.ts
init_storage();
init_db();
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";

// server/brevo.ts
import * as brevo from "@getbrevo/brevo";
async function sendPasswordResetEmail({
  toEmail,
  toName,
  resetLink
}) {
  if (!process.env.BREVO_API_KEY) {
    console.error("Cannot send password reset email: BREVO_API_KEY not configured");
    throw new Error("Email service not configured");
  }
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = "Reset Your Password";
  sendSmtpEmail.sender = {
    name: "Mindbody Analytics",
    email: process.env.BREVO_SENDER_EMAIL || "noreply@yourdomain.com"
  };
  sendSmtpEmail.to = [{ email: toEmail, name: toName }];
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px 40px;">
                  <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
                  <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.5;">
                    Hello ${toName},
                  </p>
                  <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.5;">
                    We received a request to reset your password. Click the button below to create a new password:
                  </p>
                  <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td style="border-radius: 6px; background-color: #2563eb;">
                        <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500;">Reset Password</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.5;">
                    This link will expire in 1 hour for security reasons.
                  </p>
                  <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.5;">
                    If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
                  <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.5;">
                    If the button above doesn't work, copy and paste this link into your browser:<br>
                    <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px 40px 40px; background-color: #f9f9f9;">
                  <p style="margin: 0; color: #999; font-size: 13px; text-align: center;">
                    \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} Mindbody Analytics. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  sendSmtpEmail.textContent = `
Hello ${toName},

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} Mindbody Analytics. All rights reserved.
  `.trim();
  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Password reset email sent successfully");
    return result;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}

// server/auth.ts
var PgSession = ConnectPgSimple(session);
var hashPassword = (password, salt) => {
  return scryptSync(password, salt, 64).toString("hex");
};
var setupAuth = (app2) => {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable must be set");
  }
  app2.set("trust proxy", 1);
  const isReplit = !!process.env.REPL_ID;
  const isDevelopment = process.env.NODE_ENV === "development";
  const sameSiteValue = isReplit ? "none" : "lax";
  const secureValue = isReplit ? true : app2.get("env") === "production";
  const sessionSettings = {
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
    rolling: true,
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: false
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      httpOnly: true,
      secure: secureValue,
      sameSite: sameSiteValue,
      path: "/"
    }
  };
  console.log("[Auth] Session cookie configuration:", {
    isReplit,
    isDevelopment,
    secure: sessionSettings.cookie?.secure,
    sameSite: sessionSettings.cookie?.sameSite,
    environment: app2.get("env")
  });
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          if (!user.passwordHash) {
            return done(null, false, { message: "Please sign in with Google" });
          }
          const [salt, hash] = user.passwordHash.split(":");
          const inputHash = hashPassword(password, salt);
          const hashBuffer = Buffer.from(hash, "hex");
          const inputBuffer = Buffer.from(inputHash, "hex");
          if (!timingSafeEqual(hashBuffer, inputBuffer)) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    let googleCallbackURL = "http://localhost:5000/api/auth/google/callback";
    if (process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(",");
      googleCallbackURL = `https://${domains[0]}/api/auth/google/callback`;
    }
    console.log(`[Google OAuth] Using callback URL: ${googleCallbackURL}`);
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: googleCallbackURL
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email from Google"));
            }
            let user = await storage.getUserByProvider("google", profile.id);
            if (!user) {
              user = await storage.getUserByEmail(email);
              if (user && user.provider === "local") {
                return done(null, false, {
                  message: "Email already registered with password. Please sign in with email and password."
                });
              }
            }
            if (!user) {
              const organization = await storage.createOrganization({
                name: `${profile.displayName || email}'s Organization`
              });
              user = await storage.createUser({
                email,
                name: profile.displayName || email,
                role: "admin",
                organizationId: organization.id,
                provider: "google",
                providerId: profile.id,
                passwordHash: null
              });
            }
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, name, organizationName } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password, and name are required" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const organization = await storage.createOrganization({
        name: organizationName || `${name}'s Organization`
      });
      const salt = randomBytes(16).toString("hex");
      const hash = hashPassword(password, salt);
      const user = await storage.createUser({
        email,
        passwordHash: `${salt}:${hash}`,
        name,
        role: "admin",
        organizationId: organization.id
      });
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });
  app2.post("/api/auth/login", (req, res, next) => {
    console.log("[Auth] Login request - Headers:", {
      host: req.headers.host,
      "x-forwarded-proto": req.headers["x-forwarded-proto"],
      secure: req.secure,
      protocol: req.protocol
    });
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("[Auth] Login authentication error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }
      req.login(user, (err2) => {
        if (err2) {
          console.error("[Auth] Login session error:", err2);
          return res.status(500).json({ error: "Login failed" });
        }
        console.log("[Auth] Login successful - Session ID:", req.sessionID);
        console.log("[Auth] Cookie settings:", req.session.cookie);
        res.on("finish", () => {
          console.log("[Auth] Set-Cookie header:", res.getHeader("set-cookie"));
        });
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId
        });
      });
    })(req, res, next);
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/auth/health", async (req, res) => {
    try {
      const checks = {
        sessionSecret: !!process.env.SESSION_SECRET,
        databaseUrl: !!process.env.DATABASE_URL,
        environment: process.env.NODE_ENV || "development",
        sessionStoreConnected: false,
        canQueryDatabase: false
      };
      try {
        const testUser = await storage.getUserByEmail("test@example.com");
        checks.canQueryDatabase = true;
      } catch (err) {
        console.error("Health check - database query failed:", err);
      }
      checks.sessionStoreConnected = true;
      res.json(checks);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ error: "Health check failed", details: String(error) });
    }
  });
  app2.get("/api/auth/me", (req, res) => {
    console.log("[Auth] /me check - Session ID:", req.sessionID, "Authenticated:", req.isAuthenticated(), "Cookie header:", req.headers.cookie);
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId
    });
  });
  app2.get("/api/auth/google", (req, res, next) => {
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
  });
  app2.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );
  app2.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }
      if (user.provider !== "local") {
        return res.status(400).json({ error: "This account uses Google sign-in. No password reset needed." });
      }
      await storage.deleteExpiredPasswordResetTokens();
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
      await storage.createPasswordResetToken(user.id, token, expiresAt);
      const resetLink = `${req.protocol}://${req.get("host")}/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail({
          toEmail: user.email,
          toName: user.name,
          resetLink
        });
        res.json({ message: "If the email exists, a reset link has been sent" });
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        if (process.env.NODE_ENV !== "production") {
          return res.json({
            message: "Email service unavailable. Use this link to reset your password:",
            resetLink
          });
        }
        res.json({ message: "If the email exists, a reset link has been sent" });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      if (resetToken.expiresAt < /* @__PURE__ */ new Date()) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ error: "Reset token has expired" });
      }
      const salt = randomBytes(16).toString("hex");
      const hash = hashPassword(newPassword, salt);
      await storage.updateUser(resetToken.userId, {
        passwordHash: `${salt}:${hash}`
      });
      await storage.deletePasswordResetToken(token);
      res.json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
};
var requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// server/routes/users.ts
init_schema();
import { fromZodError } from "zod-validation-error";
import { scrypt, randomBytes as randomBytes2 } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
function registerUserRoutes(app2) {
  app2.get("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;
      const organizationId = currentUser?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const users2 = await storage.getUsers(organizationId);
      res.json(users2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.post("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;
      const organizationId = currentUser?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { password, ...userData } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }
      const salt = randomBytes2(16).toString("hex");
      const buf = await scryptAsync(password, salt, 64);
      const passwordHash = `${buf.toString("hex")}.${salt}`;
      const validation = insertUserSchema.safeParse({
        ...userData,
        passwordHash,
        organizationId
      });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }
      const user = await storage.createUser(validation.data);
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(400).json({ error: "Email already exists" });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;
      const organizationId = currentUser?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { password, organizationId: clientOrgId, ...updateData } = req.body;
      let dataToUpdate = { ...updateData };
      if (password) {
        const salt = randomBytes2(16).toString("hex");
        const buf = await scryptAsync(password, salt, 64);
        dataToUpdate.passwordHash = `${salt}:${buf.toString("hex")}`;
      }
      const validation = insertUserSchema.partial().omit({ organizationId: true }).safeParse(dataToUpdate);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }
      await storage.updateUser(req.params.id, validation.data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;
      const organizationId = currentUser?.organizationId;
      const currentUserId = currentUser?.id;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      if (req.params.id === currentUserId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.patch("/api/users/me/timezone", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const validation = insertUserSchema.partial().pick({ timezone: true }).safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }
      await storage.updateUser(currentUser.id, validation.data);
      res.json({ success: true, timezone: validation.data.timezone });
    } catch (error) {
      res.status(500).json({ error: "Failed to update timezone" });
    }
  });
}

// server/routes/students.ts
init_storage();
init_schema();
import { fromZodError as fromZodError2 } from "zod-validation-error";
function registerStudentRoutes(app2) {
  app2.get("/api/students", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset) : 0;
      const status = req.query.status;
      const startDate = req.query.startDate ? new Date(req.query.startDate) : void 0;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : void 0;
      const students2 = await storage.getStudents(
        organizationId,
        limit,
        offset,
        status,
        startDate,
        endDate
      );
      const count = await storage.getStudentCount(organizationId, status, startDate, endDate);
      res.json({ students: students2, count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });
  app2.get("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const student = await storage.getStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      if (student.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student" });
    }
  });
  app2.post("/api/students", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const validation = insertStudentSchema.safeParse({ ...req.body, organizationId });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError2(validation.error).toString() });
      }
      const student = await storage.createStudent(validation.data);
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to create student" });
    }
  });
  app2.patch("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const student = await storage.getStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      if (student.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const validation = insertStudentSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError2(validation.error).toString() });
      }
      await storage.updateStudent(req.params.id, validation.data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update student" });
    }
  });
  app2.delete("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const student = await storage.getStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      if (student.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await storage.deleteStudent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete student" });
    }
  });
}

// server/routes/classes.ts
init_storage();
init_schema();
import { fromZodError as fromZodError3 } from "zod-validation-error";
function registerClassRoutes(app2) {
  app2.get("/api/classes", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const classes2 = await storage.getClasses(organizationId);
      res.json(classes2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });
  app2.post("/api/classes", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const validation = insertClassSchema.safeParse({ ...req.body, organizationId });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError3(validation.error).toString() });
      }
      const classData = await storage.createClass(validation.data);
      res.json(classData);
    } catch (error) {
      res.status(500).json({ error: "Failed to create class" });
    }
  });
}

// server/routes/attendance.ts
init_storage();
init_schema();
import { fromZodError as fromZodError4 } from "zod-validation-error";
function registerAttendanceRoutes(app2) {
  app2.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : void 0;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : void 0;
      const attendance2 = await storage.getAttendance(organizationId, startDate, endDate);
      res.json(attendance2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });
  app2.post("/api/attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const validation = insertAttendanceSchema.safeParse({ ...req.body, organizationId });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError4(validation.error).toString() });
      }
      const attendance2 = await storage.createAttendance(validation.data);
      res.json(attendance2);
    } catch (error) {
      res.status(500).json({ error: "Failed to create attendance record" });
    }
  });
}

// server/routes/revenue.ts
init_storage();
init_schema();
import { fromZodError as fromZodError5 } from "zod-validation-error";
import multer from "multer";
import Papa from "papaparse";
var importProgressMap = /* @__PURE__ */ new Map();
function registerRevenueRoutes(app2) {
  app2.get("/api/revenue/check-integrity", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;
      const organizationId = currentUser?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const totalCount = await storage.getSalesCount(organizationId);
      if (totalCount === 0) {
        return res.json({
          totalRecords: 0,
          sampleSize: 0,
          analysis: {
            withBothIds: 0,
            withSaleIdOnly: 0,
            withItemIdOnly: 0,
            withoutIds: 0
          },
          conclusion: "safe",
          message: "No existing revenue data. API import will start fresh without any duplicates.",
          deduplicationInfo: "upsertRevenue deduplicates records with mindbodySaleId (with or without itemId). Records without saleId will create duplicates.",
          sampleRecords: []
        });
      }
      const sampleSize = Math.min(100, totalCount);
      const allRecords = await storage.getRevenue(organizationId, void 0, void 0);
      const sample = allRecords.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()).slice(0, sampleSize);
      const withBothIds = sample.filter((r) => r.mindbodySaleId && r.mindbodyItemId).length;
      const withSaleIdOnly = sample.filter((r) => r.mindbodySaleId && !r.mindbodyItemId).length;
      const withItemIdOnly = sample.filter((r) => !r.mindbodySaleId && r.mindbodyItemId).length;
      const withoutIds = sample.filter((r) => !r.mindbodySaleId && !r.mindbodyItemId).length;
      const totalCategorized = withBothIds + withSaleIdOnly + withItemIdOnly + withoutIds;
      if (totalCategorized !== sample.length) {
        console.error(`Revenue integrity check: categorization mismatch! ${totalCategorized} != ${sample.length}`);
      }
      const withDedupeCapability = withBothIds + withSaleIdOnly;
      const pctSafe = withDedupeCapability / sample.length;
      let conclusion;
      let message;
      if (pctSafe >= 0.95) {
        conclusion = "safe";
        message = `${Math.round(pctSafe * 100)}% of your revenue data has Mindbody Sale IDs. API import will update existing records instead of creating duplicates.`;
      } else if (pctSafe > 0) {
        conclusion = "mixed";
        const pctDuplicates = Math.round((1 - pctSafe) * 100);
        message = `Only ${Math.round(pctSafe * 100)}% of your revenue data has Mindbody Sale IDs. API import will update ${Math.round(pctSafe * 100)}% of records but create duplicates for ${pctDuplicates}% without Sale IDs. Recommended: Delete existing revenue data and re-import via API only.`;
      } else {
        conclusion = "duplicate_risk";
        message = "Your revenue data is missing Mindbody Sale IDs (likely from CSV import without ID columns). API import will create duplicate records for all transactions. Recommended: Delete all existing revenue data before importing via Mindbody API.";
      }
      res.json({
        totalRecords: totalCount,
        sampleSize: sample.length,
        analysis: {
          withBothIds,
          withSaleIdOnly,
          withItemIdOnly,
          withoutIds
        },
        conclusion,
        message,
        deduplicationInfo: "upsertRevenue deduplicates records with mindbodySaleId (with or without itemId). Records without saleId will create duplicates.",
        sampleRecords: sample.slice(0, 10).map((r) => ({
          id: r.id,
          date: r.transactionDate,
          amount: r.amount,
          description: r.description,
          hasSaleId: !!r.mindbodySaleId,
          hasItemId: !!r.mindbodyItemId
        }))
      });
    } catch (error) {
      console.error("Revenue integrity check error:", error);
      res.status(500).json({ error: "Failed to check revenue data integrity" });
    }
  });
  app2.get("/api/revenue/import-progress", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      console.log(`[Progress Check] Org ${organizationId}, map size: ${importProgressMap.size}, has progress: ${importProgressMap.has(organizationId)}`);
      const progress = importProgressMap.get(organizationId);
      if (!progress) {
        return res.status(404).json({ error: "No import in progress" });
      }
      const elapsed = (Date.now() - progress.startTime) / 1e3;
      const percentage = progress.total > 0 ? Math.round(progress.processed / progress.total * 100) : 0;
      res.json({
        ...progress,
        percentage,
        elapsed
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import progress" });
    }
  });
  app2.get("/api/revenue", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : void 0;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : void 0;
      const revenue2 = await storage.getRevenue(organizationId, startDate, endDate);
      res.json(revenue2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue" });
    }
  });
  app2.get("/api/revenue/stats", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : /* @__PURE__ */ new Date();
      const stats = await storage.getRevenueStats(organizationId, startDate, endDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue stats" });
    }
  });
  app2.post("/api/revenue", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const validation = insertRevenueSchema.safeParse({ ...req.body, organizationId });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError5(validation.error).toString() });
      }
      const revenue2 = await storage.createRevenue(validation.data);
      res.json(revenue2);
    } catch (error) {
      res.status(500).json({ error: "Failed to create revenue record" });
    }
  });
  const upload2 = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
    // 50MB limit for large CSV files
  });
  app2.post("/api/revenue/import-csv", requireAuth, upload2.single("file"), async (req, res) => {
    const organizationId = req.user?.organizationId;
    try {
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const validMimeTypes = ["text/csv", "application/csv", "text/plain"];
      const isValidExtension = req.file.originalname.toLowerCase().endsWith(".csv");
      if (!validMimeTypes.includes(req.file.mimetype) && !isValidExtension) {
        return res.status(400).json({
          error: "Invalid file type",
          details: "Please upload a CSV file"
        });
      }
      let csvText = req.file.buffer.toString("utf-8");
      if (csvText.charCodeAt(0) === 65279) {
        csvText = csvText.slice(1);
      }
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });
      if (parseResult.errors.length > 0) {
        return res.status(400).json({
          error: "CSV parsing failed",
          details: parseResult.errors
        });
      }
      if (parseResult.data.length === 0) {
        return res.status(400).json({
          error: "CSV file is empty",
          details: "No data rows found in CSV"
        });
      }
      const csvDataCompressed = Buffer.from(csvText).toString("base64");
      const importJob = await storage.createImportJob({
        organizationId,
        dataTypes: ["revenue"],
        startDate: /* @__PURE__ */ new Date("2000-01-01"),
        endDate: /* @__PURE__ */ new Date(),
        status: "pending",
        csvData: csvDataCompressed,
        progress: JSON.stringify({
          revenue: { current: 0, total: parseResult.data.length }
        })
      });
      console.log(`[CSV Import] Created background job ${importJob.id} for ${parseResult.data.length} rows`);
      processRevenueCSVBackground(importJob.id, organizationId, storage).catch((err) => {
        console.error("[CSV Import] Background processing error:", err);
      });
      res.json({
        success: true,
        jobId: importJob.id,
        totalRows: parseResult.data.length,
        message: "CSV import started in background. Check import history for progress."
      });
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ error: "Failed to import CSV", details: error.message });
    }
  });
  app2.get("/api/revenue/import-progress", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const progress = importProgressMap.get(organizationId);
      if (progress) {
        const elapsedSeconds2 = (Date.now() - progress.startTime) / 1e3;
        const rowsPerSecond2 = progress.processed > 0 ? progress.processed / elapsedSeconds2 : 0;
        const remainingRows2 = progress.total - progress.processed;
        const estimatedSecondsLeft2 = rowsPerSecond2 > 0 ? remainingRows2 / rowsPerSecond2 : 0;
        return res.json({
          status: "in_progress",
          total: progress.total,
          processed: progress.processed,
          imported: progress.imported,
          skipped: progress.skipped,
          elapsedSeconds: Math.floor(elapsedSeconds2),
          estimatedSecondsLeft: Math.floor(estimatedSecondsLeft2),
          rowsPerSecond: Math.floor(rowsPerSecond2)
        });
      }
      const runningJobs = await storage.getActiveImportJobs(organizationId);
      const revenueJob = runningJobs.find(
        (job) => job.dataTypes?.includes("revenue") && job.csvData
      );
      if (!revenueJob || !revenueJob.progress) {
        return res.json({ status: "idle" });
      }
      const jobProgress = typeof revenueJob.progress === "string" ? JSON.parse(revenueJob.progress) : revenueJob.progress;
      const revenueProgress = jobProgress.revenue || {};
      const current = revenueProgress.current || 0;
      const total = revenueProgress.total || 0;
      const startTime = revenueJob.startDate ? new Date(revenueJob.startDate).getTime() : Date.now();
      const elapsedSeconds = (Date.now() - startTime) / 1e3;
      const rowsPerSecond = current > 0 && elapsedSeconds > 0 ? current / elapsedSeconds : 0;
      const remainingRows = total - current;
      const estimatedSecondsLeft = rowsPerSecond > 0 ? remainingRows / rowsPerSecond : 0;
      return res.json({
        status: "in_progress",
        total,
        processed: current,
        imported: current,
        // Approximate - we don't track imported/skipped separately in DB
        skipped: 0,
        elapsedSeconds: Math.floor(elapsedSeconds),
        estimatedSecondsLeft: Math.floor(estimatedSecondsLeft),
        rowsPerSecond: Math.floor(rowsPerSecond)
      });
    } catch (error) {
      console.error("[Progress] Error fetching progress:", error);
      res.status(500).json({ error: "Failed to get import progress" });
    }
  });
}
async function processRevenueCSVBackground(jobId, organizationId, storage2) {
  const startTime = Date.now();
  console.log(`[CSV Background Worker] Starting job ${jobId} for org ${organizationId}`);
  try {
    await storage2.updateImportJob(jobId, { status: "running" });
    const job = await storage2.getImportJob(jobId);
    if (!job || !job.csvData) {
      throw new Error("Import job not found or CSV data missing");
    }
    const csvText = Buffer.from(job.csvData, "base64").toString("utf-8");
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });
    const rows = parseResult.data;
    console.log(`[CSV Background Worker] Processing ${rows.length} rows with student matching`);
    importProgressMap.set(organizationId, {
      total: rows.length,
      processed: 0,
      imported: 0,
      skipped: 0,
      startTime
    });
    let imported = 0;
    let skipped = 0;
    const errors = [];
    const STUDENT_BATCH_SIZE = 1e3;
    console.log(`[CSV Background Worker] Building student lookup map...`);
    const studentLookupByMindbodyId = /* @__PURE__ */ new Map();
    const studentLookupByEmail = /* @__PURE__ */ new Map();
    let studentOffset = 0;
    let hasMoreStudents = true;
    while (hasMoreStudents) {
      const studentBatch = await storage2.getStudents(organizationId, STUDENT_BATCH_SIZE, studentOffset);
      if (studentBatch.length === 0) {
        hasMoreStudents = false;
        break;
      }
      for (const student of studentBatch) {
        if (student.mindbodyClientId) {
          studentLookupByMindbodyId.set(student.mindbodyClientId, student.id);
        }
        if (student.email) {
          studentLookupByEmail.set(student.email.toLowerCase(), student.id);
        }
      }
      studentOffset += studentBatch.length;
      console.log(`[CSV Background Worker] Loaded ${studentOffset} students into lookup map`);
      if (studentBatch.length < STUDENT_BATCH_SIZE) {
        hasMoreStudents = false;
      }
    }
    console.log(`[CSV Background Worker] Student lookup complete: ${studentLookupByMindbodyId.size} by ID, ${studentLookupByEmail.size} by email`);
    for (let index2 = 0; index2 < rows.length; index2++) {
      const row = rows[index2];
      importProgressMap.set(organizationId, {
        total: rows.length,
        processed: index2 + 1,
        imported,
        skipped,
        startTime
      });
      if (index2 > 0 && index2 % 100 === 0) {
        await storage2.updateImportJob(jobId, {
          progress: JSON.stringify({
            revenue: { current: index2, total: rows.length }
          })
        });
      }
      if (index2 > 0 && index2 % 1e3 === 0) {
        const elapsed = ((Date.now() - startTime) / 1e3).toFixed(1);
        console.log(
          `[CSV Background Worker] Progress: ${index2}/${rows.length} (${elapsed}s, ${imported} imported, ${skipped} skipped)`
        );
      }
      try {
        const saleId = row["Sale ID"] || row["SaleId"] || row["ID"] || null;
        const itemId = row["Item ID"] || row["ItemId"] || null;
        const amountStr = row["Item Total"] || row["Amount"] || row["Total"] || row["Price"];
        if (!amountStr || amountStr.toString().trim() === "") {
          errors.push(`Row ${index2 + 1}: Missing amount`);
          skipped++;
          continue;
        }
        const cleanedAmount = amountStr.toString().replace(/[^0-9.-]/g, "");
        const amount = parseFloat(cleanedAmount);
        if (isNaN(amount)) {
          errors.push(`Row ${index2 + 1}: Invalid amount "${amountStr}"`);
          skipped++;
          continue;
        }
        const dateStr = row["Sale Date"] || row["Date"] || row["Transaction Date"] || row["SaleDate"];
        if (!dateStr) {
          errors.push(`Row ${index2 + 1}: Missing date`);
          skipped++;
          continue;
        }
        const transactionDate = new Date(dateStr);
        if (isNaN(transactionDate.getTime())) {
          errors.push(`Row ${index2 + 1}: Invalid date "${dateStr}"`);
          skipped++;
          continue;
        }
        let studentId = null;
        const clientId = row["Client ID"] || row["ClientId"] || row["ClientID"];
        const clientEmail = row["Email"] || row["Client Email"];
        if (clientId) {
          studentId = studentLookupByMindbodyId.get(clientId.toString()) || null;
        }
        if (!studentId && clientEmail) {
          studentId = studentLookupByEmail.get(clientEmail.toString().toLowerCase()) || null;
        }
        const type = row["Payment Method"] || row["Type"] || row["Category"] || "Sale";
        const description = row["Item name"] || row["Description"] || row["Item"] || row["Product"] || row["Service"] || "";
        await storage2.upsertRevenue({
          organizationId,
          studentId,
          mindbodySaleId: saleId,
          mindbodyItemId: itemId,
          amount: amount.toFixed(2),
          type,
          description,
          transactionDate
        });
        imported++;
      } catch (error) {
        errors.push(`Row ${index2 + 1}: ${error.message}`);
        skipped++;
      }
    }
    const totalTime = ((Date.now() - startTime) / 1e3).toFixed(1);
    console.log(
      `[CSV Background Worker] Completed: ${imported} imported, ${skipped} skipped, ${rows.length} total in ${totalTime}s`
    );
    await storage2.updateImportJob(jobId, {
      status: "completed",
      error: errors.length > 0 ? `${errors.length} rows had errors. First: ${errors[0]}` : null,
      progress: JSON.stringify({
        revenue: { current: rows.length, total: rows.length }
      })
    });
    importProgressMap.delete(organizationId);
  } catch (error) {
    console.error("[CSV Background Worker] Error:", error);
    await storage2.updateImportJob(jobId, {
      status: "failed",
      error: error.message
    });
    importProgressMap.delete(organizationId);
  }
}

// server/routes/mindbody.ts
init_storage();
init_mindbody();
function safeJsonParse2(value, fallback = {}) {
  if (value === null || value === void 0) {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function registerMindbodyRoutes(app2) {
  app2.get("/api/mindbody/auth-url", requireAuth, async (req, res) => {
    try {
      const siteId = req.query.siteId;
      if (!siteId) {
        return res.status(400).json({ error: "siteId is required" });
      }
      const clientId = process.env.MINDBODY_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: "MINDBODY_CLIENT_ID not configured" });
      }
      let redirectUri = "http://localhost:5000/api/mindbody/callback";
      if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(",");
        redirectUri = `https://${domains[0]}/api/mindbody/callback`;
      }
      const nonce = Math.random().toString(36).substring(7);
      const authUrl = `https://signin.mindbodyonline.com/connect/authorize?response_mode=form_post&response_type=code%20id_token&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email%20profile%20openid%20offline_access%20Mindbody.Api.Public.v6&nonce=${nonce}&subscriberId=${siteId}`;
      res.json({ authUrl });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate auth URL";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/mindbody/callback", async (req, res) => {
    try {
      const code = req.body.code;
      const idToken = req.body.id_token;
      if (!code) {
        console.error("Missing authorization code in callback");
        return res.redirect("/import?error=missing_code");
      }
      const user = req.user;
      if (!user?.organizationId) {
        console.error("User not authenticated in callback");
        return res.redirect("/login?error=unauthorized");
      }
      const org = await storage.getOrganization(user.organizationId);
      if (!org) {
        console.error("Organization not found in callback");
        return res.redirect("/import?error=org_not_found");
      }
      const mindbodyService2 = new MindbodyService();
      await mindbodyService2.exchangeCodeForTokens(code, user.organizationId);
      console.log("Mindbody OAuth successful for organization:", user.organizationId);
      res.redirect("/import?success=connected");
    } catch (error) {
      console.error("Mindbody OAuth callback error:", error);
      res.redirect("/import?error=connection_failed");
    }
  });
  app2.post("/api/mindbody/connect", requireAuth, async (req, res) => {
    try {
      const { code, siteId } = req.body;
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!code || !siteId) {
        return res.status(400).json({ error: "Code and siteId are required" });
      }
      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const mindbodyService2 = new MindbodyService();
      await mindbodyService2.exchangeCodeForTokens(code, organizationId);
      await storage.updateOrganizationSiteId(organizationId, siteId);
      res.json({ success: true, message: "Mindbody account connected successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect Mindbody account";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.get("/api/mindbody/import/active", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const activeJob = await storage.getActiveImportJob(organizationId);
      if (!activeJob) {
        return res.status(404).json({ error: "No active import job" });
      }
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.json({
        id: activeJob.id,
        status: activeJob.status,
        dataTypes: activeJob.dataTypes,
        startDate: activeJob.startDate,
        endDate: activeJob.endDate,
        progress: safeJsonParse2(activeJob.progress, {}),
        currentDataType: activeJob.currentDataType,
        currentOffset: activeJob.currentOffset,
        error: activeJob.error,
        createdAt: activeJob.createdAt,
        updatedAt: activeJob.updatedAt
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch active job";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.get("/api/mindbody/import/active-jobs", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const activeJobs = await storage.getActiveImportJobs(organizationId);
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.json(
        activeJobs.map((job) => ({
          id: job.id,
          status: job.status,
          dataTypes: job.dataTypes,
          startDate: job.startDate,
          endDate: job.endDate,
          progress: safeJsonParse2(job.progress, {}),
          currentDataType: job.currentDataType,
          error: job.error,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        }))
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch active jobs";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.get("/api/mindbody/import/history", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const limit = parseInt(req.query.limit) || 10;
      const jobs = await storage.getImportJobs(organizationId, limit);
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.json(
        jobs.map((job) => ({
          id: job.id,
          status: job.status,
          dataTypes: job.dataTypes,
          startDate: job.startDate,
          endDate: job.endDate,
          progress: safeJsonParse2(job.progress, {}),
          error: job.error,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        }))
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch import history";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/mindbody/import/start", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { config } = req.body;
      console.log("[Import Start] Request body:", JSON.stringify({ config }, null, 2));
      console.log("[Import Start] Raw startDate from frontend:", config?.startDate);
      console.log("[Import Start] Raw endDate from frontend:", config?.endDate);
      const activeJob = await storage.getActiveImportJob(organizationId);
      if (activeJob) {
        console.log("[Import Start] Active job found:", activeJob.id, activeJob.status);
        if (activeJob.status === "paused" || activeJob.status === "cancelled") {
          await storage.updateImportJob(activeJob.id, {
            status: "cancelled",
            error: activeJob.error || "Replaced by new import"
          });
        } else {
          console.log("[Import Start] Rejecting - active job in progress");
          return res.status(400).json({
            error: "An import is already in progress",
            jobId: activeJob.id
          });
        }
      }
      let startDate;
      let endDate;
      if (config?.startDate) {
        const [year, month, day] = config.startDate.split("-").map(Number);
        startDate = new Date(Date.UTC(year, month - 1, day));
        console.log("[Import Start] Parsed startDate:", startDate.toISOString(), "from:", config.startDate);
      } else {
        const defaultStart = /* @__PURE__ */ new Date();
        defaultStart.setFullYear(defaultStart.getFullYear() - 1);
        startDate = defaultStart;
      }
      if (config?.endDate) {
        const [year, month, day] = config.endDate.split("-").map(Number);
        endDate = new Date(Date.UTC(year, month - 1, day));
        console.log("[Import Start] Parsed endDate:", endDate.toISOString(), "from:", config.endDate);
      } else {
        endDate = /* @__PURE__ */ new Date();
      }
      const dataTypes = [];
      if (config?.dataTypes?.clients) dataTypes.push("clients");
      if (config?.dataTypes?.classes) dataTypes.push("classes");
      if (config?.dataTypes?.visits) dataTypes.push("visits");
      if (config?.dataTypes?.sales) dataTypes.push("sales");
      console.log("[Import Start] Parsed dataTypes:", dataTypes);
      if (dataTypes.length === 0) {
        console.log("[Import Start] Rejecting - no data types selected");
        return res.status(400).json({ error: "At least one data type must be selected" });
      }
      const job = await storage.createImportJob({
        organizationId,
        status: "pending",
        dataTypes,
        startDate,
        endDate,
        progress: JSON.stringify({}),
        currentDataType: null,
        currentOffset: 0,
        error: null
      });
      const { importWorker: importWorker2 } = await Promise.resolve().then(() => (init_import_worker(), import_worker_exports));
      importWorker2.processJob(job.id).catch((error) => {
        console.error(`Background job ${job.id} failed:`, error);
      });
      res.json({
        success: true,
        message: "Import job started",
        jobId: job.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start import";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.get("/api/mindbody/import/:id/status", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const jobId = req.params.id;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const job = await storage.getImportJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }
      if (job.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const existingCounts = {
        students: await storage.getStudentCount(organizationId),
        classes: await storage.getClassesCount(organizationId),
        visits: await storage.getAttendanceCount(organizationId),
        sales: await storage.getSalesCount(organizationId)
      };
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.json({
        id: job.id,
        status: job.status,
        dataTypes: job.dataTypes,
        startDate: job.startDate,
        endDate: job.endDate,
        progress: safeJsonParse2(job.progress, {}),
        existingCounts,
        currentDataType: job.currentDataType,
        currentOffset: job.currentOffset,
        error: job.error,
        pausedAt: job.pausedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get job status";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/mindbody/import/:id/resume", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const jobId = req.params.id;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const job = await storage.getImportJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }
      if (job.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (job.status !== "paused" && job.status !== "failed") {
        console.log(`Cannot resume job ${jobId}: current status is ${job.status}, expected paused or failed`);
        return res.status(400).json({
          error: `Cannot resume import: job is currently ${job.status}. Only paused or failed jobs can be resumed. ${job.status === "running" || job.status === "pending" ? "The import appears to already be running. Please refresh the page." : "Please check the import status and try again."}`,
          currentStatus: job.status
        });
      }
      await storage.updateImportJob(jobId, {
        status: "pending",
        pausedAt: null,
        error: null
      });
      const { importWorker: importWorker2 } = await Promise.resolve().then(() => (init_import_worker(), import_worker_exports));
      importWorker2.processJob(jobId).catch((error) => {
        console.error(`Background job ${jobId} failed:`, error);
      });
      res.json({
        success: true,
        message: "Import job resumed"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to resume import";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/mindbody/import/:id/cancel", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const jobId = req.params.id;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const job = await storage.getImportJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }
      if (job.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (job.status !== "pending" && job.status !== "running") {
        console.log(`Cannot pause job ${jobId}: status is ${job.status}, not pending or running`);
        return res.status(400).json({ error: "Job is not in a pausable state" });
      }
      console.log(`Pausing job ${jobId} (current status: ${job.status})`);
      await storage.updateImportJob(jobId, {
        status: "paused",
        pausedAt: /* @__PURE__ */ new Date(),
        error: "Paused by user"
      });
      console.log(`Job ${jobId} paused successfully`);
      res.json({
        success: true,
        message: "Import job paused"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel import";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/mindbody/import/force-cancel", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const activeJob = await storage.getActiveImportJob(organizationId);
      if (!activeJob) {
        return res.json({
          success: true,
          message: "No active import found"
        });
      }
      console.log(`Force cancelling job ${activeJob.id} (current status: ${activeJob.status})`);
      await storage.updateImportJob(activeJob.id, {
        status: "cancelled",
        error: "Force cancelled by user"
      });
      console.log(`Job ${activeJob.id} force cancelled successfully`);
      res.json({
        success: true,
        message: "Import job cancelled",
        jobId: activeJob.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to force cancel import";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.get("/api/mindbody/import/skipped-records", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const dataType = req.query.dataType;
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const [records, total] = await Promise.all([
        storage.getSkippedImportRecords(organizationId, dataType, limit),
        storage.getSkippedImportRecordsCount(organizationId, dataType)
      ]);
      res.json({
        records,
        total
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch skipped records";
      res.status(500).json({ error: errorMessage });
    }
  });
}

// server/routes/webhooks.ts
init_storage();
init_schema();
init_mindbody();
init_db();
function registerWebhookRoutes(app2) {
  app2.post("/api/webhooks/subscriptions", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { eventType } = req.body;
      if (!eventType) {
        return res.status(400).json({ error: "Event type is required" });
      }
      const org = await storage.getOrganization(organizationId);
      if (!org?.mindbodySiteId) {
        return res.status(400).json({
          error: "Mindbody integration not configured. Please complete a data import first to configure your Mindbody site ID."
        });
      }
      let webhookUrl = "http://localhost:5000/api/webhooks/mindbody";
      if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(",");
        webhookUrl = `https://${domains[0]}/api/webhooks/mindbody`;
      }
      const mindbodyService2 = new MindbodyService();
      const { subscriptionId, messageSignatureKey } = await mindbodyService2.createWebhookSubscription(organizationId, eventType, webhookUrl);
      const subscription = await storage.createWebhookSubscription({
        organizationId,
        eventType,
        webhookUrl,
        status: "active",
        mindbodySubscriptionId: subscriptionId,
        messageSignatureKey,
        eventSchemaVersion: 1
      });
      res.json(subscription);
    } catch (error) {
      console.error("Webhook subscription creation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create webhook subscription";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.get("/api/webhooks/subscriptions", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const subscriptions = await storage.getWebhookSubscriptions(organizationId);
      res.json(subscriptions);
    } catch {
      res.status(500).json({ error: "Failed to fetch webhook subscriptions" });
    }
  });
  app2.delete("/api/webhooks/subscriptions/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const subscription = await storage.getWebhookSubscription(req.params.id);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      if (subscription.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (subscription.mindbodySubscriptionId) {
        const mindbodyService2 = new MindbodyService();
        await mindbodyService2.deleteWebhookSubscription(
          organizationId,
          subscription.mindbodySubscriptionId
        );
      }
      await storage.deleteWebhookSubscription(req.params.id);
      res.json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete webhook subscription";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.get("/api/webhooks/events", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const events = await storage.getWebhookEvents(organizationId);
      res.json(events);
    } catch {
      res.status(500).json({ error: "Failed to fetch webhook events" });
    }
  });
  app2.head("/api/webhooks/mindbody", async (req, res) => {
    res.status(200).send();
  });
  app2.post("/api/webhooks/mindbody", async (req, res) => {
    try {
      const signature = req.headers["x-mindbody-signature"];
      const rawBody = req.rawBody?.toString() || "";
      const { messageId, eventType, siteId, classVisit } = req.body;
      if (!messageId) {
        return res.status(400).json({ error: "Missing messageId" });
      }
      const existingEvent = await storage.getWebhookEvent(messageId);
      if (existingEvent) {
        return res.status(200).json({ message: "Event already processed" });
      }
      const allSubs = await db.select().from(webhookSubscriptions);
      const subscription = allSubs.find((s) => s.eventType === eventType);
      if (!subscription) {
        console.log(`No subscription found for event type: ${eventType}`);
        return res.status(200).json({ message: "No subscription found" });
      }
      if (signature && subscription.messageSignatureKey) {
        const mindbodyService2 = new MindbodyService();
        const isValid = mindbodyService2.verifyWebhookSignature(
          rawBody,
          signature,
          subscription.messageSignatureKey
        );
        if (!isValid) {
          console.error("Invalid webhook signature");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }
      const event = await storage.createWebhookEvent({
        organizationId: subscription.organizationId,
        subscriptionId: subscription.id,
        messageId,
        eventType,
        eventData: JSON.stringify(req.body),
        processed: false
      });
      res.status(200).json({ message: "Event received" });
      try {
        if (eventType === "classVisit.created" || eventType === "classVisit.updated") {
          const students2 = await storage.getStudents(subscription.organizationId);
          const student = students2.find((s) => s.mindbodyClientId === classVisit?.clientId);
          if (student && classVisit?.classId && classVisit?.visitDateTime) {
            const schedules = await storage.getClassSchedules(subscription.organizationId);
            const schedule = schedules.find(
              (s) => s.mindbodyScheduleId === classVisit.classId.toString()
            );
            if (schedule) {
              await storage.createAttendance({
                organizationId: subscription.organizationId,
                studentId: student.id,
                scheduleId: schedule.id,
                attendedAt: new Date(classVisit.visitDateTime),
                status: classVisit.signedIn ? "attended" : "noshow"
              });
              await storage.updateWebhookEvent(event.id, {
                processed: true,
                processedAt: /* @__PURE__ */ new Date()
              });
            }
          }
        }
      } catch (processingError) {
        console.error("Error processing webhook:", processingError);
        await storage.updateWebhookEvent(event.id, {
          error: processingError instanceof Error ? processingError.message : "Processing failed"
        });
      }
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

// server/openai.ts
init_storage();
init_db();
import OpenAI from "openai";
import { sql as sql2 } from "drizzle-orm";
import * as XLSX from "xlsx";

// server/objectStorage.ts
import { Storage } from "@google-cloud/storage";
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
var objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token"
      }
    },
    universe_domain: "googleapis.com"
  },
  projectId: ""
});
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
var ObjectStorageService = class {
  constructor() {
  }
  getPrivateObjectDir() {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool."
      );
    }
    return dir;
  }
  parseObjectPath(path4) {
    if (!path4.startsWith("/")) {
      path4 = `/${path4}`;
    }
    const pathParts = path4.split("/");
    if (pathParts.length < 3) {
      throw new Error("Invalid path: must contain at least a bucket name");
    }
    const bucketName = pathParts[1];
    const objectName = pathParts.slice(2).join("/");
    return { bucketName, objectName };
  }
  async saveFile(filePath, buffer) {
    const { bucketName, objectName } = this.parseObjectPath(filePath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    await file.save(buffer, {
      resumable: false
    });
  }
  async getFile(filePath) {
    const { bucketName, objectName } = this.parseObjectPath(filePath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return file;
  }
  async downloadFile(filePath) {
    const file = await this.getFile(filePath);
    const [buffer] = await file.download();
    return buffer;
  }
  async deleteFile(filePath) {
    const file = await this.getFile(filePath);
    await file.delete();
  }
  async downloadObject(file, res, cacheTtlSec = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `private, max-age=${cacheTtlSec}`
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
};

// server/openai.ts
import { randomUUID } from "crypto";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});
var MAX_TOKENS_PER_QUERY = 2e3;
var MONTHLY_QUERY_LIMIT = 1e3;
var DATABASE_SCHEMA = `
DATABASE SCHEMA:

1. students - Student/client information
   - id (uuid), organization_id (uuid), mindbody_client_id, first_name, last_name
   - email, phone, status, membership_type, join_date, created_at

2. classes - Class types offered
   - id (uuid), organization_id (uuid), mindbody_class_id, name, description
   - instructor_name, capacity, duration, created_at

3. class_schedules - Individual class sessions
   - id (uuid), organization_id (uuid), class_id (uuid, FK to classes)
   - mindbody_schedule_id, start_time, end_time, location, created_at

4. attendance - Student attendance records
   - id (uuid), organization_id (uuid), student_id (uuid, FK to students)
   - schedule_id (uuid, FK to class_schedules), attended_at, status, created_at

5. revenue - Financial transactions
   - id (uuid), organization_id (uuid), student_id (uuid, FK to students)
   - amount (decimal), type, description, transaction_date, created_at

IMPORTANT: All queries must include "WHERE organization_id = $1" for data isolation.
Use JOINs to combine tables. Aggregate functions (COUNT, SUM, AVG) are available.
Use PostgreSQL functions like EXTRACT(YEAR FROM date), TO_CHAR(), etc.
`;
var QUERY_TOOLS = [
  {
    type: "function",
    function: {
      name: "execute_sql_query",
      description: "Execute a custom SQL query to retrieve data from the database. You can query students, classes, class_schedules, attendance, and revenue tables. Always include WHERE organization_id = $1 for security.",
      parameters: {
        type: "object",
        properties: {
          sql_query: {
            type: "string",
            description: "The SQL SELECT query to execute. Must be a read-only SELECT statement. Use $1 for organization_id parameter. Example: SELECT COUNT(*) FROM class_schedules WHERE organization_id = $1 AND EXTRACT(YEAR FROM start_time) = 2025"
          },
          explanation: {
            type: "string",
            description: "Brief explanation of what this query does (for logging/debugging)"
          }
        },
        required: ["sql_query", "explanation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_excel_spreadsheet",
      description: "Create an Excel spreadsheet file (.xlsx) from structured data. Use this when the user asks to export data, create a spreadsheet, or download results as Excel. The data should be formatted as an array of objects where each object represents a row.",
      parameters: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "The filename for the Excel file (without extension). Example: 'student_roster' or 'revenue_report_2025'"
          },
          sheet_name: {
            type: "string",
            description: "The name of the worksheet/sheet. Example: 'Students' or 'Revenue Data'"
          },
          data: {
            type: "array",
            description: "Array of objects where each object represents a row. All objects should have the same keys which become column headers. Example: [{name: 'Alice', age: 25}, {name: 'Bob', age: 30}]",
            items: {
              type: "object"
            }
          },
          description: {
            type: "string",
            description: "Brief description of what this spreadsheet contains (for the user)"
          }
        },
        required: ["filename", "sheet_name", "data", "description"]
      }
    }
  }
];
var OpenAIService = class {
  // Execute database query functions called by AI
  async executeFunctionCall(functionName, args, organizationId, userId) {
    try {
      if (functionName === "execute_sql_query") {
        const { sql_query, explanation } = args;
        const trimmedQuery = sql_query.trim().toUpperCase();
        if (!trimmedQuery.startsWith("SELECT")) {
          return JSON.stringify({
            error: "Only SELECT queries are allowed for security reasons"
          });
        }
        const dangerousKeywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "TRUNCATE"];
        for (const keyword of dangerousKeywords) {
          if (trimmedQuery.includes(keyword)) {
            return JSON.stringify({
              error: `Query contains forbidden keyword: ${keyword}`
            });
          }
        }
        if (!sql_query.includes("$1") && !sql_query.toLowerCase().includes("organization_id")) {
          return JSON.stringify({
            error: "Query must include organization_id filter using $1 parameter"
          });
        }
        console.log(`[AI Query] Executing: ${explanation}`);
        console.log(`[AI Query] SQL: ${sql_query}`);
        const finalQuery = sql_query.replace(/\$1/g, `'${organizationId.replace(/'/g, "''")}'`);
        const result = await db.execute(sql2.raw(finalQuery));
        console.log(`[AI Query] Result rows: ${result.rows.length}`);
        return JSON.stringify({
          success: true,
          explanation,
          row_count: result.rows.length,
          data: result.rows.slice(0, 100)
          // Limit to 100 rows for response size
        });
      }
      if (functionName === "create_excel_spreadsheet") {
        const { filename, sheet_name, data, description } = args;
        console.log(`[AI Excel] Creating spreadsheet: ${filename}`);
        console.log(`[AI Excel] Data type:`, typeof data);
        console.log(`[AI Excel] Data:`, JSON.stringify(data).substring(0, 200));
        if (!data || !Array.isArray(data)) {
          return JSON.stringify({
            error: "Data must be a non-empty array",
            received_type: typeof data
          });
        }
        if (data.length === 0) {
          return JSON.stringify({
            error: "Data array cannot be empty"
          });
        }
        console.log(`[AI Excel] Rows: ${data.length}`);
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet_name);
        const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        const objectStorage = new ObjectStorageService();
        const privateDir = objectStorage.getPrivateObjectDir();
        const fileId = randomUUID();
        const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
        const fullFilename = `${fileId}-${safeFilename}.xlsx`;
        const storagePath = `${privateDir}/excel/${fullFilename}`;
        await objectStorage.saveFile(storagePath, excelBuffer);
        await storage.createAiGeneratedFile({
          organizationId,
          userId,
          filename: fullFilename,
          originalFilename: `${safeFilename}.xlsx`,
          storagePath,
          fileType: "excel"
        });
        const downloadUrl = `/api/files/download/${fullFilename}`;
        console.log(`[AI Excel] Saved to: ${storagePath}`);
        console.log(`[AI Excel] Download URL: ${downloadUrl}`);
        console.log(`[AI Excel] Metadata saved for org ${organizationId}, user ${userId}`);
        return JSON.stringify({
          success: true,
          description,
          filename: `${safeFilename}.xlsx`,
          download_url: downloadUrl,
          row_count: data.length,
          message: `Excel file "${safeFilename}.xlsx" created successfully with ${data.length} rows.`
        });
      }
      return JSON.stringify({
        error: `Unknown function: ${functionName}`
      });
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
      return JSON.stringify({
        error: `Failed to execute ${functionName}: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
  }
  async generateInsight(organizationId, userId, query, conversationHistory = [], fileContext = "") {
    const recentQueries = await storage.getAIQueries(organizationId, 100);
    const thisMonthQueries = recentQueries.filter((q) => {
      const queryDate = new Date(q.createdAt);
      const now = /* @__PURE__ */ new Date();
      return queryDate.getMonth() === now.getMonth() && queryDate.getFullYear() === now.getFullYear();
    });
    if (thisMonthQueries.length >= MONTHLY_QUERY_LIMIT) {
      throw new Error(
        `Monthly query limit of ${MONTHLY_QUERY_LIMIT} reached. Please upgrade your plan.`
      );
    }
    const messages = [
      {
        role: "system",
        content: `You are an AI assistant for analyzing Mindbody studio data. You have access to a SQL database query tool.

${DATABASE_SCHEMA}

INSTRUCTIONS:
- For ANY question about the data, use the execute_sql_query tool to write and run a SQL SELECT query
- Always include "WHERE organization_id = $1" in your queries for data isolation
- Be creative with SQL - you can use JOINs, aggregations, subqueries, date functions, etc.
- After getting results, analyze them and provide clear, actionable insights
- When users ask follow-up questions, refer to conversation history for context
- When users ask to create a spreadsheet, export to Excel, or download data, use the create_excel_spreadsheet tool
- You can combine both tools: first query data with execute_sql_query, then create a spreadsheet with the results
${fileContext ? `- The user has uploaded files. Use their content to answer questions or cross-reference with database data` : ""}

EXAMPLES:
- "How many classes in 2025?" \u2192 SELECT COUNT(*) FROM class_schedules WHERE organization_id = $1 AND EXTRACT(YEAR FROM start_time) = 2025
- "Top 10 students by attendance?" \u2192 SELECT s.first_name, s.last_name, COUNT(*) as classes FROM attendance a JOIN students s ON a.student_id = s.id WHERE a.organization_id = $1 AND a.status = 'attended' GROUP BY s.id, s.first_name, s.last_name ORDER BY classes DESC LIMIT 10
- "Revenue this month?" \u2192 SELECT SUM(amount) FROM revenue WHERE organization_id = $1 AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)

You can answer ANY question about the data - just write the appropriate SQL query!${fileContext ? `

UPLOADED FILE DATA:
${fileContext}` : ""}`
      }
    ];
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }
    messages.push({
      role: "user",
      content: query
    });
    let totalTokensUsed = 0;
    let finalResponse = "";
    let iterationCount = 0;
    const maxIterations = 5;
    const downloadLinks = [];
    while (iterationCount < maxIterations) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: QUERY_TOOLS,
        tool_choice: "auto",
        max_tokens: MAX_TOKENS_PER_QUERY,
        temperature: 0.7
      });
      totalTokensUsed += completion.usage?.total_tokens || 0;
      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error("No response from AI");
      }
      messages.push(message);
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") continue;
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          const result = await this.executeFunctionCall(
            functionName,
            functionArgs,
            organizationId,
            userId
          );
          if (functionName === "create_excel_spreadsheet") {
            try {
              const resultData = JSON.parse(result);
              if (resultData.success && resultData.download_url) {
                downloadLinks.push({
                  filename: resultData.filename,
                  url: resultData.download_url
                });
              }
            } catch (e) {
              console.error("Failed to parse Excel creation result:", e);
            }
          }
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result
          });
        }
        iterationCount++;
        continue;
      }
      finalResponse = message.content || "No response generated";
      break;
    }
    if (downloadLinks.length > 0) {
      finalResponse += "\n\n";
      downloadLinks.forEach((link) => {
        finalResponse += `[Download: ${link.filename}](${link.url})
`;
      });
    }
    await storage.createAIQuery({
      organizationId,
      userId,
      query,
      response: finalResponse,
      tokensUsed: totalTokensUsed
    });
    return {
      response: finalResponse,
      tokensUsed: totalTokensUsed
    };
  }
};
var openaiService = new OpenAIService();

// server/routes/ai.ts
init_storage();
function registerAIRoutes(app2) {
  app2.post("/api/ai/query", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { query, conversationHistory, fileIds, conversationId, saveToHistory } = req.body;
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ error: "Query is required" });
      }
      if (query.length > 500) {
        return res.status(400).json({ error: "Query too long (max 500 characters)" });
      }
      let activeConversation = null;
      if (conversationId && typeof conversationId === "string") {
        activeConversation = await storage.getConversation(conversationId);
        if (activeConversation) {
          if (activeConversation.organizationId !== organizationId || activeConversation.userId !== userId) {
            return res.status(403).json({ error: "Access denied to conversation" });
          }
        } else {
          return res.status(404).json({ error: "Conversation not found" });
        }
      }
      const history = [];
      if (Array.isArray(conversationHistory)) {
        if (conversationHistory.length > 20) {
          return res.status(400).json({ error: "Conversation history too long (max 20 messages)" });
        }
        for (const entry of conversationHistory) {
          if (typeof entry !== "object" || entry === null) {
            return res.status(400).json({ error: "Invalid conversation history format" });
          }
          const { role, content } = entry;
          if (role !== "user" && role !== "assistant") {
            return res.status(400).json({ error: "Invalid role in conversation history. Only 'user' and 'assistant' are allowed." });
          }
          if (typeof content !== "string" || content.trim().length === 0) {
            return res.status(400).json({ error: "Invalid content in conversation history" });
          }
          if (content.length > 2e3) {
            return res.status(400).json({ error: "Conversation history message too long (max 2000 characters per message)" });
          }
          history.push({ role, content: content.trim() });
        }
      }
      let fileContext = "";
      if (Array.isArray(fileIds) && fileIds.length > 0) {
        for (const fileId of fileIds) {
          if (typeof fileId !== "string") continue;
          const file = await storage.getUploadedFile(fileId);
          if (!file || file.organizationId !== organizationId || file.userId !== userId) {
            continue;
          }
          if (file.extractedText) {
            fileContext += `

--- File: ${file.originalName} ---
${file.extractedText}
`;
          }
        }
      }
      const result = await openaiService.generateInsight(organizationId, userId, query, history, fileContext);
      let savedConversationId;
      if (saveToHistory !== false) {
        try {
          if (!activeConversation) {
            const title = query.trim().substring(0, 50) + (query.length > 50 ? "..." : "");
            activeConversation = await storage.createConversation({
              organizationId,
              userId,
              title
            });
          }
          await storage.createConversationMessage({
            conversationId: activeConversation.id,
            role: "user",
            content: query.trim()
          });
          await storage.createConversationMessage({
            conversationId: activeConversation.id,
            role: "assistant",
            content: result.response
          });
          await storage.updateConversation(activeConversation.id, {});
          savedConversationId = activeConversation.id;
        } catch (saveError) {
          console.error("Error saving to conversation:", saveError);
        }
      }
      res.json({
        ...result,
        ...savedConversationId && { conversationId: savedConversationId }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate AI insight";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.get("/api/ai/usage", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      res.json({
        queriesThisMonth: 0,
        tokensThisMonth: 0,
        queryLimit: 1e3
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });
}

// server/routes/dashboard.ts
init_storage();
function subtractPeriod(date, months) {
  const targetYear = date.getUTCFullYear();
  const targetMonth = date.getUTCMonth() - months;
  const targetDay = date.getUTCDate();
  const candidate = new Date(Date.UTC(targetYear, targetMonth, 1));
  const lastDayOfMonth = new Date(Date.UTC(
    candidate.getUTCFullYear(),
    candidate.getUTCMonth() + 1,
    0
  )).getUTCDate();
  const clampedDay = Math.min(targetDay, lastDayOfMonth);
  return new Date(Date.UTC(
    candidate.getUTCFullYear(),
    candidate.getUTCMonth(),
    clampedDay
  ));
}
function registerDashboardRoutes(app2) {
  app2.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const now = /* @__PURE__ */ new Date();
      const defaultStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const defaultEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      let startDate;
      let endDate;
      if (req.query.startDate) {
        const dateStr = req.query.startDate;
        const parsed = new Date(dateStr);
        startDate = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
      } else {
        startDate = defaultStart;
      }
      if (req.query.endDate) {
        const dateStr = req.query.endDate;
        const parsed = new Date(dateStr);
        endDate = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
      } else {
        endDate = defaultEnd;
      }
      if (endDate < startDate) {
        [startDate, endDate] = [endDate, startDate];
      }
      const isYearToDate = startDate.getUTCMonth() === 0 && startDate.getUTCDate() === 1;
      let prevStartDate;
      let prevEndDate;
      if (isYearToDate) {
        prevStartDate = subtractPeriod(startDate, 12);
        prevEndDate = subtractPeriod(endDate, 12);
      } else {
        prevStartDate = subtractPeriod(startDate, 1);
        prevEndDate = subtractPeriod(endDate, 1);
      }
      const [
        totalStudentCount,
        activeStudentCount,
        currentPeriodRevenue,
        previousPeriodRevenue,
        attendanceRecords,
        previousAttendanceRecords,
        classes2
      ] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getActiveStudentCount(organizationId),
        storage.getRevenueStats(organizationId, startDate, endDate),
        storage.getRevenueStats(organizationId, prevStartDate, prevEndDate),
        storage.getAttendance(organizationId, startDate, endDate),
        storage.getAttendance(organizationId, prevStartDate, prevEndDate),
        storage.getClasses(organizationId)
      ]);
      const attendanceRate = attendanceRecords.length > 0 ? attendanceRecords.filter((a) => a.status === "attended").length / attendanceRecords.length * 100 : 0;
      const previousAttendanceRate = previousAttendanceRecords.length > 0 ? previousAttendanceRecords.filter((a) => a.status === "attended").length / previousAttendanceRecords.length * 100 : 0;
      const revenueChange = previousPeriodRevenue.total > 0 ? (currentPeriodRevenue.total - previousPeriodRevenue.total) / previousPeriodRevenue.total * 100 : 0;
      const attendanceChange = previousAttendanceRate > 0 ? attendanceRate - previousAttendanceRate : 0;
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      console.log(`[Dashboard Stats] Attendance records count: ${attendanceRecords.length}`);
      res.json({
        totalRevenue: currentPeriodRevenue.total,
        revenueChange: revenueChange.toFixed(1),
        activeStudents: activeStudentCount,
        totalStudents: totalStudentCount,
        studentChange: "+12.5",
        attendanceRate: attendanceRate.toFixed(1),
        attendanceChange: attendanceChange.toFixed(1),
        totalAttendanceRecords: attendanceRecords.length,
        classesThisMonth: classes2.length,
        classChange: "+8.2",
        _timestamp: Date.now()
        // Cache-busting timestamp
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });
  app2.get("/api/dashboard/revenue-trend", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      let startDate;
      let endDate;
      if (req.query.startDate) {
        const dateStr = req.query.startDate;
        startDate = new Date(dateStr);
        startDate = new Date(
          Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
        );
      }
      if (req.query.endDate) {
        const dateStr = req.query.endDate;
        endDate = new Date(dateStr);
        endDate = new Date(
          Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
        );
      }
      const data = await storage.getMonthlyRevenueTrend(organizationId, startDate, endDate);
      console.log(`[Revenue Trend] Returning ${data.length} data points for ${startDate?.toISOString()} to ${endDate?.toISOString()}`);
      console.log(`[Revenue Trend] First 5 data points:`, JSON.stringify(data.slice(0, 5), null, 2));
      console.log(`[Revenue Trend] Last 5 data points:`, JSON.stringify(data.slice(-5), null, 2));
      console.log(`[Revenue Trend] Data points with revenue > 0:`, data.filter((d) => d.revenue > 0).length);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue trend" });
    }
  });
  app2.get("/api/dashboard/attendance-by-time", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : void 0;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : void 0;
      const data = await storage.getAttendanceByTimeSlot(organizationId, startDate, endDate);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance by time" });
    }
  });
}

// server/routes/reports.ts
init_storage();
function setEndOfDay(date) {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}
function registerReportRoutes(app2) {
  app2.post("/api/reports/fix-orphaned-attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const totalAttendance = await storage.getAttendanceCount(organizationId);
      const orphanedAttendance = await storage.getOrphanedAttendanceCount(organizationId);
      await storage.deleteAllAttendance(organizationId);
      res.json({
        success: true,
        message: "All attendance records deleted. You can now re-import from Mindbody to rebuild with correct student links.",
        deleted: {
          totalRecords: totalAttendance,
          orphanedRecords: orphanedAttendance,
          orphanedPercentage: totalAttendance > 0 ? (orphanedAttendance / totalAttendance * 100).toFixed(2) + "%" : "0%"
        },
        nextStep: "Go to Data Import page and import Visits/Attendance data"
      });
    } catch (error) {
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });
  app2.get("/api/reports/diagnostic", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = /* @__PURE__ */ new Date("2024-12-31");
      const endDate = /* @__PURE__ */ new Date("2025-01-01");
      const attendanceData = await storage.getAttendanceWithDetails(organizationId, startDate, endDate);
      const totalStudents = await storage.getStudentCount(organizationId);
      const totalAttendance = await storage.getAttendanceCount(organizationId);
      const orphanedAttendance = await storage.getOrphanedAttendanceCount(organizationId);
      const diagnostic = {
        databaseCounts: {
          totalStudents,
          totalAttendance,
          orphanedAttendance,
          orphanedPercentage: totalAttendance > 0 ? (orphanedAttendance / totalAttendance * 100).toFixed(2) + "%" : "0%"
        },
        attendanceQuery: {
          databaseQuery: "getAttendanceWithDetails with LEFT JOIN",
          dateRange: "2024-12-31 to 2025-01-01",
          totalRecords: attendanceData.length,
          recordsWithNames: attendanceData.filter((a) => a.studentFirstName && a.studentLastName).length,
          recordsWithoutNames: attendanceData.filter((a) => !a.studentFirstName || !a.studentLastName).length,
          sampleRecordsWithNames: attendanceData.filter((a) => a.studentFirstName && a.studentLastName).slice(0, 5).map((a) => ({
            firstName: a.studentFirstName,
            lastName: a.studentLastName,
            className: a.className,
            date: a.attendedAt.toISOString()
          })),
          sampleRecordsWithoutNames: attendanceData.filter((a) => !a.studentFirstName || !a.studentLastName).slice(0, 5).map((a) => ({
            firstName: a.studentFirstName,
            lastName: a.studentLastName,
            className: a.className,
            date: a.attendedAt.toISOString()
          }))
        }
      };
      res.json(diagnostic);
    } catch (error) {
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });
  app2.get("/api/reports/revenue", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      let startDate;
      let endDate;
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ error: "Invalid startDate format" });
        }
      }
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ error: "Invalid endDate format" });
        }
        endDate = setEndOfDay(endDate);
      }
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }
      const revenueData = await storage.getRevenue(organizationId, startDate, endDate);
      const csv = [
        "Date,Description,Amount,Type",
        ...revenueData.map(
          (r) => `${r.transactionDate.toISOString().split("T")[0]},"${r.description || "N/A"}",${r.amount},"${r.type}"`
        )
      ].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="revenue-report-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv"`
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate revenue report" });
    }
  });
  app2.get("/api/reports/attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      let startDate;
      let endDate;
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ error: "Invalid startDate format" });
        }
      }
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ error: "Invalid endDate format" });
        }
        endDate = setEndOfDay(endDate);
      }
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }
      const attendanceData = await storage.getAttendanceWithDetails(organizationId, startDate, endDate);
      console.log("[ATTENDANCE REPORT DEBUG]", {
        totalRecords: attendanceData.length,
        sampleRecords: attendanceData.slice(0, 5).map((a) => ({
          firstName: a.studentFirstName,
          lastName: a.studentLastName,
          className: a.className,
          date: a.attendedAt
        })),
        nullNameCount: attendanceData.filter((a) => !a.studentFirstName || !a.studentLastName).length,
        hasNameCount: attendanceData.filter((a) => a.studentFirstName && a.studentLastName).length
      });
      const csv = [
        "Date,Student,Class,Status",
        ...attendanceData.map((a) => {
          const studentName = a.studentFirstName && a.studentLastName ? `${a.studentFirstName} ${a.studentLastName}` : "Unknown";
          const className = a.className || "Unknown";
          return `${a.attendedAt.toISOString().split("T")[0]},"${studentName}","${className}","${a.status}"`;
        })
      ].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="attendance-report-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv"`
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate attendance report" });
    }
  });
  app2.get("/api/reports/class-performance", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      let startDate;
      let endDate;
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ error: "Invalid startDate format" });
        }
      }
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ error: "Invalid endDate format" });
        }
        endDate = setEndOfDay(endDate);
      }
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }
      const classes2 = await storage.getClasses(organizationId);
      const attendanceData = await storage.getAttendance(organizationId, startDate, endDate);
      const schedules = await storage.getClassSchedules(organizationId);
      const scheduleToClassMap = /* @__PURE__ */ new Map();
      schedules.forEach((sch) => scheduleToClassMap.set(sch.id, sch.classId));
      const classStats = classes2.map((c) => {
        const classAttendance = attendanceData.filter((a) => {
          const classId = scheduleToClassMap.get(a.scheduleId);
          return classId === c.id;
        });
        const attended = classAttendance.filter((a) => a.status === "attended").length;
        const noShow = classAttendance.filter((a) => a.status === "no-show").length;
        const totalSessions = classAttendance.length;
        const attendanceRate = totalSessions > 0 ? (attended / totalSessions * 100).toFixed(1) : "0";
        return {
          name: c.name,
          instructor: c.instructorName || "N/A",
          capacity: c.capacity || 0,
          totalSessions,
          attended,
          noShow,
          attendanceRate
        };
      });
      const csv = [
        "Class Name,Instructor,Capacity,Total Sessions,Attended,No-Show,Attendance Rate %",
        ...classStats.map(
          (s) => `"${s.name}","${s.instructor}",${s.capacity},${s.totalSessions},${s.attended},${s.noShow},${s.attendanceRate}`
        )
      ].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="class-performance-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv"`
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate class performance report" });
    }
  });
  app2.get("/api/reports/monthly-summary", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      let startDate;
      let endDate;
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ error: "Invalid startDate format" });
        }
      }
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ error: "Invalid endDate format" });
        }
      }
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }
      const now = /* @__PURE__ */ new Date();
      const periodStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
      let periodEnd = endDate || now;
      periodEnd = setEndOfDay(periodEnd);
      const [studentCount, revenueStats, attendanceRecords, classes2] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getRevenueStats(organizationId, periodStart, periodEnd),
        storage.getAttendance(organizationId, periodStart, periodEnd),
        storage.getClasses(organizationId)
      ]);
      const attendedCount = attendanceRecords.filter((a) => a.status === "attended").length;
      const noShowCount = attendanceRecords.filter((a) => a.status === "no-show").length;
      const attendanceRate = attendanceRecords.length > 0 ? (attendedCount / attendanceRecords.length * 100).toFixed(1) : "0";
      const periodName = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
      const csv = [
        "Metric,Value",
        `"Period","${periodName}"`,
        `"Total Students","${studentCount}"`,
        `"Total Classes","${classes2.length}"`,
        `"Total Revenue","$${revenueStats.total.toFixed(2)}"`,
        `"Revenue Transactions","${revenueStats.count}"`,
        `"Total Attendance Records","${attendanceRecords.length}"`,
        `"Attended Sessions","${attendedCount}"`,
        `"No-Show Sessions","${noShowCount}"`,
        `"Attendance Rate","${attendanceRate}%"`
      ].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="monthly-summary-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv"`
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate monthly summary" });
    }
  });
  app2.get("/api/reports/data-coverage", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const [studentCount, classes2, schedules, attendance2, revenue2, orphanedCount, studentsWithoutAttendance, classesWithoutSchedules] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getClasses(organizationId),
        storage.getClassSchedules(organizationId),
        storage.getAttendance(organizationId),
        storage.getRevenue(organizationId),
        storage.getOrphanedAttendanceCount(organizationId),
        storage.getStudentsWithoutAttendanceCount(organizationId),
        storage.getClassesWithoutSchedulesCount(organizationId)
      ]);
      const getDateRange = (records) => {
        if (records.length === 0) return { earliest: null, latest: null };
        const earliest = records.reduce((min, r) => r.createdAt < min ? r.createdAt : min, records[0].createdAt);
        const latest = records.reduce((max, r) => r.createdAt > max ? r.createdAt : max, records[0].createdAt);
        return { earliest, latest };
      };
      const attendanceDateRange = attendance2.length > 0 ? {
        earliest: attendance2.reduce((min, a) => a.attendedAt < min ? a.attendedAt : min, attendance2[0].attendedAt),
        latest: attendance2.reduce((max, a) => a.attendedAt > max ? a.attendedAt : max, attendance2[0].attendedAt)
      } : { earliest: null, latest: null };
      const revenueDateRange = revenue2.length > 0 ? {
        earliest: revenue2.reduce((min, r) => r.transactionDate < min ? r.transactionDate : min, revenue2[0].transactionDate),
        latest: revenue2.reduce((max, r) => r.transactionDate > max ? r.transactionDate : max, revenue2[0].transactionDate)
      } : { earliest: null, latest: null };
      const attendanceByMonth = /* @__PURE__ */ new Map();
      attendance2.forEach((a) => {
        const monthKey = a.attendedAt.toISOString().substring(0, 7);
        attendanceByMonth.set(monthKey, (attendanceByMonth.get(monthKey) || 0) + 1);
      });
      const revenueByMonth = /* @__PURE__ */ new Map();
      revenue2.forEach((r) => {
        const monthKey = r.transactionDate.toISOString().substring(0, 7);
        revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + 1);
      });
      res.json({
        summary: {
          students: {
            total: studentCount,
            dateRange: { earliest: null, latest: null }
          },
          classes: {
            total: classes2.length,
            dateRange: getDateRange(classes2)
          },
          schedules: {
            total: schedules.length,
            dateRange: getDateRange(schedules)
          },
          attendance: {
            total: attendance2.length,
            attended: attendance2.filter((a) => a.status === "attended").length,
            noShow: attendance2.filter((a) => a.status === "no-show").length,
            orphaned: orphanedCount,
            dateRange: attendanceDateRange
          },
          revenue: {
            total: revenue2.length,
            totalAmount: revenue2.reduce((sum, r) => sum + parseFloat(r.amount), 0),
            dateRange: revenueDateRange
          }
        },
        monthlyBreakdown: {
          attendance: Array.from(attendanceByMonth.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count })),
          revenue: Array.from(revenueByMonth.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }))
        },
        dataQuality: {
          orphanedAttendanceRecords: orphanedCount,
          studentsWithoutAttendance,
          classesWithoutSchedules
        }
      });
    } catch (error) {
      console.error("Data coverage report error:", error);
      res.status(500).json({ error: "Failed to generate data coverage report" });
    }
  });
  app2.get("/api/reports/quick-stats", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const [
        studentCount,
        classCount,
        attendanceRecords,
        revenueStats
      ] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getClasses(organizationId),
        storage.getAttendance(organizationId),
        storage.getRevenue(organizationId)
      ]);
      const latestAttendance = attendanceRecords.length > 0 ? new Date(attendanceRecords.reduce((max, a) => {
        const time = a.createdAt.getTime();
        return time > max ? time : max;
      }, 0)) : null;
      const latestRevenue = revenueStats.length > 0 ? new Date(revenueStats.reduce((max, r) => {
        const time = r.createdAt.getTime();
        return time > max ? time : max;
      }, 0)) : null;
      res.json({
        totalStudents: studentCount,
        totalClasses: classCount.length,
        totalAttendance: attendanceRecords.length,
        totalRevenue: revenueStats.reduce((sum, r) => sum + parseFloat(r.amount), 0),
        revenueTransactions: revenueStats.length,
        latestImports: {
          attendance: latestAttendance,
          revenue: latestRevenue
        }
      });
    } catch (error) {
      console.error("Quick stats error:", error);
      res.status(500).json({ error: "Failed to fetch quick stats" });
    }
  });
}

// server/routes/scheduled-imports.ts
init_storage();
function registerScheduledImportRoutes(app2) {
  app2.get("/api/scheduled-imports", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const scheduledImport = await storage.getScheduledImport(organizationId);
      if (!scheduledImport) {
        return res.json({
          enabled: false,
          schedule: "0 2 * * *",
          dataTypes: "students,classes,visits,sales",
          daysToImport: 7,
          lastRunAt: null,
          lastRunStatus: null,
          lastRunError: null
        });
      }
      res.json(scheduledImport);
    } catch (error) {
      console.error("Error fetching scheduled import:", error);
      res.status(500).json({ error: "Failed to fetch scheduled import configuration" });
    }
  });
  app2.post("/api/scheduled-imports", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { enabled, schedule, dataTypes, daysToImport } = req.body;
      if (enabled && !dataTypes) {
        return res.status(400).json({ error: "Data types are required when enabling scheduled imports" });
      }
      const scheduledImport = await storage.upsertScheduledImport({
        organizationId,
        enabled: enabled ?? false,
        schedule: schedule || "0 2 * * *",
        dataTypes: dataTypes || "students,classes,visits,sales",
        daysToImport: daysToImport || 7
      });
      res.json(scheduledImport);
    } catch (error) {
      console.error("Error updating scheduled import:", error);
      res.status(500).json({ error: "Failed to update scheduled import configuration" });
    }
  });
  app2.post("/api/scheduled-imports/run-now", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const activeJob = await storage.getActiveImportJob(organizationId);
      if (activeJob) {
        return res.status(400).json({ error: "An import is already running" });
      }
      const { importScheduler: importScheduler2 } = await Promise.resolve().then(() => (init_scheduler(), scheduler_exports));
      await importScheduler2.runScheduledImport(organizationId, true);
      res.json({ message: "Import started" });
    } catch (error) {
      console.error("Error starting manual import:", error);
      res.status(500).json({ error: "Failed to start import" });
    }
  });
}

// server/routes/backups.ts
init_db();
import { sql as sql3 } from "drizzle-orm";
import archiver from "archiver";
import path from "path";
import fs from "fs/promises";
function registerBackupRoutes(app2) {
  app2.get("/api/backups/database-json", requireAuth, async (req, res) => {
    const currentUser = req.user;
    if (currentUser.role !== "admin") {
      console.log(`[Backup] Unauthorized access attempt by user ${currentUser.id} (role: ${currentUser.role})`);
      return res.status(403).json({ message: "Admin access required" });
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    console.log(`[Backup] Database backup requested by admin user ${currentUser.id} (${currentUser.email})`);
    const startTime = Date.now();
    try {
      await exportDatabaseAsJson(req, res);
      const duration = Date.now() - startTime;
      console.log(`[Backup] Database backup completed in ${duration}ms for user ${currentUser.id}`);
    } catch (error) {
      console.error(`[Backup] Database backup failed for user ${currentUser.id}:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Failed to create database backup",
          error: error.message
        });
      }
    }
  });
  app2.get("/api/backups/codebase", requireAuth, async (req, res) => {
    const currentUser = req.user;
    if (currentUser.role !== "admin") {
      console.log(`[Backup] Unauthorized codebase access attempt by user ${currentUser.id} (role: ${currentUser.role})`);
      return res.status(403).json({ message: "Admin access required" });
    }
    console.log(`[Backup] Codebase backup requested by admin user ${currentUser.id} (${currentUser.email})`);
    try {
      const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const filename = `mindbody-codebase-${timestamp2}.zip`;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      const archive = archiver("zip", {
        zlib: { level: 9 }
        // Maximum compression
      });
      archive.on("error", (err) => {
        console.error(`[Backup] Archive error for user ${currentUser.id}:`, err);
        archive.abort();
        if (!res.headersSent) {
          res.status(500).json({
            message: "Failed to create codebase archive",
            error: err.message
          });
        }
      });
      res.on("close", () => {
        if (!archive.pointer()) {
          console.log(`[Backup] Client disconnected before archive completion for user ${currentUser.id}`);
          archive.abort();
        }
      });
      archive.pipe(res);
      const projectRoot = path.resolve(process.cwd());
      const dirsToBackup = [
        "client",
        "server",
        "shared"
      ];
      for (const dir of dirsToBackup) {
        const dirPath = path.join(projectRoot, dir);
        try {
          await fs.access(dirPath);
          archive.directory(dirPath, dir);
        } catch (err) {
          console.log(`Directory ${dir} not found, skipping`);
        }
      }
      const filesToBackup = [
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "vite.config.ts",
        "tailwind.config.ts",
        "drizzle.config.ts",
        "replit.md",
        ".env.example"
      ];
      for (const file of filesToBackup) {
        const filePath = path.join(projectRoot, file);
        try {
          await fs.access(filePath);
          archive.file(filePath, { name: file });
        } catch (err) {
          console.log(`File ${file} not found, skipping`);
        }
      }
      await archive.finalize();
      console.log(`[Backup] Codebase backup completed for user ${currentUser.id}`);
    } catch (error) {
      console.error(`[Backup] Codebase backup failed for user ${currentUser.id}:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Failed to create codebase backup",
          error: error.message
        });
      }
    }
  });
}
async function exportDatabaseAsJson(req, res) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const filename = `mindbody-db-backup-${timestamp2}.json`;
  const tables = [
    "users",
    "organizations",
    "students",
    "classes",
    "attendance",
    "revenue",
    "import_jobs",
    "scheduled_imports",
    "session"
  ];
  const backup = {};
  for (const table of tables) {
    try {
      const result = await db.execute(sql3.raw(`SELECT * FROM ${table}`));
      backup[table] = result.rows;
    } catch (error) {
      console.log(`Table ${table} not found or error, skipping`);
      backup[table] = [];
    }
  }
  const backupData = {
    metadata: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: "1.0",
      tables: Object.keys(backup),
      recordCount: Object.values(backup).reduce((sum, rows) => sum + rows.length, 0)
    },
    data: backup
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.json(backupData);
}

// server/routes/kpi.ts
init_db();
init_schema();
import { sql as sql4, and as and2, gte as gte2, lte as lte2, eq as eq2, desc as desc2, isNotNull } from "drizzle-orm";
function registerKPIRoutes(app2) {
  app2.get("/api/kpi/overview", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : void 0;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : void 0;
      const dateFilter = [];
      if (startDate) dateFilter.push(gte2(revenue.transactionDate, startDate));
      if (endDate) dateFilter.push(lte2(revenue.transactionDate, endDate));
      const revenueResult = await db.select({
        total: sql4`COALESCE(SUM(${revenue.amount}::numeric), 0)`
      }).from(revenue).where(
        and2(
          eq2(revenue.organizationId, organizationId),
          dateFilter.length > 0 ? and2(...dateFilter) : void 0
        )
      );
      const activeMembersResult = await db.select({
        count: sql4`COUNT(*)`
      }).from(students).where(
        and2(
          eq2(students.organizationId, organizationId),
          eq2(students.status, "active"),
          isNotNull(students.membershipType)
        )
      );
      const totalStudentsResult = await db.select({
        count: sql4`COUNT(*)`
      }).from(students).where(eq2(students.organizationId, organizationId));
      const churnedMembersResult = await db.select({
        count: sql4`COUNT(*)`
      }).from(students).where(
        and2(
          eq2(students.organizationId, organizationId),
          eq2(students.status, "inactive"),
          isNotNull(students.membershipType)
        )
      );
      const totalMembersEverResult = await db.select({
        count: sql4`COUNT(*)`
      }).from(students).where(
        and2(
          eq2(students.organizationId, organizationId),
          isNotNull(students.membershipType)
        )
      );
      const totalRevenue = Number(revenueResult[0]?.total || 0);
      const activeMembers = Number(activeMembersResult[0]?.count || 0);
      const totalStudents = Number(totalStudentsResult[0]?.count || 0);
      const churnedMembers = Number(churnedMembersResult[0]?.count || 0);
      const totalMembersEver = Number(totalMembersEverResult[0]?.count || 0);
      const churnRate = totalMembersEver > 0 ? churnedMembers / totalMembersEver * 100 : 0;
      const retentionRate = 100 - churnRate;
      res.json({
        totalRevenue,
        activeMembers,
        totalStudents,
        churnRate: churnRate.toFixed(1),
        retentionRate: retentionRate.toFixed(1)
      });
    } catch (error) {
      console.error("KPI overview error:", error);
      res.status(500).json({ error: "Failed to fetch KPI overview" });
    }
  });
  app2.get("/api/kpi/utilization-heatmap", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 86400 * 1e3);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : /* @__PURE__ */ new Date();
      const attendanceCounts = db.$with("attendance_counts").as(
        db.select({
          scheduleId: attendance.scheduleId,
          count: sql4`COUNT(*)::int`
        }).from(attendance).where(
          and2(
            eq2(attendance.organizationId, organizationId),
            eq2(attendance.status, "attended")
          )
        ).groupBy(attendance.scheduleId)
      );
      const heatmapData = await db.with(attendanceCounts).select({
        dayOfWeek: sql4`EXTRACT(DOW FROM ${classSchedules.startTime})::int`,
        hour: sql4`EXTRACT(HOUR FROM ${classSchedules.startTime})::int`,
        avgUtilization: sql4`
            AVG(
              CASE 
                WHEN ${classes.capacity} IS NULL OR ${classes.capacity} = 0 THEN 0
                ELSE LEAST(100, (COALESCE(attendance_counts.count, 0)::decimal / ${classes.capacity}) * 100)
              END
            )
          `
      }).from(classSchedules).leftJoin(classes, eq2(classSchedules.classId, classes.id)).leftJoin(attendanceCounts, eq2(attendanceCounts.scheduleId, classSchedules.id)).where(
        and2(
          eq2(classSchedules.organizationId, organizationId),
          gte2(classSchedules.startTime, startDate),
          lte2(classSchedules.startTime, endDate)
        )
      ).groupBy(
        sql4`EXTRACT(DOW FROM ${classSchedules.startTime})`,
        sql4`EXTRACT(HOUR FROM ${classSchedules.startTime})`
      );
      res.json({ heatmapData });
    } catch (error) {
      console.error("Utilization heatmap error:", error);
      res.status(500).json({ error: "Failed to fetch utilization heatmap" });
    }
  });
  app2.get("/api/kpi/intro-conversion", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : void 0;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : void 0;
      const dateFilter = [];
      if (startDate) dateFilter.push(gte2(revenue.transactionDate, startDate));
      if (endDate) dateFilter.push(lte2(revenue.transactionDate, endDate));
      const introPurchases = await db.select({
        lineItems: sql4`COUNT(*)::int`,
        uniqueBuyers: sql4`COUNT(DISTINCT ${revenue.studentId})::int`,
        total: sql4`SUM(${revenue.amount}::numeric)`
      }).from(revenue).where(
        and2(
          eq2(revenue.organizationId, organizationId),
          sql4`${revenue.description} ILIKE '%Intro%'`,
          sql4`${revenue.amount} > 0`,
          dateFilter.length > 0 ? and2(...dateFilter) : void 0
        )
      );
      const conversions = await db.execute(sql4`
        SELECT COUNT(DISTINCT s.id)::int as count
        FROM ${students} s
        INNER JOIN ${revenue} r ON r.student_id = s.id
        WHERE s.organization_id = ${organizationId}
          AND s.membership_type IS NOT NULL
          AND r.description ILIKE '%Intro%'
          AND r.amount > 0
          ${dateFilter.length > 0 && startDate ? sql4`AND r.transaction_date >= ${startDate}` : sql4``}
          ${dateFilter.length > 0 && endDate ? sql4`AND r.transaction_date <= ${endDate}` : sql4``}
      `);
      const introLineItems = Number(introPurchases[0]?.lineItems || 0);
      const uniqueIntroBuyers = Number(introPurchases[0]?.uniqueBuyers || 0);
      const introRevenue = Number(introPurchases[0]?.total || 0);
      const converted = Number(conversions.rows[0]?.count || 0);
      const conversionRate = uniqueIntroBuyers > 0 ? converted / uniqueIntroBuyers * 100 : 0;
      res.json({
        introLineItems,
        uniqueIntroBuyers,
        introRevenue,
        converted,
        conversionRate: conversionRate.toFixed(1)
      });
    } catch (error) {
      console.error("Intro conversion error:", error);
      res.status(500).json({ error: "Failed to fetch intro conversion" });
    }
  });
  app2.get("/api/kpi/churn-retention", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 365 * 86400 * 1e3);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : /* @__PURE__ */ new Date();
      const monthlyTrend = await db.select({
        month: sql4`TO_CHAR(${students.joinDate}, 'YYYY-MM')`,
        newMembers: sql4`COUNT(*)`
      }).from(students).where(
        and2(
          eq2(students.organizationId, organizationId),
          isNotNull(students.membershipType),
          isNotNull(students.joinDate),
          gte2(students.joinDate, startDate),
          lte2(students.joinDate, endDate)
        )
      ).groupBy(sql4`TO_CHAR(${students.joinDate}, 'YYYY-MM')`).orderBy(sql4`TO_CHAR(${students.joinDate}, 'YYYY-MM')`);
      res.json({ monthlyTrend });
    } catch (error) {
      console.error("Churn retention error:", error);
      res.status(500).json({ error: "Failed to fetch churn/retention trends" });
    }
  });
  app2.get("/api/kpi/class-performance", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 86400 * 1e3);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : /* @__PURE__ */ new Date();
      const attendanceCounts = db.$with("attendance_counts").as(
        db.select({
          scheduleId: attendance.scheduleId,
          count: sql4`COUNT(*)::int`
        }).from(attendance).where(
          and2(
            eq2(attendance.organizationId, organizationId),
            eq2(attendance.status, "attended")
          )
        ).groupBy(attendance.scheduleId)
      );
      const classPerformance = await db.with(attendanceCounts).select({
        classId: classes.id,
        className: classes.name,
        instructor: classes.instructorName,
        capacity: classes.capacity,
        totalScheduled: sql4`COUNT(${classSchedules.id})::int`,
        avgAttendance: sql4`AVG(COALESCE(attendance_counts.count, 0))`,
        avgUtilization: sql4`
            AVG(
              CASE 
                WHEN ${classes.capacity} IS NULL OR ${classes.capacity} = 0 THEN 0
                ELSE LEAST(100, (COALESCE(attendance_counts.count, 0)::decimal / ${classes.capacity}) * 100)
              END
            )
          `
      }).from(classes).innerJoin(classSchedules, eq2(classSchedules.classId, classes.id)).leftJoin(attendanceCounts, eq2(attendanceCounts.scheduleId, classSchedules.id)).where(
        and2(
          eq2(classes.organizationId, organizationId),
          gte2(classSchedules.startTime, startDate),
          lte2(classSchedules.startTime, endDate)
        )
      ).groupBy(classes.id, classes.name, classes.instructorName, classes.capacity).orderBy(desc2(sql4`AVG(
          CASE 
            WHEN ${classes.capacity} IS NULL OR ${classes.capacity} = 0 THEN 0
            ELSE LEAST(100, (COALESCE(attendance_counts.count, 0)::decimal / ${classes.capacity}) * 100)
          END
        )`));
      const TARGET_UTILIZATION = 80;
      const performanceWithFlags = classPerformance.map((cls) => ({
        ...cls,
        avgUtilization: Number(cls.avgUtilization || 0).toFixed(1),
        avgAttendance: Number(cls.avgAttendance || 0).toFixed(1),
        isUnderperforming: Number(cls.avgUtilization || 0) < TARGET_UTILIZATION
      }));
      res.json({ classPerformance: performanceWithFlags, targetUtilization: TARGET_UTILIZATION });
    } catch (error) {
      console.error("Class performance error:", error);
      res.status(500).json({ error: "Failed to fetch class performance" });
    }
  });
  app2.get("/api/kpi/membership-trends", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 365 * 86400 * 1e3);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : /* @__PURE__ */ new Date();
      const newMemberTrend = await db.select({
        month: sql4`TO_CHAR(${students.joinDate}, 'YYYY-MM')`,
        count: sql4`COUNT(*)::int`
      }).from(students).where(
        and2(
          eq2(students.organizationId, organizationId),
          isNotNull(students.membershipType),
          isNotNull(students.joinDate),
          gte2(students.joinDate, startDate),
          lte2(students.joinDate, endDate)
        )
      ).groupBy(sql4`TO_CHAR(${students.joinDate}, 'YYYY-MM')`).orderBy(sql4`TO_CHAR(${students.joinDate}, 'YYYY-MM')`);
      const currentActive = await db.select({
        count: sql4`COUNT(*)::int`
      }).from(students).where(
        and2(
          eq2(students.organizationId, organizationId),
          eq2(students.status, "active"),
          isNotNull(students.membershipType)
        )
      );
      const currentInactive = await db.select({
        count: sql4`COUNT(*)::int`
      }).from(students).where(
        and2(
          eq2(students.organizationId, organizationId),
          eq2(students.status, "inactive"),
          isNotNull(students.membershipType)
        )
      );
      res.json({
        newMemberTrend,
        currentActive: Number(currentActive[0]?.count || 0),
        currentInactive: Number(currentInactive[0]?.count || 0)
      });
    } catch (error) {
      console.error("Membership trends error:", error);
      res.status(500).json({ error: "Failed to fetch membership trends" });
    }
  });
}

// server/routes/files.ts
import multer2 from "multer";
init_storage();

// server/file-parser.ts
import Papa2 from "papaparse";
import * as XLSX2 from "xlsx";
import { readFileSync } from "fs";
import { PDFParse } from "pdf-parse";
async function parseFile(filePath, mimeType) {
  try {
    switch (mimeType) {
      case "text/csv":
        return parseCSV(filePath);
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      case "application/vnd.ms-excel":
        return parseExcel(filePath);
      case "text/plain":
        return parseText(filePath);
      case "application/pdf":
        return await parsePDF(filePath);
      default:
        return {
          text: `File type ${mimeType} is not supported for text extraction`,
          metadata: {}
        };
    }
  } catch (error) {
    console.error(`Error parsing file:`, error);
    return {
      text: `Error parsing file: ${error instanceof Error ? error.message : String(error)}`,
      metadata: {}
    };
  }
}
function parseCSV(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const parsed = Papa2.parse(content, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  const columns = parsed.meta.fields || [];
  const text2 = formatDataAsText(rows, columns);
  return {
    text: text2,
    metadata: {
      rows: rows.length,
      columns: columns.length
    }
  };
}
function parseExcel(filePath) {
  const workbook = XLSX2.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  let allText = "";
  const allRows = [];
  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX2.utils.sheet_to_json(worksheet, { header: 1 });
    if (data.length > 0) {
      allText += `

=== Sheet: ${sheetName} ===
`;
      const headers = data[0];
      const rows = data.slice(1);
      const rowObjects = rows.map((row) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header || `Column${i + 1}`] = row[i] || "";
        });
        return obj;
      });
      allRows.push(...rowObjects);
      allText += formatDataAsText(rowObjects, headers.map((h, i) => h || `Column${i + 1}`));
    }
  }
  return {
    text: allText,
    metadata: {
      rows: allRows.length,
      sheets: sheetNames
    }
  };
}
function parseText(filePath) {
  const content = readFileSync(filePath, "utf-8");
  return {
    text: content,
    metadata: {}
  };
}
async function parsePDF(filePath) {
  try {
    const dataBuffer = readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    return {
      text: pdfData.text || "PDF contains no extractable text",
      metadata: {
        pages: pdfData.total || 0
      }
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    if (error instanceof Error && error.message.includes("encrypted")) {
      return {
        text: "PDF is password-protected and cannot be read",
        metadata: {}
      };
    }
    return {
      text: `Could not extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      metadata: {}
    };
  }
}
function formatDataAsText(rows, columns) {
  if (rows.length === 0) return "No data found";
  const maxRows = 1e3;
  const displayRows = rows.slice(0, maxRows);
  let text2 = `Data Summary (${rows.length} total rows, showing first ${displayRows.length}):

`;
  text2 += `Columns: ${columns.join(", ")}

`;
  text2 += "Sample Data:\n";
  displayRows.slice(0, 10).forEach((row, i) => {
    text2 += `
Row ${i + 1}:
`;
    columns.forEach((col) => {
      const value = row[col];
      if (value !== void 0 && value !== null && value !== "") {
        text2 += `  ${col}: ${value}
`;
      }
    });
  });
  if (rows.length > maxRows) {
    text2 += `
... and ${rows.length - maxRows} more rows`;
  }
  return text2;
}

// server/routes/files.ts
import { writeFileSync, unlinkSync } from "fs";
import { join, basename } from "path";
import { randomUUID as randomUUID2 } from "crypto";
import { tmpdir } from "os";
function sanitizeFilename(filename) {
  const safe = basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 200);
  if (!safe || safe === ".") {
    return "file";
  }
  return safe;
}
var upload = multer2({
  storage: multer2.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/csv",
      "text/plain",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/pdf"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV, Excel, PDF, and text files are allowed."));
    }
  }
});
function registerFileRoutes(app2) {
  app2.post("/api/files/upload", requireAuth, upload.single("file"), async (req, res) => {
    let tempFilePath = null;
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const file = req.file;
      const fileId = randomUUID2();
      const safeName = sanitizeFilename(file.originalname);
      const fileName = `${fileId}-${safeName}`;
      const objectStorage = new ObjectStorageService();
      const privateDir = objectStorage.getPrivateObjectDir();
      const storagePath = `${privateDir}/${fileName}`;
      tempFilePath = join(tmpdir(), `upload-${fileId}-${safeName}`);
      writeFileSync(tempFilePath, file.buffer);
      let extractedText = "";
      try {
        const parsed = await parseFile(tempFilePath, file.mimetype);
        extractedText = parsed.text;
      } catch (error) {
        console.error("Error parsing file:", error);
        extractedText = "Could not extract text from file";
      }
      await objectStorage.saveFile(storagePath, file.buffer);
      const uploadedFile = await storage.createUploadedFile({
        organizationId,
        userId,
        fileName,
        originalName: safeName,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath,
        extractedText
      });
      res.json({
        id: uploadedFile.id,
        fileName: uploadedFile.originalName,
        fileSize: uploadedFile.fileSize,
        fileType: uploadedFile.fileType,
        createdAt: uploadedFile.createdAt
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to upload file"
      });
    } finally {
      if (tempFilePath) {
        try {
          unlinkSync(tempFilePath);
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }
    }
  });
  app2.get("/api/files", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const files = await storage.getUploadedFiles(organizationId, userId);
      res.json(
        files.map((file) => ({
          id: file.id,
          fileName: file.originalName,
          fileSize: file.fileSize,
          fileType: file.fileType,
          createdAt: file.createdAt
        }))
      );
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch files"
      });
    }
  });
  app2.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const fileId = req.params.id;
      const file = await storage.getUploadedFile(fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      if (file.organizationId !== organizationId || file.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      try {
        const objectStorage = new ObjectStorageService();
        await objectStorage.deleteFile(file.storagePath);
      } catch (error) {
        console.error("Error deleting file from storage:", error);
      }
      await storage.deleteUploadedFile(fileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete file"
      });
    }
  });
  app2.get("/api/files/download/:filename", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const filename = req.params.filename;
      const fileMetadata = await storage.getAiGeneratedFileByFilename(filename);
      if (!fileMetadata) {
        console.warn(`[Download] File metadata not found for: ${filename}`);
        return res.status(404).json({ error: "File not found" });
      }
      if (fileMetadata.organizationId !== organizationId) {
        console.warn(`[Download] Organization mismatch - File org: ${fileMetadata.organizationId}, User org: ${organizationId}`);
        return res.status(403).json({ error: "Access denied" });
      }
      const objectStorage = new ObjectStorageService();
      const file = await objectStorage.getFile(fileMetadata.storagePath);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${fileMetadata.originalFilename}"`);
      console.log(`[Download] Serving file ${fileMetadata.originalFilename} to user ${userId} from org ${organizationId}`);
      await objectStorage.downloadObject(file, res);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(404).json({
        error: error instanceof Error ? error.message : "File not found"
      });
    }
  });
}

// server/routes/conversations.ts
init_storage();
function registerConversationRoutes(app2) {
  app2.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const conversations2 = await storage.getConversations(organizationId, userId);
      res.json(conversations2);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch conversations"
      });
    }
  });
  app2.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const conversationId = req.params.id;
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.organizationId !== organizationId || conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await storage.getConversationMessages(conversationId);
      res.json({
        conversation,
        messages
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch conversation"
      });
    }
  });
  app2.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { title } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }
      if (title.length > 200) {
        return res.status(400).json({ error: "Title too long (max 200 characters)" });
      }
      const conversation = await storage.createConversation({
        organizationId,
        userId,
        title: title.trim()
      });
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to create conversation"
      });
    }
  });
  app2.patch("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const conversationId = req.params.id;
      const { title } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }
      if (title.length > 200) {
        return res.status(400).json({ error: "Title too long (max 200 characters)" });
      }
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.organizationId !== organizationId || conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.updateConversation(conversationId, { title: title.trim() });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update conversation"
      });
    }
  });
  app2.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const conversationId = req.params.id;
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.organizationId !== organizationId || conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteConversation(conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete conversation"
      });
    }
  });
  app2.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const conversationId = req.params.id;
      const { role, content } = req.body;
      if (!role || role !== "user" && role !== "assistant") {
        return res.status(400).json({ error: "Invalid role" });
      }
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.organizationId !== organizationId || conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const message = await storage.createConversationMessage({
        conversationId,
        role,
        content: content.trim()
      });
      await storage.updateConversation(conversationId, {});
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to create message"
      });
    }
  });
}

// server/routes/index.ts
async function registerRoutes(app2) {
  registerUserRoutes(app2);
  registerStudentRoutes(app2);
  registerClassRoutes(app2);
  registerAttendanceRoutes(app2);
  registerRevenueRoutes(app2);
  registerMindbodyRoutes(app2);
  registerWebhookRoutes(app2);
  registerAIRoutes(app2);
  registerDashboardRoutes(app2);
  registerReportRoutes(app2);
  registerScheduledImportRoutes(app2);
  registerBackupRoutes(app2);
  registerKPIRoutes(app2);
  registerFileRoutes(app2);
  registerConversationRoutes(app2);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
      await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner())
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(import.meta.dirname, "..", "client", "index.html");
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use((req, res, next) => {
  if (req.path === "/api/webhooks/mindbody" && req.method === "POST") {
    express2.raw({ type: "application/json" })(req, res, () => {
      try {
        req.rawBody = req.body;
        req.body = JSON.parse(req.body.toString());
        next();
      } catch (err) {
        next(err);
      }
    });
  } else {
    express2.json()(req, res, next);
  }
});
app.use(express2.urlencoded({ extended: false }));
setupAuth(app);
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { importJobs: importJobs2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq3, or, and: and3, like } = await import("drizzle-orm");
    const { importWorker: importWorker2 } = await Promise.resolve().then(() => (init_import_worker(), import_worker_exports));
    const interruptedJobs = await db2.select().from(importJobs2).where(
      or(
        eq3(importJobs2.status, "running"),
        eq3(importJobs2.status, "pending"),
        and3(
          eq3(importJobs2.status, "failed"),
          like(importJobs2.error, "%connection timeout%")
        )
      )
    );
    if (interruptedJobs.length > 0) {
      console.log(`[Auto-Resume] Found ${interruptedJobs.length} interrupted import job(s), auto-resuming...`);
      const { scheduledImports: scheduledImports2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      for (const job of interruptedJobs) {
        const progress = typeof job.progress === "string" ? JSON.parse(job.progress) : job.progress || {};
        const progressInfo = progress.visits ? `${progress.visits.current}/${progress.visits.total} students (${progress.visits.imported} imported)` : "starting";
        console.log(`[Auto-Resume] Resuming job ${job.id} from checkpoint: ${progressInfo}`);
        await db2.update(importJobs2).set({
          status: "pending",
          error: null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(importJobs2.id, job.id));
        const scheduledImport = await db2.select().from(scheduledImports2).where(eq3(scheduledImports2.organizationId, job.organizationId)).limit(1);
        if (scheduledImport.length > 0 && scheduledImport[0].lastRunError?.includes("connection timeout")) {
          await db2.update(scheduledImports2).set({
            lastRunStatus: "running",
            lastRunError: null
          }).where(eq3(scheduledImports2.organizationId, job.organizationId));
          console.log(`[Auto-Resume] Cleared scheduler error for org ${job.organizationId}`);
        }
        await importWorker2.processJob(job.id);
      }
      console.log(`[Auto-Resume] Successfully queued ${interruptedJobs.length} job(s) for auto-resume`);
    }
  } catch (error) {
    console.error("[Auto-Resume] Failed to auto-resume interrupted import jobs on startup:", error);
  }
  try {
    const { importScheduler: importScheduler2 } = await Promise.resolve().then(() => (init_scheduler(), scheduler_exports));
    await importScheduler2.startScheduler();
  } catch (error) {
    console.error("Failed to start import scheduler:", error);
  }
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
