import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  role: z.string().min(1, "Agent role is required"),
  language: z.enum(["English", "Hindi", "Hinglish", "Marathi", "Tamil", "Telugu"], {
    errorMap: () => ({ message: "Please select a valid language" }),
  }),
  greetingMessage: z.string().min(1, "Greeting message is required"),
  tone: z.enum(["Friendly", "Professional", "Casual"], {
    errorMap: () => ({ message: "Please select a valid tone" }),
  }),
  fallbackMessage: z.string().min(1, "Fallback message is required"),
  businessInfo: z.string().optional().nullable(),
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
  voice: z.string().default("Priya (Indian Female)").optional(),
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
