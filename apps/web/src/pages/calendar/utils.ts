import type { Booking } from "./types.js";

// ─────────────────────────────────────────────
// Date helpers (Monday-start weeks, local time)
// ─────────────────────────────────────────────

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

export const addMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, 1);

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const dayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export const startOfWeek = (d: Date): Date => {
  const day = d.getDay(); // 0 = Sunday
  return addDays(startOfDay(d), day === 0 ? -6 : 1 - day);
};

/** 42 cells (6 rows × 7 days) covering the month of `anchor`. */
export const monthGrid = (anchor: Date): Date[] => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
};

export const weekDays = (anchor: Date): Date[] => {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export const fmtLongDate = (d: Date): string =>
  d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

export const fmtHourLabel = (hour: number): string => {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
};

/** Group bookings by local calendar day, each day sorted by start time. */
export const groupByDay = (bookings: Booking[]): Map<string, Booking[]> => {
  const map = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = dayKey(new Date(b.startTime));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return map;
};

// ─────────────────────────────────────────────
// Time-grid layout — Google Calendar-style column packing.
// Overlapping events are split into side-by-side columns within
// their overlap cluster; each event keeps its vertical span.
// ─────────────────────────────────────────────

export interface PositionedEvent {
  booking: Booking;
  /** px from the top of the 24h grid */
  top: number;
  /** px height */
  height: number;
  /** % offset from the left of the day column */
  leftPct: number;
  /** % width within the day column */
  widthPct: number;
}

const minutesOf = (iso: string): number => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

export const layoutDayEvents = (events: Booking[], hourHeight: number): PositionedEvent[] => {
  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const results: PositionedEvent[] = [];

  let cluster: { booking: Booking; col: number; startMin: number; endMin: number }[] = [];
  let clusterEnd = -1;
  let maxCol = 0;
  const active: { end: number; col: number }[] = [];

  const flush = () => {
    const cols = maxCol + 1;
    for (const item of cluster) {
      results.push({
        booking: item.booking,
        top: (item.startMin / 60) * hourHeight + 1,
        height: Math.max(26, ((item.endMin - item.startMin) / 60) * hourHeight - 2),
        leftPct: (item.col / cols) * 100,
        widthPct: 100 / cols - (cols > 1 ? 1.5 : 0),
      });
    }
    cluster = [];
    maxCol = 0;
    active.length = 0;
  };

  for (const b of sorted) {
    const startMin = minutesOf(b.startTime);
    const endMin = Math.max(minutesOf(b.endTime), startMin + 30); // visual minimum 30 min

    if (cluster.length > 0 && startMin >= clusterEnd) flush();

    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i]!.end <= startMin) active.splice(i, 1);
    }
    const used = new Set(active.map((a) => a.col));
    let col = 0;
    while (used.has(col)) col++;

    active.push({ end: endMin, col });
    maxCol = Math.max(maxCol, col);
    clusterEnd = Math.max(clusterEnd, endMin);
    cluster.push({ booking: b, col, startMin, endMin });
  }
  flush();

  return results;
};
