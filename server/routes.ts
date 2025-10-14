import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { insertStudentSchema, insertClassSchema, insertAttendanceSchema, insertRevenueSchema, organizations } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import type { User } from "@shared/schema";
import { MindbodyService } from "./mindbody";
import { createSampleData } from "./sample-data";
import { openaiService } from "./openai";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.get("/api/students", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const students = await storage.getStudents(organizationId, limit, offset);
      const count = await storage.getStudentCount(organizationId);
      
      res.json({ students, count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  app.get("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const student = await storage.getStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      if (student.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student" });
    }
  });

  app.post("/api/students", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = insertStudentSchema.safeParse({ ...req.body, organizationId });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      const student = await storage.createStudent(validation.data);
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to create student" });
    }
  });

  app.patch("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const student = await storage.getStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      if (student.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const validation = insertStudentSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      await storage.updateStudent(req.params.id, validation.data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const student = await storage.getStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      if (student.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await storage.deleteStudent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  app.get("/api/classes", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const classes = await storage.getClasses(organizationId);
      res.json(classes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  app.post("/api/classes", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = insertClassSchema.safeParse({ ...req.body, organizationId });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      const classData = await storage.createClass(validation.data);
      res.json(classData);
    } catch (error) {
      res.status(500).json({ error: "Failed to create class" });
    }
  });

  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const attendance = await storage.getAttendance(organizationId, startDate, endDate);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = insertAttendanceSchema.safeParse({ ...req.body, organizationId });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      const attendance = await storage.createAttendance(validation.data);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Failed to create attendance record" });
    }
  });

  app.get("/api/revenue", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const revenue = await storage.getRevenue(organizationId, startDate, endDate);
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue" });
    }
  });

  app.get("/api/revenue/stats", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const stats = await storage.getRevenueStats(organizationId, startDate, endDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue stats" });
    }
  });

  app.post("/api/revenue", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = insertRevenueSchema.safeParse({ ...req.body, organizationId });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      const revenue = await storage.createRevenue(validation.data);
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ error: "Failed to create revenue record" });
    }
  });

  app.get("/api/mindbody/auth-url", requireAuth, async (req, res) => {
    try {
      const siteId = req.query.siteId as string;
      
      if (!siteId) {
        return res.status(400).json({ error: "siteId is required" });
      }

      const clientId = process.env.MINDBODY_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: "MINDBODY_CLIENT_ID not configured" });
      }

      let redirectUri = 'http://localhost:5000/api/mindbody/callback';
      if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(',');
        redirectUri = `https://${domains[0]}/api/mindbody/callback`;
      }
      
      const nonce = Math.random().toString(36).substring(7);
      const authUrl = `https://signin.mindbodyonline.com/connect/authorize?` +
        `response_mode=form_post` +
        `&response_type=code%20id_token` +
        `&client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=email%20profile%20openid%20offline_access%20Mindbody.Api.Public.v6` +
        `&nonce=${nonce}` +
        `&subscriberId=${siteId}`;

      res.json({ authUrl });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate auth URL";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/mindbody/callback", async (req, res) => {
    try {
      const code = req.body.code as string;
      const idToken = req.body.id_token as string;
      
      if (!code) {
        console.error("Missing authorization code in callback");
        return res.redirect("/import?error=missing_code");
      }

      const user = req.user as User;
      if (!user?.organizationId) {
        console.error("User not authenticated in callback");
        return res.redirect("/login?error=unauthorized");
      }

      const org = await storage.getOrganization(user.organizationId);
      if (!org) {
        console.error("Organization not found in callback");
        return res.redirect("/import?error=org_not_found");
      }

      const mindbodyService = new MindbodyService();
      await mindbodyService.exchangeCodeForTokens(code, user.organizationId);

      console.log("Mindbody OAuth successful for organization:", user.organizationId);
      res.redirect("/import?success=connected");
    } catch (error) {
      console.error("Mindbody OAuth callback error:", error);
      res.redirect("/import?error=connection_failed");
    }
  });

  app.post("/api/mindbody/connect", requireAuth, async (req, res) => {
    try {
      const { code, siteId } = req.body;
      const organizationId = (req.user as User)?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!code || !siteId) {
        return res.status(400).json({ error: "Code and siteId are required" });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const mindbodyService = new MindbodyService();
      await mindbodyService.exchangeCodeForTokens(code, organizationId);

      res.json({ success: true, message: "Mindbody account connected successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect Mindbody account";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/mindbody/import", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { useSampleData, config } = req.body;
      console.log("Import request - useSampleData:", useSampleData, "config:", config);

      if (useSampleData) {
        console.log("Creating sample data for org:", organizationId);
        const stats = await createSampleData(organizationId);
        console.log("Sample data created:", stats);
        return res.json({
          success: true,
          message: "Sample data imported successfully",
          stats
        });
      }

      const mindbodyService = new MindbodyService();
      const stats = await mindbodyService.importAllData(organizationId, config);

      const importedTypes = [];
      if (stats.clients > 0) importedTypes.push(`${stats.clients} clients`);
      if (stats.classes > 0) importedTypes.push(`${stats.classes} classes`);
      if (stats.visits > 0) importedTypes.push(`${stats.visits} visits`);
      if (stats.sales > 0) importedTypes.push(`${stats.sales} sales`);

      const message = importedTypes.length > 0 
        ? `Successfully imported ${importedTypes.join(', ')} from Mindbody`
        : 'No data imported - please select at least one data type';

      res.json({
        success: true,
        message,
        stats: {
          students: stats.clients,
          classes: stats.classes,
          attendance: stats.visits,
          revenue: stats.sales
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to import Mindbody data";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/ai/query", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;
      
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { query } = req.body;
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ error: "Query is required" });
      }

      if (query.length > 500) {
        return res.status(400).json({ error: "Query too long (max 500 characters)" });
      }

      const result = await openaiService.generateInsight(organizationId, userId, query);

      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate AI insight";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/ai/usage", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      res.json({
        queriesThisMonth: 0,
        tokensThisMonth: 0,
        queryLimit: 1000,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        studentCount,
        revenueStats,
        lastMonthRevenueStats,
        attendanceRecords,
        lastMonthAttendanceRecords,
        classes
      ] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getRevenueStats(organizationId, thisMonth, now),
        storage.getRevenueStats(organizationId, lastMonth, thisMonth),
        storage.getAttendance(organizationId, thisMonth, now),
        storage.getAttendance(organizationId, lastMonth, thisMonth),
        storage.getClasses(organizationId)
      ]);

      const attendanceRate = attendanceRecords.length > 0 
        ? (attendanceRecords.filter(a => a.status === 'attended').length / attendanceRecords.length) * 100 
        : 0;
      
      const lastMonthAttendanceRate = lastMonthAttendanceRecords.length > 0
        ? (lastMonthAttendanceRecords.filter(a => a.status === 'attended').length / lastMonthAttendanceRecords.length) * 100
        : 0;

      const revenueChange = lastMonthRevenueStats.total > 0
        ? ((revenueStats.total - lastMonthRevenueStats.total) / lastMonthRevenueStats.total) * 100
        : 0;

      const attendanceChange = lastMonthAttendanceRate > 0
        ? attendanceRate - lastMonthAttendanceRate
        : 0;

      res.json({
        totalRevenue: revenueStats.total,
        revenueChange: revenueChange.toFixed(1),
        activeStudents: studentCount,
        studentChange: "+12.5",
        attendanceRate: attendanceRate.toFixed(1),
        attendanceChange: attendanceChange.toFixed(1),
        classesThisMonth: classes.length,
        classChange: "+8.2"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/revenue-trend", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = await storage.getMonthlyRevenueTrend(organizationId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue trend" });
    }
  });

  app.get("/api/dashboard/attendance-by-time", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = await storage.getAttendanceByTimeSlot(organizationId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance by time" });
    }
  });

  // Report Generation Endpoints
  app.get("/api/reports/revenue", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const revenueData = await storage.getRevenue(organizationId);
      
      const csv = [
        "Date,Description,Amount,Type",
        ...revenueData.map(r => 
          `${r.transactionDate.toISOString().split('T')[0]},"${r.description || 'N/A'}",${r.amount},"${r.type}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="revenue-report-${new Date().toISOString().split('T')[0]}.csv"`);
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

      const attendanceData = await storage.getAttendance(organizationId);
      const studentsMap = new Map();
      const classesMap = new Map();
      const scheduleToClassMap = new Map();

      const students = await storage.getStudents(organizationId);
      const classes = await storage.getClasses(organizationId);
      const schedules = await storage.getClassSchedules(organizationId);
      
      students.forEach(s => studentsMap.set(s.id, `${s.firstName} ${s.lastName}`));
      classes.forEach(c => classesMap.set(c.id, c.name));
      schedules.forEach(sch => scheduleToClassMap.set(sch.id, sch.classId));

      const csv = [
        "Date,Student,Class,Status",
        ...attendanceData.map(a => {
          const studentName = studentsMap.get(a.studentId) || 'Unknown';
          const classId = scheduleToClassMap.get(a.scheduleId);
          const className = classId ? (classesMap.get(classId) || 'Unknown') : 'Unknown';
          return `${a.attendedAt.toISOString().split('T')[0]},"${studentName}","${className}","${a.status}"`;
        })
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${new Date().toISOString().split('T')[0]}.csv"`);
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

      const classes = await storage.getClasses(organizationId);
      const attendanceData = await storage.getAttendance(organizationId);
      const schedules = await storage.getClassSchedules(organizationId);
      
      const scheduleToClassMap = new Map();
      schedules.forEach(sch => scheduleToClassMap.set(sch.id, sch.classId));
      
      const classStats = classes.map(c => {
        const classAttendance = attendanceData.filter(a => {
          const classId = scheduleToClassMap.get(a.scheduleId);
          return classId === c.id;
        });
        const attended = classAttendance.filter(a => a.status === 'attended').length;
        const noShow = classAttendance.filter(a => a.status === 'no-show').length;
        const totalSessions = classAttendance.length;
        const attendanceRate = totalSessions > 0 ? (attended / totalSessions * 100).toFixed(1) : '0';
        
        return {
          name: c.name,
          instructor: c.instructorName || 'N/A',
          capacity: c.capacity || 0,
          totalSessions,
          attended,
          noShow,
          attendanceRate
        };
      });

      const csv = [
        "Class Name,Instructor,Capacity,Total Sessions,Attended,No-Show,Attendance Rate %",
        ...classStats.map(s => 
          `"${s.name}","${s.instructor}",${s.capacity},${s.totalSessions},${s.attended},${s.noShow},${s.attendanceRate}`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="class-performance-${new Date().toISOString().split('T')[0]}.csv"`);
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

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [studentCount, revenueStats, attendanceRecords, classes] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getRevenueStats(organizationId, thisMonth, now),
        storage.getAttendance(organizationId, thisMonth, now),
        storage.getClasses(organizationId)
      ]);

      const attendedCount = attendanceRecords.filter(a => a.status === 'attended').length;
      const noShowCount = attendanceRecords.filter(a => a.status === 'no-show').length;
      const attendanceRate = attendanceRecords.length > 0 
        ? ((attendedCount / attendanceRecords.length) * 100).toFixed(1) 
        : '0';

      const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const csv = [
        "Metric,Value",
        `"Period","${monthName}"`,
        `"Total Students","${studentCount}"`,
        `"Total Classes","${classes.length}"`,
        `"Total Revenue","$${revenueStats.total.toFixed(2)}"`,
        `"Revenue Transactions","${revenueStats.count}"`,
        `"Total Attendance Records","${attendanceRecords.length}"`,
        `"Attended Sessions","${attendedCount}"`,
        `"No-Show Sessions","${noShowCount}"`,
        `"Attendance Rate","${attendanceRate}%"`
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-summary-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate monthly summary" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
