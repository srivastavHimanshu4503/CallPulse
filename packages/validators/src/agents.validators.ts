import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  role: z.string().min(1, "Agent role is required"),
  // All 11 languages Sarvam bulbul:v3 speaks (10 Indian + Indian English).
  language: z.enum(
    [
      "English",
      "Hindi",
      "Hinglish",
      "Marathi",
      "Tamil",
      "Telugu",
      "Bengali",
      "Gujarati",
      "Kannada",
      "Malayalam",
      "Punjabi",
      "Odia",
    ],
    {
      errorMap: () => ({ message: "Please select a valid language" }),
    }
  ),
  greetingMessage: z.string().min(1, "Greeting message is required"),
  tone: z.enum(["Friendly", "Professional", "Casual"], {
    errorMap: () => ({ message: "Please select a valid tone" }),
  }),
  fallbackMessage: z.string().min(1, "Fallback message is required"),
  businessInfo: z.string().optional().nullable(),
  // How the agent should talk/behave — free text from the business owner,
  // injected into the live call prompt as its own section.
  agentGuidelines: z.string().max(4000).optional().nullable(),
  websiteUrl: z
    .string()
    .transform((val) => (val === "" ? null : val))
    .pipe(z.string().url("Please enter a valid website URL").nullable())
    .optional()
    .nullable(),
  maxDuration: z.coerce.number().min(1, "Duration must be at least 1 minute").max(120, "Duration cannot exceed 120 minutes").default(10),
  dndCompliance: z.boolean().default(true),
  recordingConsent: z.boolean().default(true),
  isActive: z.boolean().default(true).optional(),
  voice: z.string().default("sarvam:priya").optional(),
  // Sarvam bulbul:v3 accepts 0.5–2.0. Legacy ElevenLabs voices are clamped
  // to their own [0.7, 1.2] range in the voice-server. Null = default.
  voiceSpeed: z.coerce.number().min(0.5).max(2.0).optional().nullable(),
  // Word → spoken-form overrides fed to the Sarvam pronunciation dictionary.
  // Sarvam caps a dictionary at 100 words.
  pronunciations: z
    .record(z.string().min(1).max(80), z.string().min(1).max(200))
    .refine((obj) => Object.keys(obj).length <= 100, {
      message: "At most 100 pronunciation entries are allowed",
    })
    .optional()
    .nullable(),
  // Provider-native 0–1 floats (UI shows 0–100 sliders). Null = defaults.
  voiceSettings: z
    .object({
      stability: z.coerce.number().min(0).max(1).optional(),
      similarityBoost: z.coerce.number().min(0).max(1).optional(),
      style: z.coerce.number().min(0).max(1).optional(),
      temperature: z.coerce.number().min(0).max(1).optional(),
    })
    .optional()
    .nullable(),
  intakeWorkflowId: z.string().optional().nullable(),
  smsWorkflowId: z.string().optional().nullable(),
  phoneNumberId: z.string().optional().nullable(),
  intakeEnabled: z.boolean().optional().default(false),
  intakeFields: z.array(z.string()).optional().default([]),
  intakePrompt: z.string().optional().nullable(),
  smsEnabled: z.boolean().optional().default(false),
  smsTriggerCondition: z.string().optional().nullable(),
  smsTemplate: z.string().optional().nullable(),
  smsAgentReply: z.string().optional().nullable(),
  whatsappEnabled: z.boolean().optional().default(false),
  whatsappPrompt: z.string().optional().nullable(),
  apiEnabled: z.boolean().optional().default(false),
  apiWorkflowId: z.string().optional().nullable(),
  apiPrompt: z.string().optional().nullable(),
  callTransferEnabled: z.boolean().optional().default(false),
  callTransferWorkflowId: z.string().optional().nullable(),
  callTransferNumber: z.string().optional().nullable(),
  callTransferCondition: z.string().optional().nullable(),
  callTransferMessage: z.string().optional().nullable(),
  callTransferFallbackNumber: z.string().optional().nullable(),
  callTransferTimeoutSec: z.coerce.number().int().min(10).max(60).optional().default(25),
  callTransferNoAnswerAction: z.enum(["take_message", "offer_callback", "end_politely"]).optional().default("take_message"),
  callTransferStyle: z.enum(["warm", "instant"]).optional().default("warm"),
  bookingEnabled: z.boolean().optional().default(false),
  bookingConfig: z
    .object({
      triggerCondition: z.string(),
      provider: z.enum(["google", "calcom", "link"]),
      calendarLink: z.string(),
      meetingDurationMin: z.coerce.number().int().positive(),
      workingHoursNote: z.string(),
      confirmationMessage: z.string(),
      askEmail: z.boolean().optional().default(false),
    })
    .optional()
    .nullable(),
  businessHours: z.any().optional().nullable(),
  timeZone: z.string().default("Asia/Kolkata").optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
