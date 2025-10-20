import cron from "node-cron";
import { storage } from "./storage";
import { mindbodyService } from "./mindbody";
import { subDays } from "date-fns";

interface ScheduledJobInfo {
  task: cron.ScheduledTask;
  schedule: string;
}

class ImportScheduler {
  private scheduledJobs: Map<string, ScheduledJobInfo> = new Map();

  async startScheduler() {
    console.log("[Scheduler] Starting import scheduler...");

    // Load all enabled scheduled imports and create cron jobs for them
    await this.syncScheduledJobs();

    // Periodically sync scheduled jobs (every 5 minutes) in case configs change
    cron.schedule("*/5 * * * *", async () => {
      await this.syncScheduledJobs();
    });
  }

  private async syncScheduledJobs() {
    try {
      const db = await import("./db");
      const { scheduledImports } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const allScheduled = await db.db.select().from(scheduledImports).where(eq(scheduledImports.enabled, true));

      // Track which organizations should have jobs
      const activeOrgs = new Set<string>();

      for (const scheduled of allScheduled) {
        activeOrgs.add(scheduled.organizationId);

        // Validate the cron expression first
        if (!cron.validate(scheduled.schedule)) {
          console.error(`[Scheduler] Invalid cron expression for org ${scheduled.organizationId}: ${scheduled.schedule}`);
          continue;
        }

        // Check if we already have a job for this org
        const existingJobInfo = this.scheduledJobs.get(scheduled.organizationId);
        
        // Recreate the job if the schedule has changed or there's no existing job
        const scheduleChanged = existingJobInfo && existingJobInfo.schedule !== scheduled.schedule;
        
        if (!existingJobInfo || scheduleChanged) {
          // Stop existing job if any
          if (existingJobInfo) {
            existingJobInfo.task.stop();
            this.scheduledJobs.delete(scheduled.organizationId);
            if (scheduleChanged) {
              console.log(`[Scheduler] Schedule changed for org ${scheduled.organizationId} from "${existingJobInfo.schedule}" to "${scheduled.schedule}"`);
            }
          }

          // Create a new cron job for this organization
          const task = cron.schedule(scheduled.schedule, async () => {
            console.log(`[Scheduler] Cron triggered for org ${scheduled.organizationId}`);
            await this.runScheduledImport(scheduled.organizationId, false);
          });

          this.scheduledJobs.set(scheduled.organizationId, {
            task,
            schedule: scheduled.schedule,
          });
          console.log(`[Scheduler] Created cron job for org ${scheduled.organizationId} with schedule: ${scheduled.schedule}`);
        }
      }

      // Remove jobs for organizations that are no longer enabled
      for (const [orgId, jobInfo] of this.scheduledJobs.entries()) {
        if (!activeOrgs.has(orgId)) {
          jobInfo.task.stop();
          this.scheduledJobs.delete(orgId);
          console.log(`[Scheduler] Removed cron job for org ${orgId} (no longer enabled)`);
        }
      }
    } catch (error) {
      console.error("[Scheduler] Error syncing scheduled jobs:", error);
    }
  }

  async runScheduledImport(organizationId: string, isManual: boolean = false) {
    try {
      const scheduledImport = await storage.getScheduledImport(organizationId);
      
      if (!scheduledImport || !scheduledImport.enabled) {
        console.log(`[Scheduler] Skipping import for org ${organizationId} - not enabled`);
        return;
      }

      // Check if there's already an active import job for this organization
      const activeJob = await storage.getActiveImportJob(organizationId);
      if (activeJob) {
        console.log(`[Scheduler] Skipping import for org ${organizationId} - active job already exists`);
        return;
      }

      // For automatic runs (not manual), check if enough time has passed since last run
      // This prevents rapid re-runs if the cron schedule is very frequent
      if (!isManual && scheduledImport.lastRunAt) {
        const timeSinceLastRun = Date.now() - scheduledImport.lastRunAt.getTime();
        const minInterval = 10 * 60 * 1000; // 10 minutes minimum between automatic runs
        
        if (timeSinceLastRun < minInterval) {
          console.log(`[Scheduler] Skipping import for org ${organizationId} - ran ${Math.floor(timeSinceLastRun / 60000)} minutes ago`);
          return;
        }
      }

      console.log(`[Scheduler] Starting ${isManual ? 'manual' : 'scheduled'} import for org ${organizationId}`);

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
