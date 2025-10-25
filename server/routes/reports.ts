import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";
import { addDays } from "date-fns";

export function registerReportRoutes(app: Express) {
  // Report Generation Endpoints
  app.get("/api/reports/revenue", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;
      let queryEndDate: Date | undefined;

      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ error: "Invalid startDate format" });
        }
      }

      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ error: "Invalid endDate format" });
        }
      }

      // Validate date range before any modifications
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }

      // Make end date inclusive by adding one day for query
      if (endDate) {
        queryEndDate = addDays(endDate, 1);
      }

      const revenueData = await storage.getRevenue(organizationId, startDate, queryEndDate);

      const csv = [
        "Date,Description,Amount,Type",
        ...revenueData.map(
          (r) =>
            `${r.transactionDate.toISOString().split("T")[0]},"${r.description || "N/A"}",${r.amount},"${r.type}"`
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="revenue-report-${new Date().toISOString().split("T")[0]}.csv"`
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate revenue report" });
    }
  });

  app.get("/api/reports/attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;
      let queryEndDate: Date | undefined;

      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ error: "Invalid startDate format" });
        }
      }

      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ error: "Invalid endDate format" });
        }
      }

      // Validate date range before any modifications
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }

      // Make end date inclusive by adding one day for query
      if (endDate) {
        queryEndDate = addDays(endDate, 1);
      }

      const attendanceData = await storage.getAttendance(organizationId, startDate, queryEndDate);
      const studentsMap = new Map();
      const classesMap = new Map();
      const scheduleToClassMap = new Map();

      // Fetch ALL students without limit for report generation
      const students = await storage.getStudents(organizationId, 1000000, 0);
      const classes = await storage.getClasses(organizationId);
      const schedules = await storage.getClassSchedules(organizationId);

      students.forEach((s) => studentsMap.set(s.id, `${s.firstName} ${s.lastName}`));
      classes.forEach((c) => classesMap.set(c.id, c.name));
      schedules.forEach((sch) => scheduleToClassMap.set(sch.id, sch.classId));

      const csv = [
        "Date,Student,Class,Status",
        ...attendanceData.map((a) => {
          const studentName = studentsMap.get(a.studentId) || "Unknown";
          const classId = scheduleToClassMap.get(a.scheduleId);
          const className = classId ? classesMap.get(classId) || "Unknown" : "Unknown";
          return `${a.attendedAt.toISOString().split("T")[0]},"${studentName}","${className}","${a.status}"`;
        }),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="attendance-report-${new Date().toISOString().split("T")[0]}.csv"`
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate attendance report" });
    }
  });

  app.get("/api/reports/class-performance", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;
      let queryEndDate: Date | undefined;

      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ error: "Invalid startDate format" });
        }
      }

      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ error: "Invalid endDate format" });
        }
      }

      // Validate date range before any modifications
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }

      // Make end date inclusive by adding one day for query
      if (endDate) {
        queryEndDate = addDays(endDate, 1);
      }

      const classes = await storage.getClasses(organizationId);
      const attendanceData = await storage.getAttendance(organizationId, startDate, queryEndDate);
      const schedules = await storage.getClassSchedules(organizationId);

      const scheduleToClassMap = new Map();
      schedules.forEach((sch) => scheduleToClassMap.set(sch.id, sch.classId));

      const classStats = classes.map((c) => {
        const classAttendance = attendanceData.filter((a) => {
          const classId = scheduleToClassMap.get(a.scheduleId);
          return classId === c.id;
        });
        const attended = classAttendance.filter((a) => a.status === "attended").length;
        const noShow = classAttendance.filter((a) => a.status === "no-show").length;
        const totalSessions = classAttendance.length;
        const attendanceRate =
          totalSessions > 0 ? ((attended / totalSessions) * 100).toFixed(1) : "0";

        return {
          name: c.name,
          instructor: c.instructorName || "N/A",
          capacity: c.capacity || 0,
          totalSessions,
          attended,
          noShow,
          attendanceRate,
        };
      });

      const csv = [
        "Class Name,Instructor,Capacity,Total Sessions,Attended,No-Show,Attendance Rate %",
        ...classStats.map(
          (s) =>
            `"${s.name}","${s.instructor}",${s.capacity},${s.totalSessions},${s.attended},${s.noShow},${s.attendanceRate}`
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="class-performance-${new Date().toISOString().split("T")[0]}.csv"`
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate class performance report" });
    }
  });

  app.get("/api/reports/monthly-summary", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ error: "Invalid startDate format" });
        }
      }

      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ error: "Invalid endDate format" });
        }
      }

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }

      // Use provided dates or default to current month
      const now = new Date();
      const periodStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
      let periodEnd = endDate || now;
      
      // Make end date inclusive by adding one day for attendance queries
      // Note: getRevenueStats already handles +1 day internally, so pass periodEnd directly
      const queryEndDate = addDays(periodEnd, 1);

      const [studentCount, revenueStats, attendanceRecords, classes] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getRevenueStats(organizationId, periodStart, periodEnd),
        storage.getAttendance(organizationId, periodStart, queryEndDate),
        storage.getClasses(organizationId),
      ]);

      const attendedCount = attendanceRecords.filter((a) => a.status === "attended").length;
      const noShowCount = attendanceRecords.filter((a) => a.status === "no-show").length;
      const attendanceRate =
        attendanceRecords.length > 0
          ? ((attendedCount / attendanceRecords.length) * 100).toFixed(1)
          : "0";

      const periodName = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;

      const csv = [
        "Metric,Value",
        `"Period","${periodName}"`,
        `"Total Students","${studentCount}"`,
        `"Total Classes","${classes.length}"`,
        `"Total Revenue","$${revenueStats.total.toFixed(2)}"`,
        `"Revenue Transactions","${revenueStats.count}"`,
        `"Total Attendance Records","${attendanceRecords.length}"`,
        `"Attended Sessions","${attendedCount}"`,
        `"No-Show Sessions","${noShowCount}"`,
        `"Attendance Rate","${attendanceRate}%"`,
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="monthly-summary-${new Date().toISOString().split("T")[0]}.csv"`
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate monthly summary" });
    }
  });

  // Data Coverage Report - Diagnostic endpoint
  app.get("/api/reports/data-coverage", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch all data (use high limit for students to get complete dataset)
      const [students, classes, schedules, attendance, revenue] = await Promise.all([
        storage.getStudents(organizationId, 1000000, 0),
        storage.getClasses(organizationId),
        storage.getClassSchedules(organizationId),
        storage.getAttendance(organizationId),
        storage.getRevenue(organizationId),
      ]);

      // Find orphaned attendance records (studentId not in students table)
      const studentIds = new Set(students.map(s => s.id));
      const orphanedAttendance = attendance.filter(a => !studentIds.has(a.studentId));

      // Calculate date ranges
      const getDateRange = (records: Array<{ createdAt: Date }>) => {
        if (records.length === 0) return { earliest: null, latest: null };
        const dates = records.map(r => r.createdAt.getTime());
        return {
          earliest: new Date(Math.min(...dates)),
          latest: new Date(Math.max(...dates)),
        };
      };

      const attendanceDateRange = attendance.length > 0 ? {
        earliest: new Date(Math.min(...attendance.map(a => a.attendedAt.getTime()))),
        latest: new Date(Math.max(...attendance.map(a => a.attendedAt.getTime()))),
      } : { earliest: null, latest: null };

      const revenueDateRange = revenue.length > 0 ? {
        earliest: new Date(Math.min(...revenue.map(r => r.transactionDate.getTime()))),
        latest: new Date(Math.max(...revenue.map(r => r.transactionDate.getTime()))),
      } : { earliest: null, latest: null };

      // Monthly attendance breakdown
      const attendanceByMonth = new Map<string, number>();
      attendance.forEach(a => {
        const monthKey = a.attendedAt.toISOString().substring(0, 7); // YYYY-MM
        attendanceByMonth.set(monthKey, (attendanceByMonth.get(monthKey) || 0) + 1);
      });

      // Monthly revenue breakdown
      const revenueByMonth = new Map<string, number>();
      revenue.forEach(r => {
        const monthKey = r.transactionDate.toISOString().substring(0, 7);
        revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + 1);
      });

      res.json({
        summary: {
          students: {
            total: students.length,
            dateRange: getDateRange(students),
          },
          classes: {
            total: classes.length,
            dateRange: getDateRange(classes),
          },
          schedules: {
            total: schedules.length,
            dateRange: getDateRange(schedules),
          },
          attendance: {
            total: attendance.length,
            attended: attendance.filter(a => a.status === "attended").length,
            noShow: attendance.filter(a => a.status === "no-show").length,
            orphaned: orphanedAttendance.length,
            dateRange: attendanceDateRange,
          },
          revenue: {
            total: revenue.length,
            totalAmount: revenue.reduce((sum, r) => sum + parseFloat(r.amount), 0),
            dateRange: revenueDateRange,
          },
        },
        monthlyBreakdown: {
          attendance: Array.from(attendanceByMonth.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, count]) => ({ month, count })),
          revenue: Array.from(revenueByMonth.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, count]) => ({ month, count })),
        },
        dataQuality: {
          orphanedAttendanceRecords: orphanedAttendance.length,
          studentsWithoutAttendance: students.filter(s => 
            !attendance.some(a => a.studentId === s.id)
          ).length,
          classesWithoutSchedules: classes.filter(c =>
            !schedules.some(sch => sch.classId === c.id)
          ).length,
        },
      });
    } catch (error) {
      console.error("Data coverage report error:", error);
      res.status(500).json({ error: "Failed to generate data coverage report" });
    }
  });

  // Quick Stats Dashboard
  app.get("/api/reports/quick-stats", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [
        studentCount,
        classCount,
        attendanceRecords,
        revenueStats,
      ] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getClasses(organizationId),
        storage.getAttendance(organizationId),
        storage.getRevenue(organizationId),
      ]);

      // Get latest import dates (use reduce to avoid stack overflow with large datasets)
      const latestAttendance = attendanceRecords.length > 0
        ? new Date(attendanceRecords.reduce((max, a) => {
            const time = a.createdAt.getTime();
            return time > max ? time : max;
          }, 0))
        : null;

      const latestRevenue = revenueStats.length > 0
        ? new Date(revenueStats.reduce((max, r) => {
            const time = r.createdAt.getTime();
            return time > max ? time : max;
          }, 0))
        : null;

      res.json({
        totalStudents: studentCount,
        totalClasses: classCount.length,
        totalAttendance: attendanceRecords.length,
        totalRevenue: revenueStats.reduce((sum, r) => sum + parseFloat(r.amount), 0),
        revenueTransactions: revenueStats.length,
        latestImports: {
          attendance: latestAttendance,
          revenue: latestRevenue,
        },
      });
    } catch (error) {
      console.error("Quick stats error:", error);
      res.status(500).json({ error: "Failed to fetch quick stats" });
    }
  });
}
