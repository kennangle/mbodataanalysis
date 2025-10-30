import type { Express } from "express";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";
import { openaiService } from "../openai";
import { storage } from "../storage";
import { processAIQuery } from "../ai-worker";

export function registerAIRoutes(app: Express) {
  app.post("/api/ai/query", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { query, conversationId } = req.body;
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

      // Save user message with status="completed" (user messages are always complete)
      const userMessage = await storage.createConversationMessage({
        conversationId: activeConversation.id,
        role: "user",
        content: query.trim(),
        status: "completed",
      });

      // Create placeholder assistant message with status="pending" and empty content
      const assistantMessage = await storage.createConversationMessage({
        conversationId: activeConversation.id,
        role: "assistant",
        content: "",
        status: "pending",
      });

      // Update conversation timestamp
      await storage.updateConversation(activeConversation.id, {});

      // Trigger background processing asynchronously (don't await)
      processAIQuery(assistantMessage.id).catch(error => {
        console.error("[API] Background processing error:", error);
      });

      // Return immediately with pending message ID
      res.json({
        conversationId: activeConversation.id,
        messageId: assistantMessage.id,
        status: "pending",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create AI query";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/ai/message/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const messageId = req.params.id;
      if (!messageId) {
        return res.status(400).json({ error: "Message ID is required" });
      }

      // Get the message
      const message = await storage.getConversationMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Get the conversation to verify ownership
      const conversation = await storage.getConversation(message.conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify ownership
      if (conversation.organizationId !== organizationId || conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Return message with current status
      res.json({
        id: message.id,
        role: message.role,
        content: message.content,
        status: message.status,
        error: message.error,
        createdAt: message.createdAt,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch message status";
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
