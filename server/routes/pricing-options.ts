import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { mindbodyService } from "../mindbody";
import type { User } from "@shared/schema";

export function registerPricingOptionRoutes(app: Express) {
  // Get all pricing options
  app.get("/api/pricing-options", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const pricingOptions = await storage.getPricingOptions(organizationId);
      const count = await storage.getPricingOptionsCount(organizationId);

      res.json({ pricingOptions, count });
    } catch (error) {
      console.error("Failed to fetch pricing options:", error);
      res.status(500).json({ error: "Failed to fetch pricing options" });
    }
  });

  // Import pricing options from Mindbody
  app.post("/api/pricing-options/import", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let totalImported = 0;
      let totalUpdated = 0;
      let offset = 0;
      let completed = false;

      // Import all pages
      while (!completed) {
        const result = await mindbodyService.importServicesResumable(
          organizationId,
          async (current, total) => {
            // Progress callback - could be extended to emit progress events
            console.log(`Importing pricing options: ${current}/${total}`);
          },
          offset
        );

        totalImported += result.imported;
        totalUpdated += result.updated;
        offset = result.nextOffset;
        completed = result.completed;
      }

      res.json({
        success: true,
        imported: totalImported,
        updated: totalUpdated,
        total: totalImported + totalUpdated,
      });
    } catch (error) {
      console.error("Failed to import pricing options:", error);
      res.status(500).json({ error: "Failed to import pricing options" });
    }
  });
}
