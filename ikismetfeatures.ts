// analytics-mvp-demo.ts
// Single-file Express + Drizzle demo for a Replit-hosted "iKismet-style" analytics MVP
// Assumptions:
// - Node 20+, TypeScript, ts-node or tsx available in dev
// - Postgres (Neon) URL in process.env.DATABASE_URL
//
// Install (dev):
//   npm i express cors helmet pino pino-pretty zod
//   npm i drizzle-orm pg postgres
//   npm i -D typescript tsx @types/node @types/express
//
// Run (dev):
//   npx tsx analytics-mvp-demo.ts
//
// NOTE: This is an MVP scaffold: minimal error handling and auth for clarity.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import { z } from "zod";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, serial, varchar, integer, numeric, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// ---------- Logging ----------
const log = pino({ transport: { target: "pino-pretty" }, level: "info" });

// ---------- DB Init ----------
const DATABASE_URL = process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db";
const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

// ---------- Schema (subset) ----------
export const locations = pgTable("dim_location", {
  id: serial("location_id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull(),
});

export const instructors = pgTable("dim_instructor", {
  id: serial("instructor_id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  status: varchar("status", { length: 48 }).notNull(), // active/inactive
  locationId: integer("location_id").notNull().references(() => locations.id),
});

export const classes = pgTable("dim_class", {
  id: serial("class_id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  defaultCapacity: integer("default_capacity").notNull().default(20),
});

export const classInstances = pgTable("fact_class_instance", {
  id: serial("class_instance_id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull().default(20),
  waitlistCount: integer("waitlist_count").notNull().default(0),
  locationId: integer("location_id").notNull().references(() => locations.id),
}, (t) => ({
  byStart: index("idx_class_instance_start").on(t.startAt, t.locationId),
}));

export const attendance = pgTable("fact_attendance", {
  id: serial("attendance_id").primaryKey(),
  clientId: integer("client_id").notNull(),
  classInstanceId: integer("class_instance_id").notNull().references(() => classInstances.id),
  status: varchar("status", { length: 32 }).notNull(), // checked_in, completed, cancel, no_show
  bookedAt: timestamp("booked_at", { withTimezone: true }),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  cancel: boolean("cancel").notNull().default(false),
  noShow: boolean("no_show").notNull().default(false),
}, (t) => ({
  byClass: index("idx_att_class").on(t.classInstanceId),
}));

export const sales = pgTable("fact_sales", {
  id: serial("sale_id").primaryKey(),
  clientId: integer("client_id").notNull(),
  productId: integer("product_id"),
  productType: varchar("product_type", { length: 48 }).notNull(), // membership, class_pack, retail, service, intro_offer
  qty: integer("qty").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  soldAt: timestamp("sold_at", { withTimezone: true }).notNull(),
  locationId: integer("location_id").notNull().references(() => locations.id),
}, (t) => ({
  byDate: index("idx_sales_date").on(t.soldAt, t.locationId),
}));

// ---------- App ----------
const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// ---------- Helpers ----------
const RangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  location_id: z.coerce.number().optional(),
});

function parseRange(query: any) {
  const r = RangeSchema.parse(query);
  const where: any[] = [];
  if (r.from) where.push(gte(sql`date_trunc('day', ${sales.soldAt})`, sql`date_trunc('day', to_timestamp(${Date.parse(r.from!)}/1000.0))`));
  if (r.to) where.push(lte(sql`date_trunc('day', ${sales.soldAt})`, sql`date_trunc('day', to_timestamp(${Date.parse(r.to!)}/1000.0))`));
  if (r.location_id) where.push(eq(sales.locationId, r.location_id));
  return { where };
}

// ---------- Routes ----------

// KPI Overview: revenue sum, placeholders for other metrics
app.get("/api/v1/kpi/overview", async (req, res) => {
  try {
    const { where } = parseRange(req.query);
    const revenueRows = await db.select({
      sum: sql<number>`COALESCE(SUM(${sales.total}::numeric), 0)`,
    }).from(sales).where(where.length ? and(...where) : undefined);
    const revenue = Number(revenueRows[0]?.sum || 0);
    const activeMembers = 0; // TODO
    const introConversionRate = 0; // TODO
    res.json({ revenue, activeMembers, introConversionRate });
  } catch (err) {
    log.error(err, "overview failed");
    res.status(500).json({ error: "overview_failed" });
  }
});

// Utilization Heatmap: aggregate avg utilization by dow/hour
app.get("/api/v1/utilization/heatmap", async (req, res) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30*86400*1000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const locationId = req.query.location_id ? Number(req.query.location_id) : undefined;

    const attendanceCounts = db.$with("attended").as(
      db.select({
        classInstanceId: attendance.classInstanceId,
        count: sql<number>`COUNT(*)`,
      })
      .from(attendance)
      .where(eq(attendance.status, "completed"))
      .groupBy(attendance.classInstanceId)
    );

    const rows = await db
      .with(attendanceCounts)
      .select({
        dow: sql<number>`EXTRACT(DOW FROM ${classInstances.startAt})::int`,
        hour: sql<number>`EXTRACT(HOUR FROM ${classInstances.startAt})::int`,
        avg_utilization_pct: sql<number>`AVG(LEAST(100, (COALESCE(attended.count,0)::decimal / NULLIF(${classInstances.capacity},0)) * 100))`,
      })
      .from(classInstances)
      .leftJoin(attendanceCounts, eq(attendanceCounts.classInstanceId, classInstances.id))
      .where(and(
        gte(classInstances.startAt, from),
        lte(classInstances.startAt, to),
        locationId ? eq(classInstances.locationId, locationId) : sql`TRUE`
      ))
      .groupBy(sql`EXTRACT(DOW FROM ${classInstances.startAt})`, sql`EXTRACT(HOUR FROM ${classInstances.startAt})`);

    res.json({ rows });
  } catch (err) {
    log.error(err, "heatmap failed");
    res.status(500).json({ error: "heatmap_failed" });
  }
});

// Intro Offer Funnel: placeholder
app.get("/api/v1/intro/funnel", async (req, res) => {
  try {
    const locationId = req.query.location_id ? Number(req.query.location_id) : undefined;
    const windowDays = req.query.window ? Number(req.query.window) : 30;
    const introCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM ${sales} WHERE ${sales.productType} = 'intro_offer' ${locationId ? sql`AND ${sales.locationId} = ${locationId}` : sql``}`);
    const membershipAfterIntro = 0; // TODO: implement conversion join
    res.json({ intro: introCount[0].c, convertedWithinDays: membershipAfterIntro, windowDays });
  } catch (err) {
    log.error(err, "intro funnel failed");
    res.status(500).json({ error: "intro_funnel_failed" });
  }
});

// Revenue Forecast (stub)
app.get("/api/v1/forecast/revenue", async (req, res) => {
  try {
    const daysAhead = req.query.days_ahead ? Number(req.query.days_ahead) : 14;
    const baseline = 1000; // TODO: replace with rolling average or ETS
    const forecast = Array.from({ length: daysAhead }, (_, i) => ({ dayOffset: i+1, value: baseline }));
    res.json({ method: "baseline-rolling-average", forecast });
  } catch (err) {
    log.error(err, "forecast failed");
    res.status(500).json({ error: "forecast_failed" });
  }
});

// Healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => log.info(`Analytics MVP demo running on :${port}`));
