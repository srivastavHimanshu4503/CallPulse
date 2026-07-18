/**
 * Central model registry. Services must reference models through these
 * constants — never raw string literals — so a model upgrade or deprecation
 * is a one-line change here instead of a grep across the monorepo.
 */

export const OPENAI_MODELS = {
  GPT_4O_MINI: "gpt-4o-mini",
  GPT_4O: "gpt-4o",
  GPT_4_1_MINI: "gpt-4.1-mini",
  GPT_4_1: "gpt-4.1",
} as const;

export type OpenAIModelId = (typeof OPENAI_MODELS)[keyof typeof OPENAI_MODELS];

export const OPENAI_MODEL_IDS = Object.values(OPENAI_MODELS) as [
  OpenAIModelId,
  ...OpenAIModelId[],
];

/**
 * Default for structured extraction (intent, CRM fields, lead scoring):
 * cheap, fast, and reliable with strict JSON schemas at temperature 0.
 */
export const DEFAULT_STRUCTURED_MODEL: OpenAIModelId = OPENAI_MODELS.GPT_4O_MINI;
