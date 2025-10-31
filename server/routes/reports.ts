import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";

// Helper to set date to end of day (23:59:59.999) to include full day
function setEndOfDay(date: Date): Date {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

export function registerReportRoutes(app: Express) {
  // FIX ENDPOINT - Deletes all attendance to prepare for re-import
  app.post("/api/reports/fix-orphaned-attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get counts before deletion
      const totalAttendance = await storage.getAttendanceCount(organizationId);
      const orphanedAttendance = await storage.getOrphanedAttendanceCount(organizationId);

      // Delete all attendance records for this organization
      await storage.deleteAllAttendance(organizationId);

      res.json({
        success: true,
        message: "All attendance records deleted. You can now re-import from Mindbody to rebuild with correct student links.",
        deleted: {
          totalRecords: totalAttendance,
          orphanedRecords: orphanedAttendance,
          orphanedPercentage: totalAttendance > 0 ? ((orphanedAttendance / totalAttendance) * 100).toFixed(2) + '%' : '0%'
        },
        nextStep: "Go to Data Import page and import Visits/Attendance data"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  // DIAGNOSTIC ENDPOINT - Shows what production database actually has
  app.get("/api/reports/diagnostic", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get sample data from Dec 31, 2024
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2025-01-01');
      
      const attendanceData = await storage.getAttendanceWithDetails(organizationId, startDate, endDate);
      
      // Get database counts
      const totalStudents = await storage.getStudentCount(organizationId);
      const totalAttendance = await storage.getAttendanceCount(organizationId);
      const orphanedAttendance = await storage.getOrphanedAttendanceCount(organizationId);
      
      const diagnostic = {
        databaseCounts: {
          totalStudents,
          totalAttendance,
          orphanedAttendance,
          orphanedPercentage: totalAttendance > 0 ? ((orphanedAttendance / totalAttendance) * 100).toFixed(2) + '%' : '0%'
        },
        attendanceQuery: {
          databaseQuery: "getAttendanceWithDetails with LEFT JOIN",
          dateRange: "2024-12-31 to 2025-01-01",
          totalRecords: attendanceData.length,
          recordsWithNames: attendanceData.filter(a => a.studentFirstName && a.studentLastName).length,
          recordsWithoutNames: attendanceData.filter(a => !a.studentFirstName || !a.studentLastName).length,
          sampleRecordsWithNames: attendanceData
            .filter(a => a.studentFirstName && a.studentLastName)
            .slice(0, 5)
            .map(a => ({
              firstName: a.studentFirstName,
              lastName: a.studentLastName,
              className: a.className,
              date: a.attendedAt.toISOString()
            })),
          sampleRecordsWithoutNames: attendanceData
            .filter(a => !a.studentFirstName || !a.studentLastName)
            .slice(0, 5)
            .map(a => ({
              firstName: a.studentFirstName,
              lastName: a.studentLastName,
              className: a.className,
              date: a.attendedAt.toISOString()
            }))
        }
      };

      res.json(diagnostic);
    } catch (error: any) {
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  // Report Generation Endpoints
  app.get("/api/reports/revenue", requireAuth, async (req, res) => {
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
        // Set to end of day (23:59:59.999) to include the full day
        endDate = setEndOfDay(endDate);
      }

      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }

      const revenueData = await storage.getRevenue(organizationId, startDate, endDate);

      const csv = [
        "Date,Description,Amount,Type,Is Fee",
        ...revenueData.map(
          (r) =>
            `${r.transactionDate.toISOString().split("T")[0]},"${r.description || "N/A"}",${r.amount},"${r.type}","${r.isFee ? 'Yes' : 'No'}"`
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
        // Set to end of day (23:59:59.999) to include the full day
        endDate = setEndOfDay(endDate);
      }

      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }

      // Use efficient JOIN query to get attendance with student and class names
      const attendanceData = await storage.getAttendanceWithDetails(organizationId, startDate, endDate);

      // DIAGNOSTIC LOGGING FOR PRODUCTION DEBUG
      console.log('[ATTENDANCE REPORT DEBUG]', {
        totalRecords: attendanceData.length,
        sampleRecords: attendanceData.slice(0, 5).map(a => ({
          firstName: a.studentFirstName,
          lastName: a.studentLastName,
          className: a.className,
          date: a.attendedAt
        })),
        nullNameCount: attendanceData.filter(a => !a.studentFirstName || !a.studentLastName).length,
        hasNameCount: attendanceData.filter(a => a.studentFirstName && a.studentLastName).length
      });

      const csv = [
        "Date,Student,Class,Status",
        ...attendanceData.map((a) => {
          const studentName = a.studentFirstName && a.studentLastName 
            ? `${a.studentFirstName} ${a.studentLastName}` 
            : "Unknown";
          const className = a.className || "Unknown";
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
        // Set to end of day (23:59:59.999) to include the full day
        endDate = setEndOfDay(endDate);
      }

      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }

      const classes = await storage.getClasses(organizationId);
      const attendanceData = await storage.getAttendance(organizationId, startDate, endDate);
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
      
      // Set end date to end of day to include the full day
      periodEnd = setEndOfDay(periodEnd);

      const [studentCount, revenueStats, attendanceRecords, classes] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getRevenueStats(organizationId, periodStart, periodEnd),
        storage.getAttendance(organizationId, periodStart, periodEnd),
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

      // Fetch data efficiently without loading all students into memory
      const [studentCount, classes, schedules, attendance, revenue, orphanedCount, studentsWithoutAttendance, classesWithoutSchedules] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getClasses(organizationId),
        storage.getClassSchedules(organizationId),
        storage.getAttendance(organizationId),
        storage.getRevenue(organizationId),
        storage.getOrphanedAttendanceCount(organizationId),
        storage.getStudentsWithoutAttendanceCount(organizationId),
        storage.getClassesWithoutSchedulesCount(organizationId),
      ]);

      // Calculate date ranges efficiently without spread operators for large arrays
      const getDateRange = (records: Array<{ createdAt: Date }>) => {
        if (records.length === 0) return { earliest: null, latest: null };
        const earliest = records.reduce((min, r) => r.createdAt < min ? r.createdAt : min, records[0].createdAt);
        const latest = records.reduce((max, r) => r.createdAt > max ? r.createdAt : max, records[0].createdAt);
        return { earliest, latest };
      };

      const attendanceDateRange = attendance.length > 0 ? {
        earliest: attendance.reduce((min, a) => a.attendedAt < min ? a.attendedAt : min, attendance[0].attendedAt),
        latest: attendance.reduce((max, a) => a.attendedAt > max ? a.attendedAt : max, attendance[0].attendedAt),
      } : { earliest: null, latest: null };

      const revenueDateRange = revenue.length > 0 ? {
        earliest: revenue.reduce((min, r) => r.transactionDate < min ? r.transactionDate : min, revenue[0].transactionDate),
        latest: revenue.reduce((max, r) => r.transactionDate > max ? r.transactionDate : max, revenue[0].transactionDate),
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
            total: studentCount,
            dateRange: { earliest: null, latest: null },
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
            orphaned: orphanedCount,
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
          orphanedAttendanceRecords: orphanedCount,
          studentsWithoutAttendance: studentsWithoutAttendance,
          classesWithoutSchedules: classesWithoutSchedules,
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
