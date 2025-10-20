import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";

export function registerScheduledImportRoutes(app: Express) {
  // Get scheduled import config
  app.get("/api/scheduled-imports", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scheduledImport = await storage.getScheduledImport(organizationId);
      
      if (!scheduledImport) {
        // Return default config if none exists
        return res.json({
          enabled: false,
          schedule: "0 2 * * *",
          dataTypes: "students,classes,visits,sales",
          daysToImport: 7,
          lastRunAt: null,
          lastRunStatus: null,
          lastRunError: null,
        });
      }

      res.json(scheduledImport);
    } catch (error) {
      console.error("Error fetching scheduled import:", error);
      res.status(500).json({ error: "Failed to fetch scheduled import configuration" });
    }
  });

  // Update scheduled import config
  app.post("/api/scheduled-imports", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { enabled, schedule, dataTypes, daysToImport } = req.body;

      if (enabled && !dataTypes) {
        return res.status(400).json({ error: "Data types are required when enabling scheduled imports" });
      }

      const scheduledImport = await storage.upsertScheduledImport({
        organizationId,
        enabled: enabled ?? false,
        schedule: schedule || "0 2 * * *",
        dataTypes: dataTypes || "students,classes,visits,sales",
        daysToImport: daysToImport || 7,
      });

      res.json(scheduledImport);
    } catch (error) {
      console.error("Error updating scheduled import:", error);
      res.status(500).json({ error: "Failed to update scheduled import configuration" });
    }
  });

  // Trigger a manual run now
  app.post("/api/scheduled-imports/run-now", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check if there's already an active import
      const activeJob = await storage.getActiveImportJob(organizationId);
      if (activeJob) {
        return res.status(400).json({ error: "An import is already running" });
      }

      const { importScheduler } = await import("../scheduler");
      await importScheduler.runScheduledImport(organizationId);

      res.json({ message: "Import started" });
    } catch (error) {
      console.error("Error starting manual import:", error);
      res.status(500).json({ error: "Failed to start import" });
    }
  });
}
