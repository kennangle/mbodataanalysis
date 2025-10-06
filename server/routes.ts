import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { insertStudentSchema, insertClassSchema, insertAttendanceSchema, insertRevenueSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import type { User } from "@shared/schema";
import { MindbodyService } from "./mindbody";
import { createSampleData } from "./sample-data";

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

      const useSampleData = req.body.useSampleData === true;

      if (useSampleData) {
        const stats = await createSampleData(organizationId);
        return res.json({
          success: true,
          message: "Sample data imported successfully",
          stats
        });
      }

      const mindbodyService = new MindbodyService();
      
      const [studentsImported, classesImported, visitsImported, salesImported] = await Promise.all([
        mindbodyService.importClients(organizationId),
        mindbodyService.importClasses(organizationId),
        mindbodyService.importVisits(organizationId),
        mindbodyService.importSales(organizationId)
      ]);

      res.json({
        success: true,
        message: "Data import completed",
        stats: {
          students: studentsImported,
          classes: classesImported,
          attendance: visitsImported,
          revenue: salesImported
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

      const result = { response: "This is a simulated AI response. To enable real AI insights, please configure your OpenAI API key.", tokensUsed: 0 };

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

  const httpServer = createServer(app);
  return httpServer;
}
