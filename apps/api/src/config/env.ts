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
