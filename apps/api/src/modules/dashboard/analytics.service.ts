import { db } from "../../config/database.js";
import { Prisma } from "@antigravity/db";

/**
 * Analytics aggregations for the dashboard.
 *
 * Design rules:
 *  - Every bucket is keyed by an ISO date (never a weekday name) so two
 *    different Mondays can never collapse into one bar.
 *  - All day/hour grouping happens in the VIEWER'S timezone (sent by the
 *    browser), not UTC — otherwise a Saturday-morning call in India shows
 *    up on Friday because it was still Friday in UTC.
 *  - `occurredAt` is stored as a naive UTC timestamp, so SQL conversion is
 *    two steps: mark it as UTC, then shift to the viewer's zone:
 *    ("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE <tz>
 *  - The exact date range is computed once, returned to the client, and used
 *    by every query so charts always match the selected period.
 */

export type Period = "today" | "7d" | "30d" | "90d";

/** Browsers often report legacy IANA aliases (macOS/Chrome says
 *  "Asia/Calcutta") that JavaScript accepts but Postgres may not. Map the
 *  common ones to their modern canonical names. */
const TZ_ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
};

const tzVerified = new Map<string, string>();

/**
 * Validate an IANA timezone from the request. Three layers so a bad value
 * can never crash the charts again:
 *   1. Intl parse + canonicalization (rejects garbage, normalizes case),
 *   2. legacy-alias mapping (Asia/Calcutta → Asia/Kolkata),
 *   3. a real `AT TIME ZONE` probe against Postgres, cached per zone —
 *      if the database itself doesn't know the zone, fall back to UTC
 *      instead of 500ing every query.
 */
export const resolveTimezone = async (raw: unknown): Promise<string> => {
  let tz = String(raw || "").trim() || "UTC";
  try {
    tz = new Intl.DateTimeFormat("en-US", { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
  tz = TZ_ALIASES[tz] ?? tz;

  const cached = tzVerified.get(tz);
  if (cached) return cached;

  try {
    await db.$queryRaw`SELECT now() AT TIME ZONE ${tz}`;
    tzVerified.set(tz, tz);
    return tz;
  } catch {
    tzVerified.set(tz, "UTC");
    return "UTC";
  }
};

export interface DateRange {
  start: Date;
  end: Date;
  prevStart: Date;
  days: number;
  /** IANA timezone all grouping happens in (the viewer's). */
  tz: string;
  /** Calendar date of the first bucket in `tz`, e.g. "2026-07-12". */
  startKey: string;
  /** Calendar date of today in `tz`. */
  endKey: string;
  /** Human label like "Jul 10 – Jul 17, 2026". */
  label: string;
}

/** Calendar date ("2026-07-18") of an instant, as seen in `tz`. */
const wallDateKey = (d: Date, tz: string): string =>
  d.toLocaleDateString("en-CA", { timeZone: tz });

/** How far `tz`'s wall clock is ahead of UTC at a given instant. */
const tzOffsetMs = (date: Date, tz: string): number => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour === "24" ? "0" : p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUTC - date.getTime();
};

/** The exact UTC instant of midnight (00:00) on `key` in `tz`. */
const wallMidnightUtc = (key: string, tz: string): Date => {
  const guess = new Date(`${key}T00:00:00Z`);
  return new Date(guess.getTime() - tzOffsetMs(guess, tz));
};

/** Shift a calendar-date key by N days (pure calendar math, no tz). */
const shiftKey = (key: string, days: number): string => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Format a calendar-date key as "Jul 15" / "Tue, Jul 15". */
export const fmtKey = (key: string, withWeekday = false): string =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
    ...(withWeekday ? { weekday: "short" } : {}),
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** Current period = the last N days INCLUDING today, using day boundaries in
 *  the viewer's timezone. Previous period = the N days before that. */
export const resolveDateRange = (period: Period, tz: string): DateRange => {
  const days = period === "today" ? 1 : period === "30d" ? 30 : period === "90d" ? 90 : 7;
  const now = new Date();
  const endKey = wallDateKey(now, tz);
  const startKey = shiftKey(endKey, -(days - 1));
  const prevStartKey = shiftKey(startKey, -days);

  const start = wallMidnightUtc(startKey, tz);
  const prevStart = wallMidnightUtc(prevStartKey, tz);

  const year = Number(endKey.slice(0, 4));
  const label =
    days === 1 ? `Today, ${fmtKey(endKey)}` : `${fmtKey(startKey)} – ${fmtKey(endKey)}, ${year}`;

  return { start, end: now, prevStart, days, tz, startKey, endKey, label };
};

const agentWhere = (agentId: string) => (agentId !== "all" ? { agentId } : {});
const agentSql = (agentId: string) =>
  agentId !== "all" ? Prisma.sql`AND "agentId" = ${agentId}` : Prisma.empty;

/** sentimentScore stores the 0-100 post-call lead score; /20 → 0-5 stars. */
const toRating = (avgScore: number | null): string =>
  avgScore && avgScore > 0 ? (avgScore / 20).toFixed(1) : "0.0";

/* ─────────────────────────── KPIs ─────────────────────────── */

export async function getKpis(tenantId: string, agentId: string, range: DateRange) {
  const base = { tenantId, ...agentWhere(agentId) };
  const curr = { gte: range.start, lte: range.end };
  const prev = { gte: range.prevStart, lt: range.start };

  const [currAgg, prevAgg, currWhatsapp, prevWhatsapp, currLeads, prevLeads] = await Promise.all([
    db.communicationLog.aggregate({
      where: { ...base, type: "CALL", occurredAt: curr },
      _count: { id: true },
      _sum: { duration: true },
      _avg: { sentimentScore: true },
    }),
    db.communicationLog.aggregate({
      where: { ...base, type: "CALL", occurredAt: prev },
      _count: { id: true },
      _sum: { duration: true },
    }),
    db.communicationLog.count({ where: { ...base, type: "WHATSAPP", occurredAt: curr } }),
    db.communicationLog.count({ where: { ...base, type: "WHATSAPP", occurredAt: prev } }),
    db.communicationLog.count({
      where: { ...base, type: "CALL", occurredAt: curr, sentimentScore: { gte: 70 } },
    }),
    db.communicationLog.count({
      where: { ...base, type: "CALL", occurredAt: prev, sentimentScore: { gte: 70 } },
    }),
  ]);

  const calls = currAgg._count.id;
  const prevCalls = prevAgg._count.id;
  const durationSec = currAgg._sum.duration || 0;
  const prevDurationSec = prevAgg._sum.duration || 0;
  const avgDuration = calls ? durationSec / calls : 0;
  const prevAvgDuration = prevCalls ? prevDurationSec / prevCalls : 0;

  return {
    calls,
    prevCalls,
    whatsapp: currWhatsapp,
    prevWhatsapp,
    leads: currLeads,
    conv: calls ? Math.round((currLeads / calls) * 100) : 0,
    prevConv: prevCalls ? Math.round((prevLeads / prevCalls) * 100) : 0,
    avgDuration,
    prevAvgDuration,
    minutes: Math.round(durationSec / 60),
    rating: toRating(currAgg._avg.sentimentScore),
  };
}

/* ─────────────────────────── Daily / weekly series ─────────────────────────── */

export interface SeriesRow {
  /** ISO bucket key, e.g. "2026-07-15". */
  date: string;
  /** Human label, e.g. "Tue, Jul 15" (daily) or "Jul 8 – Jul 14" (weekly). */
  label: string;
  booked: number;
  lead: number;
  followup: number;
  missed: number;
  total: number;
}

/**
 * One bucket per day (or per week for 90d so the chart stays readable).
 * Buckets are keyed by the actual date — never by weekday name — and every
 * bucket in the range is present even when it has zero calls.
 */
export async function getSeries(
  tenantId: string,
  agentId: string,
  range: DateRange,
): Promise<SeriesRow[]> {
  const weekly = range.days > 45;
  // Two-step shift: the column is a naive UTC timestamp, so first tag it as
  // UTC, then convert to the viewer's wall time — THEN truncate to day/week.
  const wallExpr = Prisma.sql`(("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${range.tz})`;
  const bucketExpr = weekly
    ? Prisma.sql`DATE_TRUNC('week', ${wallExpr})`
    : Prisma.sql`DATE_TRUNC('day', ${wallExpr})`;

  const rows: Array<{
    bucket: Date;
    lead: bigint;
    followup: bigint;
    negative: bigint;
    booked: bigint;
  }> = await db.$queryRaw`
    SELECT
      ${bucketExpr} as bucket,
      COUNT(CASE WHEN "sentimentScore" >= 70 THEN 1 END) as lead,
      COUNT(CASE WHEN "sentimentScore" >= 40 AND "sentimentScore" < 70 THEN 1 END) as followup,
      COUNT(CASE WHEN "sentimentScore" < 40 THEN 1 END) as negative,
      COUNT(CASE WHEN "sentimentScore" IS NULL THEN 1 END) as booked
    FROM "communication_logs"
    WHERE "tenantId" = ${tenantId}
      AND "type" = 'CALL'
      AND "occurredAt" >= ${range.start}
      AND "occurredAt" <= ${range.end}
      ${agentSql(agentId)}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  // Buckets come back as wall-clock timestamps (midnight in the viewer's
  // zone); Prisma parses them as UTC, so the ISO date slice IS the wall date.
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    byKey.set(new Date(r.bucket).toISOString().slice(0, 10), r);
  }

  // Walk calendar-date keys from start to today — every bucket present, even
  // with zero calls. Pure key arithmetic: no timezone drift possible.
  let cursorKey = range.startKey;
  if (weekly) {
    // Snap to Monday so week buckets line up with DATE_TRUNC('week').
    const dow = (new Date(`${cursorKey}T00:00:00Z`).getUTCDay() + 6) % 7;
    cursorKey = shiftKey(cursorKey, -dow);
  }

  const out: SeriesRow[] = [];
  while (cursorKey <= range.endKey) {
    const r = byKey.get(cursorKey);
    const booked = Number(r?.booked ?? 0);
    const lead = Number(r?.lead ?? 0);
    const followup = Number(r?.followup ?? 0);
    const missed = Number(r?.negative ?? 0);

    const label = weekly
      ? `${fmtKey(cursorKey)} – ${fmtKey(shiftKey(cursorKey, 6))}`
      : range.days > 10
        ? fmtKey(cursorKey) // "Jul 15" — weekday would be noise at 30 bars
        : fmtKey(cursorKey, true); // "Tue, Jul 15"

    out.push({
      date: cursorKey,
      label,
      booked,
      lead,
      followup,
      missed,
      total: booked + lead + followup + missed,
    });
    cursorKey = shiftKey(cursorKey, weekly ? 7 : 1);
  }

  return out;
}

/* ─────────────────────────── Peak-hours heatmap ─────────────────────────── */

export interface HeatmapResult {
  /** 7 rows (Mon..Sun) × 12 cols (9 AM..8 PM), normalized 0-4 for color. */
  grid: number[][];
  /** Raw call counts, same shape — used for accurate tooltips. */
  counts: number[][];
  hours: string[];
}

export const HEATMAP_HOURS = [
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
];

export async function getHeatmap(
  tenantId: string,
  agentId: string,
  range: DateRange,
): Promise<HeatmapResult> {
  const rows: Array<{ dow: number; hour: number; count: bigint }> = await db.$queryRaw`
    SELECT
      EXTRACT(ISODOW FROM (("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${range.tz})) as dow,
      EXTRACT(HOUR FROM (("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${range.tz})) as hour,
      COUNT(*) as count
    FROM "communication_logs"
    WHERE "tenantId" = ${tenantId}
      AND "type" = 'CALL'
      AND "occurredAt" >= ${range.start}
      AND "occurredAt" <= ${range.end}
      ${agentSql(agentId)}
    GROUP BY dow, hour
  `;

  const counts = Array.from({ length: 7 }, () => Array(12).fill(0));
  for (const r of rows) {
    const day = Number(r.dow) - 1; // 0=Mon … 6=Sun
    const hour = Number(r.hour);
    if (day >= 0 && day < 7 && hour >= 9 && hour <= 20) {
      counts[day]![hour - 9] = Number(r.count);
    }
  }

  const max = Math.max(...counts.flat(), 0);
  const grid = counts.map((row) => row.map((v) => (max > 0 ? Math.ceil((v / max) * 4) : 0)));
  return { grid, counts, hours: HEATMAP_HOURS };
}

/* ─────────────────────────── Sentiment + funnel ─────────────────────────── */

export async function getSentiment(tenantId: string, agentId: string, range: DateRange) {
  const grouped = await db.communicationLog.groupBy({
    by: ["sentimentScore"],
    where: {
      tenantId,
      type: "CALL",
      occurredAt: { gte: range.start, lte: range.end },
      sentimentScore: { not: null },
      ...agentWhere(agentId),
    },
    _count: { _all: true },
  });

  let pos = 0;
  let neu = 0;
  let neg = 0;
  for (const g of grouped) {
    if (g.sentimentScore! >= 70) pos += g._count._all;
    else if (g.sentimentScore! >= 40) neu += g._count._all;
    else neg += g._count._all;
  }
  const total = pos + neu + neg;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return {
    buckets: [
      { label: "Positive", pct: pct(pos), color: "#16A34A" },
      { label: "Neutral", pct: pct(neu), color: "#CBD5E1" },
      { label: "Negative", pct: pct(neg), color: "#DC2626" },
    ],
    engaged: pos + neu,
  };
}

export async function getFunnel(
  tenantId: string,
  range: DateRange,
  calls: number,
  engaged: number,
  leads: number,
) {
  const deals = await db.deal.count({
    where: { tenantId, createdAt: { gte: range.start, lte: range.end } },
  });
  const pct = (n: number) => (calls ? Math.round((n / calls) * 100) : 0);
  return [
    { label: "Calls answered", value: calls, pct: calls ? 100 : 0 },
    { label: "Real conversations", value: engaged, pct: pct(engaged) },
    { label: "Interested callers (leads)", value: leads, pct: pct(leads) },
    { label: "Deals created", value: deals, pct: pct(deals) },
  ];
}

/* ─────────────────────────── Agent performance ─────────────────────────── */

export interface AgentPerf {
  agentId: string;
  calls: number;
  minutes: number;
  rating: string;
  leads: number;
}

/** Per-agent totals via Prisma groupBy — type-safe, no raw SQL. */
export async function getAgentPerformance(
  tenantId: string,
  range: DateRange,
): Promise<AgentPerf[]> {
  const where = {
    tenantId,
    type: "CALL" as const,
    occurredAt: { gte: range.start, lte: range.end },
  };

  const [grouped, leadGrouped] = await Promise.all([
    db.communicationLog.groupBy({
      by: ["agentId"],
      where,
      _count: { _all: true },
      _sum: { duration: true },
      _avg: { sentimentScore: true },
    }),
    db.communicationLog.groupBy({
      by: ["agentId"],
      where: { ...where, sentimentScore: { gte: 70 } },
      _count: { _all: true },
    }),
  ]);

  const leadsByAgent = new Map(leadGrouped.map((g) => [g.agentId, g._count._all]));

  return grouped.map((g) => ({
    agentId: g.agentId!,
    calls: g._count._all,
    minutes: Math.round((g._sum.duration || 0) / 60),
    rating: toRating(g._avg.sentimentScore),
    leads: leadsByAgent.get(g.agentId) ?? 0,
  }));
}
