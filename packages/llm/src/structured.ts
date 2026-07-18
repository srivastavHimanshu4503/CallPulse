import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { LLMError, RateLimitError, withRetries, type AppError } from "@antigravity/errors";
import type { LLMProviderConfig } from "./types.js";

/**
 * A lightweight helper for structured extraction using the underlying OpenAI client.
 * In a fully provider-agnostic future, this could be adapted to Vercel AI SDK or similar.
 *
 * Reliability: retries transient provider failures (rate limits, 5xx,
 * network) with exponential backoff before surfacing a typed `LLMError`.
 * Schema-validation failures are NOT retried at this layer with the same
 * input temperature — callers decide how to degrade.
 */
export const generateStructuredOutput = async <T extends z.ZodType>(
  config: LLMProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  schema: T,
  schemaName: string
): Promise<z.infer<T>> => {
  // Always use OpenAI for structured output for now since it has robust native support
  const openai = new OpenAI({ apiKey: config.apiKey, maxRetries: 0 });

  return withRetries(
    async () => {
      let completion;
      try {
        completion = await openai.beta.chat.completions.parse({
          model: config.model || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: zodResponseFormat(schema, schemaName),
          temperature: config.temperature ?? 0, // 0 is best for structured extraction
        });
      } catch (err) {
        throw classifyOpenAIError(err, schemaName);
      }

      const parsed = completion.choices[0]?.message.parsed;
      if (!parsed) {
        const refusal = completion.choices[0]?.message.refusal;
        throw new LLMError(
          `Structured output "${schemaName}" returned no parsed result${refusal ? ` (refusal: ${refusal})` : ""}`,
          { retryable: true, context: { schemaName } }
        );
      }
      return parsed;
    },
    { attempts: 3, baseDelayMs: 750, label: `structured:${schemaName}` }
  );
};

const classifyOpenAIError = (err: unknown, schemaName: string): AppError => {
  const status = (err as { status?: number }).status;
  const message = (err as Error)?.message ?? String(err);

  if (status === 429) {
    return new RateLimitError(`OpenAI rate limited: ${message}`, {
      context: { schemaName },
      cause: err,
    });
  }
  // 4xx (bad schema, bad key, content policy) won't succeed on retry.
  const retryable = status === undefined || status >= 500;
  return new LLMError(`OpenAI structured output failed: ${message}`, {
    retryable,
    context: { schemaName, status },
    cause: err,
  });
};
