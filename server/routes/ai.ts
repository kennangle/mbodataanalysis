import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { insertStudentSchema, insertClassSchema, insertAttendanceSchema, insertRevenueSchema, insertUserSchema, organizations, webhookSubscriptions } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import type { User } from "@shared/schema";

import { MindbodyService } from "../mindbody";
import { openaiService } from "../openai";
import { db } from "../db";


export function registerAIRoutes(app: Express) {
  app.post("/api/ai/query", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;
      
      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { query } = req.body;
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ error: "Query is required" });
      }

      if (query.length > 500) {
        return res.status(400).json({ error: "Query too long (max 500 characters)" });
      }

      const result = await openaiService.generateInsight(organizationId, userId, query);

      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate AI insight";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/ai/usage", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      res.json({
        queriesThisMonth: 0,
        tokensThisMonth: 0,
        queryLimit: 1000,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });
}
