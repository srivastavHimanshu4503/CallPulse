import type { Request, Response, NextFunction } from "express";
import { db } from "../config/database.js";
import { hasFeature, type FeatureKey } from "@antigravity/types";

// Plans change rarely; a short cache keeps gating from adding a DB read to
// every request. Invalidated implicitly by the 60s TTL after plan changes.
const planCache = new Map<string, { plan: string; at: number }>();
const TTL_MS = 60_000;

const getPlan = async (tenantId: string): Promise<string> => {
  const hit = planCache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.plan;
  const tenant = await db.tenant.findFirst({ where: { id: tenantId }, select: { plan: true } });
  const plan = tenant?.plan ?? "FREE";
  planCache.set(tenantId, { plan, at: Date.now() });
  return plan;
};

/** Call after a plan change so gates update immediately, not after TTL. */
export const invalidatePlanCache = (tenantId: string): void => {
  planCache.delete(tenantId);
};

/**
 * Route gate: 403 with a machine-readable code when the tenant's plan lacks
 * the feature. The frontend recognises UPGRADE_REQUIRED and shows the
 * upgrade card instead of a generic error.
 */
/** Like requireFeature, but only enforced when `when(req)` is true — e.g.
 *  workflow toggle is gated only when ACTIVATING, pausing is always free. */
export const requireFeatureWhen =
  (feature: FeatureKey, when: (req: Request) => boolean) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!when(req)) {
      next();
      return;
    }
    return requireFeature(feature)(req, res, next);
  };

export const requireFeature =
  (feature: FeatureKey) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, data: null, error: "Unauthorized" });
        return;
      }
      const plan = await getPlan(tenantId);
      if (!hasFeature(plan, feature)) {
        res.status(403).json({
          success: false,
          data: null,
          error: "This feature needs a Pro plan",
          code: "UPGRADE_REQUIRED",
          feature,
        });
        return;
      }
      next();
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: (err as Error).message });
    }
  };
