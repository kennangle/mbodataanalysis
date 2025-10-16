import { storage } from "./storage";
import { mindbodyService } from "./mindbody";
import type { ImportJob } from "@shared/schema";

export class ImportWorker {
  private jobQueue: string[] = [];
  private isProcessing = false;
  private currentJobId: string | null = null;

  async processJob(jobId: string): Promise<void> {
    // Add job to queue
    if (!this.jobQueue.includes(jobId)) {
      this.jobQueue.push(jobId);
      console.log(`Job ${jobId} added to queue (position ${this.jobQueue.length})`);
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
      if (job.status === 'paused' || job.status === 'cancelled') {
        console.log(`Job ${jobId} was cancelled before processing started, skipping`);
        return;
      }

      // Set job to running
      await storage.updateImportJob(jobId, { status: 'running' });

      const startDate = new Date(job.startDate);
      const endDate = new Date(job.endDate);
      const dataTypes = job.dataTypes;
      const progress = JSON.parse(job.progress);

      console.log(`Processing import job ${jobId} for organization ${job.organizationId}`);

      // Process clients
      if (dataTypes.includes('clients') && !progress.clients?.completed) {
        await this.processClients(job, startDate, endDate, progress);
        
        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === 'paused' || updatedJob?.status === 'cancelled') {
          console.log(`Job ${jobId} was cancelled during clients import, stopping`);
          return;
        }
      }

      // Process classes
      if (dataTypes.includes('classes') && !progress.classes?.completed) {
        await this.processClasses(job, startDate, endDate, progress);
        
        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === 'paused' || updatedJob?.status === 'cancelled') {
          console.log(`Job ${jobId} was cancelled during classes import, stopping`);
          return;
        }
      }

      // Process visits
      if (dataTypes.includes('visits') && !progress.visits?.completed) {
        await this.processVisits(job, startDate, endDate, progress);
        
        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === 'paused' || updatedJob?.status === 'cancelled') {
          console.log(`Job ${jobId} was cancelled during visits import, stopping`);
          return;
        }
      }

      // Process sales
      if (dataTypes.includes('sales') && !progress.sales?.completed) {
        await this.processSales(job, startDate, endDate, progress);
        
        // Check if job was cancelled during processing
        const updatedJob = await storage.getImportJob(jobId);
        if (updatedJob?.status === 'paused' || updatedJob?.status === 'cancelled') {
          console.log(`Job ${jobId} was cancelled during sales import, stopping`);
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
    progress: any
  ): Promise<void> {
    console.log('Processing clients...');
    
    if (!progress.clients) {
      progress.clients = { current: 0, total: 0, imported: 0, updated: 0, completed: false };
    }

    let batchResult;
    do {
      // Check if job has been cancelled before processing next batch
      const currentJob = await storage.getImportJob(job.id);
      if (currentJob?.status === 'paused' || currentJob?.status === 'cancelled') {
        console.log(`Job ${job.id} has been cancelled, stopping clients import`);
        return;
      }

      batchResult = await mindbodyService.importClientsResumable(
        job.organizationId,
        startDate,
        endDate,
        async (current, total) => {
          progress.clients.current = current;
          progress.clients.total = total;
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

      await storage.updateImportJob(job.id, {
        progress: JSON.stringify(progress),
      });

      console.log(`Clients batch: imported=${batchResult.imported}, updated=${batchResult.updated}, next=${batchResult.nextOffset}, completed=${batchResult.completed}`);
    } while (!batchResult.completed);

    console.log(`Clients complete: ${progress.clients.imported} new, ${progress.clients.updated} updated`);
  }

  private async processClasses(
    job: ImportJob,
    startDate: Date,
    endDate: Date,
    progress: any
  ): Promise<void> {
    console.log('Processing classes...');
    
    if (!progress.classes) {
      progress.classes = { current: 0, total: 0, imported: 0, completed: false };
    }

    let batchResult;
    do {
      // Check if job has been cancelled before processing next batch
      const currentJob = await storage.getImportJob(job.id);
      if (currentJob?.status === 'paused' || currentJob?.status === 'cancelled') {
        console.log(`Job ${job.id} has been cancelled, stopping classes import`);
        return;
      }

      batchResult = await mindbodyService.importClassesResumable(
        job.organizationId,
        startDate,
        endDate,
        async (current, total) => {
          progress.classes.current = current;
          progress.classes.total = total;
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

      await storage.updateImportJob(job.id, {
        progress: JSON.stringify(progress),
      });

      console.log(`Classes batch: imported=${batchResult.imported}, next=${batchResult.nextOffset}, completed=${batchResult.completed}`);
    } while (!batchResult.completed);

    console.log(`Classes complete: ${progress.classes.imported} imported`);
  }

  private async processVisits(
    job: ImportJob,
    startDate: Date,
    endDate: Date,
    progress: any
  ): Promise<void> {
    console.log('Processing visits...');
    
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

      await storage.updateImportJob(job.id, {
        progress: JSON.stringify(progress),
      });

      console.log(`Visits batch: imported=${batchResult.imported}, next=${batchResult.nextStudentIndex}, completed=${batchResult.completed}`);
    } while (!batchResult.completed);

    console.log(`Visits complete: ${progress.visits.imported} imported`);
  }

  private async processSales(
    job: ImportJob,
    startDate: Date,
    endDate: Date,
    progress: any
  ): Promise<void> {
    console.log('Processing sales...');
    
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

      await storage.updateImportJob(job.id, {
        progress: JSON.stringify(progress),
      });

      console.log(`Sales batch: imported=${batchResult.imported}, next=${batchResult.nextStudentIndex}, completed=${batchResult.completed}`);
    } while (!batchResult.completed);

    console.log(`Sales complete: ${progress.sales.imported} imported`);
  }

  isJobProcessing(): boolean {
    return this.isProcessing;
  }

  getCurrentJobId(): string | null {
    return this.currentJobId;
  }
}

export const importWorker = new ImportWorker();
