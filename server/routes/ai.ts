import type { Express } from "express";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";
import { openaiService } from "../openai";
import { storage } from "../storage";

export function registerAIRoutes(app: Express) {
  app.post("/api/ai/query", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { query, conversationHistory, fileIds, conversationId, saveToHistory } = req.body;
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ error: "Query is required" });
      }

      if (query.length > 500) {
        return res.status(400).json({ error: "Query too long (max 500 characters)" });
      }

      // Verify conversation ownership if conversationId is provided
      let activeConversation = null;
      if (conversationId && typeof conversationId === "string") {
        activeConversation = await storage.getConversation(conversationId);
        
        if (activeConversation) {
          // Verify ownership
          if (activeConversation.organizationId !== organizationId || activeConversation.userId !== userId) {
            return res.status(403).json({ error: "Access denied to conversation" });
          }
        } else {
          return res.status(404).json({ error: "Conversation not found" });
        }
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

      let fileContext = "";
      if (Array.isArray(fileIds) && fileIds.length > 0) {
        for (const fileId of fileIds) {
          if (typeof fileId !== "string") continue;
          
          const file = await storage.getUploadedFile(fileId);
          if (!file || file.organizationId !== organizationId || file.userId !== userId) {
            continue;
          }

          if (file.extractedText) {
            fileContext += `\n\n--- File: ${file.originalName} ---\n${file.extractedText}\n`;
          }
        }
      }
      
      const result = await openaiService.generateInsight(organizationId, userId, query, history, fileContext);

      // Save messages to conversation if requested
      let savedConversationId: string | undefined;
      if (saveToHistory !== false) { // Default to true
        try {
          // Create new conversation if none exists
          if (!activeConversation) {
            // Generate title from first 50 characters of query
            const title = query.trim().substring(0, 50) + (query.length > 50 ? "..." : "");
            activeConversation = await storage.createConversation({
              organizationId,
              userId,
              title,
            });
          }

          // Save user message
          await storage.createConversationMessage({
            conversationId: activeConversation.id,
            role: "user",
            content: query.trim(),
          });

          // Save assistant response
          await storage.createConversationMessage({
            conversationId: activeConversation.id,
            role: "assistant",
            content: result.response,
          });

          // Update conversation timestamp
          await storage.updateConversation(activeConversation.id, {});

          savedConversationId = activeConversation.id;
        } catch (saveError) {
          console.error("Error saving to conversation:", saveError);
          // Don't fail the request if saving fails
        }
      }

      res.json({
        ...result,
        ...(savedConversationId && { conversationId: savedConversationId }),
      });
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
