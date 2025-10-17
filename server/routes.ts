import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { insertStudentSchema, insertClassSchema, insertAttendanceSchema, insertRevenueSchema, insertUserSchema, organizations, webhookSubscriptions } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import type { User } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
import { MindbodyService } from "./mindbody";
import { createSampleData } from "./sample-data";
import { openaiService } from "./openai";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // User management routes (admin only)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const organizationId = currentUser?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Only admins can manage users
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const users = await storage.getUsers(organizationId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const organizationId = currentUser?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Only admins can create users
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { password, ...userData } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      // Hash password
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const passwordHash = `${buf.toString("hex")}.${salt}`;

      // Force organizationId to match current user's organization (prevent tenant boundary violation)
      const validation = insertUserSchema.safeParse({ 
        ...userData, 
        passwordHash,
        organizationId // Use authenticated user's organization, ignore client input
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      const user = await storage.createUser(validation.data);
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      if (error?.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: "Email already exists" });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const organizationId = currentUser?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Only admins can update users
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { password, organizationId: clientOrgId, ...updateData } = req.body;
      let dataToUpdate = { ...updateData };

      // Prevent organizationId changes (tenant boundary protection)
      // Explicitly ignore any organizationId in the request body

      // If password is provided, hash it
      if (password) {
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(password, salt, 64)) as Buffer;
        // Use same format as registration: salt:hash
        dataToUpdate.passwordHash = `${salt}:${buf.toString("hex")}`;
      }

      const validation = insertUserSchema.partial().omit({ organizationId: true }).safeParse(dataToUpdate);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      await storage.updateUser(req.params.id, validation.data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const organizationId = currentUser?.organizationId;
      const currentUserId = currentUser?.id;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Only admins can delete users
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Prevent self-deletion
      if (req.params.id === currentUserId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  
  app.get("/api/students", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const status = req.query.status as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const students = await storage.getStudents(organizationId, limit, offset, status, startDate, endDate);
      const count = await storage.getStudentCount(organizationId, status, startDate, endDate);
      
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

  // New resumable import endpoints
  app.get("/api/mindbody/import/active", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const activeJob = await storage.getActiveImportJob(organizationId);
      
      if (!activeJob) {
        return res.status(404).json({ error: "No active import job" });
      }

      res.json({
        id: activeJob.id,
        status: activeJob.status,
        dataTypes: activeJob.dataTypes,
        startDate: activeJob.startDate,
        endDate: activeJob.endDate,
        progress: JSON.parse(activeJob.progress),
        currentDataType: activeJob.currentDataType,
        currentOffset: activeJob.currentOffset,
        error: activeJob.error,
        createdAt: activeJob.createdAt,
        updatedAt: activeJob.updatedAt,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch active job";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/mindbody/import/start", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { config } = req.body;
      
      // Check if there's already an active job (running or pending)
      const activeJob = await storage.getActiveImportJob(organizationId);
      if (activeJob) {
        // Allow starting new import if the active job is paused or cancelled
        if (activeJob.status === 'paused' || activeJob.status === 'cancelled') {
          // Clean up the old paused/cancelled job by marking it as cancelled
          await storage.updateImportJob(activeJob.id, {
            status: 'cancelled',
            error: activeJob.error || 'Replaced by new import',
          });
        } else {
          // Reject if there's a truly active (running/pending) job
          return res.status(400).json({ 
            error: "An import is already in progress", 
            jobId: activeJob.id 
          });
        }
      }

      // Parse config
      const startDate = config?.startDate ? new Date(config.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 12));
      const endDate = config?.endDate ? new Date(config.endDate) : new Date();
      const dataTypes = [];
      
      if (config?.dataTypes?.clients) dataTypes.push('clients');
      if (config?.dataTypes?.classes) dataTypes.push('classes');
      if (config?.dataTypes?.visits) dataTypes.push('visits');
      if (config?.dataTypes?.sales) dataTypes.push('sales');

      if (dataTypes.length === 0) {
        return res.status(400).json({ error: "At least one data type must be selected" });
      }

      // Create import job
      const job = await storage.createImportJob({
        organizationId,
        status: 'pending',
        dataTypes,
        startDate,
        endDate,
        progress: JSON.stringify({}),
        currentDataType: null,
        currentOffset: 0,
        error: null,
      });

      // Start processing in background (don't await)
      const { importWorker } = await import("./import-worker");
      importWorker.processJob(job.id).catch(error => {
        console.error(`Background job ${job.id} failed:`, error);
      });

      res.json({
        success: true,
        message: "Import job started",
        jobId: job.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start import";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/mindbody/import/:id/status", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const jobId = req.params.id;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const job = await storage.getImportJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }

      // Check authorization
      if (job.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json({
        id: job.id,
        status: job.status,
        dataTypes: job.dataTypes,
        startDate: job.startDate,
        endDate: job.endDate,
        progress: JSON.parse(job.progress),
        currentDataType: job.currentDataType,
        currentOffset: job.currentOffset,
        error: job.error,
        pausedAt: job.pausedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get job status";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/mindbody/import/:id/resume", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const jobId = req.params.id;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const job = await storage.getImportJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }

      // Check authorization
      if (job.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Can only resume paused or failed jobs
      if (job.status !== 'paused' && job.status !== 'failed') {
        return res.status(400).json({ error: "Job is not in a resumable state" });
      }

      // Check if any progress was made (data was actually fetched from Mindbody)
      const progress = JSON.parse(job.progress || '{}');
      const hasProgress = Object.values(progress).some((p: any) => 
        p && (p.imported > 0 || p.updated > 0 || p.current > 0)
      );

      // Only enforce 24-hour limit if:
      // 1. The job made progress (fetched data from Mindbody API), AND
      // 2. It wasn't manually paused/cancelled by user (those should be resumable immediately)
      const wasManuallyPaused = job.error === 'Paused by user' || job.error === 'Cancelled by user';
      
      if (hasProgress && !wasManuallyPaused) {
        const now = new Date();
        const lastUpdate = new Date(job.updatedAt);
        const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        const REQUIRED_HOURS = 24;

        if (hoursSinceLastUpdate < REQUIRED_HOURS) {
          const hoursRemaining = Math.ceil(REQUIRED_HOURS - hoursSinceLastUpdate);
          const nextAvailableTime = new Date(lastUpdate.getTime() + (REQUIRED_HOURS * 60 * 60 * 1000));
          
          return res.status(429).json({ 
            error: "Too soon to resume import",
            message: `Mindbody API has a 24-hour limit between imports. Please wait ${hoursRemaining} more hour${hoursRemaining !== 1 ? 's' : ''} before resuming.`,
            lastDownloadTime: lastUpdate.toISOString(),
            nextAvailableTime: nextAvailableTime.toISOString(),
            hoursRemaining
          });
        }
      }

      // Update status to pending and clear pausedAt
      await storage.updateImportJob(jobId, {
        status: 'pending',
        pausedAt: null,
        error: null,
      });

      // Start processing in background (don't await)
      const { importWorker } = await import("./import-worker");
      importWorker.processJob(jobId).catch(error => {
        console.error(`Background job ${jobId} failed:`, error);
      });

      res.json({
        success: true,
        message: "Import job resumed"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to resume import";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/mindbody/import/:id/cancel", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const jobId = req.params.id;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const job = await storage.getImportJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }

      // Check authorization
      if (job.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Can only pause pending or running jobs
      if (job.status !== 'pending' && job.status !== 'running') {
        console.log(`Cannot pause job ${jobId}: status is ${job.status}, not pending or running`);
        return res.status(400).json({ error: "Job is not in a pausable state" });
      }

      console.log(`Pausing job ${jobId} (current status: ${job.status})`);
      
      // Update status to paused with timestamp (can be resumed later)
      await storage.updateImportJob(jobId, {
        status: 'paused',
        pausedAt: new Date(),
        error: 'Paused by user',
      });
      
      console.log(`Job ${jobId} paused successfully`);

      res.json({
        success: true,
        message: "Import job paused"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel import";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Webhook routes
  app.post("/api/webhooks/subscriptions", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { eventType } = req.body;
      if (!eventType) {
        return res.status(400).json({ error: "Event type is required" });
      }

      // Check if organization has Mindbody site ID configured
      const org = await storage.getOrganization(organizationId);
      if (!org?.mindbodySiteId) {
        return res.status(400).json({ 
          error: "Mindbody integration not configured. Please complete a data import first to configure your Mindbody site ID." 
        });
      }

      // Build webhook URL for this deployment
      let webhookUrl = 'http://localhost:5000/api/webhooks/mindbody';
      if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(',');
        webhookUrl = `https://${domains[0]}/api/webhooks/mindbody`;
      }

      const mindbodyService = new MindbodyService();
      const { subscriptionId, messageSignatureKey } = await mindbodyService.createWebhookSubscription(
        organizationId,
        eventType,
        webhookUrl
      );

      const subscription = await storage.createWebhookSubscription({
        organizationId,
        eventType,
        webhookUrl,
        status: 'active',
        mindbodySubscriptionId: subscriptionId,
        messageSignatureKey,
        eventSchemaVersion: 1,
      });

      res.json(subscription);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create webhook subscription";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/webhooks/subscriptions", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const subscriptions = await storage.getWebhookSubscriptions(organizationId);
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhook subscriptions" });
    }
  });

  app.delete("/api/webhooks/subscriptions/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const subscription = await storage.getWebhookSubscription(req.params.id);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      if (subscription.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Delete from Mindbody
      if (subscription.mindbodySubscriptionId) {
        const mindbodyService = new MindbodyService();
        await mindbodyService.deleteWebhookSubscription(organizationId, subscription.mindbodySubscriptionId);
      }

      // Delete from our database
      await storage.deleteWebhookSubscription(req.params.id);

      res.json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete webhook subscription";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/webhooks/events", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const events = await storage.getWebhookEvents(organizationId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhook events" });
    }
  });

  // Webhook receiver endpoints (no auth required - validated by signature)
  app.head("/api/webhooks/mindbody", async (req, res) => {
    // Mindbody validation endpoint
    res.status(200).send();
  });

  app.post("/api/webhooks/mindbody", async (req, res) => {
    try {
      const signature = req.headers['x-mindbody-signature'] as string;
      const rawBody = (req as any).rawBody?.toString() || '';
      const { messageId, eventType, siteId, classVisit } = req.body;

      if (!messageId) {
        return res.status(400).json({ error: "Missing messageId" });
      }

      // Check for duplicate
      const existingEvent = await storage.getWebhookEvent(messageId);
      if (existingEvent) {
        return res.status(200).json({ message: "Event already processed" });
      }

      // Find subscription for this event type and site
      const allSubs = await db.select().from(webhookSubscriptions);
      const subscription = allSubs.find(s => s.eventType === eventType);

      if (!subscription) {
        console.log(`No subscription found for event type: ${eventType}`);
        return res.status(200).json({ message: "No subscription found" });
      }

      // Verify signature
      if (signature && subscription.messageSignatureKey) {
        const mindbodyService = new MindbodyService();
        const isValid = mindbodyService.verifyWebhookSignature(rawBody, signature, subscription.messageSignatureKey);
        if (!isValid) {
          console.error('Invalid webhook signature');
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      // Store event for processing
      const event = await storage.createWebhookEvent({
        organizationId: subscription.organizationId,
        subscriptionId: subscription.id,
        messageId,
        eventType,
        eventData: JSON.stringify(req.body),
        processed: false,
      });

      // Respond immediately (within 10 seconds requirement)
      res.status(200).json({ message: "Event received" });

      // Process asynchronously
      try {
        if (eventType === 'classVisit.created' || eventType === 'classVisit.updated') {
          // Find student by Mindbody client ID
          const students = await storage.getStudents(subscription.organizationId);
          const student = students.find(s => s.mindbodyClientId === classVisit?.clientId);

          if (student && classVisit?.classId && classVisit?.visitDateTime) {
            // Find class schedule by Mindbody class ID
            const schedules = await storage.getClassSchedules(subscription.organizationId);
            const schedule = schedules.find(s => s.mindbodyScheduleId === classVisit.classId.toString());

            if (schedule) {
              // Create attendance record
              await storage.createAttendance({
                organizationId: subscription.organizationId,
                studentId: student.id,
                scheduleId: schedule.id,
                attendedAt: new Date(classVisit.visitDateTime),
                status: classVisit.signedIn ? "attended" : "noshow",
              });

              // Mark event as processed
              await storage.updateWebhookEvent(event.id, {
                processed: true,
                processedAt: new Date(),
              });
            }
          }
        }
      } catch (processingError) {
        console.error('Error processing webhook:', processingError);
        await storage.updateWebhookEvent(event.id, {
          error: processingError instanceof Error ? processingError.message : "Processing failed",
        });
      }
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: "Internal server error" });
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
        totalStudentCount,
        activeStudentCount,
        revenueStats,
        lastMonthRevenueStats,
        attendanceRecords,
        lastMonthAttendanceRecords,
        classes
      ] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getActiveStudentCount(organizationId),
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
        activeStudents: activeStudentCount,
        totalStudents: totalStudentCount,
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
