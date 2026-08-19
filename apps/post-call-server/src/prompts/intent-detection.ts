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
  confidence: z.number().min(0).max(1).describe("Confidence in the primary label, 0 to 1"),
  reasoning: z.string().describe("One sentence citing the transcript evidence for this label"),
  dealAmountReasoning: z
    .string()
    .describe(
      "Show your work BEFORE deciding the amount: quote every price, budget, quantity, and unit price mentioned in the transcript, then write out the arithmetic step by step (e.g. '3 tents × ₹2500 = ₹7500, plus 50 chairs × ₹20 = ₹1000, total ₹8500'). If no monetary signal exists, say so explicitly.",
    ),
  dealAmount: z
    .number()
    .nullable()
    .describe(
      "The total potential deal value in rupees, derived from dealAmountReasoning. Must be a positive number — NEVER 0. Return null only when the transcript contains no price, budget, quote, or estimable amount at all.",
    ),
});

export type IntentResult = z.infer<typeof IntentSchema>;

export const buildIntentDetectionSystemPrompt =
  (): string => `You are a call-intent classifier for a business phone answering service. You will receive the transcript of a completed phone call between a CALLER (the customer) and an AGENT (our AI receptionist).

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

DEAL AMOUNT EXTRACTION (dealAmountReasoning + dealAmount):
For sales/booking/pricing intents, work hard to find the deal's monetary value. Callers and agents mention money in many forms — catch ALL of them:

- Explicit quotes by the AGENT: "yeh package 15000 ka hai", "per tent 2500 rupaye".
- Budgets stated by the CALLER: "mera budget 50000 hai", "around 2 lakh soch rahe hain".
- Indian number words — convert to digits: "paanch hazaar" = 5000, "dedh lakh" = 150000, "dhai hazaar" = 2500, "pandrah sau" = 1500, "do lakh" = 200000, "ek crore" = 10000000. Also shorthand: "2.5k" = 2500, "1.5L" = 150000, "₹5,000" = 5000.
- Quantity × unit price: if the caller wants 3 tents and the agent quoted ₹2500 per tent, compute 3 × 2500 = 7500. Sum multiple line items.
- Ranges: "do se teen lakh ke beech" → use the LOWER bound (200000). Conservative beats inflated.
- Advance/token amounts: if only an advance is mentioned but the full price is also stated, use the full price, not the advance.

Procedure:
1. In dealAmountReasoning, list every monetary signal found in the transcript with the exact quote.
2. Do the arithmetic step by step in writing (never in your head) — quantity × price per item, then sum.
3. Set dealAmount to that total.

Hard rules:
- dealAmount must be POSITIVE. Never output 0 — a zero-value deal is worse than no deal. If genuinely no price, budget, or estimable amount appears anywhere in the transcript, return null.
- Do not invent amounts that have no basis in the transcript. Null is the correct answer when the caller only asked "kitna lagega?" and got no number back.
- Ignore obviously joking amounts ("ek rupaye mein karwa do") — those are banter, not budgets.
- Amounts are in Indian Rupees (INR).`;
