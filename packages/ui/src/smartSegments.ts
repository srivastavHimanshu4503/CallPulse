/**
 * Pre-built "smart segments" — filters that ship with the app for one-click
 * targeting. Users can also save custom segments to localStorage via
 * `useSavedSegments()`.
 */

import { FilterLogicalOperator, FilterOperator } from "@antigravity/types";
import type { FilterCondition } from "@antigravity/types";
import { Flame, Snowflake, Sparkles, CalendarCheck, Star, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SmartSegment {
  id: string;
  name: string;
  icon: LucideIcon;
  tone: "positive" | "brand" | "attention" | "muted" | "accent";
  logical: FilterLogicalOperator;
  conditions: FilterCondition[];
  /** For heuristics we can't express in FilterCondition (e.g. score-based),
   *  the segment carries a client-side matcher. If provided, the CRM will use
   *  this instead of running the raw conditions through evaluateCondition. */
  clientMatcher?: (contact: any) => boolean;
}

/** Utility for building conditions with stable ids so they don't re-render. */
const cond = (
  id: string,
  fieldId: string,
  operator: FilterOperator,
  value: string,
): FilterCondition => ({ id, fieldId, operator, value });

const isoDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

export function buildSmartSegments(): SmartSegment[] {
  return [
    {
      id: "hot",
      name: "Hot leads",
      icon: Flame,
      tone: "positive",
      logical: FilterLogicalOperator.AND,
      conditions: [],
      clientMatcher: (c) => c._computedScore?.band === "hot",
    },
    {
      id: "new-week",
      name: "New this week",
      icon: UserPlus,
      tone: "brand",
      logical: FilterLogicalOperator.AND,
      conditions: [cond("s-new-1", "createdAt", FilterOperator.IS_AFTER, isoDaysAgo(7))],
    },
    {
      id: "cold",
      name: "Cold — 30d+",
      icon: Snowflake,
      tone: "muted",
      logical: FilterLogicalOperator.AND,
      conditions: [],
      clientMatcher: (c) => c._computedScore?.band === "cold",
    },
    {
      id: "positive",
      name: "Positive sentiment",
      icon: Sparkles,
      tone: "accent",
      logical: FilterLogicalOperator.AND,
      conditions: [],
      clientMatcher: (c) => (c._latestSentiment ?? 0) > 0.3,
    },
    {
      id: "booked",
      name: "Booked this month",
      icon: CalendarCheck,
      tone: "attention",
      logical: FilterLogicalOperator.AND,
      conditions: [],
      clientMatcher: (c) =>
        Array.isArray(c.activities) &&
        c.activities.some(
          (a: any) =>
            a.type === "BOOKING_CREATED" &&
            a.occurredAt &&
            new Date(a.occurredAt).getTime() > Date.now() - 30 * 86_400_000,
        ),
    },
    {
      id: "with-deals",
      name: "With open deals",
      icon: Star,
      tone: "brand",
      logical: FilterLogicalOperator.AND,
      conditions: [cond("s-deals-1", "hasOpenDeals", FilterOperator.EQUALS, "yes")],
    },
  ];
}

const LS_KEY = "indiai:crm:saved-segments:v1";

export interface SavedSegment {
  id: string;
  name: string;
  logical: FilterLogicalOperator;
  conditions: FilterCondition[];
  createdAt: string;
}

export function loadSavedSegments(): SavedSegment[] {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSegment(seg: Omit<SavedSegment, "id" | "createdAt">): SavedSegment[] {
  const list = loadSavedSegments();
  const next: SavedSegment = {
    ...seg,
    id: Math.random().toString(36).slice(2, 10),
    createdAt: new Date().toISOString(),
  };
  const updated = [next, ...list];
  window.localStorage.setItem(LS_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteSavedSegment(id: string): SavedSegment[] {
  const list = loadSavedSegments().filter((s) => s.id !== id);
  window.localStorage.setItem(LS_KEY, JSON.stringify(list));
  return list;
}
