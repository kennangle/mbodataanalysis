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
  getMonthlyRevenueTrend(organizationId: string): Promise<Array<{ month: string; revenue: number; students: number }>>;
  getAttendanceByTimeSlot(organizationId: string): Promise<Array<{ day: string; morning: number; afternoon: number; evening: number }>>;
  
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
    if (startDate && endDate) {
      return await db.select()
        .from(classSchedules)
        .where(
          and(
            eq(classSchedules.organizationId, organizationId),
            gte(classSchedules.startTime, startDate),
            lte(classSchedules.startTime, endDate)
          )
        );
    }
    
    return await db.select()
      .from(classSchedules)
      .where(eq(classSchedules.organizationId, organizationId));
  }

  async createClassSchedule(schedule: InsertClassSchedule): Promise<ClassSchedule> {
    const result = await db.insert(classSchedules).values(schedule).returning();
    return result[0];
  }

  async getAttendance(organizationId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
    if (startDate && endDate) {
      return await db.select()
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
    
    return await db.select()
      .from(attendance)
      .where(eq(attendance.organizationId, organizationId))
      .orderBy(desc(attendance.attendedAt));
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
    if (startDate && endDate) {
      return await db.select()
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
    
    return await db.select()
      .from(revenue)
      .where(eq(revenue.organizationId, organizationId))
      .orderBy(desc(revenue.transactionDate));
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

  async getMonthlyRevenueTrend(organizationId: string): Promise<Array<{ month: string; revenue: number; students: number }>> {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    
    const revenueByMonth = await db.select({
      monthNum: sql<number>`extract(month from ${revenue.transactionDate})`,
      yearNum: sql<number>`extract(year from ${revenue.transactionDate})`,
      total: sql<number>`sum(${revenue.amount})`
    })
    .from(revenue)
    .where(
      and(
        eq(revenue.organizationId, organizationId),
        gte(revenue.transactionDate, oneYearAgo)
      )
    )
    .groupBy(
      sql`extract(month from ${revenue.transactionDate})`,
      sql`extract(year from ${revenue.transactionDate})`
    );
    
    const studentCount = await db.select({
      count: sql<number>`count(distinct ${students.id})`
    })
    .from(students)
    .where(eq(students.organizationId, organizationId));
    
    const totalStudents = Number(studentCount[0]?.count || 0);
    const revenueMap = new Map(
      revenueByMonth.map(r => [`${r.yearNum}-${r.monthNum}`, Number(r.total || 0)])
    );
    
    const monthsData = [];
    const currentYear = now.getFullYear();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const key = `${year}-${month}`;
      
      const monthName = monthDate.toLocaleString('en-US', { month: 'short' });
      const displayMonth = year !== currentYear ? `${monthName} ${year}` : monthName;
      
      monthsData.push({
        month: displayMonth,
        revenue: revenueMap.get(key) || 0,
        students: totalStudents
      });
    }
    
    return monthsData;
  }

  async getAttendanceByTimeSlot(organizationId: string): Promise<Array<{ day: string; morning: number; afternoon: number; evening: number }>> {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const result = await db.select({
      dayOfWeek: sql<number>`extract(dow from ${classSchedules.startTime})`,
      timeSlot: sql<string>`
        CASE 
          WHEN extract(hour from ${classSchedules.startTime}) < 12 THEN 'morning'
          WHEN extract(hour from ${classSchedules.startTime}) < 17 THEN 'afternoon'
          ELSE 'evening'
        END
      `,
      count: sql<number>`count(*)`
    })
    .from(attendance)
    .innerJoin(classSchedules, eq(attendance.scheduleId, classSchedules.id))
    .where(
      and(
        eq(attendance.organizationId, organizationId),
        eq(classSchedules.organizationId, organizationId)
      )
    )
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
    
    const dayData = daysOfWeek.map(day => ({
      day,
      morning: 0,
      afternoon: 0,
      evening: 0
    }));
    
    result.forEach(r => {
      const dayIndex = Number(r.dayOfWeek);
      const timeSlot = r.timeSlot as 'morning' | 'afternoon' | 'evening';
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
    return await db.select()
      .from(aiQueries)
      .where(eq(aiQueries.organizationId, organizationId))
      .orderBy(desc(aiQueries.createdAt))
      .limit(limit);
  }
}

export const storage = new DbStorage();
