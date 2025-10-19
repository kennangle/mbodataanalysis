import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { insertRevenueSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import type { User } from "@shared/schema";
import multer from "multer";
import Papa from "papaparse";

export function registerRevenueRoutes(app: Express) {
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

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
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
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Import revenue from CSV
  app.post("/api/revenue/import-csv", requireAuth, upload.single('file'), async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file type
      const validMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
      const isValidExtension = req.file.originalname.toLowerCase().endsWith('.csv');
      
      if (!validMimeTypes.includes(req.file.mimetype) && !isValidExtension) {
        return res.status(400).json({ 
          error: "Invalid file type",
          details: "Please upload a CSV file"
        });
      }

      // Parse CSV
      const csvText = req.file.buffer.toString('utf-8');
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });

      if (parseResult.errors.length > 0) {
        return res.status(400).json({ 
          error: "CSV parsing failed", 
          details: parseResult.errors 
        });
      }

      // Get student map for matching by email/name
      const students = await storage.getStudents(organizationId);
      const studentMapByEmail = new Map(
        students.filter(s => s.email).map(s => [s.email!.toLowerCase(), s.id])
      );
      const studentMapByName = new Map(
        students
          .filter(s => s.firstName && s.lastName)
          .map(s => [`${s.firstName.toLowerCase()} ${s.lastName.toLowerCase()}`, s.id])
      );

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      const rows = parseResult.data as any[];

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        try {
          // Map CSV columns to revenue fields (flexible column matching)
          const saleId = row['Sale ID'] || row['SaleId'] || row['ID'] || null;
          const itemId = row['Item ID'] || row['ItemId'] || null;
          const amountStr = row['Amount'] || row['Total'] || row['Price'];
          
          // Validate amount is present
          if (!amountStr || amountStr.toString().trim() === '') {
            errors.push(`Row ${index + 1}: Missing amount field`);
            skipped++;
            continue;
          }
          
          // Clean and validate amount
          const cleanedAmount = amountStr.toString().replace(/[^0-9.-]/g, '');
          const amount = parseFloat(cleanedAmount);
          if (isNaN(amount)) {
            errors.push(`Row ${index + 1}: Invalid amount "${amountStr}"`);
            skipped++;
            continue;
          }
          
          const type = row['Type'] || row['Category'] || row['Payment Method'] || 'Sale';
          const description = row['Description'] || row['Item'] || row['Product'] || row['Service'] || '';
          
          // Handle various date formats
          const dateStr = row['Date'] || row['Sale Date'] || row['Transaction Date'] || row['SaleDate'];
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

          // Try to match student by email or name
          let studentId: string | null = null;
          const clientEmail = row['Client Email'] || row['Email'] || row['ClientEmail'];
          const clientName = row['Client Name'] || row['Client'] || row['ClientName'];
          
          if (clientEmail) {
            studentId = studentMapByEmail.get(clientEmail.toLowerCase()) || null;
          }
          if (!studentId && clientName) {
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

      res.json({
        success: true,
        imported,
        skipped,
        total: parseResult.data.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Return first 10 errors
      });
    } catch (error: any) {
      console.error('CSV import error:', error);
      res.status(500).json({ error: "Failed to import CSV", details: error.message });
    }
  });
}
