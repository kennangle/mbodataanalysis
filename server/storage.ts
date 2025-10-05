import { db } from "@db";
import { 
  users, 
  organizations,
  students, 
  classes, 
  classSchedules, 
  attendance, 
  revenue,
  aiQueries,
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
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganizationTokens(id: string, accessToken: string, refreshToken: string): Promise<void>;
  
  getStudents(organizationId: string, limit?: number, offset?: number): Promise<Student[]>;
  getStudentById(id: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<void>;
  deleteStudent(id: string): Promise<void>;
  getStudentCount(organizationId: string): Promise<number>;
  
  getClasses(organizationId: string): Promise<Class[]>;
  getClassById(id: string): Promise<Class | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: string, classData: Partial<InsertClass>): Promise<void>;
  deleteClass(id: string): Promise<void>;
  
  getClassSchedules(organizationId: string, startDate?: Date, endDate?: Date): Promise<ClassSchedule[]>;
  createClassSchedule(schedule: InsertClassSchedule): Promise<ClassSchedule>;
  
  getAttendance(organizationId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
  getAttendanceByStudent(studentId: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  
  getRevenue(organizationId: string, startDate?: Date, endDate?: Date): Promise<Revenue[]>;
  createRevenue(revenue: InsertRevenue): Promise<Revenue>;
  getRevenueStats(organizationId: string, startDate: Date, endDate: Date): Promise<{ total: number; count: number }>;
  
  createAIQuery(query: InsertAIQuery): Promise<AIQuery>;
  getAIQueries(organizationId: string, limit?: number): Promise<AIQuery[]>;
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

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return result[0];
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const result = await db.insert(organizations).values(org).returning();
    return result[0];
  }

  async updateOrganizationTokens(id: string, accessToken: string, refreshToken: string): Promise<void> {
    await db.update(organizations)
      .set({ mindbodyAccessToken: accessToken, mindbodyRefreshToken: refreshToken })
      .where(eq(organizations.id, id));
  }

  async getStudents(organizationId: string, limit: number = 100, offset: number = 0): Promise<Student[]> {
    return await db.select()
      .from(students)
      .where(eq(students.organizationId, organizationId))
      .limit(limit)
      .offset(offset);
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

  async getStudentCount(organizationId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(students)
      .where(eq(students.organizationId, organizationId));
    return Number(result[0].count);
  }

  async getClasses(organizationId: string): Promise<Class[]> {
    return await db.select()
      .from(classes)
      .where(eq(classes.organizationId, organizationId));
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

  async getClassSchedules(organizationId: string, startDate?: Date, endDate?: Date): Promise<ClassSchedule[]> {
    let query = db.select().from(classSchedules).where(eq(classSchedules.organizationId, organizationId));
    
    if (startDate && endDate) {
      query = query.where(
        and(
          eq(classSchedules.organizationId, organizationId),
          gte(classSchedules.startTime, startDate),
          lte(classSchedules.startTime, endDate)
        )
      );
    }
    
    return await query;
  }

  async createClassSchedule(schedule: InsertClassSchedule): Promise<ClassSchedule> {
    const result = await db.insert(classSchedules).values(schedule).returning();
    return result[0];
  }

  async getAttendance(organizationId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
    let query = db.select().from(attendance).where(eq(attendance.organizationId, organizationId));
    
    if (startDate && endDate) {
      query = query.where(
        and(
          eq(attendance.organizationId, organizationId),
          gte(attendance.attendedAt, startDate),
          lte(attendance.attendedAt, endDate)
        )
      );
    }
    
    return await query.orderBy(desc(attendance.attendedAt));
  }

  async getAttendanceByStudent(studentId: string): Promise<Attendance[]> {
    return await db.select()
      .from(attendance)
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(attendance.attendedAt));
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const result = await db.insert(attendance).values(attendanceData).returning();
    return result[0];
  }

  async getRevenue(organizationId: string, startDate?: Date, endDate?: Date): Promise<Revenue[]> {
    let query = db.select().from(revenue).where(eq(revenue.organizationId, organizationId));
    
    if (startDate && endDate) {
      query = query.where(
        and(
          eq(revenue.organizationId, organizationId),
          gte(revenue.transactionDate, startDate),
          lte(revenue.transactionDate, endDate)
        )
      );
    }
    
    return await query.orderBy(desc(revenue.transactionDate));
  }

  async createRevenue(revenueData: InsertRevenue): Promise<Revenue> {
    const result = await db.insert(revenue).values(revenueData).returning();
    return result[0];
  }

  async getRevenueStats(organizationId: string, startDate: Date, endDate: Date): Promise<{ total: number; count: number }> {
    const result = await db.select({
      total: sql<number>`sum(${revenue.amount})`,
      count: sql<number>`count(*)`
    })
    .from(revenue)
    .where(
      and(
        eq(revenue.organizationId, organizationId),
        gte(revenue.transactionDate, startDate),
        lte(revenue.transactionDate, endDate)
      )
    );
    
    return {
      total: Number(result[0].total || 0),
      count: Number(result[0].count || 0)
    };
  }

  async createAIQuery(query: InsertAIQuery): Promise<AIQuery> {
    const result = await db.insert(aiQueries).values(query).returning();
    return result[0];
  }

  async getAIQueries(organizationId: string, limit: number = 10): Promise<AIQuery[]> {
    return await db.select()
      .from(aiQueries)
      .where(eq(aiQueries.organizationId, organizationId))
      .orderBy(desc(aiQueries.createdAt))
      .limit(limit);
  }
}

export const storage = new DbStorage();
