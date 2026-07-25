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
  JWT_REFRESH_SECRET: z.string().min(10, { message: "JWT_REFRESH_SECRET must be at least 10 chars" }),

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
  // Plivo application ID that owns the SIP endpoint / voice URL webhook.
  // Set once in the Plivo console and referenced when creating trunks.
  PLIVO_APPLICATION_ID: z.string().min(1).optional(),
  // The trunk (SIP domain) Plivo routes purchased Indian DIDs into.
  // Optional — if unset, we skip auto-attach and log a warning.
  PLIVO_TRUNK_ID: z.string().min(1).optional(),
  // Compliance application ID from Plivo India KYC. India numbers cannot be
  // purchased without attaching one. Set once after KYC approval.
  PLIVO_COMPLIANCE_APPLICATION_ID: z.string().min(1).optional(),
  // LiveKit SIP inbound URI — where Plivo forwards the call. Grab this from
  // the LiveKit dashboard under Project → SIP → Inbound Trunk (Host).
  // Example: sip.livekit.cloud OR <project-id>.sip.livekit.cloud
  LIVEKIT_SIP_URI: z.string().min(1).optional(),
  // Auth for the LiveKit inbound SIP trunk. Plivo attaches these on the SIP
  // INVITE so LiveKit accepts the call.
  LIVEKIT_SIP_AUTH_USERNAME: z.string().min(1).optional(),
  LIVEKIT_SIP_AUTH_PASSWORD: z.string().min(1).optional(),

  // Razorpay — optional so the API boots without payments configured.
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Speech APIs
  SARVAM_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables during startup:");
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
