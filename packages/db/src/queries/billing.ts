import { db } from "../client.js";

type CreditReason =
  "SIGNUP_GRANT" | "PLAN_GRANT" | "TOPUP_PURCHASE" | "CALL_DEDUCTION" | "ADJUSTMENT";

/**
 * The single shared way to move credits from background services.
 *  - Idempotent: the same (reason, refId) pair is applied at most once, so a
 *    retried pipeline run can never double-charge a call.
 *  - Clamped: deductions never take the balance below zero — the caller gets
 *    back what was actually applied.
 *  - Atomic: ledger row + cached balance move in one transaction.
 */
export const applyCreditDelta = async (input: {
  tenantId: string;
  delta: number;
  reason: CreditReason;
  refId: string;
  note?: string;
}): Promise<{ applied: number; balance: number; duplicate: boolean }> => {
  const existing = await db.creditLedger.findFirst({
    where: { tenantId: input.tenantId, reason: input.reason, refId: input.refId },
    select: { id: true },
  });
  if (existing) {
    const t = await db.tenant.findFirst({
      where: { id: input.tenantId },
      select: { creditBalance: true },
    });
    return { applied: 0, balance: t?.creditBalance ?? 0, duplicate: true };
  }

  return db.$transaction(async (tx) => {
    const tenant = await tx.tenant.findFirst({
      where: { id: input.tenantId },
      select: { creditBalance: true },
    });
    if (!tenant) throw new Error("Tenant not found");

    const applied = input.delta < 0 ? -Math.min(-input.delta, tenant.creditBalance) : input.delta;

    const updated = await tx.tenant.update({
      where: { id: input.tenantId },
      data: { creditBalance: { increment: applied } },
      select: { creditBalance: true },
    });
    await tx.creditLedger.create({
      data: {
        tenantId: input.tenantId,
        delta: applied,
        reason: input.reason,
        refId: input.refId,
        note: input.note,
      },
    });
    return { applied, balance: updated.creditBalance, duplicate: false };
  });
};

export const getCreditBalance = async (tenantId: string): Promise<number> => {
  const t = await db.tenant.findFirst({
    where: { id: tenantId },
    select: { creditBalance: true },
  });
  return t?.creditBalance ?? 0;
};
