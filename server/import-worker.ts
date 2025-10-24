import { storage } from "./storage";
import { mindbodyService } from "./mindbody";
import type { ImportJob } from "@shared/schema";

// Helper function to log memory usage
function logMemoryUsage(context: string): void {
  const usage = process.memoryUsage();
  const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
  console.log(
    `[Memory] ${context} - RSS: ${formatMB(usage.rss)}MB, Heap Used: ${formatMB(usage.heapUsed)}MB / ${formatMB(usage.heapTotal)}MB`
  );
}

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

// Helper to detect database connection errors
function isDatabaseConnectionError(error: any): boolean {
  if (!error) return false;
  const errorStr = error.toString().toLowerCase();
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  
  return (
    // Neon connection termination
    code === '57p01' ||
    message.includes('terminating connection') ||
    // General connection errors
    message.includes('connection terminated') ||
    message.includes('connection closed') ||
    message.includes('connection lost') ||
    message.includes('econnreset') ||
    errorStr.includes('econnreset')
  );
}

// Keep database connection alive and update heartbeat
async function keepAliveAndHeartbeat(jobId: string, context: string): Promise<void> {
  try {
    await withDatabaseRetry(
      async () => {
        // Ping database to keep connection alive
        await storage.keepConnectionAlive();
        // Update heartbeat timestamp (optional - won't fail if column doesn't exist)
        await storage.updateImportJobHeartbeat(jobId);
      },
      `Keep-alive and heartbeat (${context})`
    );
  } catch (error) {
    // Log but don't crash - keep-alive is a best-effort optimization
    console.warn(`[Keep-Alive] Warning for job ${jobId} at ${context}:`, error);
    // Don't throw - this is non-critical
  }
}

// Retry wrapper for database operations that may fail due to connection issues
async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  context: string = 'Database operation',
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry on connection errors
      if (!isDatabaseConnectionError(error)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(
          `[DB Retry] ${context} failed (attempt ${attempt}/${maxRetries}): ${error}. Retrying in ${delay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[DB Retry] ${context} failed after ${maxRetries} attempts`);
      }
    }
  }
  
  throw lastError;
}

// Module-level guard to prevent duplicate handler registration
let shutdownHandlersRegistered = false;

export class ImportWorker {
  private jobQueue: string[] = [];
  private isProcessing = false;
  private currentJobId: string | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.registerShutdownHandlers();
    this.startWatchdog();
  }

  private startWatchdog(): void {
    // Check for stalled jobs every 2 minutes
    this.watchdogInterval = setInterval(async () => {
      try {
        await this.checkForStalledJobs();
      } catch (error) {
        console.error('[Watchdog] Error checking for stalled jobs:', error);
      }
    }, 120000); // 2 minutes
  }

  private async checkForStalledJobs(): Promise<void> {
    try {
      // Query for running jobs with stale heartbeats (>5 minutes old)
      // Increased from 3 to 5 minutes for extra cushion
      const stalledJobs = await storage.getStalledImportJobs(5);
      
      for (const job of stalledJobs) {
        console.log(`[Watchdog] Detected stalled job ${job.id} - last heartbeat: ${job.heartbeatAt}`);
        
        await withDatabaseRetry(
          () => storage.updateImportJob(job.id, {
            status: "failed",
            error: "Import worker stopped responding (connection timeout). Please try a smaller date range or contact support.",
          }),
          `Mark stalled job ${job.id} as failed`
        );
        
        console.log(`[Watchdog] Marked job ${job.id} as failed`);
      }
    } catch (error) {
      console.error('[Watchdog] Failed to check for stalled jobs:', error);
    }
  }

  private registerShutdownHandlers(): void {
    if (shutdownHandlersRegistered) return;
    shutdownHandlersRegistered = true;

    // Handle graceful shutdown signals
    const handleShutdown = async (signal: string) => {
      console.log(`[ImportWorker] Received ${signal} signal, leaving job in resumable state...`);
      
      // Stop watchdog
      if (this.watchdogInterval) {
        clearInterval(this.watchdogInterval);
      }
      
      if (this.currentJobId) {
        try {
          const job = await withDatabaseRetry(
            () => storage.getImportJob(this.currentJobId!),
            'Get import job during shutdown'
          );
          if (job && job.status === "running") {
            // Leave status as "running" so auto-resume can pick it up
            // Just clear the error field if any
            await withDatabaseRetry(
              () => storage.updateImportJob(this.currentJobId!, {
                error: null,
              }),
              'Clear error during shutdown'
            );
            console.log(`[ImportWorker] Job ${this.currentJobId} left in resumable state for auto-resume`);
          }
        } catch (error) {
          console.error(`[ImportWorker] Failed to update job during shutdown:`, error);
          // Don't crash if we can't update - auto-resume will handle it
        }
      }

      // Exit gracefully after updating job
      if (signal === 'SIGTERM' || signal === 'SIGINT') {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    
    process.on('uncaughtException', async (error) => {
      console.error('[ImportWorker] Uncaught exception:', error);
      await handleShutdown('uncaughtException');
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('[ImportWorker] Unhandled rejection:', reason);
      await handleShutdown('unhandledRejection');
      process.exit(1);
    });
  }

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

    // Log initial memory state
    logMemoryUsage(`Starting job ${jobId}`);

    try {
      const job = await withDatabaseRetry(
        () => storage.getImportJob(jobId),
        'Get import job'
      );
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

      await withDatabaseRetry(
        () => storage.updateImportJob(jobId, {
          status: "running",
          progress: JSON.stringify(progress),
          heartbeatAt: new Date(), // Set initial heartbeat
        }),
        'Set job status to running'
      );

      // Process clients
      if (dataTypes.includes("clients") && !progress.clients?.completed) {
        logMemoryUsage("Before processing clients");
        await this.processClients(job, startDate, endDate, progress, baselineApiCallCount);
        logMemoryUsage("After processing clients");

        // API call count is already updated within processClients

        // Check if job was cancelled during processing
        const updatedJob = await withDatabaseRetry(
          () => storage.getImportJob(jobId),
          'Check job status after clients'
        );
        if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
          return;
        }
      }

      // Process classes
      if (dataTypes.includes("classes") && !progress.classes?.completed) {
        logMemoryUsage("Before processing classes");
        await this.processClasses(job, startDate, endDate, progress, baselineApiCallCount);
        logMemoryUsage("After processing classes");

        // API call count is already updated within processClasses

        // Check if job was cancelled during processing
        const updatedJob = await withDatabaseRetry(
          () => storage.getImportJob(jobId),
          'Check job status after classes'
        );
        if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
          return;
        }
      }

      // Process visits
      if (dataTypes.includes("visits") && !progress.visits?.completed) {
        logMemoryUsage("Before processing visits");
        await this.processVisits(job, startDate, endDate, progress, baselineApiCallCount);
        logMemoryUsage("After processing visits");

        // API call count is already updated within processVisits

        // Check if job was cancelled during processing
        const updatedJob = await withDatabaseRetry(
          () => storage.getImportJob(jobId),
          'Check job status after visits'
        );
        if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
          return;
        }
      }

      // Process sales
      if (dataTypes.includes("sales") && !progress.sales?.completed) {
        logMemoryUsage("Before processing sales");
        await this.processSales(job, startDate, endDate, progress, baselineApiCallCount);
        logMemoryUsage("After processing sales");

        // API call count is already updated within processSales

        // Check if job was cancelled during processing
        const updatedJob = await withDatabaseRetry(
          () => storage.getImportJob(jobId),
          'Check job status after sales'
        );
        if (updatedJob?.status === "paused" || updatedJob?.status === "cancelled") {
          return;
        }
      }

      // Mark job as completed
      await withDatabaseRetry(
        () => storage.updateImportJob(jobId, {
          status: "completed",
          progress: JSON.stringify(progress),
        }),
        'Mark job as completed'
      );

      logMemoryUsage(`Job ${jobId} completed successfully`);
      console.log(`Import job ${jobId} completed successfully`);
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      logMemoryUsage(`Job ${jobId} failed with error`);
      
      // Build a helpful error message with context
      let errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Get the job to see what was being processed (with retry)
      const failedJob = await withDatabaseRetry(
        () => storage.getImportJob(jobId),
        'Get failed job details'
      ).catch(() => null); // If we can't even get the job after retries, continue with basic error
      
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
      
      await withDatabaseRetry(
        () => storage.updateImportJob(jobId, {
          status: "failed",
          error: errorMessage,
        }),
        'Mark job as failed'
      ).catch((err) => {
        // Last resort: log error if even the failure update fails
        console.error(`Failed to mark job ${jobId} as failed:`, err);
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
      const currentJob = await withDatabaseRetry(
        () => storage.getImportJob(job.id),
        'Check job status before clients batch'
      );
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
          await withDatabaseRetry(
            () => storage.updateImportJob(job.id, {
              progress: JSON.stringify(progress),
              currentDataType: "clients",
              currentOffset: current,
            }),
            'Update import progress (clients)'
          );
        },
        progress.clients.current || 0
      );

      progress.clients.imported += batchResult.imported;
      progress.clients.updated += batchResult.updated;
      progress.clients.current = batchResult.nextOffset;
      progress.clients.completed = batchResult.completed;

      // Update API call count after batch
      progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();

      await withDatabaseRetry(
        () => storage.updateImportJob(job.id, {
          progress: JSON.stringify(progress),
        }),
        'Update import progress after batch (clients)'
      );
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
      const currentJob = await withDatabaseRetry(
        () => storage.getImportJob(job.id),
        'Check job status before classes batch'
      );
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
          await withDatabaseRetry(
            () => storage.updateImportJob(job.id, {
              progress: JSON.stringify(progress),
              currentDataType: "classes",
              currentOffset: current,
            }),
            'Update import progress (classes)'
          );
        },
        progress.classes.current || 0
      );

      progress.classes.imported += batchResult.imported;
      progress.classes.current = batchResult.nextOffset;
      progress.classes.completed = batchResult.completed;

      // Update API call count after batch
      progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();

      await withDatabaseRetry(
        () => storage.updateImportJob(job.id, {
          progress: JSON.stringify(progress),
        }),
        'Update import progress after batch (classes)'
      );
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

    // MEMORY OPTIMIZATION: Load schedules once and reuse across all batches
    let schedulesByTime: Map<string, any> | undefined = undefined;

    let batchResult;
    do {
      // CRITICAL: Keep database connection alive and update heartbeat
      await keepAliveAndHeartbeat(job.id, `visits batch ${progress.visits.current || 0}`);
      
      console.log(`[Import] Processing visits batch: student ${progress.visits.current || 0}/${progress.visits.total || 0}`);

      // Check if job has been cancelled before processing next batch
      const currentJob = await withDatabaseRetry(
        () => storage.getImportJob(job.id),
        'Check job status before visits batch'
      );
      if (currentJob?.status === "paused" || currentJob?.status === "cancelled") {
        console.log(`[Import] Job ${job.id} has been cancelled, stopping visits import`);
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
          await withDatabaseRetry(
            () => storage.updateImportJob(job.id, {
              progress: JSON.stringify(progress),
              currentDataType: "visits",
              currentOffset: current,
            }),
            'Update import progress (visits)'
          );
        },
        progress.visits.current || 0,
        schedulesByTime // Pass cached schedules
      );

      // Cache schedules for next batch (loaded on first iteration)
      if (!schedulesByTime && batchResult.schedulesByTime) {
        schedulesByTime = batchResult.schedulesByTime;
      }

      progress.visits.imported += batchResult.imported;
      progress.visits.current = batchResult.nextStudentIndex;
      progress.visits.completed = batchResult.completed;

      // Update API call count after batch
      progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();

      await withDatabaseRetry(
        () => storage.updateImportJob(job.id, {
          progress: JSON.stringify(progress),
        }),
        'Update import progress after batch (visits)'
      );

      // Log memory usage after each batch to monitor for issues
      logMemoryUsage(`Visits batch completed: ${progress.visits.current}/${progress.visits.total} students`);
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
    const allStudents = await withDatabaseRetry(
      () => storage.getStudents(job.organizationId, 100000),
      'Load all students for sales import'
    );

    let batchResult;
    do {
      // Check if job has been cancelled before processing next batch
      const currentJob = await withDatabaseRetry(
        () => storage.getImportJob(job.id),
        'Check job status before sales batch'
      );
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
          await withDatabaseRetry(
            () => storage.updateImportJob(job.id, {
              progress: JSON.stringify(progress),
              currentDataType: "sales",
              currentOffset: current,
            }),
            'Update import progress (sales)'
          );
        },
        progress.sales.current || 0,
        allStudents // Pass cached students to avoid reloading
      );

      progress.sales.imported += batchResult.imported;
      progress.sales.current = batchResult.nextStudentIndex;
      progress.sales.completed = batchResult.completed;

      // Update API call count after batch
      progress.apiCallCount = baselineApiCallCount + mindbodyService.getApiCallCount();

      await withDatabaseRetry(
        () => storage.updateImportJob(job.id, {
          progress: JSON.stringify(progress),
        }),
        'Update import progress after batch (sales)'
      );
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
