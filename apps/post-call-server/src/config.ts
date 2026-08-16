import dotenv from "dotenv";
import { z } from "zod";
import { DEFAULT_STRUCTURED_MODEL, OPENAI_MODEL_IDS } from "@antigravity/llm";

dotenv.config();

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3002),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  DATABASE_URL: z.string().url(),

  // Shared secret voice-server must send in `x-post-call-secret`. Empty in
  // dev means no auth check. In prod this is a required guard.
  POST_CALL_SERVER_SECRET: optionalString,

  // Concurrency: how many post-call jobs run in parallel per process. Bump
  // as CPU / DB pool headroom allows. Horizontal scale is by adding
  // processes, since the in-memory queue does not share state across procs.
  POST_CALL_CONCURRENCY: z.coerce.number().int().positive().default(4),

  OPENAI_API_KEY: optionalString,

  // Twilio — used to fetch call recordings after each call.
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,

  // Plivo — used to fetch trunk recordings for Indian DIDs.
  PLIVO_AUTH_ID: optionalString,
  PLIVO_AUTH_TOKEN: optionalString,

  // Which model runs post-call extraction. Must be a registered model id
  // from @antigravity/llm — typos fail fast at boot instead of at call time.
  POST_CALL_LLM_MODEL: z.enum(OPENAI_MODEL_IDS).default(DEFAULT_STRUCTURED_MODEL),

  // Max retry attempts for a job before it lands in the dead-letter log.
  POST_CALL_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),

  // Chat sessions: a conversation is considered over after this many minutes
  // of customer silence; the sweeper then runs post-processing on it.
  CHAT_SESSION_IDLE_MINUTES: z.coerce.number().int().positive().default(30),
  CHAT_SWEEP_INTERVAL_MINUTES: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse({
  ...process.env,
  PORT: process.env.POST_CALL_PORT || process.env.POST_CALL_SERVER_PORT || 3002,
});
if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
  throw new Error(`Invalid environment configuration: ${details}`);
}
const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === "production",
  server: {
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
  },
  auth: {
    sharedSecret: env.POST_CALL_SERVER_SECRET,
  },
  queue: {
    concurrency: env.POST_CALL_CONCURRENCY,
    maxAttempts: env.POST_CALL_MAX_ATTEMPTS,
  },
  llm: {
    openaiApiKey: env.OPENAI_API_KEY,
    model: env.POST_CALL_LLM_MODEL,
  },
  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
  },
  plivo: {
    authId: env.PLIVO_AUTH_ID,
    authToken: env.PLIVO_AUTH_TOKEN,
  },
  chat: {
    idleMinutes: env.CHAT_SESSION_IDLE_MINUTES,
    sweepIntervalMinutes: env.CHAT_SWEEP_INTERVAL_MINUTES,
  },
} as const;

export type AppConfig = typeof config;
