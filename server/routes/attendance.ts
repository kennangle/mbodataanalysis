import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { insertAttendanceSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import type { User } from "@shared/schema";
import multer from "multer";
import Papa from "papaparse";
import { readFileSync, unlinkSync } from "fs";

const upload = multer({ dest: "/tmp/uploads/" });

export function registerAttendanceRoutes(app: Express) {
  // Get attendance records
  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const attendance = await storage.getAttendance(organizationId, startDate, endDate);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  // Create attendance record
  app.post("/api/attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = insertAttendanceSchema.safeParse({ ...req.body, organizationId });
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      const attendance = await storage.createAttendance(validation.data);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Failed to create attendance record" });
    }
  });

  // Import attendance from CSV (Mindbody export)
  app.post("/api/attendance/import-csv", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Server-side validation
      if (!req.file.originalname.endsWith('.csv')) {
        return res.status(400).json({ error: "Only CSV files are allowed" });
      }
      
      if (req.file.size > 50 * 1024 * 1024) { // 50MB limit
        return res.status(400).json({ error: "File size exceeds 50MB limit" });
      }

      const filePath = req.file.path;
      let imported = 0;
      let skipped = 0;
      let duplicates = 0;
      const errors: string[] = [];

      try {
        // Read and parse CSV
        const csvContent = readFileSync(filePath, "utf-8");
        const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
        const rows = parsed.data as Array<Record<string, any>>;

        console.log(`[Attendance CSV] Processing ${rows.length} rows`);
        console.log(`[Attendance CSV] Sample columns:`, Object.keys(rows[0] || {}).join(", "));

        // Load students, schedules, and existing attendance for deduplication
        const [students, schedules, existingAttendance] = await Promise.all([
          storage.getStudents(organizationId, 100000),
          storage.getClassSchedules(organizationId),
          storage.getAttendance(organizationId),
        ]);

        console.log(`[Attendance CSV] Loaded ${students.length} students, ${schedules.length} schedules, ${existingAttendance.length} existing attendance records`);

        // Create lookup maps for faster matching
        const studentsByClientId = new Map(
          students.filter(s => s.mindbodyClientId).map(s => [s.mindbodyClientId!, s])
        );
        const studentsByEmail = new Map(
          students.filter(s => s.email).map(s => [s.email!.toLowerCase(), s])
        );
        
        // Multiple schedule matching strategies for better success rate
        const schedulesByTimeUTC = new Map(
          schedules.map(s => [s.startTime.toISOString(), s])
        );
        const schedulesByTimeLocal = new Map(
          schedules.map(s => [s.startTime.toISOString().split('T')[0] + ' ' + s.startTime.toISOString().split('T')[1].substring(0, 8), s])
        );
        
        // Deduplication: track existing attendance by student+schedule+date
        const existingAttendanceSet = new Set(
          existingAttendance.map(a => `${a.studentId}|${a.scheduleId}|${a.attendedAt.toISOString().split('T')[0]}`)
        );

        // Process each row
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          try {
            // Flexible column name matching
            const clientId = row["Client ID"] || row["ClientID"] || row["Client Id"] || row["client_id"];
            const email = row["Email"] || row["email"] || row["Client Email"];
            const className = row["Class Name"] || row["ClassName"] || row["Class"] || row["class_name"];
            const startDateTimeRaw = row["Start Date/Time"] || row["Start DateTime"] || row["Class Date"] || 
                                     row["Date/Time"] || row["DateTime"] || row["Date"];
            const status = row["Status"] || row["status"] || "attended";

            // Match student by Client ID or Email
            let student = clientId ? studentsByClientId.get(clientId) : undefined;
            if (!student && email) {
              student = studentsByEmail.get(email.toLowerCase());
            }

            if (!student) {
              skipped++;
              if (errors.length < 100) {
                errors.push(`Row ${i + 1}: No student found for ${clientId || email || 'unknown'}`);
              }
              continue;
            }

            // Parse date/time
            if (!startDateTimeRaw) {
              skipped++;
              if (errors.length < 100) {
                errors.push(`Row ${i + 1}: Missing date/time`);
              }
              continue;
            }

            const startDateTime = new Date(startDateTimeRaw);
            if (isNaN(startDateTime.getTime())) {
              skipped++;
              if (errors.length < 100) {
                errors.push(`Row ${i + 1}: Invalid date format: ${startDateTimeRaw}`);
              }
              continue;
            }

            // Match schedule by start time with multiple strategies
            let schedule = schedulesByTimeUTC.get(startDateTime.toISOString());
            if (!schedule) {
              // Try matching with just date and time (ignoring timezone)
              const timeKey = startDateTime.toISOString().split('T')[0] + ' ' + startDateTime.toISOString().split('T')[1].substring(0, 8);
              schedule = schedulesByTimeLocal.get(timeKey);
            }

            if (!schedule) {
              skipped++;
              // Don't add to errors - this is common for old/deleted classes
              continue;
            }

            // Check for duplicates
            const duplicateKey = `${student.id}|${schedule.id}|${startDateTime.toISOString().split('T')[0]}`;
            if (existingAttendanceSet.has(duplicateKey)) {
              duplicates++;
              continue;
            }

            // Create attendance record (will be batched)
            await storage.createAttendance({
              organizationId,
              studentId: student.id,
              scheduleId: schedule.id,
              attendedAt: startDateTime,
              status: status.toLowerCase().includes("noshow") || status.toLowerCase().includes("no show") 
                ? "noshow" 
                : "attended",
            });

            // Add to set to prevent duplicates within this import
            existingAttendanceSet.add(duplicateKey);
            imported++;
          } catch (error) {
            skipped++;
            if (errors.length < 100) {
              errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        console.log(`[Attendance CSV] Import complete: ${imported} imported, ${skipped} skipped, ${duplicates} duplicates`);

        res.json({
          success: true,
          imported,
          skipped,
          duplicates,
          totalRows: rows.length,
          errors,
        });
      } finally {
        // Clean up uploaded file
        try {
          unlinkSync(filePath);
        } catch (cleanupError) {
          console.error("Failed to delete uploaded file:", cleanupError);
        }
      }
    } catch (error) {
      console.error("[Attendance CSV] Import failed:", error);
      res.status(500).json({ 
        error: "CSV import failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}
