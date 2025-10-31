import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // Nullable for OAuth users
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  organizationId: uuid("organization_id"),
  provider: text("provider").notNull().default("local"), // "local", "google"
  providerId: text("provider_id"), // OAuth provider user ID
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  mindbodyAccessToken: text("mindbody_access_token"),
  mindbodyRefreshToken: text("mindbody_refresh_token"),
  mindbodySiteId: text("mindbody_site_id"),
  mindbodyApiKey: text("mindbody_api_key"),
  mindbodyStaffUsername: text("mindbody_staff_username"),
  mindbodyStaffPassword: text("mindbody_staff_password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export const students = pgTable(
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("students_org_idx").on(table.organizationId),
  })
);

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export const classes = pgTable(
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("classes_org_idx").on(table.organizationId),
  })
);

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
});
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;

export const classSchedules = pgTable(
  "class_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    classId: uuid("class_id").notNull(),
    mindbodyScheduleId: text("mindbody_schedule_id"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    location: text("location"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("schedules_org_idx").on(table.organizationId),
    classIdx: index("schedules_class_idx").on(table.classId),
    timeIdx: index("schedules_time_idx").on(table.startTime),
  })
);

export const insertClassScheduleSchema = createInsertSchema(classSchedules).omit({
  id: true,
  createdAt: true,
});
export type InsertClassSchedule = z.infer<typeof insertClassScheduleSchema>;
export type ClassSchedule = typeof classSchedules.$inferSelect;

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    studentId: uuid("student_id").notNull(),
    scheduleId: uuid("schedule_id").notNull(),
    attendedAt: timestamp("attended_at").notNull(),
    status: text("status").notNull().default("attended"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("attendance_org_idx").on(table.organizationId),
    studentIdx: index("attendance_student_idx").on(table.studentId),
    scheduleIdx: index("attendance_schedule_idx").on(table.scheduleId),
    timeIdx: index("attendance_time_idx").on(table.attendedAt),
    // Optimized for AI queries: "Find all classes for specific students with date ordering"
    studentClassesIdx: index("attendance_student_classes_idx").on(
      table.organizationId,
      table.studentId,
      table.attendedAt
    ),
    // Optimized for "which students attended which classes in a date range"
    classAttendanceIdx: index("attendance_class_attendance_idx").on(
      table.organizationId,
      table.scheduleId,
      table.attendedAt,
      table.studentId
    ),
    // Note: Unique constraint attendance_unique_student_schedule_date_idx exists in database
    // Created via raw SQL to prevent duplicates: (organizationId, studentId, scheduleId, attendedAt::date)
    // Not defined here because Drizzle can't generate proper migration SQL for partial indexes with date casting
  })
);

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export const revenue = pgTable(
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("revenue_org_idx").on(table.organizationId),
    studentIdx: index("revenue_student_idx").on(table.studentId),
    dateIdx: index("revenue_date_idx").on(table.transactionDate),
    uniqueSaleItem: uniqueIndex("revenue_unique_sale_item_idx").on(
      table.organizationId,
      table.mindbodySaleId,
      table.mindbodyItemId
    ),
    // Optimized for AI queries: "Find Intro Offer purchases and get student IDs"
    introOfferIdx: index("revenue_intro_offer_idx").on(
      table.organizationId,
      table.description,
      table.studentId
    ),
    // Optimized for "students who purchased on a date range"
    studentPurchaseIdx: index("revenue_student_purchase_idx").on(
      table.organizationId,
      table.studentId,
      table.transactionDate
    ),
  })
);

export const insertRevenueSchema = createInsertSchema(revenue).omit({
  id: true,
  createdAt: true,
});
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type Revenue = typeof revenue.$inferSelect;

export const aiQueries = pgTable(
  "ai_queries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    query: text("query").notNull(),
    response: text("response"),
    tokensUsed: integer("tokens_used"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("ai_queries_org_idx").on(table.organizationId),
    userIdx: index("ai_queries_user_idx").on(table.userId),
  })
);

export const insertAIQuerySchema = createInsertSchema(aiQueries).omit({
  id: true,
  createdAt: true,
});
export type InsertAIQuery = z.infer<typeof insertAIQuerySchema>;
export type AIQuery = typeof aiQueries.$inferSelect;

export const sessions = pgTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => ({
    expireIdx: index("sessions_expire_idx").on(table.expire),
  })
);

export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    status: text("status").notNull().default("pending"), // pending, running, completed, failed, paused, cancelled
    dataTypes: text("data_types").array().notNull(), // ["clients", "classes", "visits", "sales"]
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    progress: text("progress").notNull().default("{}"), // JSON: {clients: {current: 0, total: 0}, ...}
    currentDataType: text("current_data_type"), // Which data type is currently processing
    currentOffset: integer("current_offset").default(0), // Current pagination offset
    error: text("error"), // Error message if failed
    csvData: text("csv_data"), // Compressed CSV data for background processing
    pausedAt: timestamp("paused_at"), // When the import was paused
    heartbeatAt: timestamp("heartbeat_at"), // Last worker heartbeat - updated every minute
    useUtilityFunction: boolean("use_utility_function").default(true), // Use fast utility function for visits (default: true)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("import_jobs_org_idx").on(table.organizationId),
    statusIdx: index("import_jobs_status_idx").on(table.status),
  })
);

export const insertImportJobSchema = createInsertSchema(importJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;
export type ImportJob = typeof importJobs.$inferSelect;

export const skippedImportRecords = pgTable(
  "skipped_import_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    importJobId: uuid("import_job_id"),
    dataType: text("data_type").notNull(), // "client", "class", "visit", "sale"
    mindbodyId: text("mindbody_id").notNull(), // Mindbody record ID
    reason: text("reason").notNull(), // Why it was skipped
    rawData: text("raw_data"), // JSON of the raw Mindbody record
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("skipped_import_records_org_idx").on(table.organizationId),
    jobIdx: index("skipped_import_records_job_idx").on(table.importJobId),
    dataTypeIdx: index("skipped_import_records_data_type_idx").on(table.dataType),
  })
);

export const insertSkippedImportRecordSchema = createInsertSchema(skippedImportRecords).omit({
  id: true,
  createdAt: true,
});
export type InsertSkippedImportRecord = z.infer<typeof insertSkippedImportRecordSchema>;
export type SkippedImportRecord = typeof skippedImportRecords.$inferSelect;

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("password_reset_tokens_user_idx").on(table.userId),
    tokenIdx: index("password_reset_tokens_token_idx").on(table.token),
    expiresIdx: index("password_reset_tokens_expires_idx").on(table.expiresAt),
  })
);

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    eventType: text("event_type").notNull(), // e.g., "classVisit.created"
    webhookUrl: text("webhook_url").notNull(),
    status: text("status").notNull().default("active"), // active, inactive
    mindbodySubscriptionId: text("mindbody_subscription_id"), // ID from Mindbody
    messageSignatureKey: text("message_signature_key"), // For HMAC verification
    referenceId: text("reference_id"),
    eventSchemaVersion: integer("event_schema_version").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("webhook_subscriptions_org_idx").on(table.organizationId),
    statusIdx: index("webhook_subscriptions_status_idx").on(table.status),
  })
);

export const insertWebhookSubscriptionSchema = createInsertSchema(webhookSubscriptions).omit({
  id: true,
  createdAt: true,
});
export type InsertWebhookSubscription = z.infer<typeof insertWebhookSubscriptionSchema>;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    subscriptionId: uuid("subscription_id"), // Link to subscription
    messageId: text("message_id").notNull().unique(), // For deduplication
    eventType: text("event_type").notNull(),
    eventData: text("event_data").notNull(), // JSON payload
    processed: boolean("processed").notNull().default(false),
    processedAt: timestamp("processed_at"),
    error: text("error"), // Error message if processing failed
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("webhook_events_org_idx").on(table.organizationId),
    messageIdx: index("webhook_events_message_idx").on(table.messageId),
    processedIdx: index("webhook_events_processed_idx").on(table.processed),
  })
);

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

export const scheduledImports = pgTable(
  "scheduled_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    schedule: text("schedule").notNull().default("0 2 * * *"), // Cron expression (2am daily)
    dataTypes: text("data_types").notNull().default("students,classes,visits,sales"), // Comma-separated
    daysToImport: integer("days_to_import").notNull().default(7), // Import last N days
    lastRunAt: timestamp("last_run_at"),
    lastRunStatus: text("last_run_status"), // "success" | "failed" | "running"
    lastRunError: text("last_run_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: uniqueIndex("scheduled_imports_org_idx").on(table.organizationId),
  })
);

export const insertScheduledImportSchema = createInsertSchema(scheduledImports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScheduledImport = z.infer<typeof insertScheduledImportSchema>;
export type ScheduledImport = typeof scheduledImports.$inferSelect;

export const uploadedFiles = pgTable(
  "uploaded_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    fileName: text("file_name").notNull(),
    originalName: text("original_name").notNull(),
    fileType: text("file_type").notNull(), // mime type
    fileSize: integer("file_size").notNull(), // bytes
    storagePath: text("storage_path").notNull(), // path in object storage
    extractedText: text("extracted_text"), // parsed content for AI analysis
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("uploaded_files_org_idx").on(table.organizationId),
    userIdx: index("uploaded_files_user_idx").on(table.userId),
  })
);

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  createdAt: true,
});
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;

export const aiGeneratedFiles = pgTable(
  "ai_generated_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    filename: text("filename").notNull(), // UUID-prefixed filename
    originalFilename: text("original_filename").notNull(), // User-friendly name
    storagePath: text("storage_path").notNull(), // Full path in object storage
    fileType: text("file_type").notNull().default("excel"), // File type
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("ai_generated_files_org_idx").on(table.organizationId),
    userIdx: index("ai_generated_files_user_idx").on(table.userId),
    filenameIdx: index("ai_generated_files_filename_idx").on(table.filename),
  })
);

export const insertAiGeneratedFileSchema = createInsertSchema(aiGeneratedFiles).omit({
  id: true,
  createdAt: true,
});
export type InsertAiGeneratedFile = z.infer<typeof insertAiGeneratedFileSchema>;
export type AiGeneratedFile = typeof aiGeneratedFiles.$inferSelect;

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(), // Auto-generated from first message or user-provided
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("conversations_org_idx").on(table.organizationId),
    userIdx: index("conversations_user_idx").on(table.userId),
    updatedIdx: index("conversations_updated_idx").on(table.updatedAt),
  })
);

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull(),
    role: text("role").notNull(), // "user" or "assistant"
    content: text("content").notNull(),
    fileIds: text("file_ids").array(), // Array of uploaded file IDs attached to this message
    status: text("status").default("completed"), // "pending" | "completed" | "failed"
    error: text("error"), // Error message if status is "failed"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index("conversation_messages_conversation_idx").on(table.conversationId),
    createdIdx: index("conversation_messages_created_idx").on(table.createdAt),
    statusIdx: index("conversation_messages_status_idx").on(table.status),
  })
);

export const insertConversationMessageSchema = createInsertSchema(conversationMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;
export type ConversationMessage = typeof conversationMessages.$inferSelect;

export const pricingOptions = pgTable(
  "pricing_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    mindbodyServiceId: text("mindbody_service_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    onlineDescription: text("online_description"),
    price: decimal("price", { precision: 10, scale: 2 }),
    onlinePrice: decimal("online_price", { precision: 10, scale: 2 }),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }),
    taxIncluded: boolean("tax_included").default(false),
    programId: text("program_id"),
    defaultTimeLength: integer("default_time_length"), // in minutes
    type: text("type"),
    count: integer("count"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("pricing_options_org_idx").on(table.organizationId),
    serviceIdx: uniqueIndex("pricing_options_service_idx").on(table.organizationId, table.mindbodyServiceId),
  })
);

export const insertPricingOptionSchema = createInsertSchema(pricingOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPricingOption = z.infer<typeof insertPricingOptionSchema>;
export type PricingOption = typeof pricingOptions.$inferSelect;
