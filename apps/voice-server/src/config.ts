import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const truthy = (v: string | undefined) => v === "true" || v === "1";

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  PUBLIC_URL: optionalString,
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  DATABASE_URL: z.string().url(),

  LIVEKIT_URL: optionalString,
  LIVEKIT_API_KEY: optionalString,
  LIVEKIT_API_SECRET: optionalString,
  // Worker registration name. The LiveKit SIP dispatch rule routes real
  // phone calls to "inbound-agent" — local dev MUST register under a
  // different name (e.g. "inbound-agent-local") or the laptop steals
  // production calls whenever it's running (both envs share one LiveKit
  // project). Browser test calls follow the api server's matching env.
  LIVEKIT_AGENT_NAME: z.string().default("inbound-agent"),

  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_PHONE_NUMBER: optionalString,

  // ── LiveKit-egress → S3 for call recordings. All four required to enable.
  // Provider-agnostic: works for both Twilio and Plivo trunks since every
  // call already lands in a LiveKit room.
  RECORDINGS_S3_BUCKET: optionalString,
  RECORDINGS_S3_REGION: optionalString,
  RECORDINGS_S3_ACCESS_KEY: optionalString,
  RECORDINGS_S3_SECRET: optionalString,

  SARVAM_API_KEY: optionalString,
  DEEPGRAM_API_KEY: optionalString,
  SONIOX_API_KEY: optionalString,
  // "soniox" is the fast path — stt-rt-v5 streams per-token interims AND
  // handles Hindi/English code-switching in one model, unlocking preemptive
  // LLM generation on Hinglish (Deepgram nova-3 does interims but chopped
  // Hinglish into fragments; Sarvam is finals-only). "sarvam" stays the
  // safe default until Soniox is validated on real Indian call quality.
  STT_PROVIDER: z.enum(["sarvam", "deepgram", "soniox"]).default("sarvam"),
  OPENAI_API_KEY: optionalString,
  ELEVENLABS_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,

  LLM_PROVIDER: z.enum(["openai", "google", "anthropic"]).default("openai"),
  LLM_MODEL: optionalString,
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.6),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().optional(),
  // OpenAI service tier for the primary LLM ("priority" = paid low-latency
  // tier). Unset = standard tier. Ignored when Azure is configured.
  LLM_SERVICE_TIER: optionalString,
  // Azure OpenAI (all three required to activate): serves the OpenAI models
  // from an Indian Azure region — ~25ms RTT from the Mumbai box instead of
  // ~280ms to api.openai.com. Applies to the openai provider only.
  AZURE_OPENAI_API_KEY: optionalString,
  AZURE_OPENAI_ENDPOINT: optionalString,
  AZURE_OPENAI_DEPLOYMENT: optionalString,
  AZURE_OPENAI_API_VERSION: optionalString,
  // Comma-separated list of fallback providers, e.g. "anthropic,google"
  LLM_FALLBACK_PROVIDERS: optionalString,
  LLM_FALLBACK_MODELS: optionalString,

  ENABLE_OUTBOUND: z.string().optional().transform(truthy),
  ENABLE_WHATSAPP: z.string().optional().transform(truthy),
  ENABLE_POST_CALL_TEMPORAL: z.string().optional().transform(truthy),
  ENABLE_MULTI_TENANT: z.string().optional().transform(truthy),

  POST_CALL_SERVER_URL: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : "http://localhost:3002")),
  POST_CALL_SERVER_SECRET: optionalString,
});

const parsed = envSchema.safeParse({
  ...process.env,
  PORT: process.env.VOICE_PORT || process.env.VOICE_SERVER_PORT || 3001,
});
if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
  throw new Error(`Invalid environment configuration: ${details}`);
}
const env = parsed.data;

import type { LLMProviderName, LLMProviderConfig } from "@antigravity/llm";

// gpt-4.1 (not mini): tenants paste knowledge bases in raw Devanagari /
// Tamil / Telugu / Marathi, and mini-class models hallucinate against them
// on live calls. TTFT is comparable to 4o-mini, so latency is unaffected.
//
// Google: `gemini-2.5-flash` is retired for new keys, and
// `gemini-flash-latest` (currently aliased to gemini-3.6-flash) caps free
// tier at 20 requests/day — one voice call exhausts it. `gemini-3.1-flash-lite`
// is on the higher-quota "lite" tier (~15k RPD free), was also the fastest
// in TTFT tests, and is the default that actually works without paid billing.
// Override via LLM_MODEL when you have billing enabled and want max quality.
const DEFAULT_MODELS: Record<LLMProviderName, string> = {
  openai: "gpt-4.1",
  google: "gemini-3.1-flash-lite",
  anthropic: "claude-3-5-haiku-20241022",
};

const API_KEY_ENV: Record<LLMProviderName, string> = {
  openai: "OPENAI_API_KEY",
  google: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

const resolveApiKey = (provider: LLMProviderName): string | undefined => {
  switch (provider) {
    case "openai":
      return env.OPENAI_API_KEY;
    case "google":
      return env.GEMINI_API_KEY;
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
  }
};

const azureOpenAI =
  env.AZURE_OPENAI_API_KEY && env.AZURE_OPENAI_ENDPOINT && env.AZURE_OPENAI_DEPLOYMENT
    ? {
        apiKey: env.AZURE_OPENAI_API_KEY,
        endpoint: env.AZURE_OPENAI_ENDPOINT,
        deployment: env.AZURE_OPENAI_DEPLOYMENT,
        apiVersion: env.AZURE_OPENAI_API_VERSION,
      }
    : undefined;

const buildLLMConfig = (
  provider: LLMProviderName,
  modelOverride: string | undefined,
): LLMProviderConfig => {
  // Azure replaces api.openai.com for the openai provider when configured.
  // serviceTier is deliberately NOT set on Azure — the parameter is rejected
  // there, and regional capacity is already latency-consistent.
  if (provider === "openai" && azureOpenAI) {
    return {
      provider,
      apiKey: azureOpenAI.apiKey,
      model: modelOverride ?? DEFAULT_MODELS[provider],
      temperature: env.LLM_TEMPERATURE,
      maxTokens: env.LLM_MAX_TOKENS,
      azure: {
        endpoint: azureOpenAI.endpoint,
        deployment: azureOpenAI.deployment,
        apiVersion: azureOpenAI.apiVersion,
      },
    };
  }
  const apiKey = resolveApiKey(provider);
  if (!apiKey) {
    throw new Error(
      `LLM provider "${provider}" is configured but ${API_KEY_ENV[provider]} is missing`,
    );
  }
  return {
    provider,
    apiKey,
    model: modelOverride ?? DEFAULT_MODELS[provider],
    temperature: env.LLM_TEMPERATURE,
    maxTokens: env.LLM_MAX_TOKENS,
    ...(provider === "openai" && env.LLM_SERVICE_TIER ? { serviceTier: env.LLM_SERVICE_TIER } : {}),
  };
};

const primaryLLM = buildLLMConfig(env.LLM_PROVIDER, env.LLM_MODEL);

const parseList = (input: string | undefined): string[] =>
  input
    ? input
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

const fallbackNames = parseList(env.LLM_FALLBACK_PROVIDERS) as LLMProviderName[];
const fallbackModels = parseList(env.LLM_FALLBACK_MODELS);
for (const p of fallbackNames) {
  if (!(p in DEFAULT_MODELS)) {
    throw new Error(`LLM_FALLBACK_PROVIDERS contains unknown provider: ${p}`);
  }
}
const fallbackLLMs: LLMProviderConfig[] = fallbackNames.map((provider, idx) =>
  buildLLMConfig(provider, fallbackModels[idx]),
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
    agentName: env.LIVEKIT_AGENT_NAME,
    isConfigured: !!(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET),
  },
  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    phoneNumber: env.TWILIO_PHONE_NUMBER,
    isConfigured: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER),
  },
  recordings: {
    bucket: env.RECORDINGS_S3_BUCKET,
    region: env.RECORDINGS_S3_REGION,
    accessKey: env.RECORDINGS_S3_ACCESS_KEY,
    secret: env.RECORDINGS_S3_SECRET,
    isConfigured: !!(
      env.RECORDINGS_S3_BUCKET &&
      env.RECORDINGS_S3_REGION &&
      env.RECORDINGS_S3_ACCESS_KEY &&
      env.RECORDINGS_S3_SECRET
    ),
  },
  stt: {
    provider: env.STT_PROVIDER,
    deepgramApiKey: env.DEEPGRAM_API_KEY,
    sonioxApiKey: env.SONIOX_API_KEY,
  },
  tts: {
    sarvamApiKey: env.SARVAM_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    elevenlabsApiKey: env.ELEVENLABS_API_KEY,
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
