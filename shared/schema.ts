import { pgTable, text, integer, timestamp, boolean, decimal, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  organizationId: uuid("organization_id"),
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
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(),
  description: text("description"),
  transactionDate: timestamp("transaction_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("revenue_org_idx").on(table.organizationId),
  studentIdx: index("revenue_student_idx").on(table.studentId),
  dateIdx: index("revenue_date_idx").on(table.transactionDate),
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
