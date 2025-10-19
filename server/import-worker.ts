import { storage } from "./storage";
import { mindbodyService } from "./mindbody";
import type { ImportJob } from "@shared/schema";

// Safe JSON parser that handles null, objects, and invalid JSON
function safeJsonParse<T = any>(value: any, fallback: T = {} as T): T {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
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
    console.log(`[ImportWorker] processJob called for job ${jobId}`);
    // Add job to queue
    if (!this.jobQueue.includes(jobId)) {
      this.jobQueue.push(jobId);
      console.log(`[ImportWorker] Added job ${jobId} to queue. Queue length: ${this.jobQueue.length}`);
    }

    // Start processing if not already processing
    if (!this.isProcessing) {
      console.log(`[ImportWorker] Starting processQueue (not currently processing)`);
      this.processQueue();
    } else {
      console.log(`[ImportWorker] Already processing job ${this.currentJobId}, job ${jobId} queued`);
    }
  }

  private async processQueue(): Promise<void> {
    console.log(`[ImportWorker] processQueue started. Queue length: ${this.jobQueue.length}`);
    while (this.jobQueue.length > 0) {
      const jobId = this.jobQueue.shift()!;
      console.log(`[ImportWorker] Processing job ${jobId} from queue`);
      await this.processJobInternal(jobId);
    }
    console.log(`[ImportWorker] processQueue completed. Queue is now empty.`);
  }

  private async processJobInternal(jobId: string): Promise<void> {
    console.log(`[ImportWorker] processJobInternal called for job ${jobId}`);
    this.isProcessing = true;
    this.currentJobId = jobId;

    try {
      const job = await storage.getImportJob(jobId);
      if (!job) {
        console.error(`[ImportWorker] Job ${jobId} not found`);
        return;
      }
      console.log(`[ImportWorker] Job ${jobId} found. Status: ${job.status}, DataTypes: ${job.dataTypes}`);

      // Check if job was cancelled before it started processing
      if (job.status === 'paused' || job.status === 'cancelled') {
        console.log(`[ImportWorker] Job ${jobId} is ${job.status}, exiting early`);
        return;
      }

      // Set job to running and initialize/resume progress tracking
      console.log(`[ImportWorker] Initializing job ${jobId}...`);
      
      const startDate = new Date(job.startDate);
      const endDate = new Date(job.endDate);
      const dataTypes = job.dataTypes;
      console.log(`[ImportWorker] Dates: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log(`[ImportWorker] DataTypes: ${JSON.stringify(dataTypes)}`);
      
      const progress: any = safeJsonParse(job.progress, {});
      console.log(`[ImportWorker] Parsed progress:`, progress);
      
      // Initialize API tracking if not present
      if (!progress.apiCallCount) {
        progress.apiCallCount = 0;
      }
      if (!progress.importStartTime) {
        progress.importStartTime = new Date().toISOString();
      }
      
      // Store baseline API count from previous session (if resuming)
      const baselineApiCallCount = progress.apiCallCount || 0;
      console.log(`[ImportWorker] Baseline API call count: ${baselineApiCallCount}`);
      
      // Reset the API counter to track only this session's calls
      mindbodyService.resetApiCallCount();
      
      console.log(`[ImportWorker] Updating job ${jobId} status to 'running'...`);
      await storage.updateImportJob(jobId, { 
        status: 'running',
        progress: JSON.stringify(progress),
      });
      console.log(`[ImportWorker] Job ${jobId} status updated to 'running'`);

      // Process clients
      if (dataTypes.includes('clients') && !progress.clients?.completed) {
        await this.processClients(job, startDate, endDate, progress, baselineApiCallCount);
        
        // API call count is already updated within processClients
        
        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === 'paused' || updatedJob?.status === 'cancelled') {
          return;
        }
      }

      // Process classes
      if (dataTypes.includes('classes') && !progress.classes?.completed) {
        await this.processClasses(job, startDate, endDate, progress, baselineApiCallCount);
        
        // API call count is already updated within processClasses
        
        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === 'paused' || updatedJob?.status === 'cancelled') {
          return;
        }
      }

      // Process visits
      if (dataTypes.includes('visits') && !progress.visits?.completed) {
        await this.processVisits(job, startDate, endDate, progress, baselineApiCallCount);
        
        // API call count is already updated within processVisits
        
        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === 'paused' || updatedJob?.status === 'cancelled') {
          return;
        }
      }

      // Process sales
      if (dataTypes.includes('sales') && !progress.sales?.completed) {
        await this.processSales(job, startDate, endDate, progress, baselineApiCallCount);
        
        // API call count is already updated within processSales
        
        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === 'paused' || updatedJob?.status === 'cancelled') {
          return;
        }
      }

      // Mark job as completed
      await storage.updateImportJob(jobId, {
        status: 'completed',
        progress: JSON.stringify(progress),
      });

      console.log(`Import job ${jobId} completed successfully`);
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      await storage.updateImportJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
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
      if (currentJob?.status === 'paused' || currentJob?.status === 'cancelled') {
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
            currentDataType: 'clients',
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
      if (currentJob?.status === 'paused' || currentJob?.status === 'cancelled') {
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
            currentDataType: 'classes',
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
      if (currentJob?.status === 'paused' || currentJob?.status === 'cancelled') {
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
            currentDataType: 'visits',
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

    let batchResult;
    do {
      // Check if job has been cancelled before processing next batch
      const currentJob = await storage.getImportJob(job.id);
      if (currentJob?.status === 'paused' || currentJob?.status === 'cancelled') {
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
            currentDataType: 'sales',
            currentOffset: current,
          });
        },
        progress.sales.current || 0
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
