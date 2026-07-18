import { z } from "zod";

/**
 * Closed intent taxonomy. A fixed enum (instead of free-form strings) keeps
 * downstream branching (deal creation, notifications, analytics) reliable —
 * the LLM can never invent a new label that breaks a switch statement.
 */
export const INTENT_VALUES = [
  "BOOKING_REQUEST",
  "SALES_INQUIRY",
  "PRICING_INQUIRY",
  "SUPPORT_REQUEST",
  "COMPLAINT",
  "CANCELLATION",
  "RESCHEDULE",
  "CALLBACK_REQUEST",
  "GENERAL_INQUIRY",
  "WRONG_NUMBER",
  "SPAM",
  "TEST_CALL",
  "NO_CONTENT",
] as const;

export const IntentSchema = z.object({
  primary: z
    .enum(INTENT_VALUES)
    .describe("The single best-matching intent label for the caller's main goal"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in the primary label, 0 to 1"),
  reasoning: z
    .string()
    .describe("One sentence citing the transcript evidence for this label"),
  dealAmount: z
    .number()
    .nullable()
    .describe("If the call implies a potential deal, extract or calculate the total amount based on the transcript (e.g. quantity * price). Return null if no amount can be assumed."),
});

export type IntentResult = z.infer<typeof IntentSchema>;

export const buildIntentDetectionSystemPrompt = (): string => `You are a call-intent classifier for a business phone answering service. You will receive the transcript of a completed phone call between a CALLER (the customer) and an AGENT (our AI receptionist).

Classify the CALLER's primary goal into exactly one of these labels:

- BOOKING_REQUEST — caller wants to book, schedule, or reserve an appointment/service/table.
- SALES_INQUIRY — caller is interested in buying a product or service (beyond just price).
- PRICING_INQUIRY — caller mainly asked about cost, quotes, or fees.
- SUPPORT_REQUEST — caller needs help with an existing product, order, or service.
- COMPLAINT — caller is dissatisfied and expressing a grievance.
- CANCELLATION — caller wants to cancel an existing booking, order, or subscription.
- RESCHEDULE — caller wants to move an existing appointment to a different time.
- CALLBACK_REQUEST — caller primarily wants a human to call them back.
- GENERAL_INQUIRY — caller asked general questions (hours, location, services offered) with no buying or support signal.
- WRONG_NUMBER — caller reached the wrong business or asked for someone unrelated.
- SPAM — robocall, telemarketer, scam, or automated caller.
- TEST_CALL — caller is clearly testing the system ("testing", "can you hear me", staff trying out the agent).
- NO_CONTENT — transcript is empty or has no meaningful caller speech.

Rules:
1. Classify the CALLER's goal, never the AGENT's replies.
2. If several intents appear, pick the one the caller spent the most effort on or stated last as their goal.
3. BOOKING_REQUEST beats PRICING_INQUIRY when the caller asks price and then tries to book.
4. Use NO_CONTENT only when the caller said nothing meaningful.
6. reasoning must quote or paraphrase the specific caller line that decided the label.
7. dealAmount: If the intent relates to a sale, booking, or pricing, calculate or estimate the deal amount from context (e.g., quantity * unit price). If no reasonable estimate can be made, return null.`;
