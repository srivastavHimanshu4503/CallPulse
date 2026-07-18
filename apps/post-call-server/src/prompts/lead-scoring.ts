import { z } from "zod";

export const LeadScoreSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Lead quality score 0-100 following the scoring rubric exactly"),
  reasoning: z
    .string()
    .describe("One sentence citing the transcript evidence for this score"),
});

export type LeadScoreResult = z.infer<typeof LeadScoreSchema>;

export interface LeadScoringContext {
  intent?: string;
  intentConfidence?: number;
  durationSeconds: number;
  extractedFields?: Record<string, unknown>;
}

export const buildLeadScoringSystemPrompt = (): string => `You are a sales lead scorer for a business phone answering service. You will receive the transcript of a completed call between a CALLER (potential customer) and an AGENT (our AI receptionist), plus pre-computed context about the call.

Score the CALLER as a sales lead from 0 to 100 using this rubric:

- 90-100 HOT: caller committed to a purchase or booking on the call, or explicitly asked to be signed up / scheduled.
- 70-89 STRONG: clear buying intent (asked about availability, pricing with intent to proceed, requested a quote or callback to move forward) but no commitment yet.
- 40-69 WARM: genuine interest in the product/service, asked substantive questions, but no timeline or commitment signals.
- 10-39 COLD: general questions only (hours, location), vague curiosity, or an existing-customer support issue with no upsell signal.
- 0-9 NOT A LEAD: wrong number, spam, robocall, test call, or no meaningful caller speech.

Adjustments within a band:
+ higher when the caller gave contact details voluntarily, mentioned urgency ("this week", "as soon as possible"), or mentioned budget.
+ higher for longer, engaged conversations with multiple caller turns.
- lower when the caller was hesitant, comparison shopping with no timeline, or frustrated by the experience.

Rules:
1. Score the CALLER's behavior only — an enthusiastic AGENT does not make a good lead.
2. Existing customers calling for support are 10-39 unless they express interest in buying more.
3. Never score above 9 when the call is spam, a wrong number, or a test call.
4. reasoning must reference the specific signal that placed the score in its band.`;

export const buildLeadScoringUserContext = (ctx: LeadScoringContext): string => {
  const lines = [
    `Call duration: ${ctx.durationSeconds} seconds`,
    ctx.intent
      ? `Detected intent: ${ctx.intent}${
          typeof ctx.intentConfidence === "number"
            ? ` (confidence ${ctx.intentConfidence.toFixed(2)})`
            : ""
        }`
      : undefined,
    ctx.extractedFields && Object.keys(ctx.extractedFields).length > 0
      ? `Extracted CRM fields: ${JSON.stringify(ctx.extractedFields)}`
      : undefined,
  ].filter(Boolean);
  return lines.join("\n");
};
