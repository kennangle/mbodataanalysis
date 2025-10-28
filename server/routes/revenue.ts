import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { insertRevenueSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import type { User } from "@shared/schema";
import multer from "multer";
import Papa from "papaparse";

// In-memory progress tracking for CSV imports
interface ImportProgress {
  total: number;
  processed: number;
  imported: number;
  skipped: number;
  startTime: number;
}

const importProgressMap = new Map<string, ImportProgress>();

export function registerRevenueRoutes(app: Express) {
  // Check revenue data integrity (admin only)
  app.get("/api/revenue/check-integrity", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const organizationId = currentUser?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Admin only
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Count total records first
      const totalCount = await storage.getSalesCount(organizationId);

      // Handle empty dataset
      if (totalCount === 0) {
        return res.json({
          totalRecords: 0,
          sampleSize: 0,
          analysis: {
            withBothIds: 0,
            withSaleIdOnly: 0,
            withItemIdOnly: 0,
            withoutIds: 0,
          },
          conclusion: "safe",
          message: "No existing revenue data. API import will start fresh without any duplicates.",
          deduplicationInfo: "upsertRevenue deduplicates records with mindbodySaleId (with or without itemId). Records without saleId will create duplicates.",
          sampleRecords: [],
        });
      }

      // Get sample of revenue records (100 most recent, properly sorted)
      const sampleSize = Math.min(100, totalCount);
      const allRecords = await storage.getRevenue(organizationId, undefined, undefined);
      
      // Sort by transaction date descending and take most recent
      const sample = allRecords
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
        .slice(0, sampleSize);

      // Analyze all possible ID combinations
      const withBothIds = sample.filter(r => r.mindbodySaleId && r.mindbodyItemId).length;
      const withSaleIdOnly = sample.filter(r => r.mindbodySaleId && !r.mindbodyItemId).length;
      const withItemIdOnly = sample.filter(r => !r.mindbodySaleId && r.mindbodyItemId).length;
      const withoutIds = sample.filter(r => !r.mindbodySaleId && !r.mindbodyItemId).length;

      // Verify totals match (sanity check)
      const totalCategorized = withBothIds + withSaleIdOnly + withItemIdOnly + withoutIds;
      if (totalCategorized !== sample.length) {
        console.error(`Revenue integrity check: categorization mismatch! ${totalCategorized} != ${sample.length}`);
      }

      // upsertRevenue deduplication logic (from storage.ts):
      // - Has mindbodySaleId (with or without itemId): Deduped via DB constraint or manual check
      // - No mindbodySaleId: NOT deduped, will create duplicates
      const withDedupeCapability = withBothIds + withSaleIdOnly;
      const pctSafe = withDedupeCapability / sample.length;

      // Determine conclusion based on actual upsertRevenue behavior
      let conclusion: "safe" | "mixed" | "duplicate_risk";
      let message: string;

      if (pctSafe >= 0.95) {
        // 95%+ have Sale ID (sufficient for deduplication)
        conclusion = "safe";
        message = `${Math.round(pctSafe * 100)}% of your revenue data has Mindbody Sale IDs. API import will update existing records instead of creating duplicates.`;
      } else if (pctSafe > 0) {
        // Mixed dataset - some with Sale IDs, some without
        conclusion = "mixed";
        const pctDuplicates = Math.round((1 - pctSafe) * 100);
        message = `Only ${Math.round(pctSafe * 100)}% of your revenue data has Mindbody Sale IDs. API import will update ${Math.round(pctSafe * 100)}% of records but create duplicates for ${pctDuplicates}% without Sale IDs. Recommended: Delete existing revenue data and re-import via API only.`;
      } else {
        // No Sale IDs - will create all duplicates
        conclusion = "duplicate_risk";
        message = "Your revenue data is missing Mindbody Sale IDs (likely from CSV import without ID columns). API import will create duplicate records for all transactions. Recommended: Delete all existing revenue data before importing via Mindbody API.";
      }

      res.json({
        totalRecords: totalCount,
        sampleSize: sample.length,
        analysis: {
          withBothIds,
          withSaleIdOnly,
          withItemIdOnly,
          withoutIds,
        },
        conclusion,
        message,
        deduplicationInfo: "upsertRevenue deduplicates records with mindbodySaleId (with or without itemId). Records without saleId will create duplicates.",
        sampleRecords: sample.slice(0, 10).map(r => ({
          id: r.id,
          date: r.transactionDate,
          amount: r.amount,
          description: r.description,
          hasSaleId: !!r.mindbodySaleId,
          hasItemId: !!r.mindbodyItemId,
        })),
      });
    } catch (error) {
      console.error("Revenue integrity check error:", error);
      res.status(500).json({ error: "Failed to check revenue data integrity" });
    }
  });

  // Get CSV import progress
  app.get("/api/revenue/import-progress", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log(`[Progress Check] Org ${organizationId}, map size: ${importProgressMap.size}, has progress: ${importProgressMap.has(organizationId)}`);
      const progress = importProgressMap.get(organizationId);
      if (!progress) {
        return res.status(404).json({ error: "No import in progress" });
      }

      const elapsed = (Date.now() - progress.startTime) / 1000;
      // Guard against division by zero for empty CSV files
      const percentage =
        progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

      res.json({
        ...progress,
        percentage,
        elapsed,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import progress" });
    }
  });
  // Get revenue records
  app.get("/api/revenue", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const revenue = await storage.getRevenue(organizationId, startDate, endDate);
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue" });
    }
  });

  // Get revenue statistics
  app.get("/api/revenue/stats", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const stats = await storage.getRevenueStats(organizationId, startDate, endDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue stats" });
    }
  });

  // Create revenue record
  app.post("/api/revenue", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = insertRevenueSchema.safeParse({ ...req.body, organizationId });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      const revenue = await storage.createRevenue(validation.data);
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ error: "Failed to create revenue record" });
    }
  });

  // CSV upload configuration
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for large CSV files
  });

  // Import revenue from CSV (background job with chunked student matching)
  app.post("/api/revenue/import-csv", requireAuth, upload.single("file"), async (req, res) => {
    const organizationId = (req.user as User)?.organizationId;
    
    try {
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file type
      const validMimeTypes = ["text/csv", "application/csv", "text/plain"];
      const isValidExtension = req.file.originalname.toLowerCase().endsWith(".csv");

      if (!validMimeTypes.includes(req.file.mimetype) && !isValidExtension) {
        return res.status(400).json({
          error: "Invalid file type",
          details: "Please upload a CSV file",
        });
      }

      // Parse CSV to validate format (handle BOM if present)
      let csvText = req.file.buffer.toString("utf-8");
      // Remove BOM if present
      if (csvText.charCodeAt(0) === 0xfeff) {
        csvText = csvText.slice(1);
      }

      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });

      if (parseResult.errors.length > 0) {
        return res.status(400).json({
          error: "CSV parsing failed",
          details: parseResult.errors,
        });
      }

      if (parseResult.data.length === 0) {
        return res.status(400).json({
          error: "CSV file is empty",
          details: "No data rows found in CSV",
        });
      }

      // Compress CSV data for storage (base64 encode for now - could use gzip in future)
      const csvDataCompressed = Buffer.from(csvText).toString("base64");

      // Create import job with CSV data
      const importJob = await storage.createImportJob({
        organizationId,
        dataTypes: ["revenue"],
        startDate: new Date("2000-01-01"),
        endDate: new Date(),
        status: "pending",
        csvData: csvDataCompressed,
        progress: JSON.stringify({
          revenue: { current: 0, total: parseResult.data.length }
        }),
      });

      console.log(`[CSV Import] Created background job ${importJob.id} for ${parseResult.data.length} rows`);

      // Start background processing (non-blocking)
      processRevenueCSVBackground(importJob.id, organizationId, storage).catch(err => {
        console.error("[CSV Import] Background processing error:", err);
      });

      // Return immediately with job ID
      res.json({
        success: true,
        jobId: importJob.id,
        totalRows: parseResult.data.length,
        message: "CSV import started in background. Check import history for progress.",
      });

    } catch (error: any) {
      console.error("CSV import error:", error);
      res.status(500).json({ error: "Failed to import CSV", details: error.message });
    }
  });

  // Get CSV import progress
  app.get("/api/revenue/import-progress", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const progress = importProgressMap.get(organizationId);
      if (!progress) {
        return res.json({ status: "idle" });
      }

      const elapsedSeconds = (Date.now() - progress.startTime) / 1000;
      const rowsPerSecond = progress.processed > 0 ? progress.processed / elapsedSeconds : 0;
      const remainingRows = progress.total - progress.processed;
      const estimatedSecondsLeft = rowsPerSecond > 0 ? remainingRows / rowsPerSecond : 0;

      res.json({
        status: "in_progress", // Critical: Frontend depends on this for UI visibility
        total: progress.total,
        processed: progress.processed,
        imported: progress.imported,
        skipped: progress.skipped,
        elapsedSeconds: Math.floor(elapsedSeconds),
        estimatedSecondsLeft: Math.floor(estimatedSecondsLeft),
        rowsPerSecond: Math.floor(rowsPerSecond),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get import progress" });
    }
  });
}

// Background worker for CSV import with chunked student matching
async function processRevenueCSVBackground(
  jobId: string,
  organizationId: string,
  storage: IStorage
) {
  const startTime = Date.now();
  console.log(`[CSV Background Worker] Starting job ${jobId} for org ${organizationId}`);

  try {
    // Update job status to running
    await storage.updateImportJob(jobId, { status: "running" });

    // Fetch the job to get CSV data
    const job = await storage.getImportJob(jobId);
    if (!job || !job.csvData) {
      throw new Error("Import job not found or CSV data missing");
    }

    // Decompress CSV data
    const csvText = Buffer.from(job.csvData, "base64").toString("utf-8");

    // Parse CSV
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    const rows = parseResult.data as any[];
    console.log(`[CSV Background Worker] Processing ${rows.length} rows with student matching`);

    // Initialize progress
    importProgressMap.set(organizationId, {
      total: rows.length,
      processed: 0,
      imported: 0,
      skipped: 0,
      startTime,
    });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const STUDENT_BATCH_SIZE = 1000;

    // Pre-build student lookup map in chunks to avoid memory issues
    console.log(`[CSV Background Worker] Building student lookup map...`);
    const studentLookupByMindbodyId = new Map<string, string>(); // mindbodyId -> studentId
    const studentLookupByEmail = new Map<string, string>(); // email -> studentId

    // Fetch students in batches
    let studentOffset = 0;
    let hasMoreStudents = true;

    while (hasMoreStudents) {
      const studentBatch = await storage.getStudents(organizationId, STUDENT_BATCH_SIZE, studentOffset);
      
      if (studentBatch.length === 0) {
        hasMoreStudents = false;
        break;
      }

      // Build lookup maps
      for (const student of studentBatch) {
        if (student.mindbodyId) {
          studentLookupByMindbodyId.set(student.mindbodyId, student.id);
        }
        if (student.email) {
          studentLookupByEmail.set(student.email.toLowerCase(), student.id);
        }
      }

      studentOffset += studentBatch.length;
      console.log(`[CSV Background Worker] Loaded ${studentOffset} students into lookup map`);

      if (studentBatch.length < STUDENT_BATCH_SIZE) {
        hasMoreStudents = false;
      }
    }

    console.log(`[CSV Background Worker] Student lookup complete: ${studentLookupByMindbodyId.size} by ID, ${studentLookupByEmail.size} by email`);

    // Process rows with student matching
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      // Update progress
      importProgressMap.set(organizationId, {
        total: rows.length,
        processed: index + 1,
        imported,
        skipped,
        startTime,
      });

      // Update job progress every 100 rows
      if (index > 0 && index % 100 === 0) {
        await storage.updateImportJob(jobId, {
          progress: JSON.stringify({
            revenue: { current: index, total: rows.length }
          }),
        });
      }

      // Log progress every 1000 rows
      if (index > 0 && index % 1000 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `[CSV Background Worker] Progress: ${index}/${rows.length} (${elapsed}s, ${imported} imported, ${skipped} skipped)`
        );
      }

      try {
        // Map CSV columns
        const saleId = row["Sale ID"] || row["SaleId"] || row["ID"] || null;
        const itemId = row["Item ID"] || row["ItemId"] || null;
        const amountStr = row["Item Total"] || row["Amount"] || row["Total"] || row["Price"];

        if (!amountStr || amountStr.toString().trim() === "") {
          errors.push(`Row ${index + 1}: Missing amount`);
          skipped++;
          continue;
        }

        const cleanedAmount = amountStr.toString().replace(/[^0-9.-]/g, "");
        const amount = parseFloat(cleanedAmount);
        if (isNaN(amount)) {
          errors.push(`Row ${index + 1}: Invalid amount "${amountStr}"`);
          skipped++;
          continue;
        }

        const dateStr = row["Sale Date"] || row["Date"] || row["Transaction Date"] || row["SaleDate"];
        if (!dateStr) {
          errors.push(`Row ${index + 1}: Missing date`);
          skipped++;
          continue;
        }

        const transactionDate = new Date(dateStr);
        if (isNaN(transactionDate.getTime())) {
          errors.push(`Row ${index + 1}: Invalid date "${dateStr}"`);
          skipped++;
          continue;
        }

        // Match student by Mindbody Client ID or email
        let studentId: string | null = null;
        const clientId = row["Client ID"] || row["ClientId"] || row["ClientID"];
        const clientEmail = row["Email"] || row["Client Email"];

        if (clientId) {
          studentId = studentLookupByMindbodyId.get(clientId.toString()) || null;
        }
        if (!studentId && clientEmail) {
          studentId = studentLookupByEmail.get(clientEmail.toString().toLowerCase()) || null;
        }

        const type = row["Payment Method"] || row["Type"] || row["Category"] || "Sale";
        const description =
          row["Item name"] ||
          row["Description"] ||
          row["Item"] ||
          row["Product"] ||
          row["Service"] ||
          "";

        // Upsert revenue
        await storage.upsertRevenue({
          organizationId,
          studentId,
          mindbodySaleId: saleId,
          mindbodyItemId: itemId,
          amount: amount.toFixed(2),
          type,
          description,
          transactionDate,
        });

        imported++;
      } catch (error: any) {
        errors.push(`Row ${index + 1}: ${error.message}`);
        skipped++;
      }
    }

    // Final update
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[CSV Background Worker] Completed: ${imported} imported, ${skipped} skipped, ${rows.length} total in ${totalTime}s`
    );

    await storage.updateImportJob(jobId, {
      status: "completed",
      error: errors.length > 0 ? `${errors.length} rows had errors. First: ${errors[0]}` : null,
      progress: JSON.stringify({
        revenue: { current: rows.length, total: rows.length }
      }),
    });

    // Clear progress
    importProgressMap.delete(organizationId);

  } catch (error: any) {
    console.error("[CSV Background Worker] Error:", error);

    // Update job as failed
    await storage.updateImportJob(jobId, {
      status: "failed",
      error: error.message,
    });

    // Clear progress
    importProgressMap.delete(organizationId);
  }
}
