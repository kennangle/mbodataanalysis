import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { webhookSubscriptions } from "@shared/schema";
import type { User } from "@shared/schema";

import { MindbodyService } from "../mindbody";
import { db } from "../db";

export function registerWebhookRoutes(app: Express) {
  // Webhook routes
  app.post("/api/webhooks/subscriptions", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { eventType } = req.body;
      if (!eventType) {
        return res.status(400).json({ error: "Event type is required" });
      }

      // Check if organization has Mindbody site ID configured
      const org = await storage.getOrganization(organizationId);
      if (!org?.mindbodySiteId) {
        return res.status(400).json({
          error:
            "Mindbody integration not configured. Please complete a data import first to configure your Mindbody site ID.",
        });
      }

      // Build webhook URL for this deployment
      let webhookUrl = "http://localhost:5000/api/webhooks/mindbody";
      if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(",");
        webhookUrl = `https://${domains[0]}/api/webhooks/mindbody`;
      }

      const mindbodyService = new MindbodyService();
      const { subscriptionId, messageSignatureKey } =
        await mindbodyService.createWebhookSubscription(organizationId, eventType, webhookUrl);

      const subscription = await storage.createWebhookSubscription({
        organizationId,
        eventType,
        webhookUrl,
        status: "active",
        mindbodySubscriptionId: subscriptionId,
        messageSignatureKey,
        eventSchemaVersion: 1,
      });

      res.json(subscription);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create webhook subscription";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/webhooks/subscriptions", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const subscriptions = await storage.getWebhookSubscriptions(organizationId);
      res.json(subscriptions);
    } catch {
      res.status(500).json({ error: "Failed to fetch webhook subscriptions" });
    }
  });

  app.delete("/api/webhooks/subscriptions/:id", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const subscription = await storage.getWebhookSubscription(req.params.id);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      if (subscription.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Delete from Mindbody
      if (subscription.mindbodySubscriptionId) {
        const mindbodyService = new MindbodyService();
        await mindbodyService.deleteWebhookSubscription(
          organizationId,
          subscription.mindbodySubscriptionId
        );
      }

      // Delete from our database
      await storage.deleteWebhookSubscription(req.params.id);

      res.json({ success: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete webhook subscription";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/webhooks/events", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const events = await storage.getWebhookEvents(organizationId);
      res.json(events);
    } catch {
      res.status(500).json({ error: "Failed to fetch webhook events" });
    }
  });

  // Webhook receiver endpoints (no auth required - validated by signature)
  app.head("/api/webhooks/mindbody", async (req, res) => {
    // Mindbody validation endpoint
    res.status(200).send();
  });

  app.post("/api/webhooks/mindbody", async (req, res) => {
    try {
      const signature = req.headers["x-mindbody-signature"] as string;
      const rawBody = (req as any).rawBody?.toString() || "";
      const { messageId, eventType, siteId, classVisit } = req.body;

      if (!messageId) {
        return res.status(400).json({ error: "Missing messageId" });
      }

      // Check for duplicate
      const existingEvent = await storage.getWebhookEvent(messageId);
      if (existingEvent) {
        return res.status(200).json({ message: "Event already processed" });
      }

      // Find subscription for this event type and site
      const allSubs = await db.select().from(webhookSubscriptions);
      const subscription = allSubs.find((s) => s.eventType === eventType);

      if (!subscription) {
        console.log(`No subscription found for event type: ${eventType}`);
        return res.status(200).json({ message: "No subscription found" });
      }

      // Verify signature
      if (signature && subscription.messageSignatureKey) {
        const mindbodyService = new MindbodyService();
        const isValid = mindbodyService.verifyWebhookSignature(
          rawBody,
          signature,
          subscription.messageSignatureKey
        );
        if (!isValid) {
          console.error("Invalid webhook signature");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      // Store event for processing
      const event = await storage.createWebhookEvent({
        organizationId: subscription.organizationId,
        subscriptionId: subscription.id,
        messageId,
        eventType,
        eventData: JSON.stringify(req.body),
        processed: false,
      });

      // Respond immediately (within 10 seconds requirement)
      res.status(200).json({ message: "Event received" });

      // Process asynchronously
      try {
        if (eventType === "classVisit.created" || eventType === "classVisit.updated") {
          // Find student by Mindbody client ID
          const students = await storage.getStudents(subscription.organizationId);
          const student = students.find((s) => s.mindbodyClientId === classVisit?.clientId);

          if (student && classVisit?.classId && classVisit?.visitDateTime) {
            // Find class schedule by Mindbody class ID
            const schedules = await storage.getClassSchedules(subscription.organizationId);
            const schedule = schedules.find(
              (s) => s.mindbodyScheduleId === classVisit.classId.toString()
            );

            if (schedule) {
              // Create attendance record
              await storage.createAttendance({
                organizationId: subscription.organizationId,
                studentId: student.id,
                scheduleId: schedule.id,
                attendedAt: new Date(classVisit.visitDateTime),
                status: classVisit.signedIn ? "attended" : "noshow",
              });

              // Mark event as processed
              await storage.updateWebhookEvent(event.id, {
                processed: true,
                processedAt: new Date(),
              });
            }
          }
        }
      } catch (processingError) {
        console.error("Error processing webhook:", processingError);
        await storage.updateWebhookEvent(event.id, {
          error: processingError instanceof Error ? processingError.message : "Processing failed",
        });
      }
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
