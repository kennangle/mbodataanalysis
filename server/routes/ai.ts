import type { Express } from "express";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";
import { openaiService } from "../openai";

export function registerAIRoutes(app: Express) {
  app.post("/api/ai/query", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { query, conversationHistory } = req.body;
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ error: "Query is required" });
      }

      if (query.length > 500) {
        return res.status(400).json({ error: "Query too long (max 500 characters)" });
      }

      // Validate conversation history if provided
      const history: Array<{ role: string; content: string }> = [];
      
      if (Array.isArray(conversationHistory)) {
        // Limit history to last 20 messages (10 exchanges) to prevent token overflow
        if (conversationHistory.length > 20) {
          return res.status(400).json({ error: "Conversation history too long (max 20 messages)" });
        }

        // Validate each history entry
        for (const entry of conversationHistory) {
          // Must be an object with role and content
          if (typeof entry !== "object" || entry === null) {
            return res.status(400).json({ error: "Invalid conversation history format" });
          }

          const { role, content } = entry;

          // Role must be "user" or "assistant" only (prevent system message injection)
          if (role !== "user" && role !== "assistant") {
            return res.status(400).json({ error: "Invalid role in conversation history. Only 'user' and 'assistant' are allowed." });
          }

          // Content must be a non-empty string with reasonable length
          if (typeof content !== "string" || content.trim().length === 0) {
            return res.status(400).json({ error: "Invalid content in conversation history" });
          }

          if (content.length > 2000) {
            return res.status(400).json({ error: "Conversation history message too long (max 2000 characters per message)" });
          }

          history.push({ role, content: content.trim() });
        }
      }
      
      const result = await openaiService.generateInsight(organizationId, userId, query, history);

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
