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
  // Clean up orphaned import jobs on startup
  // Import worker is in-memory and doesn't survive restarts
  try {
    const { db } = await import("./db");
    const { importJobs } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const runningJobs = await db.select().from(importJobs).where(eq(importJobs.status, "running"));

    if (runningJobs.length > 0) {
      console.log(`Found ${runningJobs.length} orphaned import job(s), marking as failed...`);
      for (const job of runningJobs) {
        await db
          .update(importJobs)
          .set({
            status: "failed",
            error: "Import interrupted by application restart. You can start a new import.",
            updatedAt: new Date(),
          })
          .where(eq(importJobs.id, job.id));
      }
      console.log(`Successfully cleaned up ${runningJobs.length} orphaned job(s)`);
    }
  } catch (error) {
    console.error("Failed to clean up orphaned import jobs on startup:", error);
    // Don't abort startup if cleanup fails
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
