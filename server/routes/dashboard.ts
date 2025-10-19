import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";
import { db } from "../db";


export function registerDashboardRoutes(app: Express) {
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalStudentCount,
        activeStudentCount,
        revenueStats,
        lastMonthRevenueStats,
        attendanceRecords,
        lastMonthAttendanceRecords,
        classes
      ] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getActiveStudentCount(organizationId),
        storage.getRevenueStats(organizationId, thisMonth, now),
        storage.getRevenueStats(organizationId, lastMonth, thisMonth),
        storage.getAttendance(organizationId), // Get ALL attendance records
        storage.getAttendance(organizationId, lastMonth, thisMonth),
        storage.getClasses(organizationId)
      ]);

      const attendanceRate = attendanceRecords.length > 0 
        ? (attendanceRecords.filter(a => a.status === 'attended').length / attendanceRecords.length) * 100 
        : 0;
      
      const lastMonthAttendanceRate = lastMonthAttendanceRecords.length > 0
        ? (lastMonthAttendanceRecords.filter(a => a.status === 'attended').length / lastMonthAttendanceRecords.length) * 100
        : 0;

      const revenueChange = lastMonthRevenueStats.total > 0
        ? ((revenueStats.total - lastMonthRevenueStats.total) / lastMonthRevenueStats.total) * 100
        : 0;

      const attendanceChange = lastMonthAttendanceRate > 0
        ? attendanceRate - lastMonthAttendanceRate
        : 0;

      // Prevent browser caching to ensure fresh attendance data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log(`[Dashboard Stats] Attendance records count: ${attendanceRecords.length}`);
      
      res.json({
        totalRevenue: revenueStats.total,
        revenueChange: revenueChange.toFixed(1),
        activeStudents: activeStudentCount,
        totalStudents: totalStudentCount,
        studentChange: "+12.5",
        attendanceRate: attendanceRate.toFixed(1),
        attendanceChange: attendanceChange.toFixed(1),
        totalAttendanceRecords: attendanceRecords.length,
        classesThisMonth: classes.length,
        classChange: "+8.2",
        _timestamp: Date.now() // Cache-busting timestamp
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/revenue-trend", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Parse dates and normalize to UTC to avoid timezone issues
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate) {
        const dateStr = req.query.startDate as string;
        startDate = new Date(dateStr);
        // Ensure it's treated as start of day UTC
        startDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
      }
      
      if (req.query.endDate) {
        const dateStr = req.query.endDate as string;
        endDate = new Date(dateStr);
        // Ensure it's treated as start of day UTC
        endDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
      }

      const data = await storage.getMonthlyRevenueTrend(organizationId, startDate, endDate);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue trend" });
    }
  });

  app.get("/api/dashboard/attendance-by-time", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const data = await storage.getAttendanceByTimeSlot(organizationId, startDate, endDate);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance by time" });
    }
  });
}
