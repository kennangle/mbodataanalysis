import type { Express } from "express";
import multer from "multer";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";
import { storage } from "../storage";
import { parseFile } from "../file-parser";
import { writeFileSync, unlinkSync } from "fs";
import { join, basename } from "path";
import { randomUUID } from "crypto";
import { ObjectStorageService } from "../objectStorage";
import { tmpdir } from "os";

function sanitizeFilename(filename: string): string {
  const safe = basename(filename)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 200);
  
  if (!safe || safe === '.') {
    return 'file';
  }
  
  return safe;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/csv",
      "text/plain",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/pdf",
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV, Excel, PDF, and text files are allowed."));
    }
  },
});

export function registerFileRoutes(app: Express) {
  app.post("/api/files/upload", requireAuth, upload.single("file"), async (req, res) => {
    let tempFilePath: string | null = null;
    
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      const fileId = randomUUID();
      const safeName = sanitizeFilename(file.originalname);
      const fileName = `${fileId}-${safeName}`;
      
      const objectStorage = new ObjectStorageService();
      const privateDir = objectStorage.getPrivateObjectDir();
      const storagePath = `${privateDir}/${fileName}`;
      
      // Write to temp file for parsing
      tempFilePath = join(tmpdir(), `upload-${fileId}-${safeName}`);
      writeFileSync(tempFilePath, file.buffer);

      let extractedText = "";
      try {
        const parsed = await parseFile(tempFilePath, file.mimetype);
        extractedText = parsed.text;
      } catch (error) {
        console.error("Error parsing file:", error);
        extractedText = "Could not extract text from file";
      }

      // Upload to object storage
      await objectStorage.saveFile(storagePath, file.buffer);

      const uploadedFile = await storage.createUploadedFile({
        organizationId,
        userId,
        fileName,
        originalName: safeName,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath,
        extractedText,
      });

      res.json({
        id: uploadedFile.id,
        fileName: uploadedFile.originalName,
        fileSize: uploadedFile.fileSize,
        fileType: uploadedFile.fileType,
        createdAt: uploadedFile.createdAt,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to upload file",
      });
    } finally {
      // Clean up temp file
      if (tempFilePath) {
        try {
          unlinkSync(tempFilePath);
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }
    }
  });

  app.get("/api/files", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const files = await storage.getUploadedFiles(organizationId, userId);
      
      res.json(
        files.map(file => ({
          id: file.id,
          fileName: file.originalName,
          fileSize: file.fileSize,
          fileType: file.fileType,
          createdAt: file.createdAt,
        }))
      );
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch files",
      });
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const fileId = req.params.id;
      const file = await storage.getUploadedFile(fileId);

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      if (file.organizationId !== organizationId || file.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      try {
        unlinkSync(file.storagePath);
      } catch (error) {
        console.error("Error deleting file from storage:", error);
      }

      await storage.deleteUploadedFile(fileId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete file",
      });
    }
  });
}
