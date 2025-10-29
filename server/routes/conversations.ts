import type { Express } from "express";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";
import { storage } from "../storage";

export function registerConversationRoutes(app: Express) {
  // Get all conversations for the current user
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversations = await storage.getConversations(organizationId, userId);
      
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch conversations",
      });
    }
  });

  // Get a specific conversation with messages
  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversationId = req.params.id;
      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify ownership
      if (conversation.organizationId !== organizationId || conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const messages = await storage.getConversationMessages(conversationId);

      res.json({
        conversation,
        messages,
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch conversation",
      });
    }
  });

  // Create a new conversation
  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { title } = req.body;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }

      if (title.length > 200) {
        return res.status(400).json({ error: "Title too long (max 200 characters)" });
      }

      const conversation = await storage.createConversation({
        organizationId,
        userId,
        title: title.trim(),
      });

      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to create conversation",
      });
    }
  });

  // Update conversation title
  app.patch("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversationId = req.params.id;
      const { title } = req.body;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }

      if (title.length > 200) {
        return res.status(400).json({ error: "Title too long (max 200 characters)" });
      }

      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify ownership
      if (conversation.organizationId !== organizationId || conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.updateConversation(conversationId, { title: title.trim() });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update conversation",
      });
    }
  });

  // Delete a conversation
  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversationId = req.params.id;
      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify ownership
      if (conversation.organizationId !== organizationId || conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteConversation(conversationId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete conversation",
      });
    }
  });

  // Add a message to a conversation
  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      const userId = (req.user as User)?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversationId = req.params.id;
      const { role, content } = req.body;

      if (!role || (role !== "user" && role !== "assistant")) {
        return res.status(400).json({ error: "Invalid role" });
      }

      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify ownership
      if (conversation.organizationId !== organizationId || conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const message = await storage.createConversationMessage({
        conversationId,
        role,
        content: content.trim(),
      });

      // Update conversation's updatedAt timestamp
      await storage.updateConversation(conversationId, {});

      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to create message",
      });
    }
  });
}
