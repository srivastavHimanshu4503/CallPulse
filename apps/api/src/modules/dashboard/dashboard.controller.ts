import type { Request, Response } from "express";
import { db } from "../../config/database.js";
import { sendSuccess, sendError } from "../../utils/response.js";

export class DashboardController {
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      // Calculate relative times (today, this week)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);

      // 1. Total Contacts count
      const totalContacts = await db.contact.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      });

      // 2. Inbound/Outbound calls handled today
      const callsHandledToday = await db.communicationLog.count({
        where: {
          tenantId,
          type: "CALL",
          createdAt: {
            gte: today,
          },
        },
      });

      // 3. Outbound SMS sent this week
      const smsSentThisWeek = await db.communicationLog.count({
        where: {
          tenantId,
          type: "SMS",
          createdAt: {
            gte: oneWeekAgo,
          },
        },
      });

      // 4. Open deals count
      const openDeals = await db.deal.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      });

      // 5. Total deal pipeline value sum
      const dealPipelineResult = await db.deal.aggregate({
        where: {
          tenantId,
          deletedAt: null,
        },
        _sum: {
          value: true,
        },
      });

      const dealsPipelineValue = dealPipelineResult._sum.value || 0;

      sendSuccess(res, {
        totalContacts,
        callsHandledToday,
        smsSentThisWeek,
        openDeals,
        dealsPipelineValue,
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
        where: {
          tenantId,
        },
        take: limit + 1, // Fetch limit + 1 items to see if there is a next page
        orderBy: {
          occurredAt: "desc",
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      };

      if (cursor) {
        queryArgs.skip = 1;
        queryArgs.cursor = {
          id: cursor,
        };
      }

      const activities = await db.activity.findMany(queryArgs);

      let nextCursor: string | null = null;
      let items = activities;

      if (activities.length > limit) {
        const nextItem = activities[limit];
        if (nextItem) {
          nextCursor = nextItem.id;
        }
        items = activities.slice(0, limit);
      }

      sendSuccess(res, {
        items,
        nextCursor,
      }, 200);
    } catch (error: any) {
      sendError(res, error.message || "Failed to fetch activity logs", 500);
    }
  }
}
