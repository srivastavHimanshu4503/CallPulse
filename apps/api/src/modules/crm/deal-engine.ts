import type { PipelineStageInput } from "@antigravity/validators";

/**
 * Deal pipeline business rules (see docs: AI-Native CRM — Deals Pipeline).
 *
 * Rules implemented here so every caller (REST API, post-call automation,
 * imports) behaves identically:
 *   - Probability inherits the stage default only while source is AUTO.
 *   - Manual overrides persist across stage moves until explicitly reset.
 *   - Weighted revenue is always value × probability / 100, server-side.
 *   - Stage movement is a business event: history + close dates + activity.
 */

export interface StageConfig {
  name: string;
  color: string;
  position: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
}

/** Spec-default pipeline for new tenants. */
export const DEFAULT_PIPELINE_NAME = "Sales Pipeline";
export const DEFAULT_STAGES: StageConfig[] = [
  { name: "New Lead", color: "#64748b", position: 0, probability: 10, isWon: false, isLost: false },
  { name: "Qualified", color: "#0ea5e9", position: 1, probability: 30, isWon: false, isLost: false },
  { name: "Discovery", color: "#6366f1", position: 2, probability: 45, isWon: false, isLost: false },
  { name: "Proposal Sent", color: "#f59e0b", position: 3, probability: 70, isWon: false, isLost: false },
  { name: "Negotiation", color: "#f97316", position: 4, probability: 90, isWon: false, isLost: false },
  { name: "Closed Won", color: "#10b981", position: 5, probability: 100, isWon: true, isLost: false },
  { name: "Closed Lost", color: "#ef4444", position: 6, probability: 0, isWon: false, isLost: true },
];

export const weightedRevenue = (value: number, probability: number): number =>
  Math.round(value * probability) / 100;

/**
 * Normalize pipeline stage input (plain names from the legacy UI, or full
 * configs) into complete StageConfigs. Plain names get an evenly-spread
 * probability ramp, with won/lost inferred from conventional names so legacy
 * pipelines still forecast sensibly.
 */
export const normalizeStageInput = (
  stages: Array<string | PipelineStageInput>
): StageConfig[] => {
  const openCount = Math.max(1, stages.length - 1);
  return stages.map((s, i) => {
    const cfg = typeof s === "string" ? { name: s } : s;
    const lower = cfg.name.toLowerCase();
    const isWon = cfg.isWon ?? (lower.includes("won") || lower === "booked");
    const isLost = cfg.isLost ?? lower.includes("lost");
    const rampDefault = Math.min(95, Math.round((i / openCount) * 90) + 10);
    return {
      name: cfg.name,
      color: cfg.color ?? DEFAULT_STAGES[Math.min(i, DEFAULT_STAGES.length - 1)]!.color,
      position: i,
      probability: cfg.probability ?? (isWon ? 100 : isLost ? 0 : rampDefault),
      isWon,
      isLost,
    };
  });
};

/**
 * Reconcile PipelineStage rows with the desired configs (matched by name).
 * Existing stages keep their ids (deals keep pointing at them); removed
 * stages are archived rather than deleted so historical deals stay valid.
 * Runs inside the caller's transaction.
 */
export const syncPipelineStages = async (
  tx: any,
  tenantId: string,
  pipelineId: string,
  configs: StageConfig[]
): Promise<void> => {
  const existing = await tx.pipelineStage.findMany({ where: { pipelineId } });
  const byName = new Map(existing.map((s: any) => [s.name, s]));
  const keep = new Set<string>();

  for (const cfg of configs) {
    const found = byName.get(cfg.name) as any;
    if (found) {
      keep.add(found.id);
      await tx.pipelineStage.update({
        where: { id: found.id },
        data: {
          color: cfg.color,
          position: cfg.position,
          probability: cfg.probability,
          isWon: cfg.isWon,
          isLost: cfg.isLost,
          archivedAt: null,
        },
      });
    } else {
      const created = await tx.pipelineStage.create({
        data: { tenantId, pipelineId, ...cfg },
      });
      keep.add(created.id);
    }
  }

  await tx.pipelineStage.updateMany({
    where: { pipelineId, id: { notIn: [...keep] }, archivedAt: null },
    data: { archivedAt: new Date() },
  });
};

/** Find the active stage config for a pipeline by name (case-insensitive). */
export const findStage = async (
  tx: any,
  pipelineId: string | null | undefined,
  stageName: string
): Promise<any | null> => {
  if (!pipelineId) return null;
  return tx.pipelineStage.findFirst({
    where: {
      pipelineId,
      archivedAt: null,
      name: { equals: stageName, mode: "insensitive" },
    },
  });
};

/**
 * Compute the field patch for a deal entering `stageName` (spec: "Stage
 * Movement" + "Manual Probability Override").
 */
export const stageMovePatch = (
  deal: { probability: number; probabilitySource: string; value: number },
  stage: { name: string; probability: number; isWon: boolean; isLost: boolean } | null,
  stageName: string
): Record<string, unknown> => {
  const probability =
    deal.probabilitySource === "MANUAL"
      ? deal.probability
      : stage?.probability ?? deal.probability;
  return {
    stage: stage?.name ?? stageName,
    stageId: stage ? (stage as any).id ?? undefined : null,
    probability,
    weightedValue: weightedRevenue(deal.value, probability),
    actualCloseDate: stage && (stage.isWon || stage.isLost) ? new Date() : null,
    lastActivityAt: new Date(),
  };
};
