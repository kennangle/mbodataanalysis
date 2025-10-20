import { db } from "./db";
import {
  users,
  organizations,
  students,
  classes,
  classSchedules,
  attendance,
  revenue,
  aiQueries,
  importJobs,
  passwordResetTokens,
  webhookSubscriptions,
  webhookEvents,
  scheduledImports,
  type User,
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type Student,
  type InsertStudent,
  type Class,
  type InsertClass,
  type ClassSchedule,
  type InsertClassSchedule,
  type Attendance,
  type InsertAttendance,
  type Revenue,
  type InsertRevenue,
  type AIQuery,
  type InsertAIQuery,
  type ImportJob,
  type InsertImportJob,
  type PasswordResetToken,
  type WebhookSubscription,
  type InsertWebhookSubscription,
  type WebhookEvent,
  type InsertWebhookEvent,
  type ScheduledImport,
  type InsertScheduledImport,
} from "@shared/schema";
import { eq, and, desc, gte, lt, lte, sql } from "drizzle-orm";
import { addDays } from "date-fns";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProvider(provider: string, providerId: string): Promise<User | undefined>;
  getUsers(organizationId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<void>;
  deleteUser(id: string): Promise<void>;

  createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;

  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganizationTokens(id: string, accessToken: string, refreshToken: string): Promise<void>;
  updateOrganizationSiteId(id: string, siteId: string): Promise<void>;

  getStudents(
    organizationId: string,
    limit?: number,
    offset?: number,
    status?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Student[]>;
  getStudentById(id: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<void>;
  deleteStudent(id: string): Promise<void>;
  getStudentCount(
    organizationId: string,
    status?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number>;
  getActiveStudentCount(organizationId: string): Promise<number>;

  getClasses(organizationId: string): Promise<Class[]>;
  getClassById(id: string): Promise<Class | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: string, classData: Partial<InsertClass>): Promise<void>;
  deleteClass(id: string): Promise<void>;
  getClassesCount(organizationId: string): Promise<number>;

  getClassSchedules(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ClassSchedule[]>;
  createClassSchedule(schedule: InsertClassSchedule): Promise<ClassSchedule>;

  getAttendance(organizationId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
  getAttendanceByStudent(studentId: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendanceCount(organizationId: string): Promise<number>;

  getRevenue(organizationId: string, startDate?: Date, endDate?: Date): Promise<Revenue[]>;
  createRevenue(revenue: InsertRevenue): Promise<Revenue>;
  upsertRevenue(revenue: InsertRevenue): Promise<Revenue>;
  getSalesCount(organizationId: string): Promise<number>;
  getRevenueStats(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ total: number; count: number }>;
  getAllTimeRevenueStats(organizationId: string): Promise<{ total: number; count: number }>;
  getMonthlyRevenueTrend(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ month: string; revenue: number; students: number }>>;
  getAttendanceByTimeSlot(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ day: string; morning: number; afternoon: number; evening: number }>>;

  createAIQuery(query: InsertAIQuery): Promise<AIQuery>;
  getAIQueries(organizationId: string, limit?: number): Promise<AIQuery[]>;

  // Import Jobs
  createImportJob(job: InsertImportJob): Promise<ImportJob>;
  getImportJob(id: string): Promise<ImportJob | undefined>;
  getImportJobs(organizationId: string, limit?: number): Promise<ImportJob[]>;
  updateImportJob(id: string, job: Partial<InsertImportJob>): Promise<void>;
  getActiveImportJob(organizationId: string): Promise<ImportJob | undefined>;

  // Webhooks
  createWebhookSubscription(subscription: InsertWebhookSubscription): Promise<WebhookSubscription>;
  getWebhookSubscriptions(organizationId: string): Promise<WebhookSubscription[]>;
  getWebhookSubscription(id: string): Promise<WebhookSubscription | undefined>;
  updateWebhookSubscription(
    id: string,
    subscription: Partial<InsertWebhookSubscription>
  ): Promise<void>;
  deleteWebhookSubscription(id: string): Promise<void>;

  createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent>;
  getWebhookEvent(messageId: string): Promise<WebhookEvent | undefined>;
  getWebhookEvents(organizationId: string, limit?: number): Promise<WebhookEvent[]>;
  updateWebhookEvent(id: string, event: Partial<InsertWebhookEvent>): Promise<void>;

  // Scheduled Imports
  getScheduledImport(organizationId: string): Promise<ScheduledImport | undefined>;
  upsertScheduledImport(scheduledImport: InsertScheduledImport): Promise<ScheduledImport>;
  updateScheduledImport(
    organizationId: string,
    scheduledImport: Partial<InsertScheduledImport>
  ): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByProvider(provider: string, providerId: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.provider, provider), eq(users.providerId, providerId)))
      .limit(1);
    return result[0];
  }

  async getUsers(organizationId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<void> {
    await db.update(users).set(user).where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<PasswordResetToken> {
    const result = await db
      .insert(passwordResetTokens)
      .values({
        userId,
        token,
        expiresAt,
      })
      .returning();
    return result[0];
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    return result[0];
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db.delete(passwordResetTokens).where(lte(passwordResetTokens.expiresAt, new Date()));
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return result[0];
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const result = await db.insert(organizations).values(org).returning();
    return result[0];
  }

  async updateOrganizationTokens(
    id: string,
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    await db
      .update(organizations)
      .set({ mindbodyAccessToken: accessToken, mindbodyRefreshToken: refreshToken })
      .where(eq(organizations.id, id));
  }

  async updateOrganizationSiteId(id: string, siteId: string): Promise<void> {
    await db
      .update(organizations)
      .set({ mindbodySiteId: siteId })
      .where(eq(organizations.id, id));
  }

  async getStudents(
    organizationId: string,
    limit: number = 100,
    offset: number = 0,
    status?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Student[]> {
    const conditions: any[] = [eq(students.organizationId, organizationId)];

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

  async getStudentById(id: string): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return result[0];
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const result = await db.insert(students).values(student).returning();
    return result[0];
  }

  async updateStudent(id: string, student: Partial<InsertStudent>): Promise<void> {
    await db.update(students).set(student).where(eq(students.id, id));
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  async getStudentCount(
    organizationId: string,
    status?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const conditions: any[] = [eq(students.organizationId, organizationId)];

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

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(whereClause);
    return Number(result[0].count);
  }

  async getActiveStudentCount(organizationId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(and(eq(students.organizationId, organizationId), eq(students.status, "active")));
    return Number(result[0].count);
  }

  async getClasses(organizationId: string): Promise<Class[]> {
    return await db.select().from(classes).where(eq(classes.organizationId, organizationId));
  }

  async getClassById(id: string): Promise<Class | undefined> {
    const result = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return result[0];
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const result = await db.insert(classes).values(classData).returning();
    return result[0];
  }

  async updateClass(id: string, classData: Partial<InsertClass>): Promise<void> {
    await db.update(classes).set(classData).where(eq(classes.id, id));
  }

  async deleteClass(id: string): Promise<void> {
    await db.delete(classes).where(eq(classes.id, id));
  }

  async getClassesCount(organizationId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(eq(classes.organizationId, organizationId));
    return Number(result[0].count);
  }

  async getClassSchedules(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ClassSchedule[]> {
    if (startDate && endDate) {
      return await db
        .select()
        .from(classSchedules)
        .where(
          and(
            eq(classSchedules.organizationId, organizationId),
            gte(classSchedules.startTime, startDate),
            lte(classSchedules.startTime, endDate)
          )
        );
    }

    return await db
      .select()
      .from(classSchedules)
      .where(eq(classSchedules.organizationId, organizationId));
  }

  async createClassSchedule(schedule: InsertClassSchedule): Promise<ClassSchedule> {
    const result = await db.insert(classSchedules).values(schedule).returning();
    return result[0];
  }

  async getAttendance(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Attendance[]> {
    if (startDate && endDate) {
      return await db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.organizationId, organizationId),
            gte(attendance.attendedAt, startDate),
            lte(attendance.attendedAt, endDate)
          )
        )
        .orderBy(desc(attendance.attendedAt));
    }

    return await db
      .select()
      .from(attendance)
      .where(eq(attendance.organizationId, organizationId))
      .orderBy(desc(attendance.attendedAt));
  }

  async getAttendanceByStudent(studentId: string): Promise<Attendance[]> {
    return await db
      .select()
      .from(attendance)
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(attendance.attendedAt));
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const result = await db.insert(attendance).values(attendanceData).returning();
    return result[0];
  }

  async getAttendanceCount(organizationId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendance)
      .where(eq(attendance.organizationId, organizationId));
    return Number(result[0].count);
  }

  async getRevenue(organizationId: string, startDate?: Date, endDate?: Date): Promise<Revenue[]> {
    if (startDate && endDate) {
      return await db
        .select()
        .from(revenue)
        .where(
          and(
            eq(revenue.organizationId, organizationId),
            gte(revenue.transactionDate, startDate),
            lte(revenue.transactionDate, endDate)
          )
        )
        .orderBy(desc(revenue.transactionDate));
    }

    return await db
      .select()
      .from(revenue)
      .where(eq(revenue.organizationId, organizationId))
      .orderBy(desc(revenue.transactionDate));
  }

  async createRevenue(revenueData: InsertRevenue): Promise<Revenue> {
    const result = await db.insert(revenue).values(revenueData).returning();
    return result[0];
  }

  async upsertRevenue(revenueData: InsertRevenue): Promise<Revenue> {
    // When mindbodyItemId is NULL, we need to check for duplicates manually
    // because PostgreSQL unique constraints don't treat NULL values as equal
    if (!revenueData.mindbodyItemId && revenueData.mindbodySaleId) {
      // Check if record already exists
      const existing = await db
        .select()
        .from(revenue)
        .where(
          and(
            eq(revenue.organizationId, revenueData.organizationId),
            eq(revenue.mindbodySaleId, revenueData.mindbodySaleId),
            sql`${revenue.mindbodyItemId} IS NULL`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        const updated = await db
          .update(revenue)
          .set({
            studentId: revenueData.studentId,
            amount: revenueData.amount,
            type: revenueData.type,
            description: revenueData.description,
            transactionDate: revenueData.transactionDate,
          })
          .where(eq(revenue.id, existing[0].id))
          .returning();
        return updated[0];
      }
    }

    // For non-NULL mindbodyItemId, or if no existing record found, use regular upsert
    if (revenueData.mindbodyItemId) {
      const result = await db
        .insert(revenue)
        .values(revenueData)
        .onConflictDoUpdate({
          target: [revenue.organizationId, revenue.mindbodySaleId, revenue.mindbodyItemId],
          set: {
            studentId: revenueData.studentId,
            amount: revenueData.amount,
            type: revenueData.type,
            description: revenueData.description,
            transactionDate: revenueData.transactionDate,
          },
        })
        .returning();
      return result[0];
    }

    // Insert new record (no conflict possible)
    const result = await db.insert(revenue).values(revenueData).returning();
    return result[0];
  }

  async getSalesCount(organizationId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(revenue)
      .where(eq(revenue.organizationId, organizationId));
    return Number(result[0].count);
  }

  async getRevenueStats(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ total: number; count: number }> {
    // Make end date inclusive by adding one day and using < comparison
    const nextDay = addDays(endDate, 1);

    const result = await db
      .select({
        total: sql<number>`sum(CAST(${revenue.amount} AS NUMERIC))`,
        count: sql<number>`count(*)`,
      })
      .from(revenue)
      .where(
        and(
          eq(revenue.organizationId, organizationId),
          gte(revenue.transactionDate, startDate),
          lt(revenue.transactionDate, nextDay)
        )
      );

    return {
      total: Number(result[0].total || 0),
      count: Number(result[0].count || 0),
    };
  }

  async getAllTimeRevenueStats(organizationId: string): Promise<{ total: number; count: number }> {
    const result = await db
      .select({
        total: sql<number>`sum(CAST(${revenue.amount} AS NUMERIC))`,
        count: sql<number>`count(*)`,
      })
      .from(revenue)
      .where(eq(revenue.organizationId, organizationId));

    return {
      total: Number(result[0].total || 0),
      count: Number(result[0].count || 0),
    };
  }

  async getMonthlyRevenueTrend(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ month: string; revenue: number; students: number }>> {
    const now = new Date();
    const effectiveStartDate = startDate || new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const effectiveEndDate = endDate || now;

    // Make end date inclusive by adding one day and using < comparison
    // This ensures all revenue on the selected end date is included
    const nextDay = addDays(effectiveEndDate, 1);

    const whereConditions = [
      eq(revenue.organizationId, organizationId),
      gte(revenue.transactionDate, effectiveStartDate),
      lt(revenue.transactionDate, nextDay),
    ];

    const revenueByMonth = await db
      .select({
        monthNum: sql<number>`extract(month from ${revenue.transactionDate})`,
        yearNum: sql<number>`extract(year from ${revenue.transactionDate})`,
        total: sql<number>`sum(CAST(${revenue.amount} AS NUMERIC))`,
      })
      .from(revenue)
      .where(and(...whereConditions))
      .groupBy(
        sql`extract(month from ${revenue.transactionDate})`,
        sql`extract(year from ${revenue.transactionDate})`
      );

    const studentCount = await db
      .select({
        count: sql<number>`count(distinct ${students.id})`,
      })
      .from(students)
      .where(eq(students.organizationId, organizationId));

    const totalStudents = Number(studentCount[0]?.count || 0);
    const revenueMap = new Map(
      revenueByMonth.map((r) => [`${r.yearNum}-${r.monthNum}`, Number(r.total || 0)])
    );

    // Calculate months to show based on date range
    const monthsData = [];
    const startMonth = new Date(effectiveStartDate.getFullYear(), effectiveStartDate.getMonth(), 1);
    const endMonth = new Date(effectiveEndDate.getFullYear(), effectiveEndDate.getMonth(), 1);

    // If no custom range, show last 12 months
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
          students: totalStudents,
        });
      }
    } else {
      // Show months within the date range
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
          students: totalStudents,
        });

        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }
    }

    return monthsData;
  }

  async getAttendanceByTimeSlot(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ day: string; morning: number; afternoon: number; evening: number }>> {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const whereConditions = [
      eq(attendance.organizationId, organizationId),
      eq(classSchedules.organizationId, organizationId),
    ];

    if (startDate) {
      whereConditions.push(gte(classSchedules.startTime, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(classSchedules.startTime, endDate));
    }

    const result = await db
      .select({
        dayOfWeek: sql<number>`extract(dow from ${classSchedules.startTime})`,
        timeSlot: sql<string>`
        CASE 
          WHEN extract(hour from ${classSchedules.startTime}) < 12 THEN 'morning'
          WHEN extract(hour from ${classSchedules.startTime}) < 17 THEN 'afternoon'
          ELSE 'evening'
        END
      `,
        count: sql<number>`count(*)`,
      })
      .from(attendance)
      .innerJoin(classSchedules, eq(attendance.scheduleId, classSchedules.id))
      .where(and(...whereConditions))
      .groupBy(
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
      evening: 0,
    }));

    result.forEach((r) => {
      const dayIndex = Number(r.dayOfWeek);
      const timeSlot = r.timeSlot as "morning" | "afternoon" | "evening";
      const count = Number(r.count);

      if (dayIndex >= 0 && dayIndex < 7 && timeSlot) {
        dayData[dayIndex][timeSlot] = count;
      }
    });

    return dayData;
  }

  async createAIQuery(query: InsertAIQuery): Promise<AIQuery> {
    const result = await db.insert(aiQueries).values(query).returning();
    return result[0];
  }

  async getAIQueries(organizationId: string, limit: number = 10): Promise<AIQuery[]> {
    return await db
      .select()
      .from(aiQueries)
      .where(eq(aiQueries.organizationId, organizationId))
      .orderBy(desc(aiQueries.createdAt))
      .limit(limit);
  }

  async createImportJob(job: InsertImportJob): Promise<ImportJob> {
    const result = await db.insert(importJobs).values(job).returning();
    return result[0];
  }

  async getImportJob(id: string): Promise<ImportJob | undefined> {
    const result = await db.select().from(importJobs).where(eq(importJobs.id, id)).limit(1);
    return result[0];
  }

  async getImportJobs(organizationId: string, limit: number = 10): Promise<ImportJob[]> {
    return await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.organizationId, organizationId))
      .orderBy(desc(importJobs.createdAt))
      .limit(limit);
  }

  async updateImportJob(id: string, job: Partial<InsertImportJob>): Promise<void> {
    await db
      .update(importJobs)
      .set({ ...job, updatedAt: new Date() })
      .where(eq(importJobs.id, id));
  }

  async getActiveImportJob(organizationId: string): Promise<ImportJob | undefined> {
    const result = await db
      .select()
      .from(importJobs)
      .where(
        and(
          eq(importJobs.organizationId, organizationId),
          sql`${importJobs.status} IN ('pending', 'running', 'paused')`
        )
      )
      .orderBy(desc(importJobs.createdAt))
      .limit(1);
    return result[0];
  }

  async createWebhookSubscription(
    subscription: InsertWebhookSubscription
  ): Promise<WebhookSubscription> {
    const result = await db.insert(webhookSubscriptions).values(subscription).returning();
    return result[0];
  }

  async getWebhookSubscriptions(organizationId: string): Promise<WebhookSubscription[]> {
    return await db
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.organizationId, organizationId))
      .orderBy(desc(webhookSubscriptions.createdAt));
  }

  async getWebhookSubscription(id: string): Promise<WebhookSubscription | undefined> {
    const result = await db
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.id, id))
      .limit(1);
    return result[0];
  }

  async updateWebhookSubscription(
    id: string,
    subscription: Partial<InsertWebhookSubscription>
  ): Promise<void> {
    await db.update(webhookSubscriptions).set(subscription).where(eq(webhookSubscriptions.id, id));
  }

  async deleteWebhookSubscription(id: string): Promise<void> {
    await db.delete(webhookSubscriptions).where(eq(webhookSubscriptions.id, id));
  }

  async createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent> {
    const result = await db.insert(webhookEvents).values(event).returning();
    return result[0];
  }

  async getWebhookEvent(messageId: string): Promise<WebhookEvent | undefined> {
    const result = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.messageId, messageId))
      .limit(1);
    return result[0];
  }

  async getWebhookEvents(organizationId: string, limit: number = 50): Promise<WebhookEvent[]> {
    return await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.organizationId, organizationId))
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit);
  }

  async updateWebhookEvent(id: string, event: Partial<InsertWebhookEvent>): Promise<void> {
    await db.update(webhookEvents).set(event).where(eq(webhookEvents.id, id));
  }

  async getScheduledImport(organizationId: string): Promise<ScheduledImport | undefined> {
    const result = await db
      .select()
      .from(scheduledImports)
      .where(eq(scheduledImports.organizationId, organizationId))
      .limit(1);
    return result[0];
  }

  async upsertScheduledImport(scheduledImport: InsertScheduledImport): Promise<ScheduledImport> {
    const existing = await this.getScheduledImport(scheduledImport.organizationId);
    
    if (existing) {
      await db
        .update(scheduledImports)
        .set({ ...scheduledImport, updatedAt: new Date() })
        .where(eq(scheduledImports.organizationId, scheduledImport.organizationId));
      
      const updated = await this.getScheduledImport(scheduledImport.organizationId);
      return updated!;
    }
    
    const result = await db.insert(scheduledImports).values(scheduledImport).returning();
    return result[0];
  }

  async updateScheduledImport(
    organizationId: string,
    scheduledImport: Partial<InsertScheduledImport>
  ): Promise<void> {
    await db
      .update(scheduledImports)
      .set({ ...scheduledImport, updatedAt: new Date() })
      .where(eq(scheduledImports.organizationId, organizationId));
  }
}

export const storage = new DbStorage();
