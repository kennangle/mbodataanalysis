import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";
import { MindbodyService } from "../mindbody";


export function registerMindbodyRoutes(app: Express) {
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

}
