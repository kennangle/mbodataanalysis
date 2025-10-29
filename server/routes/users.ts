import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { insertUserSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import type { User } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export function registerUserRoutes(app: Express) {
  // Get all users (admin only)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const organizationId = currentUser?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const users = await storage.getUsers(organizationId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create user (admin only)
  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const organizationId = currentUser?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { password, ...userData } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const passwordHash = `${buf.toString("hex")}.${salt}`;

      const validation = insertUserSchema.safeParse({
        ...userData,
        passwordHash,
        organizationId,
      });

      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      const user = await storage.createUser(validation.data);
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(400).json({ error: "Email already exists" });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update user (admin only)
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const organizationId = currentUser?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { password, organizationId: clientOrgId, ...updateData } = req.body;
      let dataToUpdate = { ...updateData };

      if (password) {
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(password, salt, 64)) as Buffer;
        dataToUpdate.passwordHash = `${salt}:${buf.toString("hex")}`;
      }

      const validation = insertUserSchema
        .partial()
        .omit({ organizationId: true })
        .safeParse(dataToUpdate);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      await storage.updateUser(req.params.id, validation.data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const organizationId = currentUser?.organizationId;
      const currentUserId = currentUser?.id;

      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      if (req.params.id === currentUserId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Update current user's timezone
  app.patch("/api/users/me/timezone", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as User;
      if (!currentUser?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = insertUserSchema
        .partial()
        .pick({ timezone: true })
        .safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).toString() });
      }

      await storage.updateUser(currentUser.id, validation.data);
      res.json({ success: true, timezone: validation.data.timezone });
    } catch (error) {
      res.status(500).json({ error: "Failed to update timezone" });
    }
  });
}
