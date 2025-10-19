import { pgTable, text, integer, timestamp, boolean, decimal, uuid, index } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export const students = pgTable("students", {
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
}, (table) => ({
  orgIdx: index("students_org_idx").on(table.organizationId),
}));

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  mindbodyClassId: text("mindbody_class_id"),
  name: text("name").notNull(),
  description: text("description"),
  instructorName: text("instructor_name"),
  capacity: integer("capacity"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("classes_org_idx").on(table.organizationId),
}));

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
});
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;

export const classSchedules = pgTable("class_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  classId: uuid("class_id").notNull(),
  mindbodyScheduleId: text("mindbody_schedule_id"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("schedules_org_idx").on(table.organizationId),
  classIdx: index("schedules_class_idx").on(table.classId),
  timeIdx: index("schedules_time_idx").on(table.startTime),
}));

export const insertClassScheduleSchema = createInsertSchema(classSchedules).omit({
  id: true,
  createdAt: true,
});
export type InsertClassSchedule = z.infer<typeof insertClassScheduleSchema>;
export type ClassSchedule = typeof classSchedules.$inferSelect;

export const attendance = pgTable("attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  studentId: uuid("student_id").notNull(),
  scheduleId: uuid("schedule_id").notNull(),
  attendedAt: timestamp("attended_at").notNull(),
  status: text("status").notNull().default("attended"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("attendance_org_idx").on(table.organizationId),
  studentIdx: index("attendance_student_idx").on(table.studentId),
  scheduleIdx: index("attendance_schedule_idx").on(table.scheduleId),
  timeIdx: index("attendance_time_idx").on(table.attendedAt),
}));

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export const revenue = pgTable("revenue", {
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
}, (table) => ({
  orgIdx: index("revenue_org_idx").on(table.organizationId),
  studentIdx: index("revenue_student_idx").on(table.studentId),
  dateIdx: index("revenue_date_idx").on(table.transactionDate),
  uniqueSaleItem: index("revenue_unique_sale_item_idx").on(table.organizationId, table.mindbodySaleId, table.mindbodyItemId),
}));

export const insertRevenueSchema = createInsertSchema(revenue).omit({
  id: true,
  createdAt: true,
});
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type Revenue = typeof revenue.$inferSelect;

export const aiQueries = pgTable("ai_queries", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  userId: uuid("user_id").notNull(),
  query: text("query").notNull(),
  response: text("response"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_queries_org_idx").on(table.organizationId),
  userIdx: index("ai_queries_user_idx").on(table.userId),
}));

export const insertAIQuerySchema = createInsertSchema(aiQueries).omit({
  id: true,
  createdAt: true,
});
export type InsertAIQuery = z.infer<typeof insertAIQuerySchema>;
export type AIQuery = typeof aiQueries.$inferSelect;

export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => ({
  expireIdx: index("sessions_expire_idx").on(table.expire),
}));

export const importJobs = pgTable("import_jobs", {
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
  pausedAt: timestamp("paused_at"), // When the import was paused
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("import_jobs_org_idx").on(table.organizationId),
  statusIdx: index("import_jobs_status_idx").on(table.status),
}));

export const insertImportJobSchema = createInsertSchema(importJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;
export type ImportJob = typeof importJobs.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("password_reset_tokens_user_idx").on(table.userId),
  tokenIdx: index("password_reset_tokens_token_idx").on(table.token),
  expiresIdx: index("password_reset_tokens_expires_idx").on(table.expiresAt),
}));

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const webhookSubscriptions = pgTable("webhook_subscriptions", {
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
}, (table) => ({
  orgIdx: index("webhook_subscriptions_org_idx").on(table.organizationId),
  statusIdx: index("webhook_subscriptions_status_idx").on(table.status),
}));

export const insertWebhookSubscriptionSchema = createInsertSchema(webhookSubscriptions).omit({
  id: true,
  createdAt: true,
});
export type InsertWebhookSubscription = z.infer<typeof insertWebhookSubscriptionSchema>;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;

export const webhookEvents = pgTable("webhook_events", {
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
}, (table) => ({
  orgIdx: index("webhook_events_org_idx").on(table.organizationId),
  messageIdx: index("webhook_events_message_idx").on(table.messageId),
  processedIdx: index("webhook_events_processed_idx").on(table.processed),
}));

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
