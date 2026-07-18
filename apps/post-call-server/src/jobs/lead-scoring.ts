import { createLogger } from "../logger.js";
import type { JobHandler, PostCallContext } from "./types.js";
import { getErrorMessage } from "@antigravity/errors";
import { extractStructured, llmEnabled } from "../llm/client.js";
import {
  LeadScoreSchema,
  buildLeadScoringSystemPrompt,
  buildLeadScoringUserContext,
  buildTranscriptUserPrompt,
} from "../prompts/index.js";

const log = createLogger("job:lead-scoring");

export const leadScoring: JobHandler = {
  name: "lead-scoring",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    const turnCount = ctx.job.transcript.length;

    if (turnCount === 0) return { leadScore: 0 };
    if (!llmEnabled()) return { leadScore: heuristicScore(ctx) };

    log.info("Scoring lead via LLM", {
      logId: ctx.job.logId,
      intent: ctx.intent?.primary,
    });

    try {
      const result = await extractStructured({
        schema: LeadScoreSchema,
        schemaName: "LeadScore",
        system: buildLeadScoringSystemPrompt(),
        user: buildTranscriptUserPrompt(
          ctx.job.transcript,
          buildLeadScoringUserContext({
            intent: ctx.intent?.primary,
            intentConfidence: ctx.intent?.confidence,
            durationSeconds: ctx.job.durationSeconds,
            extractedFields: ctx.extractedFields,
          })
        ),
      });

      const score = clamp(Math.round(result.score), 0, 100);
      log.info("Lead scored", { logId: ctx.job.logId, score, reasoning: result.reasoning });
      return { leadScore: score };
    } catch (err) {
      // Degrade to the engagement heuristic rather than a misleading 0.
      const fallback = heuristicScore(ctx);
      log.error("Lead scoring failed after retries — using heuristic fallback", {
        logId: ctx.job.logId,
        fallback,
        error: getErrorMessage(err),
      });
      return { leadScore: fallback };
    }
  },
};

/** Engagement-based fallback when the LLM is unavailable. */
const heuristicScore = (ctx: PostCallContext): number => {
  const turnBonus = Math.min(50, ctx.job.transcript.length * 5);
  const durationBonus = Math.min(30, Math.floor(ctx.job.durationSeconds / 10));
  const intent = ctx.intent?.primary;
  if (intent === "SPAM" || intent === "WRONG_NUMBER" || intent === "TEST_CALL" || intent === "NO_CONTENT") {
    return Math.min(5, turnBonus + durationBonus);
  }
  return clamp(turnBonus + durationBonus, 0, 100);
};

const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));
