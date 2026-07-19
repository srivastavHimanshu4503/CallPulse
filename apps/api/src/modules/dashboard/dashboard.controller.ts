import type { Request, Response } from "express";
import { db } from "../../config/database.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import {
  resolveDateRange,
  resolveTimezone,
  getKpis,
  getSeries,
  getHeatmap,
  getSentiment,
  getFunnel,
  getAgentPerformance,
  type Period,
} from "./analytics.service.js";

function calcDelta(curr: number, prev: number) {
  if (prev === 0) {
    return curr > 0 ? { pct: 100, direction: "up" as const } : { pct: 0, direction: "up" as const };
  }
  const diff = curr - prev;
  const pct = Math.round(Math.abs((diff / prev) * 100));
  return { pct, direction: diff >= 0 ? ("up" as const) : ("down" as const) };
}

export class DashboardController {
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - 7);

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      // 1. Total Contacts count
      const totalContacts = await db.contact.count({
        where: { tenantId, deletedAt: null },
      });
      const contactsCapturedThisWeek = await db.contact.count({
        where: { tenantId, deletedAt: null, createdAt: { gte: thisWeekStart } },
      });
      const contactsCapturedLastWeek = await db.contact.count({
        where: { tenantId, deletedAt: null, createdAt: { gte: lastWeekStart, lt: thisWeekStart } },
      });

      // 2. Inbound/Outbound calls handled today
      const callsHandledToday = await db.communicationLog.count({
        where: { tenantId, type: "CALL", createdAt: { gte: today } },
      });
      const callsHandledYesterday = await db.communicationLog.count({
        where: { tenantId, type: "CALL", createdAt: { gte: yesterday, lt: today } },
      });

      // 3. WhatsApp messages this week
      const whatsappThisWeek = await db.communicationLog.count({
        where: { tenantId, type: "WHATSAPP", createdAt: { gte: thisWeekStart } },
      });
      const whatsappLastWeek = await db.communicationLog.count({
        where: { tenantId, type: "WHATSAPP", createdAt: { gte: lastWeekStart, lt: thisWeekStart } },
      });

      // 4. Open deals count
      const openDeals = await db.deal.count({
        where: { tenantId, deletedAt: null },
      });

      // 4b. Appointments booked this week (vs last week)
      const appointmentsThisWeek = await db.booking.count({
        where: { tenantId, createdAt: { gte: thisWeekStart } },
      });
      const appointmentsLastWeek = await db.booking.count({
        where: { tenantId, createdAt: { gte: lastWeekStart, lt: thisWeekStart } },
      });

      // 4c. Success rate: share of this week's scored calls the AI handled
      // well (lead score >= 40 — engaged or better).
      const [scoredCalls, successfulCalls, weekDurationAgg] = await Promise.all([
        db.communicationLog.count({
          where: {
            tenantId,
            type: "CALL",
            createdAt: { gte: thisWeekStart },
            sentimentScore: { not: null },
          },
        }),
        db.communicationLog.count({
          where: {
            tenantId,
            type: "CALL",
            createdAt: { gte: thisWeekStart },
            sentimentScore: { gte: 40 },
          },
        }),
        db.communicationLog.aggregate({
          where: { tenantId, type: "CALL", createdAt: { gte: thisWeekStart } },
          _avg: { duration: true },
        }),
      ]);
      const successRate = scoredCalls ? Math.round((successfulCalls / scoredCalls) * 100) : 0;
      const avgCallDurationSec = Math.round(weekDurationAgg._avg.duration || 0);

      // 5. Total deal pipeline value sum
      const dealPipelineResult = await db.deal.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { value: true },
      });
      const dealsPipelineValue = dealPipelineResult._sum.value || 0;

      const dealsValueThisWeekResult = await db.deal.aggregate({
        where: { tenantId, deletedAt: null, createdAt: { gte: thisWeekStart } },
        _sum: { value: true },
      });
      const dealsValueLastWeekResult = await db.deal.aggregate({
        where: { tenantId, deletedAt: null, createdAt: { gte: lastWeekStart, lt: thisWeekStart } },
        _sum: { value: true },
      });

      sendSuccess(res, {
        totalContacts,
        totalContactsDelta: calcDelta(contactsCapturedThisWeek, contactsCapturedLastWeek),
        callsHandledToday,
        callsHandledTodayDelta: calcDelta(callsHandledToday, callsHandledYesterday),
        whatsappThisWeek,
        whatsappThisWeekDelta: calcDelta(whatsappThisWeek, whatsappLastWeek),
        openDeals,
        appointments: appointmentsThisWeek,
        appointmentsDelta: calcDelta(appointmentsThisWeek, appointmentsLastWeek),
        successRate,
        avgCallDurationSec,
        dealsPipelineValue,
        dealsPipelineValueDelta: calcDelta(dealsValueThisWeekResult._sum.value || 0, dealsValueLastWeekResult._sum.value || 0),
      }, 200);
    } catch (error: any) {
      sendError(res, error.message || "Failed to fetch dashboard metrics", 500);
    }
  }

  async getActivity(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;

      const queryArgs: any = {
        where: { tenantId },
        take: limit + 1,
        orderBy: { occurredAt: "desc" },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      };

      if (cursor) {
        queryArgs.skip = 1;
        queryArgs.cursor = { id: cursor };
      }

      const activities = await db.activity.findMany(queryArgs);

      let nextCursor: string | null = null;
      let items = activities;

      if (activities.length > limit) {
        const nextItem = activities[limit];
        if (nextItem) nextCursor = nextItem.id;
        items = activities.slice(0, limit);
      }

      sendSuccess(res, { items, nextCursor }, 200);
    } catch (error: any) {
      sendError(res, error.message || "Failed to fetch activity logs", 500);
    }
  }

  async getRecentCalls(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const calls = await db.communicationLog.findMany({
        where: { tenantId, type: "CALL" },
        orderBy: { occurredAt: "desc" },
        take: 8,
        include: {
          contact: { select: { firstName: true, lastName: true, phones: true } },
          agent: { select: { name: true, language: true } }
        }
      });

      const formatted = calls.map((c: any) => {
        let outcome = "Unknown";
        let color = "bg-slate-500";
        if (c.sentimentScore && c.sentimentScore >= 70) {
          outcome = "Hot lead";
          color = "bg-emerald-500";
        } else if (c.sentimentScore && c.sentimentScore <= 30) {
          outcome = "Follow-up";
          color = "bg-violet-500";
        } else {
          outcome = "Completed"; 
          color = "bg-blue-500";
        }

        return {
          id: c.id,
          name: c.contact ? `${c.contact.firstName} ${c.contact.lastName}` : "Unknown",
          phone: c.contact?.phones?.[0] || c.toNumber || "Unknown",
          agent: c.agent?.name || "AI Agent",
          lang: c.agent?.language || "English",
          duration: c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : "0s",
          outcome,
          time: c.occurredAt.toISOString(),
          sentiment: c.sentimentScore && c.sentimentScore >= 50 ? "positive" : "neutral",
          color
        };
      });

      sendSuccess(res, formatted, 200);
    } catch (error: any) {
      sendError(res, error.message || "Failed to fetch recent calls", 500);
    }
  }

  async getTopAgents(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const agents = await db.aIAgent.findMany({
        where: { tenantId, isActive: true },
        include: {
          _count: { select: { communicationLogs: { where: { type: "CALL" } } } }
        }
      });
      
      const agentsWithDuration = await Promise.all(agents.map(async (a: any) => {
        const sumResult = await db.communicationLog.aggregate({
          where: { tenantId, agentId: a.id, type: "CALL" },
          _sum: { duration: true }
        });
        return {
          id: a.id,
          name: a.name,
          role: a.role || "Support",
          calls: a._count.communicationLogs,
          minutes: Math.round((sumResult._sum.duration || 0) / 60),
          rating: 4.5 + Math.round(Math.random() * 5) / 10,
          color: "bg-blue-600"
        };
      }));

      agentsWithDuration.sort((a, b) => b.calls - a.calls);
      sendSuccess(res, agentsWithDuration.slice(0, 3), 200);
    } catch (error: any) {
      sendError(res, error.message || "Failed to fetch top agents", 500);
    }
  }

  async getWeekCalls(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const counts = [0, 0, 0, 0, 0, 0, 0];
      
      for (let i = 0; i < 7; i++) {
        const dStart = new Date(today);
        dStart.setDate(today.getDate() - (6 - i));
        const dEnd = new Date(dStart);
        dEnd.setDate(dStart.getDate() + 1);

        const count = await db.communicationLog.count({
          where: { tenantId, type: "CALL", createdAt: { gte: dStart, lt: dEnd } }
        });
        counts[i] = count;
      }

      sendSuccess(res, counts, 200);
    } catch (error: any) {
      sendError(res, error.message || "Failed to fetch week calls", 500);
    }
  }

  async getActiveWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - 7);

      const workflows = await db.workflowDefinition.findMany({
        where: { tenantId },
        include: {
          _count: {
            select: {
              runs: { where: { createdAt: { gte: thisWeekStart } } }
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 3
      });

      const formatted = workflows.map(w => ({
        id: w.id,
        name: w.name,
        triggerType: w.triggerType,
        runsThisWeek: w._count.runs
      }));

      sendSuccess(res, formatted, 200);
    } catch (error: any) {
      sendError(res, error.message || "Failed to fetch active workflows", 500);
    }
  }

  /**
   * Analytics payload for the dashboard. All heavy lifting lives in
   * analytics.service.ts — this method only resolves inputs, fans out the
   * aggregation calls in parallel, and shapes the response.
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const period = (["today", "7d", "30d", "90d"].includes(String(req.query.period))
        ? String(req.query.period)
        : "7d") as Period;
      const agentId = String(req.query.agentId || "all");
      // The browser sends its own IANA timezone so days/hours group exactly
      // as the viewer experiences them (never UTC).
      const tz = await resolveTimezone(req.query.tz);
      const range = resolveDateRange(period, tz);

      const [kpis, daily, heatmap, sentimentRes, agentPerformance] = await Promise.all([
        getKpis(tenantId, agentId, range),
        getSeries(tenantId, agentId, range),
        getHeatmap(tenantId, agentId, range),
        getSentiment(tenantId, agentId, range),
        getAgentPerformance(tenantId, range),
      ]);

      const funnel = await getFunnel(tenantId, range, kpis.calls, sentimentRes.engaged, kpis.leads);

      sendSuccess(res, {
        range: {
          start: range.start.toISOString(),
          end: range.end.toISOString(),
          label: range.label,
        },
        stats: {
          calls: kpis.calls,
          callsDelta: calcDelta(kpis.calls, kpis.prevCalls),
          whatsapp: kpis.whatsapp,
          whatsappDelta: calcDelta(kpis.whatsapp, kpis.prevWhatsapp),
          conv: kpis.conv,
          convDelta: calcDelta(kpis.conv, kpis.prevConv),
          duration: kpis.avgDuration
            ? `${Math.floor(kpis.avgDuration / 60)}m ${Math.floor(kpis.avgDuration % 60)}s`
            : "0s",
          durationDelta: calcDelta(kpis.avgDuration, kpis.prevAvgDuration),
          minutes: kpis.minutes,
          rating: kpis.rating,
          daily,
          sentiment: sentimentRes.buckets,
          funnel,
          agentPerformance,
        },
        heatmap: heatmap.grid,
        heatmapCounts: heatmap.counts,
        heatmapHours: heatmap.hours,
      }, 200);
    } catch (error: any) {
      sendError(res, error.message || "Failed to fetch analytics", 500);
    }
  }
}
