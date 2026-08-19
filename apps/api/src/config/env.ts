import { z } from "zod";
import dotenv from "dotenv";

// Load local environment variables from file
dotenv.config();

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

  // LiveKit (required for in-app test calls; optional for other flows)
  LIVEKIT_URL: z.string().min(1).optional(),
  LIVEKIT_API_KEY: z.string().min(1).optional(),
  LIVEKIT_API_SECRET: z.string().min(1).optional(),
  LIVEKIT_AGENT_NAME: z.string().default("inbound-agent"),

  // Twilio — used for US numbers and WhatsApp.
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  // WhatsApp Business Account — enables automatic sender registration when
  // an agent's WhatsApp bot is turned on. One-time setup in Twilio Console.
  TWILIO_WABA_ID: z.string().min(1).optional(),
  // Public URL Twilio calls for inbound WhatsApp (set per environment).
  WHATSAPP_WEBHOOK_URL: z.string().url().optional(),

  // Plivo — used for Indian numbers. Both keys required to enable Plivo.
  PLIVO_AUTH_ID: z.string().min(1).optional(),
  PLIVO_AUTH_TOKEN: z.string().min(1).optional(),
  // Compliance application ID from Plivo India KYC. India numbers cannot be
  // purchased without attaching one. Set once after KYC approval.
  PLIVO_COMPLIANCE_APPLICATION_ID: z.string().min(1).optional(),
  // Zentrunk (SIP Trunking) trunk ID that fronts LiveKit. Purchased DIDs
  // get auto-attached to this trunk right after buying so calls immediately
  // SIP-forward to LiveKit — no manual console click.
  PLIVO_TRUNK_ID: z.string().min(1).optional(),

  // Razorpay — optional so the API boots without payments configured.
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Speech APIs
  SARVAM_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),

  // Recording playback: the S3 bucket the voice-server egress writes to.
  // Only needed for pre-signing GETs; the api server uses ambient AWS creds
  // (AWS_PROFILE locally, ECS task role in prod).
  RECORDINGS_S3_BUCKET: z.string().min(1).optional(),
  RECORDINGS_S3_REGION: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables during startup:");

  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
