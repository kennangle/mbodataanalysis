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

      const students = await storage.getStudents(organizationId);
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
}
