import { createLogger } from "../logger.js";
import type { JobHandler, PostCallContext } from "./types.js";
import { getErrorMessage } from "@antigravity/errors";
import { extractStructured, llmEnabled } from "../llm/client.js";
import {
  IntentSchema,
  buildIntentDetectionSystemPrompt,
  buildTranscriptUserPrompt,
} from "../prompts/index.js";

const log = createLogger("job:intent-detection");

export const intentDetection: JobHandler = {
  name: "intent-detection",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    const turnCount = ctx.job.transcript.length;

    if (turnCount === 0) {
      return { intent: { primary: "NO_CONTENT", confidence: 1 } };
    }
    if (!llmEnabled()) {
      log.info("Skipping LLM intent detection (no API key)", { turnCount });
      return { intent: { primary: "GENERAL_INQUIRY", confidence: 0.5 } };
    }

    log.info("Classifying intent via LLM", { logId: ctx.job.logId, turnCount });

    try {
      const result = await extractStructured({
        schema: IntentSchema,
        schemaName: "IntentClassification",
        system: buildIntentDetectionSystemPrompt(),
        user: buildTranscriptUserPrompt(ctx.job.transcript),
      });

      log.info("Intent classified", {
        logId: ctx.job.logId,
        intent: result.primary,
        confidence: result.confidence,
        dealAmount: result.dealAmount,
        dealAmountReasoning: result.dealAmountReasoning,
      });

      return {
        intent: {
          primary: result.primary,
          confidence: result.confidence,
          reasons: [result.reasoning],
          dealAmount: result.dealAmount,
        },
      };
    } catch (err) {
      // Degrade, never break: downstream handlers can work with a
      // low-confidence generic intent.
      log.error("Intent classification failed after retries — degrading", {
        logId: ctx.job.logId,
        error: getErrorMessage(err),
      });
      return { intent: { primary: "GENERAL_INQUIRY", confidence: 0 } };
    }
  },
};
