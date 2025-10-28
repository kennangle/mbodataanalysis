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

  // Import revenue from CSV
  app.post("/api/revenue/import-csv", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
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

      // Initialize progress tracking early so frontend can show "Initializing..." properly
      console.log(`[CSV Import] Initializing progress tracking for org ${organizationId}`);
      const startTime = Date.now();
      importProgressMap.set(organizationId, {
        total: 0, // Will update after parsing
        processed: 0,
        imported: 0,
        skipped: 0,
        startTime,
      });
      console.log(`[CSV Import] Progress tracking initialized, map size: ${importProgressMap.size}`);

      // Parse CSV (handle BOM if present)
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
        importProgressMap.delete(organizationId); // Clean up on error
        return res.status(400).json({
          error: "CSV parsing failed",
          details: parseResult.errors,
        });
      }

      // Get student maps for matching by Mindbody ID, email, or name (this can take 10-20 seconds for 36K+ students)
      const students = await storage.getStudents(organizationId);
      const studentMapByMindbodyId = new Map(
        students.filter((s) => s.mindbodyClientId).map((s) => [s.mindbodyClientId!, s.id])
      );
      const studentMapByEmail = new Map(
        students.filter((s) => s.email).map((s) => [s.email!.toLowerCase(), s.id])
      );
      const studentMapByName = new Map(
        students
          .filter((s) => s.firstName && s.lastName)
          .map((s) => [`${s.firstName.toLowerCase()} ${s.lastName.toLowerCase()}`, s.id])
      );

      let imported = 0;
      let skipped = 0;
      let updated = 0;
      const errors: string[] = [];
      const rows = parseResult.data as any[];

      console.log(`[CSV Import] Starting import of ${rows.length} rows...`);

      // Create import job for tracking
      const importJob = await storage.createImportJob({
        organizationId,
        dataTypes: ["revenue"],
        startDate: new Date("2000-01-01"), // CSV doesn't have predefined date range
        endDate: new Date(),
        status: "in_progress",
      });

      // Update progress tracking with actual row count (initialized earlier with total=0)
      importProgressMap.set(organizationId, {
        total: rows.length,
        processed: 0,
        imported: 0,
        skipped: 0,
        startTime,
      });

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];

        // Update progress on every row for real-time accuracy
        importProgressMap.set(organizationId, {
          total: rows.length,
          processed: index + 1, // +1 because we're processing this row now
          imported,
          skipped,
          startTime,
        });

        // Log progress every 1000 rows
        if (index > 0 && index % 1000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(
            `[CSV Import] Progress: ${index}/${rows.length} rows processed (${elapsed}s, ${imported} imported, ${skipped} skipped)`
          );
        }
        try {
          // Map CSV columns to revenue fields (flexible column matching)
          // Mindbody format: "Sale ID", "Item Total", "Client ID", "Client", "Item name", "Payment Method"
          const saleId = row["Sale ID"] || row["SaleId"] || row["ID"] || null;
          const itemId = row["Item ID"] || row["ItemId"] || null;
          const amountStr = row["Item Total"] || row["Amount"] || row["Total"] || row["Price"];

          // Validate amount is present
          if (!amountStr || amountStr.toString().trim() === "") {
            errors.push(`Row ${index + 1}: Missing amount field`);
            skipped++;
            continue;
          }

          // Clean and validate amount
          const cleanedAmount = amountStr.toString().replace(/[^0-9.-]/g, "");
          const amount = parseFloat(cleanedAmount);
          if (isNaN(amount)) {
            errors.push(`Row ${index + 1}: Invalid amount "${amountStr}"`);
            skipped++;
            continue;
          }

          const type = row["Payment Method"] || row["Type"] || row["Category"] || "Sale";
          const description =
            row["Item name"] ||
            row["Description"] ||
            row["Item"] ||
            row["Product"] ||
            row["Service"] ||
            "";

          // Handle various date formats
          const dateStr =
            row["Sale Date"] || row["Date"] || row["Transaction Date"] || row["SaleDate"];
          if (!dateStr) {
            errors.push(`Row ${index + 1}: Missing date field`);
            skipped++;
            continue;
          }

          const transactionDate = new Date(dateStr);
          if (isNaN(transactionDate.getTime())) {
            errors.push(`Row ${index + 1}: Invalid date "${dateStr}"`);
            skipped++;
            continue;
          }

          // Try to match student by Mindbody Client ID, email, or name
          let studentId: string | null = null;
          const clientId = row["Client ID"] || row["ClientID"] || row["Client Id"];
          const clientEmail = row["Client Email"] || row["Email"] || row["ClientEmail"];
          let clientName = row["Client"] || row["Client Name"] || row["ClientName"];

          // First, try matching by Mindbody Client ID (most accurate)
          if (clientId) {
            studentId = studentMapByMindbodyId.get(clientId) || null;
          }

          // If no match, try email
          if (!studentId && clientEmail) {
            studentId = studentMapByEmail.get(clientEmail.toLowerCase()) || null;
          }

          // If no match, try name (handle "Last, First" format from Mindbody)
          if (!studentId && clientName) {
            // Convert "Last, First" to "First Last" for matching
            if (clientName.includes(",")) {
              const parts = clientName.split(",").map((p: string) => p.trim());
              if (parts.length === 2) {
                clientName = `${parts[1]} ${parts[0]}`; // "First Last"
              }
            }
            studentId = studentMapByName.get(clientName.toLowerCase()) || null;
          }

          // Import with upsert to prevent duplicates
          await storage.upsertRevenue({
            organizationId,
            studentId,
            mindbodySaleId: saleId,
            mindbodyItemId: itemId,
            amount: amount.toFixed(2), // Ensure 2 decimal places
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

      // Log final summary
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[CSV Import] Completed: ${imported} processed, ${skipped} skipped, ${rows.length} total in ${totalTime}s`
      );

      // Log errors for debugging
      if (errors.length > 0) {
        console.error(
          `[CSV Import] Errors (showing first 10 of ${errors.length}):`,
          errors.slice(0, 10)
        );
      }

      // Update import job with completion status
      await storage.updateImportJob(importJob.id, {
        status: "completed",
        error: errors.length > 0 ? `${errors.length} rows had errors. First error: ${errors[0]}` : null,
      });

      // Clear progress tracking
      importProgressMap.delete(organizationId);

      res.json({
        success: true,
        processed: imported, // Total rows processed successfully (includes both new inserts and updates)
        skipped,
        total: parseResult.data.length,
        totalErrors: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined, // Return first 20 errors for visibility
      });
    } catch (error: any) {
      console.error("CSV import error:", error);

      // Clear progress on error
      const organizationId = (req.user as User)?.organizationId;
      if (organizationId) {
        importProgressMap.delete(organizationId);
      }

      // Update import job as failed if it was created
      try {
        const importJob = await storage.getActiveImportJob(organizationId!);
        if (importJob) {
          await storage.updateImportJob(importJob.id, {
            status: "failed",
            error: error.message,
          });
        }
      } catch (e) {
        // Ignore error updating job status
      }

      res.status(500).json({ error: "Failed to import CSV", details: error.message });
    }
  });
}
