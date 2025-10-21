import type { Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import archiver from "archiver";
import path from "path";
import fs from "fs/promises";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";

export function registerBackupRoutes(app: Express) {
  // Database backup - export as JSON
  app.get("/api/backups/database-json", requireAuth, async (req, res) => {
    const currentUser = req.user as User;

    // Admin-only: backups contain sensitive data
    if (currentUser.role !== "admin") {
      console.log(`[Backup] Unauthorized access attempt by user ${currentUser.id} (role: ${currentUser.role})`);
      return res.status(403).json({ message: "Admin access required" });
    }

    // Prevent caching of sensitive backup data
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");

    // Audit log
    console.log(`[Backup] Database backup requested by admin user ${currentUser.id} (${currentUser.email})`);
    const startTime = Date.now();

    try {
      await exportDatabaseAsJson(req, res);
      const duration = Date.now() - startTime;
      console.log(`[Backup] Database backup completed in ${duration}ms for user ${currentUser.id}`);
    } catch (error: any) {
      console.error(`[Backup] Database backup failed for user ${currentUser.id}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ 
          message: "Failed to create database backup",
          error: error.message 
        });
      }
    }
  });

  // Codebase backup - create ZIP archive
  app.get("/api/backups/codebase", requireAuth, async (req, res) => {
    const currentUser = req.user as User;

    // Admin-only: codebase contains sensitive configuration
    if (currentUser.role !== "admin") {
      console.log(`[Backup] Unauthorized codebase access attempt by user ${currentUser.id} (role: ${currentUser.role})`);
      return res.status(403).json({ message: "Admin access required" });
    }

    // Audit log
    console.log(`[Backup] Codebase backup requested by admin user ${currentUser.id} (${currentUser.email})`);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `mindbody-codebase-${timestamp}.zip`;

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      // Prevent caching of sensitive backup data
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");

      const archive = archiver("zip", {
        zlib: { level: 9 } // Maximum compression
      });

      // Handle archive errors gracefully
      archive.on("error", (err) => {
        console.error(`[Backup] Archive error for user ${currentUser.id}:`, err);
        archive.abort();
        if (!res.headersSent) {
          res.status(500).json({ 
            message: "Failed to create codebase archive",
            error: err.message 
          });
        }
      });

      // Handle client disconnection
      res.on("close", () => {
        if (!archive.pointer()) {
          console.log(`[Backup] Client disconnected before archive completion for user ${currentUser.id}`);
          archive.abort();
        }
      });

      archive.pipe(res);

      // Get the project root directory
      const projectRoot = path.resolve(process.cwd());

      // Add important directories to the archive
      const dirsToBackup = [
        "client",
        "server",
        "shared",
      ];

      for (const dir of dirsToBackup) {
        const dirPath = path.join(projectRoot, dir);
        try {
          await fs.access(dirPath);
          archive.directory(dirPath, dir);
        } catch (err) {
          console.log(`Directory ${dir} not found, skipping`);
        }
      }

      // Add important files
      const filesToBackup = [
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "vite.config.ts",
        "tailwind.config.ts",
        "drizzle.config.ts",
        "replit.md",
        ".env.example"
      ];

      for (const file of filesToBackup) {
        const filePath = path.join(projectRoot, file);
        try {
          await fs.access(filePath);
          archive.file(filePath, { name: file });
        } catch (err) {
          console.log(`File ${file} not found, skipping`);
        }
      }

      await archive.finalize();
      console.log(`[Backup] Codebase backup completed for user ${currentUser.id}`);
    } catch (error: any) {
      console.error(`[Backup] Codebase backup failed for user ${currentUser.id}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ 
          message: "Failed to create codebase backup",
          error: error.message 
        });
      }
    }
  });
}

// Helper function to export database as JSON
async function exportDatabaseAsJson(req: any, res: any) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `mindbody-db-backup-${timestamp}.json`;

  // Get all table data
  const tables = [
    "users",
    "organizations", 
    "students",
    "classes",
    "attendance",
    "revenue",
    "import_jobs",
    "scheduled_imports",
    "session"
  ];

  const backup: Record<string, any[]> = {};

  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM ${table}`));
      backup[table] = result.rows;
    } catch (error) {
      console.log(`Table ${table} not found or error, skipping`);
      backup[table] = [];
    }
  }

  // Add metadata
  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: "1.0",
      tables: Object.keys(backup),
      recordCount: Object.values(backup).reduce((sum, rows) => sum + rows.length, 0)
    },
    data: backup
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.json(backupData);
}
