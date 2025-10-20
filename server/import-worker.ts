import { storage } from "./storage";
import { mindbodyService } from "./mindbody";
import type { ImportJob } from "@shared/schema";

// Safe JSON parser that handles null, objects, and invalid JSON
function safeJsonParse<T = any>(value: any, fallback: T = {} as T): T {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "object") {
    return value as T;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class ImportWorker {
  private jobQueue: string[] = [];
  private isProcessing = false;
  private currentJobId: string | null = null;

  async processJob(jobId: string): Promise<void> {
    // Add job to queue
    if (!this.jobQueue.includes(jobId)) {
      this.jobQueue.push(jobId);
    }

    // Start processing if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    while (this.jobQueue.length > 0) {
      const jobId = this.jobQueue.shift()!;
      await this.processJobInternal(jobId);
    }
  }

  private async processJobInternal(jobId: string): Promise<void> {
    this.isProcessing = true;
    this.currentJobId = jobId;

    try {
      const job = await storage.getImportJob(jobId);
      if (!job) {
        console.error(`Job ${jobId} not found`);
        return;
      }

      // Check if job was cancelled before it started processing
      if (job.status === "paused" || job.status === "cancelled") {
        return;
      }

      // Set job to running and initialize/resume progress tracking
      const startDate = new Date(job.startDate);
      const endDate = new Date(job.endDate);
      const dataTypes = job.dataTypes;

      const progress: any = safeJsonParse(job.progress, {});

      // Initialize API tracking if not present
      if (!progress.apiCallCount) {
        progress.apiCallCount = 0;
      }
      if (!progress.importStartTime) {
        progress.importStartTime = new Date().toISOString();
      }

      // Store baseline API count from previous session (if resuming)
      const baselineApiCallCount = progress.apiCallCount || 0;

      // Reset the API counter to track only this session's calls
      mindbodyService.resetApiCallCount();

      await storage.updateImportJob(jobId, {
        status: "running",
        progress: JSON.stringify(progress),
      });

      // Process clients
      if (dataTypes.includes("clients") && !progress.clients?.completed) {
        await this.processClients(job, startDate, endDate, progress, baselineApiCallCount);

        // API call count is already updated within processClients

        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
          return;
        }
      }

      // Process classes
      if (dataTypes.includes("classes") && !progress.classes?.completed) {
        await this.processClasses(job, startDate, endDate, progress, baselineApiCallCount);

        // API call count is already updated within processClasses

        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
          return;
        }
      }

      // Process visits
      if (dataTypes.includes("visits") && !progress.visits?.completed) {
        await this.processVisits(job, startDate, endDate, progress, baselineApiCallCount);

        // API call count is already updated within processVisits

        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
          return;
        }
      }

      // Process sales
      if (dataTypes.includes("sales") && !progress.sales?.completed) {
        await this.processSales(job, startDate, endDate, progress, baselineApiCallCount);

        // API call count is already updated within processSales

        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
          return;
        }
      }

      // Mark job as completed
      await storage.updateImportJob(jobId, {
        status: "completed",
        progress: JSON.stringify(progress),
      });

      console.log(`Import job ${jobId} completed successfully`);
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      
      // Build a helpful error message with context
      let errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Get the job to see what was being processed
      const failedJob = await storage.getImportJob(jobId);
      if (failedJob?.currentDataType) {
        const dataTypeNames: Record<string, string> = {
          clients: "Students",
          classes: "Classes",
          visits: "Visits",
          sales: "Sales",
        };
        const displayName = dataTypeNames[failedJob.currentDataType] || failedJob.currentDataType;
        errorMessage = `Failed while importing ${displayName}: ${errorMessage}`;
      }
      
      // Add common error context (case-insensitive matching)
      const lowerError = errorMessage.toLowerCase();
      if (lowerError.includes("timeout") || lowerError.includes("etimedout") || lowerError.includes("408") || lowerError.includes("504")) {
        errorMessage += " (Network timeout - this is common for large imports. Resume to continue.)";
      } else if (lowerError.includes("429") || lowerError.includes("rate limit")) {
        errorMessage += " (API rate limit reached. Wait a few minutes, then resume.)";
      } else if (lowerError.includes("401") || lowerError.includes("403") || lowerError.includes("unauthorized") || lowerError.includes("forbidden") || lowerError.includes("permission")) {
        errorMessage += " (Authentication/permission issue. Check your Mindbody connection.)";
      } else if (lowerError.includes("memory")) {
        errorMessage += " (Out of memory. Try importing smaller date ranges.)";
      }
      
      await storage.updateImportJob(jobId, {
        status: "failed",
        error: errorMessage,
      });
    } finally {
      this.isProcessing = false;
      this.currentJobId = null;
    }
  }

  private async processClients(
    job: ImportJob,
    startDate: Date,
    endDate: Date,
    progress: any,
    baselineApiCallCount: number = 0
  ): Promise<void> {
    if (!progress.clients) {
      progress.clients = { current: 0, total: 0, imported: 0, updated: 0, completed: false };
    }

    let batchResult;
    do {
      // Check if job has been cancelled before processing next batch
      const currentJob = await storage.getImportJob(job.id);
      if (currentJob?.status === "paused" || currentJob?.status === "cancelled") {
        return;
      }

      batchResult = await mindbodyService.importClientsResumable(
        job.organizationId,
        startDate,
        endDate,
        async (current, total) => {
          progress.clients.current = current;
          progress.clients.total = total;
          // Update API call count in progress callback
          progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
          await storage.updateImportJob(job.id, {
            progress: JSON.stringify(progress),
            currentDataType: "clients",
            currentOffset: current,
          });
        },
        progress.clients.current || 0
      );

      progress.clients.imported += batchResult.imported;
      progress.clients.updated += batchResult.updated;
      progress.clients.current = batchResult.nextOffset;
      progress.clients.completed = batchResult.completed;

      // Update API call count after batch
      progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();

      await storage.updateImportJob(job.id, {
        progress: JSON.stringify(progress),
      });
    } while (!batchResult.completed);
  }

  private async processClasses(
    job: ImportJob,
    startDate: Date,
    endDate: Date,
    progress: any,
    baselineApiCallCount: number = 0
  ): Promise<void> {
    if (!progress.classes) {
      progress.classes = { current: 0, total: 0, imported: 0, completed: false };
    }

    let batchResult;
    do {
      // Check if job has been cancelled before processing next batch
      const currentJob = await storage.getImportJob(job.id);
      if (currentJob?.status === "paused" || currentJob?.status === "cancelled") {
        return;
      }

      batchResult = await mindbodyService.importClassesResumable(
        job.organizationId,
        startDate,
        endDate,
        async (current, total) => {
          progress.classes.current = current;
          progress.classes.total = total;
          // Update API call count in progress callback
          progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
          await storage.updateImportJob(job.id, {
            progress: JSON.stringify(progress),
            currentDataType: "classes",
            currentOffset: current,
          });
        },
        progress.classes.current || 0
      );

      progress.classes.imported += batchResult.imported;
      progress.classes.current = batchResult.nextOffset;
      progress.classes.completed = batchResult.completed;

      // Update API call count after batch
      progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();

      await storage.updateImportJob(job.id, {
        progress: JSON.stringify(progress),
      });
    } while (!batchResult.completed);
  }

  private async processVisits(
    job: ImportJob,
    startDate: Date,
    endDate: Date,
    progress: any,
    baselineApiCallCount: number = 0
  ): Promise<void> {
    if (!progress.visits) {
      progress.visits = { current: 0, total: 0, imported: 0, completed: false };
    }

    let batchResult;
    do {
      // Check if job has been cancelled before processing next batch
      const currentJob = await storage.getImportJob(job.id);
      if (currentJob?.status === "paused" || currentJob?.status === "cancelled") {
        console.log(`Job ${job.id} has been cancelled, stopping visits import`);
        return;
      }

      batchResult = await mindbodyService.importVisitsResumable(
        job.organizationId,
        startDate,
        endDate,
        async (current, total) => {
          progress.visits.current = current;
          progress.visits.total = total;
          // Update API call count in progress callback
          progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
          await storage.updateImportJob(job.id, {
            progress: JSON.stringify(progress),
            currentDataType: "visits",
            currentOffset: current,
          });
        },
        progress.visits.current || 0
      );

      progress.visits.imported += batchResult.imported;
      progress.visits.current = batchResult.nextStudentIndex;
      progress.visits.completed = batchResult.completed;

      // Update API call count after batch
      progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();

      await storage.updateImportJob(job.id, {
        progress: JSON.stringify(progress),
      });
    } while (!batchResult.completed);
  }

  private async processSales(
    job: ImportJob,
    startDate: Date,
    endDate: Date,
    progress: any,
    baselineApiCallCount: number = 0
  ): Promise<void> {
    if (!progress.sales) {
      progress.sales = { current: 0, total: 0, imported: 0, completed: false };
    }

    // OPTIMIZATION: Load all students once instead of per-batch
    const allStudents = await storage.getStudents(job.organizationId, 100000);

    let batchResult;
    do {
      // Check if job has been cancelled before processing next batch
      const currentJob = await storage.getImportJob(job.id);
      if (currentJob?.status === "paused" || currentJob?.status === "cancelled") {
        console.log(`Job ${job.id} has been cancelled, stopping sales import`);
        return;
      }

      batchResult = await mindbodyService.importSalesResumable(
        job.organizationId,
        startDate,
        endDate,
        async (current, total) => {
          progress.sales.current = current;
          progress.sales.total = total;
          // Update API call count in progress callback
          progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();
          await storage.updateImportJob(job.id, {
            progress: JSON.stringify(progress),
            currentDataType: "sales",
            currentOffset: current,
          });
        },
        progress.sales.current || 0,
        allStudents // Pass cached students to avoid reloading
      );

      progress.sales.imported += batchResult.imported;
      progress.sales.current = batchResult.nextStudentIndex;
      progress.sales.completed = batchResult.completed;

      // Update API call count after batch
      progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();

      await storage.updateImportJob(job.id, {
        progress: JSON.stringify(progress),
      });
    } while (!batchResult.completed);
  }

  isJobProcessing(): boolean {
    return this.isProcessing;
  }

  getCurrentJobId(): string | null {
    return this.currentJobId;
  }
}

export const importWorker = new ImportWorker();
