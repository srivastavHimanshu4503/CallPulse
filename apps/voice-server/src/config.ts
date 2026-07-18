import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const truthy = (v: string | undefined) => v === "true" || v === "1";

const optionalString = z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  PUBLIC_URL: optionalString,
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  DATABASE_URL: z.string().url(),

  LIVEKIT_URL: optionalString,
  LIVEKIT_API_KEY: optionalString,
  LIVEKIT_API_SECRET: optionalString,

  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_PHONE_NUMBER: optionalString,

  SARVAM_API_KEY: optionalString,
  DEEPGRAM_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,

  LLM_PROVIDER: z.enum(["openai", "google", "anthropic"]).default("openai"),
  LLM_MODEL: optionalString,
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.6),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().optional(),
  // Comma-separated list of fallback providers, e.g. "anthropic,google"
  LLM_FALLBACK_PROVIDERS: optionalString,
  LLM_FALLBACK_MODELS: optionalString,

  ENABLE_OUTBOUND: z.string().optional().transform(truthy),
  ENABLE_WHATSAPP: z.string().optional().transform(truthy),
  ENABLE_POST_CALL_TEMPORAL: z.string().optional().transform(truthy),
  ENABLE_MULTI_TENANT: z.string().optional().transform(truthy),

  POST_CALL_SERVER_URL: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : "http://localhost:3002")),
  POST_CALL_SERVER_SECRET: optionalString,
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
  throw new Error(`Invalid environment configuration: ${details}`);
}
const env = parsed.data;

import type { LLMProviderName, LLMProviderConfig } from "@antigravity/llm";

const DEFAULT_MODELS: Record<LLMProviderName, string> = {
  openai: "gpt-4o-mini",
  google: "gemini-2.5-flash",
  anthropic: "claude-3-5-haiku-20241022",
};

const API_KEY_ENV: Record<LLMProviderName, string> = {
  openai: "OPENAI_API_KEY",
  google: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

const resolveApiKey = (provider: LLMProviderName): string | undefined => {
  switch (provider) {
    case "openai": return env.OPENAI_API_KEY;
    case "google": return env.GEMINI_API_KEY;
    case "anthropic": return env.ANTHROPIC_API_KEY;
  }
};

const buildLLMConfig = (
  provider: LLMProviderName,
  modelOverride: string | undefined
): LLMProviderConfig => {
  const apiKey = resolveApiKey(provider);
  if (!apiKey) {
    throw new Error(`LLM provider "${provider}" is configured but ${API_KEY_ENV[provider]} is missing`);
  }
  return {
    provider,
    apiKey,
    model: modelOverride ?? DEFAULT_MODELS[provider],
    temperature: env.LLM_TEMPERATURE,
    maxTokens: env.LLM_MAX_TOKENS,
  };
};

const primaryLLM = buildLLMConfig(env.LLM_PROVIDER, env.LLM_MODEL);

const parseList = (input: string | undefined): string[] =>
  input ? input.split(",").map((s) => s.trim()).filter(Boolean) : [];

const fallbackNames = parseList(env.LLM_FALLBACK_PROVIDERS) as LLMProviderName[];
const fallbackModels = parseList(env.LLM_FALLBACK_MODELS);
for (const p of fallbackNames) {
  if (!(p in DEFAULT_MODELS)) {
    throw new Error(`LLM_FALLBACK_PROVIDERS contains unknown provider: ${p}`);
  }
}
const fallbackLLMs: LLMProviderConfig[] = fallbackNames.map((provider, idx) =>
  buildLLMConfig(provider, fallbackModels[idx])
);

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === "production",
  server: {
    port: env.PORT,
    publicUrl: env.PUBLIC_URL,
    logLevel: env.LOG_LEVEL,
  },
  livekit: {
    url: env.LIVEKIT_URL,
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
    isConfigured: !!(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET),
  },
  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    phoneNumber: env.TWILIO_PHONE_NUMBER,
    isConfigured: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER),
  },
  stt: {
    deepgramApiKey: env.DEEPGRAM_API_KEY,
  },
  tts: {
    sarvamApiKey: env.SARVAM_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
  },
  llm: {
    primary: primaryLLM,
    fallbacks: fallbackLLMs,
  },
  postCallServer: {
    // Full URL to the post-call-server /ingest endpoint. If unset, dispatch
    // is skipped and the DB row still gets an `extractionStatus = PENDING`
    // that a later reconciliation job can pick up.
    ingestUrl: env.POST_CALL_SERVER_URL
      ? env.POST_CALL_SERVER_URL.replace(/\/$/, "") + "/ingest"
      : undefined,
    sharedSecret: env.POST_CALL_SERVER_SECRET,
  },
  flags: {
    enableOutbound: env.ENABLE_OUTBOUND,
    enableWhatsapp: env.ENABLE_WHATSAPP,
    enablePostCallTemporal: env.ENABLE_POST_CALL_TEMPORAL,
    enableMultiTenant: env.ENABLE_MULTI_TENANT,
  },
} as const;

export type AppConfig = typeof config;
