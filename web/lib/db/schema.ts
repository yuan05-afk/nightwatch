import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Held-out test flows from the corrected CIC-IDS2017, replayed in time order.
 *  `label`/`family` are ground truth: used for scoring the shift, never shown before triage. */
export const flowsReplay = pgTable(
  "flows_replay",
  {
    id: serial("id").primaryKey(),
    scenario: text("scenario").notNull(),
    seq: integer("seq").notNull(),
    ts: timestamp("ts", { withTimezone: false }).notNull(),
    srcIp: text("src_ip").notNull(),
    dstIp: text("dst_ip").notNull(),
    srcPort: integer("src_port").notNull(),
    dstPort: integer("dst_port").notNull(),
    protocol: integer("protocol").notNull(),
    features: real("features").array().notNull(),
    label: text("label").notNull(),
    family: text("family").notNull(),
  },
  (t) => [uniqueIndex("flows_replay_scenario_seq").on(t.scenario, t.seq)],
);

/** One analyst's replay session of a scenario. */
export const shifts = pgTable("shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  scenario: text("scenario").notNull(),
  cursor: integer("cursor").notNull().default(0),
  capacityMinutes: integer("capacity_minutes").notNull().default(30),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const incidents = pgTable(
  "incidents",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => shifts.id, { onDelete: "cascade" }),
    groupKey: text("group_key").notNull(),
    verdict: text("verdict").notNull(), // known | unknown
    predicted: text("predicted").notNull(),
    srcIp: text("src_ip").notNull(),
    dstIp: text("dst_ip").notNull(),
    dstPort: integer("dst_port").notNull(),
    firstSeen: timestamp("first_seen").notNull(),
    lastSeen: timestamp("last_seen").notNull(),
    flowCount: integer("flow_count").notNull().default(0),
    maxProbability: real("max_probability").notNull(),
    maxAnomaly: real("max_anomaly").notNull(),
    tier: integer("tier").notNull().default(2), // severity: Critical 4 .. Low 1
    confidence: real("confidence").notNull().default(0),
    rankScore: real("rank_score").notNull(),
    exemplarFlowId: integer("exemplar_flow_id").notNull(),
    status: text("status").notNull().default("open"), // open | confirmed | false_positive | escalated
    truthFamily: text("truth_family").notNull(), // hidden until triaged
  },
  (t) => [
    uniqueIndex("incidents_shift_key").on(t.shiftId, t.groupKey),
    index("incidents_shift_rank").on(t.shiftId, t.rankScore),
  ],
);

export const shiftStats = pgTable("shift_stats", {
  shiftId: uuid("shift_id")
    .primaryKey()
    .references(() => shifts.id, { onDelete: "cascade" }),
  flowsScored: integer("flows_scored").notNull().default(0),
  suppressed: integer("suppressed").notNull().default(0),
  known: integer("known").notNull().default(0),
  unknown: integer("unknown").notNull().default(0),
  attacksSuppressed: integer("attacks_suppressed").notNull().default(0), // misses, from ground truth
  benignAlerts: integer("benign_alerts").notNull().default(0),
  scoringMicros: real("scoring_micros").notNull().default(0),
});

export const feedback = pgTable("feedback", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  incidentId: bigint("incident_id", { mode: "number" })
    .notNull()
    .references(() => incidents.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  action: text("action").notNull(), // confirm | false_positive | escalate
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only. The app role gets INSERT/SELECT only (see drizzle/0001_audit_grants.sql). */
export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  target: text("target"),
  meta: jsonb("meta").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});
