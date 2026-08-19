import { z } from "zod";
import { generateStructuredOutput, type OpenAIModelId } from "@antigravity/llm";
import { ConfigError } from "@antigravity/errors";
import { config } from "../config.js";

/**
 * The single LLM entry point for this service. Jobs never build provider
 * configs — model, key, and temperature are decided here, in one place.
 */

export const llmEnabled = (): boolean => Boolean(config.llm.openaiApiKey);

export interface ExtractionRequest<T extends z.ZodType> {
  schema: T;
  schemaName: string;
  system: string;
  user: string;
  /** Override only when a job genuinely needs a different model. */
  model?: OpenAIModelId;
}

export const extractStructured = async <T extends z.ZodType>(
  req: ExtractionRequest<T>,
): Promise<z.infer<T>> => {
  if (!config.llm.openaiApiKey) {
    throw new ConfigError("OPENAI_API_KEY is not configured", {
      context: { schemaName: req.schemaName },
    });
  }
  return generateStructuredOutput(
    {
      provider: "openai",
      apiKey: config.llm.openaiApiKey,
      model: req.model ?? config.llm.model,
      temperature: 0,
    },
    req.system,
    req.user,
    req.schema,
    req.schemaName,
  );
};
