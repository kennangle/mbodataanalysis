import cron from "node-cron";
import { storage } from "./storage";
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
      for (const [orgId, jobInfo] of Array.from(this.scheduledJobs.entries())) {
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

      // Parse data types - ensure it's a valid string before splitting
      const dataTypesString = scheduledImport.dataTypes || "students,classes,visits,sales";
      const dataTypes = dataTypesString.split(",").map((t) => t.trim()).filter(t => t.length > 0);

      // Validate we have at least one data type
      if (dataTypes.length === 0) {
        throw new Error("No data types configured for scheduled import");
      }

      // Create import job
      const importJob = await storage.createImportJob({
        organizationId,
        status: "pending",
        dataTypes, // Pass the array, not the string
        startDate,
        endDate,
        progress: "{}",
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
      // Delegate to the import worker which handles all the complex logic
      const { importWorker } = await import("./import-worker");
      await importWorker.processJob(jobId);

      // Poll for job completion since processJob returns immediately after queuing
      let finalJob = await storage.getImportJob(jobId);
      const maxWaitTime = 4 * 60 * 60 * 1000; // 4 hours max (reasonable for large imports)
      const pollInterval = 10000; // Check every 10 seconds
      const startTime = Date.now();

      while (finalJob && finalJob.status !== "completed" && finalJob.status !== "failed" && finalJob.status !== "cancelled") {
        // Check if we've exceeded max wait time
        if (Date.now() - startTime > maxWaitTime) {
          const errorMsg = `Import exceeded ${maxWaitTime / 3600000} hour timeout. The job may still be running in the background.`;
          console.error(`[Scheduler] ${errorMsg}`);
          
          // Mark as failed due to timeout
          await storage.updateScheduledImport(organizationId, {
            lastRunStatus: "failed",
            lastRunError: errorMsg,
          });
          return;
        }

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        finalJob = await storage.getImportJob(jobId);
      }

      // Handle case where job disappears (null)
      if (!finalJob) {
        await storage.updateScheduledImport(organizationId, {
          lastRunStatus: "failed",
          lastRunError: "Import job disappeared from database",
        });
        return;
      }
      
      // Update scheduled import based on final status
      if (finalJob.status === "completed") {
        await storage.updateScheduledImport(organizationId, {
          lastRunStatus: "success",
          lastRunError: null,
        });
        console.log(`[Scheduler] Scheduled import completed for org ${organizationId}`);
      } else if (finalJob.status === "failed") {
        await storage.updateScheduledImport(organizationId, {
          lastRunStatus: "failed",
          lastRunError: finalJob.error || "Import failed",
        });
      } else if (finalJob.status === "cancelled") {
        await storage.updateScheduledImport(organizationId, {
          lastRunStatus: "failed",
          lastRunError: "Import was cancelled",
        });
      } else {
        // Catch any other unexpected states
        await storage.updateScheduledImport(organizationId, {
          lastRunStatus: "failed",
          lastRunError: `Unexpected job status: ${finalJob.status}`,
        });
      }
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
