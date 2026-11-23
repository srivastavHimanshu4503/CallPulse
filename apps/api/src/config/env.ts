import path from "node:path";
import { z } from "zod";
import dotenv from "dotenv";

// Load local environment variables from file (checking local first, then monorepo root)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const optionalString = <T extends z.ZodTypeAny>(schema: T = z.string().min(1) as unknown as T) =>
  z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    schema.optional(),
  );

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid connection string" }),
  TYPESENSE_HOST: z.string().min(1, { message: "TYPESENSE_HOST is required" }),
  TYPESENSE_PORT: z.coerce.number().default(8108),
  TYPESENSE_PROTOCOL: z.enum(["http", "https"]).default("http"),
  TYPESENSE_API_KEY: z.string().min(1, { message: "TYPESENSE_API_KEY is required" }),
  JWT_SECRET: z.string().min(10, { message: "JWT_SECRET must be at least 10 chars" }),
  JWT_REFRESH_SECRET: z
    .string()
    .min(10, { message: "JWT_REFRESH_SECRET must be at least 10 chars" }),
  CALENDAR_TOKEN_ENCRYPTION_KEY: optionalString(
    z
      .string()
      .length(64, { message: "CALENDAR_TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters" })
      .regex(/^[0-9a-fA-F]{64}$/, {
        message: "CALENDAR_TOKEN_ENCRYPTION_KEY must be a valid hex string",
      }),
  ),

  // Google OAuth (Sign-in + Google Calendar)
  GOOGLE_CLIENT_ID: optionalString(),
  GOOGLE_CLIENT_SECRET: optionalString(),
  GOOGLE_OAUTH_REDIRECT_URL: optionalString(z.string().url()),

  // LiveKit (required for in-app test calls; optional for other flows)
  LIVEKIT_URL: optionalString(),
  LIVEKIT_API_KEY: optionalString(),
  LIVEKIT_API_SECRET: optionalString(),
  LIVEKIT_AGENT_NAME: z.string().default("inbound-agent"),

  // Twilio — used for US numbers and WhatsApp.
  TWILIO_ACCOUNT_SID: optionalString(),
  TWILIO_AUTH_TOKEN: optionalString(),
  // WhatsApp Business Account — enables automatic sender registration when
  // an agent's WhatsApp bot is turned on. One-time setup in Twilio Console.
  TWILIO_WABA_ID: optionalString(),
  // Public URL Twilio calls for inbound WhatsApp (set per environment).
  WHATSAPP_WEBHOOK_URL: optionalString(z.string().url()),

  // Plivo — used for Indian numbers. Both keys required to enable Plivo.
  PLIVO_AUTH_ID: optionalString(),
  PLIVO_AUTH_TOKEN: optionalString(),
  // Compliance application ID from Plivo India KYC. India numbers cannot be
  // purchased without attaching one. Set once after KYC approval.
  PLIVO_COMPLIANCE_APPLICATION_ID: optionalString(),
  // Zentrunk (SIP Trunking) trunk ID that fronts LiveKit. Purchased DIDs
  // get auto-attached to this trunk right after buying so calls immediately
  // SIP-forward to LiveKit — no manual console click.
  PLIVO_TRUNK_ID: optionalString(),

  // Razorpay — optional so the API boots without payments configured.
  RAZORPAY_KEY_ID: optionalString(),
  RAZORPAY_KEY_SECRET: optionalString(),
  RAZORPAY_WEBHOOK_SECRET: optionalString(),

  // Speech APIs
  SARVAM_API_KEY: optionalString(),
  OPENAI_API_KEY: optionalString(),

  // Recording playback: the S3 bucket the voice-server egress writes to.
  // Only needed for pre-signing GETs; the api server uses ambient AWS creds
  // (AWS_PROFILE locally, ECS task role in prod).
  RECORDINGS_S3_BUCKET: optionalString(),
  RECORDINGS_S3_REGION: optionalString(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables during startup:");

  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
