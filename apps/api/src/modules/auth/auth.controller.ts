import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { getCleanErrorMessage } from "@antigravity/utils";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
} from "@antigravity/validators";

const authService = new AuthService();

// In-memory cache for the auth-page voice preview (per language).
// Regenerated on server restart; safe because inputs are hardcoded.
const VOICE_SAMPLE_CACHE = new Map<string, Buffer>();

// Hardcoded receptionist greetings — male voice + male grammatical endings
// ("sakta hoon", "raha hoon") so voice + text agree.
const VOICE_SAMPLES: Record<"hi" | "en", { text: string; language: string }> = {
  hi: {
    text: "नमस्ते! राजेश डिस्ट्रीब्यूटर्स में आपका स्वागत है। मैं आपकी क्या सहायता कर सकता हूं?",
    language: "hi-IN",
  },
  en: {
    text: "Hello! Welcome to Rajesh Distributors. How may I help you today?",
    language: "en-IN",
  },
};

// Warm male voices from Sarvam bulbul:v3.
const VOICE_SPEAKER = "anand";

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      const result = await authService.register(parsed.data);
      sendSuccess(res, result, 201);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      const result = await authService.login(parsed.data);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 401);
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      const result = await authService.refresh(parsed.data.refreshToken);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 401);
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    try {
      // For Phase 1 stateless JWT logout, we send a successful success response
      // (The client will clear tokens from local store)
      sendSuccess(res, { message: "Logged out successfully" }, 200);
    } catch (error: any) {
      sendError(res, "Logout failed", 500);
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      const result = await authService.forgotPassword(parsed.data.email);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      await authService.resetPassword(parsed.data);
      sendSuccess(res, { message: "Password updated successfully" }, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const tenantId = req.tenantId;

      if (!userId || !tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const result = await authService.me(userId, tenantId);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 401);
    }
  }

  // Public: returns an audio sample of the AI receptionist greeting in the
  // requested language. Uses Sarvam bulbul:v3 with a male voice; inputs are
  // hardcoded (no arbitrary text) so this endpoint is safe to expose.
  async voiceSample(req: Request, res: Response): Promise<void> {
    try {
      const rawLang = String(req.query.lang || "hi").toLowerCase();
      const lang: "hi" | "en" = rawLang === "en" ? "en" : "hi";

      let audio = VOICE_SAMPLE_CACHE.get(lang);
      if (!audio) {
        const apiKey = process.env.SARVAM_API_KEY;
        if (!apiKey) {
          sendError(res, "Voice preview is not configured on the server", 503);
          return;
        }
        const sample = VOICE_SAMPLES[lang];
        const response = await fetch("https://api.sarvam.ai/text-to-speech", {
          method: "POST",
          headers: {
            "api-subscription-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: sample.text,
            speaker: VOICE_SPEAKER,
            target_language_code: sample.language,
            model: "bulbul:v3",
            pace: 1.05,
          }),
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Sarvam TTS failed: ${err}`);
        }
        const data = (await response.json()) as { audios?: string[] };
        const base64 = data.audios?.[0];
        if (!base64) throw new Error("No audio returned from Sarvam");
        audio = Buffer.from(base64, "base64");
        VOICE_SAMPLE_CACHE.set(lang, audio);
      }

      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(audio);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 500);
    }
  }
}
