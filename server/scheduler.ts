import cron from "node-cron";
import { storage } from "./storage";
import { mindbodyService } from "./mindbody";
import { subDays } from "date-fns";

class ImportScheduler {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  async startScheduler() {
    console.log("[Scheduler] Starting import scheduler...");

    // Check for scheduled imports every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
      await this.checkAndRunScheduledImports();
    });

    // Initial check on startup
    await this.checkAndRunScheduledImports();
  }

  private async checkAndRunScheduledImports() {
    try {
      // This is a simple implementation - in production, you'd query all organizations
      // For now, we'll just check if there's an active import job and skip if so
      const db = await import("./db");
      const { scheduledImports } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const allScheduled = await db.db.select().from(scheduledImports).where(eq(scheduledImports.enabled, true));

      for (const scheduled of allScheduled) {
        await this.runScheduledImport(scheduled.organizationId);
      }
    } catch (error) {
      console.error("[Scheduler] Error checking scheduled imports:", error);
    }
  }

  async runScheduledImport(organizationId: string) {
    try {
      const scheduledImport = await storage.getScheduledImport(organizationId);
      
      if (!scheduledImport || !scheduledImport.enabled) {
        return;
      }

      // Check if there's already an active import job for this organization
      const activeJob = await storage.getActiveImportJob(organizationId);
      if (activeJob) {
        console.log(`[Scheduler] Skipping scheduled import for org ${organizationId} - active job already exists`);
        return;
      }

      // Check if enough time has passed since last run
      if (scheduledImport.lastRunAt) {
        const timeSinceLastRun = Date.now() - scheduledImport.lastRunAt.getTime();
        const minInterval = 60 * 60 * 1000; // 1 hour minimum between runs
        
        if (timeSinceLastRun < minInterval) {
          return;
        }
      }

      console.log(`[Scheduler] Starting scheduled import for org ${organizationId}`);

      // Update status to running
      await storage.updateScheduledImport(organizationId, {
        lastRunAt: new Date(),
        lastRunStatus: "running",
        lastRunError: null,
      });

      // Calculate date range
      const endDate = new Date();
      const startDate = subDays(endDate, scheduledImport.daysToImport);

      // Parse data types
      const dataTypes = scheduledImport.dataTypes.split(",").map((t) => t.trim());

      // Create import job
      const importJob = await storage.createImportJob({
        organizationId,
        status: "pending",
        dataTypes: scheduledImport.dataTypes,
        startDate,
        endDate,
        progress: 0,
      });

      // Run the import in the background
      this.runImportInBackground(importJob.id, organizationId, dataTypes, startDate, endDate);
    } catch (error) {
      console.error(`[Scheduler] Error running scheduled import for org ${organizationId}:`, error);
      
      try {
        await storage.updateScheduledImport(organizationId, {
          lastRunStatus: "failed",
          lastRunError: error instanceof Error ? error.message : String(error),
        });
      } catch (updateError) {
        console.error("[Scheduler] Error updating scheduled import status:", updateError);
      }
    }
  }

  private async runImportInBackground(
    jobId: string,
    organizationId: string,
    dataTypes: string[],
    startDate: Date,
    endDate: Date
  ) {
    try {
      let totalProgress = 0;
      const progressPerType = 100 / dataTypes.length;

      for (const dataType of dataTypes) {
        const job = await storage.getImportJob(jobId);
        if (!job || job.status === "cancelled") {
          break;
        }

        await storage.updateImportJob(jobId, {
          status: "running",
          currentStep: dataType,
        });

        switch (dataType) {
          case "students":
            await mindbodyService.importClients(organizationId, startDate, endDate, async (current, total) => {
              const stepProgress = (current / total) * progressPerType;
              await storage.updateImportJob(jobId, {
                progress: totalProgress + stepProgress,
              });
            });
            break;

          case "classes":
            await mindbodyService.importClasses(organizationId, startDate, endDate, async (current, total) => {
              const stepProgress = (current / total) * progressPerType;
              await storage.updateImportJob(jobId, {
                progress: totalProgress + stepProgress,
              });
            });
            break;

          case "visits":
            await mindbodyService.importClassVisits(organizationId, startDate, endDate, async (current, total) => {
              const stepProgress = (current / total) * progressPerType;
              await storage.updateImportJob(jobId, {
                progress: totalProgress + stepProgress,
              });
            });
            break;

          case "sales":
            await mindbodyService.importSales(organizationId, startDate, endDate, async (current, total) => {
              const stepProgress = (current / total) * progressPerType;
              await storage.updateImportJob(jobId, {
                progress: totalProgress + stepProgress,
              });
            });
            break;
        }

        totalProgress += progressPerType;
      }

      await storage.updateImportJob(jobId, {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
      });

      await storage.updateScheduledImport(organizationId, {
        lastRunStatus: "success",
        lastRunError: null,
      });

      console.log(`[Scheduler] Scheduled import completed for org ${organizationId}`);
    } catch (error) {
      console.error(`[Scheduler] Error in background import:`, error);

      await storage.updateImportJob(jobId, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });

      await storage.updateScheduledImport(organizationId, {
        lastRunStatus: "failed",
        lastRunError: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const importScheduler = new ImportScheduler();
