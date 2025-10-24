import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Webhook endpoint needs raw body for signature verification
// Apply conditional JSON parsing: use raw body for webhooks, JSON for everything else
app.use((req, res, next) => {
  if (req.path === "/api/webhooks/mindbody" && req.method === "POST") {
    // For webhooks, capture raw body and parse JSON manually
    express.raw({ type: "application/json" })(req, res, () => {
      try {
        // Store raw body for signature verification
        (req as any).rawBody = (req as any).body;
        // Parse JSON for convenience
        req.body = JSON.parse((req as any).body.toString());
        next();
      } catch (err) {
        next(err);
      }
    });
  } else {
    // For all other routes, use standard JSON parsing
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

setupAuth(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Auto-resume interrupted import jobs on startup
  try {
    const { db } = await import("./db");
    const { importJobs } = await import("@shared/schema");
    const { eq, or, and, like } = await import("drizzle-orm");
    const { importWorker } = await import("./import-worker");

    // Find jobs that were interrupted:
    // 1. Running or pending jobs (server crash before watchdog detected them)
    // 2. Failed jobs with connection timeout error (watchdog detected stall after crash)
    const interruptedJobs = await db
      .select()
      .from(importJobs)
      .where(
        or(
          eq(importJobs.status, "running"),
          eq(importJobs.status, "pending"),
          and(
            eq(importJobs.status, "failed"),
            like(importJobs.error, "%connection timeout%")
          )
        )
      );

    if (interruptedJobs.length > 0) {
      console.log(`[Auto-Resume] Found ${interruptedJobs.length} interrupted import job(s), auto-resuming...`);
      
      const { scheduledImports } = await import("@shared/schema");
      
      for (const job of interruptedJobs) {
        // Get the progress to show what was preserved
        const progress = typeof job.progress === 'string' 
          ? JSON.parse(job.progress) 
          : job.progress || {};
        
        const progressInfo = progress.visits 
          ? `${progress.visits.current}/${progress.visits.total} students (${progress.visits.imported} imported)`
          : 'starting';
        
        console.log(`[Auto-Resume] Resuming job ${job.id} from checkpoint: ${progressInfo}`);
        
        // Update status to running (in case it was pending)
        await db
          .update(importJobs)
          .set({
            status: "running",
            error: null,
            updatedAt: new Date(),
          })
          .where(eq(importJobs.id, job.id));
        
        // If this job belongs to a scheduled import, clear the error message in the UI
        const scheduledImport = await db
          .select()
          .from(scheduledImports)
          .where(eq(scheduledImports.organizationId, job.organizationId))
          .limit(1);
        
        if (scheduledImport.length > 0 && scheduledImport[0].lastRunError?.includes("connection timeout")) {
          await db
            .update(scheduledImports)
            .set({
              lastRunStatus: "running",
              lastRunError: null,
            })
            .where(eq(scheduledImports.organizationId, job.organizationId));
          
          console.log(`[Auto-Resume] Cleared scheduler error for org ${job.organizationId}`);
        }
        
        // Queue the job for processing - this preserves all progress!
        await importWorker.processJob(job.id);
      }
      
      console.log(`[Auto-Resume] Successfully queued ${interruptedJobs.length} job(s) for auto-resume`);
    }
  } catch (error) {
    console.error("[Auto-Resume] Failed to auto-resume interrupted import jobs on startup:", error);
    // Don't abort startup if auto-resume fails
  }

  // Start the import scheduler
  try {
    const { importScheduler } = await import("./scheduler");
    await importScheduler.startScheduler();
  } catch (error) {
    console.error("Failed to start import scheduler:", error);
    // Don't abort startup if scheduler fails
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
