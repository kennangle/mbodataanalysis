import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerUserRoutes } from "./users";
import { registerStudentRoutes } from "./students";
import { registerClassRoutes } from "./classes";
import { registerAttendanceRoutes } from "./attendance";
import { registerRevenueRoutes } from "./revenue";
import { registerMindbodyRoutes } from "./mindbody";
import { registerWebhookRoutes } from "./webhooks";
import { registerAIRoutes } from "./ai";
import { registerDashboardRoutes } from "./dashboard";
import { registerReportRoutes } from "./reports";
import { registerScheduledImportRoutes } from "./scheduled-imports";
import { registerBackupRoutes } from "./backups";
import { registerKPIRoutes } from "./kpi";
import { registerFileRoutes } from "./files";
import { registerConversationRoutes } from "./conversations";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all route modules
  registerUserRoutes(app);
  registerStudentRoutes(app);
  registerClassRoutes(app);
  registerAttendanceRoutes(app);
  registerRevenueRoutes(app);
  registerMindbodyRoutes(app);
  registerWebhookRoutes(app);
  registerAIRoutes(app);
  registerDashboardRoutes(app);
  registerReportRoutes(app);
  registerScheduledImportRoutes(app);
  registerBackupRoutes(app);
  registerKPIRoutes(app);
  registerFileRoutes(app);
  registerConversationRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
