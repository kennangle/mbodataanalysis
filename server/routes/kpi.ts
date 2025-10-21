import type { Express } from "express";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";
import { db } from "../db";
import { students, revenue, classSchedules, attendance, classes } from "@shared/schema";
import { sql, and, gte, lte, eq, desc, isNotNull } from "drizzle-orm";

export function registerKPIRoutes(app: Express) {
  // KPI Overview: High-level metrics
  app.get("/api/kpi/overview", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Build date filters
      const dateFilter = [];
      if (startDate) dateFilter.push(gte(revenue.transactionDate, startDate));
      if (endDate) dateFilter.push(lte(revenue.transactionDate, endDate));

      // Total Revenue
      const revenueResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${revenue.amount}::numeric), 0)`,
        })
        .from(revenue)
        .where(
          and(
            eq(revenue.organizationId, organizationId),
            dateFilter.length > 0 ? and(...dateFilter) : undefined
          )
        );

      // Active Members: has membershipType AND status = 'active'
      const activeMembersResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(students)
        .where(
          and(
            eq(students.organizationId, organizationId),
            eq(students.status, "active"),
            isNotNull(students.membershipType)
          )
        );

      // Total Students
      const totalStudentsResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(students)
        .where(eq(students.organizationId, organizationId));

      // Churn Rate: inactive students who had memberships / total members who ever had memberships
      const churnedMembersResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(students)
        .where(
          and(
            eq(students.organizationId, organizationId),
            eq(students.status, "inactive"),
            isNotNull(students.membershipType)
          )
        );

      const totalMembersEverResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(students)
        .where(
          and(
            eq(students.organizationId, organizationId),
            isNotNull(students.membershipType)
          )
        );

      const totalRevenue = Number(revenueResult[0]?.total || 0);
      const activeMembers = Number(activeMembersResult[0]?.count || 0);
      const totalStudents = Number(totalStudentsResult[0]?.count || 0);
      const churnedMembers = Number(churnedMembersResult[0]?.count || 0);
      const totalMembersEver = Number(totalMembersEverResult[0]?.count || 0);

      const churnRate = totalMembersEver > 0 ? (churnedMembers / totalMembersEver) * 100 : 0;
      const retentionRate = 100 - churnRate;

      res.json({
        totalRevenue,
        activeMembers,
        totalStudents,
        churnRate: churnRate.toFixed(1),
        retentionRate: retentionRate.toFixed(1),
      });
    } catch (error) {
      console.error("KPI overview error:", error);
      res.status(500).json({ error: "Failed to fetch KPI overview" });
    }
  });

  // Utilization Heatmap: Average class utilization by day-of-week and hour
  app.get("/api/kpi/utilization-heatmap", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : new Date(Date.now() - 30 * 86400 * 1000); // Default 30 days
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : new Date();

      // CTE: Count attendance per schedule
      const attendanceCounts = db.$with("attendance_counts").as(
        db
          .select({
            scheduleId: attendance.scheduleId,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(attendance)
          .where(
            and(
              eq(attendance.organizationId, organizationId),
              eq(attendance.status, "attended")
            )
          )
          .groupBy(attendance.scheduleId)
      );

      // Main query: Join schedules with classes to get capacity, calculate utilization
      const heatmapData = await db
        .with(attendanceCounts)
        .select({
          dayOfWeek: sql<number>`EXTRACT(DOW FROM ${classSchedules.startTime})::int`,
          hour: sql<number>`EXTRACT(HOUR FROM ${classSchedules.startTime})::int`,
          avgUtilization: sql<number>`
            AVG(
              CASE 
                WHEN ${classes.capacity} IS NULL OR ${classes.capacity} = 0 THEN 0
                ELSE LEAST(100, (COALESCE(attendance_counts.count, 0)::decimal / ${classes.capacity}) * 100)
              END
            )
          `,
        })
        .from(classSchedules)
        .leftJoin(classes, eq(classSchedules.classId, classes.id))
        .leftJoin(attendanceCounts, eq(attendanceCounts.scheduleId, classSchedules.id))
        .where(
          and(
            eq(classSchedules.organizationId, organizationId),
            gte(classSchedules.startTime, startDate),
            lte(classSchedules.startTime, endDate)
          )
        )
        .groupBy(
          sql`EXTRACT(DOW FROM ${classSchedules.startTime})`,
          sql`EXTRACT(HOUR FROM ${classSchedules.startTime})`
        );

      res.json({ heatmapData });
    } catch (error) {
      console.error("Utilization heatmap error:", error);
      res.status(500).json({ error: "Failed to fetch utilization heatmap" });
    }
  });

  // Intro Conversion Funnel: Intro offers purchased → Membership conversions
  app.get("/api/kpi/intro-conversion", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const dateFilter = [];
      if (startDate) dateFilter.push(gte(revenue.transactionDate, startDate));
      if (endDate) dateFilter.push(lte(revenue.transactionDate, endDate));

      // Count intro offer line items (not distinct students) - matching Mindbody report
      // Filter out refunds (negative amounts) and exclude void/adjustment descriptions
      const introPurchases = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
          total: sql<number>`SUM(${revenue.amount}::numeric)`,
        })
        .from(revenue)
        .where(
          and(
            eq(revenue.organizationId, organizationId),
            sql`${revenue.description} ILIKE '%Intro%'`,
            sql`${revenue.amount} > 0`,
            dateFilter.length > 0 ? and(...dateFilter) : undefined
          )
        );

      // Find students who bought intro AND later got membership
      // Don't require active status - count anyone who converted (even if they later churned)
      const conversions = await db.execute<{ count: number }>(sql`
        SELECT COUNT(DISTINCT s.id)::int as count
        FROM ${students} s
        INNER JOIN ${revenue} r ON r.student_id = s.id
        WHERE s.organization_id = ${organizationId}
          AND s.membership_type IS NOT NULL
          AND r.description ILIKE '%Intro%'
          AND r.amount > 0
          ${dateFilter.length > 0 && startDate ? sql`AND r.transaction_date >= ${startDate}` : sql``}
          ${dateFilter.length > 0 && endDate ? sql`AND r.transaction_date <= ${endDate}` : sql``}
      `);

      const introBuyers = Number(introPurchases[0]?.count || 0);
      const introRevenue = Number(introPurchases[0]?.total || 0);
      const converted = Number(conversions[0]?.count || 0);
      const conversionRate = introBuyers > 0 ? (converted / introBuyers) * 100 : 0;

      res.json({
        introBuyers,
        introRevenue,
        converted,
        conversionRate: conversionRate.toFixed(1),
      });
    } catch (error) {
      console.error("Intro conversion error:", error);
      res.status(500).json({ error: "Failed to fetch intro conversion" });
    }
  });

  // Churn & Retention Trends: Monthly breakdown
  app.get("/api/kpi/churn-retention", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : new Date(Date.now() - 365 * 86400 * 1000); // Default 1 year
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : new Date();

      // Monthly active members count (snapshot approach - count active at end of each month)
      // This is a simplified version - would need historical snapshots for true accuracy
      const monthlyTrend = await db
        .select({
          month: sql<string>`TO_CHAR(${students.joinDate}, 'YYYY-MM')`,
          newMembers: sql<number>`COUNT(*)`,
        })
        .from(students)
        .where(
          and(
            eq(students.organizationId, organizationId),
            isNotNull(students.membershipType),
            isNotNull(students.joinDate),
            gte(students.joinDate, startDate),
            lte(students.joinDate, endDate)
          )
        )
        .groupBy(sql`TO_CHAR(${students.joinDate}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${students.joinDate}, 'YYYY-MM')`);

      res.json({ monthlyTrend });
    } catch (error) {
      console.error("Churn retention error:", error);
      res.status(500).json({ error: "Failed to fetch churn/retention trends" });
    }
  });

  // Class Performance: Rank classes by utilization %
  app.get("/api/kpi/class-performance", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : new Date(Date.now() - 30 * 86400 * 1000);
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : new Date();

      // CTE: Count attendance per schedule
      const attendanceCounts = db.$with("attendance_counts").as(
        db
          .select({
            scheduleId: attendance.scheduleId,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(attendance)
          .where(
            and(
              eq(attendance.organizationId, organizationId),
              eq(attendance.status, "attended")
            )
          )
          .groupBy(attendance.scheduleId)
      );

      // Calculate average utilization per class
      const classPerformance = await db
        .with(attendanceCounts)
        .select({
          classId: classes.id,
          className: classes.name,
          instructor: classes.instructorName,
          capacity: classes.capacity,
          totalScheduled: sql<number>`COUNT(${classSchedules.id})::int`,
          avgAttendance: sql<number>`AVG(COALESCE(attendance_counts.count, 0))`,
          avgUtilization: sql<number>`
            AVG(
              CASE 
                WHEN ${classes.capacity} IS NULL OR ${classes.capacity} = 0 THEN 0
                ELSE LEAST(100, (COALESCE(attendance_counts.count, 0)::decimal / ${classes.capacity}) * 100)
              END
            )
          `,
        })
        .from(classes)
        .innerJoin(classSchedules, eq(classSchedules.classId, classes.id))
        .leftJoin(attendanceCounts, eq(attendanceCounts.scheduleId, classSchedules.id))
        .where(
          and(
            eq(classes.organizationId, organizationId),
            gte(classSchedules.startTime, startDate),
            lte(classSchedules.startTime, endDate)
          )
        )
        .groupBy(classes.id, classes.name, classes.instructorName, classes.capacity)
        .orderBy(desc(sql`AVG(
          CASE 
            WHEN ${classes.capacity} IS NULL OR ${classes.capacity} = 0 THEN 0
            ELSE LEAST(100, (COALESCE(attendance_counts.count, 0)::decimal / ${classes.capacity}) * 100)
          END
        )`));

      // Add performance flags
      const TARGET_UTILIZATION = 80;
      const performanceWithFlags = classPerformance.map(cls => ({
        ...cls,
        avgUtilization: Number(cls.avgUtilization || 0).toFixed(1),
        avgAttendance: Number(cls.avgAttendance || 0).toFixed(1),
        isUnderperforming: Number(cls.avgUtilization || 0) < TARGET_UTILIZATION,
      }));

      res.json({ classPerformance: performanceWithFlags, targetUtilization: TARGET_UTILIZATION });
    } catch (error) {
      console.error("Class performance error:", error);
      res.status(500).json({ error: "Failed to fetch class performance" });
    }
  });

  // Membership Trends: New vs Active vs Churned over time
  app.get("/api/kpi/membership-trends", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : new Date(Date.now() - 365 * 86400 * 1000);
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : new Date();

      // Monthly new member signups
      const newMemberTrend = await db
        .select({
          month: sql<string>`TO_CHAR(${students.joinDate}, 'YYYY-MM')`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(students)
        .where(
          and(
            eq(students.organizationId, organizationId),
            isNotNull(students.membershipType),
            isNotNull(students.joinDate),
            gte(students.joinDate, startDate),
            lte(students.joinDate, endDate)
          )
        )
        .groupBy(sql`TO_CHAR(${students.joinDate}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${students.joinDate}, 'YYYY-MM')`);

      // Current snapshot
      const currentActive = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(students)
        .where(
          and(
            eq(students.organizationId, organizationId),
            eq(students.status, "active"),
            isNotNull(students.membershipType)
          )
        );

      const currentInactive = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(students)
        .where(
          and(
            eq(students.organizationId, organizationId),
            eq(students.status, "inactive"),
            isNotNull(students.membershipType)
          )
        );

      res.json({
        newMemberTrend,
        currentActive: Number(currentActive[0]?.count || 0),
        currentInactive: Number(currentInactive[0]?.count || 0),
      });
    } catch (error) {
      console.error("Membership trends error:", error);
      res.status(500).json({ error: "Failed to fetch membership trends" });
    }
  });
}
