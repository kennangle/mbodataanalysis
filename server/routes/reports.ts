import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { insertStudentSchema, insertClassSchema, insertAttendanceSchema, insertRevenueSchema, insertUserSchema, organizations, webhookSubscriptions } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import type { User } from "@shared/schema";

import { MindbodyService } from "../mindbody";
import { openaiService } from "../openai";
import { db } from "../db";


export function registerReportRoutes(app: Express) {
  // Report Generation Endpoints
  app.get("/api/reports/revenue", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const revenueData = await storage.getRevenue(organizationId);
      
      const csv = [
        "Date,Description,Amount,Type",
        ...revenueData.map(r => 
          `${r.transactionDate.toISOString().split('T')[0]},"${r.description || 'N/A'}",${r.amount},"${r.type}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="revenue-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate revenue report" });
    }
  });

  app.get("/api/reports/attendance", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const attendanceData = await storage.getAttendance(organizationId);
      const studentsMap = new Map();
      const classesMap = new Map();
      const scheduleToClassMap = new Map();

      const students = await storage.getStudents(organizationId);
      const classes = await storage.getClasses(organizationId);
      const schedules = await storage.getClassSchedules(organizationId);
      
      students.forEach(s => studentsMap.set(s.id, `${s.firstName} ${s.lastName}`));
      classes.forEach(c => classesMap.set(c.id, c.name));
      schedules.forEach(sch => scheduleToClassMap.set(sch.id, sch.classId));

      const csv = [
        "Date,Student,Class,Status",
        ...attendanceData.map(a => {
          const studentName = studentsMap.get(a.studentId) || 'Unknown';
          const classId = scheduleToClassMap.get(a.scheduleId);
          const className = classId ? (classesMap.get(classId) || 'Unknown') : 'Unknown';
          return `${a.attendedAt.toISOString().split('T')[0]},"${studentName}","${className}","${a.status}"`;
        })
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate attendance report" });
    }
  });

  app.get("/api/reports/class-performance", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const classes = await storage.getClasses(organizationId);
      const attendanceData = await storage.getAttendance(organizationId);
      const schedules = await storage.getClassSchedules(organizationId);
      
      const scheduleToClassMap = new Map();
      schedules.forEach(sch => scheduleToClassMap.set(sch.id, sch.classId));
      
      const classStats = classes.map(c => {
        const classAttendance = attendanceData.filter(a => {
          const classId = scheduleToClassMap.get(a.scheduleId);
          return classId === c.id;
        });
        const attended = classAttendance.filter(a => a.status === 'attended').length;
        const noShow = classAttendance.filter(a => a.status === 'no-show').length;
        const totalSessions = classAttendance.length;
        const attendanceRate = totalSessions > 0 ? (attended / totalSessions * 100).toFixed(1) : '0';
        
        return {
          name: c.name,
          instructor: c.instructorName || 'N/A',
          capacity: c.capacity || 0,
          totalSessions,
          attended,
          noShow,
          attendanceRate
        };
      });

      const csv = [
        "Class Name,Instructor,Capacity,Total Sessions,Attended,No-Show,Attendance Rate %",
        ...classStats.map(s => 
          `"${s.name}","${s.instructor}",${s.capacity},${s.totalSessions},${s.attended},${s.noShow},${s.attendanceRate}`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="class-performance-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate class performance report" });
    }
  });

  app.get("/api/reports/monthly-summary", requireAuth, async (req, res) => {
    try {
      const organizationId = (req.user as User)?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [studentCount, revenueStats, attendanceRecords, classes] = await Promise.all([
        storage.getStudentCount(organizationId),
        storage.getRevenueStats(organizationId, thisMonth, now),
        storage.getAttendance(organizationId, thisMonth, now),
        storage.getClasses(organizationId)
      ]);

      const attendedCount = attendanceRecords.filter(a => a.status === 'attended').length;
      const noShowCount = attendanceRecords.filter(a => a.status === 'no-show').length;
      const attendanceRate = attendanceRecords.length > 0 
        ? ((attendedCount / attendanceRecords.length) * 100).toFixed(1) 
        : '0';

      const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const csv = [
        "Metric,Value",
        `"Period","${monthName}"`,
        `"Total Students","${studentCount}"`,
        `"Total Classes","${classes.length}"`,
        `"Total Revenue","$${revenueStats.total.toFixed(2)}"`,
        `"Revenue Transactions","${revenueStats.count}"`,
        `"Total Attendance Records","${attendanceRecords.length}"`,
        `"Attended Sessions","${attendedCount}"`,
        `"No-Show Sessions","${noShowCount}"`,
        `"Attendance Rate","${attendanceRate}%"`
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-summary-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate monthly summary" });
    }
  });
}
