import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import type { User } from "@shared/schema";
import { db } from "../db";

// Helper to safely subtract months/years while clamping to valid days
function subtractPeriod(date: Date, months: number): Date {
  const targetYear = date.getUTCFullYear();
  const targetMonth = date.getUTCMonth() - months;
  const targetDay = date.getUTCDate();
  
  // Create date with target month (may overflow into next month)
  const candidate = new Date(Date.UTC(targetYear, targetMonth, 1));
  
  // Get last day of target month
  const lastDayOfMonth = new Date(Date.UTC(
    candidate.getUTCFullYear(),
    candidate.getUTCMonth() + 1,
    0
  )).getUTCDate();
  
  // Clamp to valid day (e.g., Feb 31 → Feb 28/29)
  const clampedDay = Math.min(targetDay, lastDayOfMonth);
  
  return new Date(Date.UTC(
    candidate.getUTCFullYear(),
    candidate.getUTCMonth(),
    clampedDay
  ));
}

export function registerDashboardRoutes(app: Express) {
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Parse and normalize date range to UTC (strip time components)
      const now = new Date();
      const defaultStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const defaultEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

      let startDate: Date;
      let endDate: Date;

      if (req.query.startDate) {
        const dateStr = req.query.startDate as string;
        const parsed = new Date(dateStr);
        startDate = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
      } else {
        startDate = defaultStart;
      }

      if (req.query.endDate) {
        const dateStr = req.query.endDate as string;
        const parsed = new Date(dateStr);
        endDate = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
      } else {
        endDate = defaultEnd;
      }

      // Validate and swap if end is before start
      if (endDate < startDate) {
        [startDate, endDate] = [endDate, startDate];
      }

      console.log(`[Dashboard Stats] Using date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Determine if this is a year-to-date comparison (starts on Jan 1)
      const isYearToDate = startDate.getUTCMonth() === 0 && startDate.getUTCDate() === 1;
      
      // Calculate previous equivalent period (calendar-aligned with safe month handling)
      let prevStartDate: Date;
      let prevEndDate: Date;
      
      if (isYearToDate) {
        // Year-to-date: compare to same dates last year (subtract 12 months)
        prevStartDate = subtractPeriod(startDate, 12);
        prevEndDate = subtractPeriod(endDate, 12);
      } else {
        // Month-based: compare to same dates previous month (subtract 1 month)
        prevStartDate = subtractPeriod(startDate, 1);
        prevEndDate = subtractPeriod(endDate, 1);
      }

      // Fetch current period and previous period revenue (including fees separately)
      const [
        totalStudentCount,
        activeStudentCount,
        currentPeriodRevenue,
        previousPeriodRevenue,
        currentPeriodFees,
        previousPeriodFees,
        attendanceRecords,
        previousAttendanceRecords,
        classes,
      ] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getActiveStudentCount(organizationId),
        storage.getRevenueStats(organizationId, startDate, endDate),
        storage.getRevenueStats(organizationId, prevStartDate, prevEndDate),
        storage.getFeeStats(organizationId, startDate, endDate),
        storage.getFeeStats(organizationId, prevStartDate, prevEndDate),
        storage.getAttendance(organizationId, startDate, endDate),
        storage.getAttendance(organizationId, prevStartDate, prevEndDate),
        storage.getClasses(organizationId),
      ]);

      const attendanceRate =
        attendanceRecords.length > 0
          ? (attendanceRecords.filter((a) => a.status === "attended").length /
              attendanceRecords.length) *
            100
          : 0;

      const previousAttendanceRate =
        previousAttendanceRecords.length > 0
          ? (previousAttendanceRecords.filter((a) => a.status === "attended").length /
              previousAttendanceRecords.length) *
            100
          : 0;

      const revenueChange =
        previousPeriodRevenue.total > 0
          ? ((currentPeriodRevenue.total - previousPeriodRevenue.total) /
              previousPeriodRevenue.total) *
            100
          : 0;

      const attendanceChange =
        previousAttendanceRate > 0 ? attendanceRate - previousAttendanceRate : 0;

      const feeChange =
        previousPeriodFees.total > 0
          ? ((currentPeriodFees.total - previousPeriodFees.total) /
              previousPeriodFees.total) *
            100
          : 0;

      // Prevent browser caching to ensure fresh attendance data
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      console.log(`[Dashboard Stats] Attendance records count: ${attendanceRecords.length}`);
      console.log(`[Dashboard Stats] Current period revenue: $${currentPeriodRevenue.total.toFixed(2)} (${currentPeriodRevenue.count} transactions)`);
      console.log(`[Dashboard Stats] Previous period revenue: $${previousPeriodRevenue.total.toFixed(2)} (${previousPeriodRevenue.count} transactions)`);
      console.log(`[Dashboard Stats] Current period fees: $${currentPeriodFees.total.toFixed(2)} (${currentPeriodFees.count} fee items)`);
      console.log(`[Dashboard Stats] Previous period fees: $${previousPeriodFees.total.toFixed(2)} (${previousPeriodFees.count} fee items)`);

      res.json({
        totalRevenue: currentPeriodRevenue.total,
        revenueChange: revenueChange.toFixed(1),
        totalFees: currentPeriodFees.total,
        feeChange: feeChange.toFixed(1),
        activeStudents: activeStudentCount,
        totalStudents: totalStudentCount,
        studentChange: "+12.5",
        attendanceRate: attendanceRate.toFixed(1),
        attendanceChange: attendanceChange.toFixed(1),
        totalAttendanceRecords: attendanceRecords.length,
        classesThisMonth: classes.length,
        classChange: "+8.2",
        _timestamp: Date.now(), // Cache-busting timestamp
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
        startDate = new Date(
          Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
        );
      }

      if (req.query.endDate) {
        const dateStr = req.query.endDate as string;
        endDate = new Date(dateStr);
        // Ensure it's treated as start of day UTC
        endDate = new Date(
          Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
        );
      }

      const data = await storage.getMonthlyRevenueTrend(organizationId, startDate, endDate);
      console.log(`[Revenue Trend] Returning ${data.length} data points for ${startDate?.toISOString()} to ${endDate?.toISOString()}`);
      console.log(`[Revenue Trend] First 5 data points:`, JSON.stringify(data.slice(0, 5), null, 2));
      console.log(`[Revenue Trend] Last 5 data points:`, JSON.stringify(data.slice(-5), null, 2));
      console.log(`[Revenue Trend] Data points with revenue > 0:`, data.filter(d => d.revenue > 0).length);
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
