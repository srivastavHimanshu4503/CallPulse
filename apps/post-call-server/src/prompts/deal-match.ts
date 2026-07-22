import { z } from "zod";

/**
 * Deal-match decision: given the contact's open deals and the new call,
 * decide whether the call is about one of those deals (update it / move its
 * stage) or a genuinely new requirement (create a fresh deal).
 */

export interface OpenDealForMatch {
  id: string;
  title: string;
  stage: string;
  value: number;
  summary: string | null;
  lastActivityAt: string | null;
  /** Ordered stages of this deal's pipeline with default win % and won/lost tags. */
  stages: { name: string; probability: number; isWon: boolean; isLost: boolean }[];
}

export const DealMatchSchema = z.object({
  decision: z
    .enum(["UPDATE_EXISTING", "CREATE_NEW", "NO_ACTION"])
    .describe(
      "UPDATE_EXISTING if the call is about one of the listed open deals. CREATE_NEW if it is a genuinely different requirement. NO_ACTION if the call carries no deal signal at all (e.g. a cancellation/reschedule that matches no listed deal).",
    ),
  dealId: z
    .string()
    .nullable()
    .describe("The id of the matched deal — copied EXACTLY from the list. Null unless decision is UPDATE_EXISTING."),
  newStage: z
    .string()
    .nullable()
    .describe(
      "If the call moved the deal forward or backward, the EXACT name of the target stage from that deal's stage list (e.g. caller confirmed the booking → the booked/won-ish stage; caller cancelled → the lost stage). Null = keep the current stage.",
    ),
  updatedValue: z
    .number()
    .nullable()
    .describe("New total deal value in rupees if this call changed it (new quote, changed quantity). Null = keep the existing value."),
  updatedSummary: z
    .string()
    .nullable()
    .describe("If updating: 1-2 sentences merging what was already known with what this call added/changed. Null when not updating."),
  reasoning: z.string().describe("One sentence citing the evidence for the decision"),
});

export type DealMatchResult = z.infer<typeof DealMatchSchema>;

export const buildDealMatchSystemPrompt = (): string => `You maintain a sales CRM. A contact who already has open deals just finished a phone call with our AI receptionist. Decide whether this call is ABOUT one of their existing open deals, or a brand-new requirement.

Rules:
1. Same event/booking/requirement (confirming it, asking for updates, changing date/quantity/details, negotiating its price, cancelling it) → UPDATE_EXISTING with that deal's id.
2. A clearly different product, event, or requirement → CREATE_NEW.
3. When genuinely unsure whether it is the same requirement, prefer UPDATE_EXISTING for follow-up-style calls ("what about my booking", "wo wala order") and CREATE_NEW only when the caller describes a distinctly different need.
4. Stage moves (newStage) must be justified by the call. Read the stage list as a progress ladder — the win % tells you what each stage means (low % = first contact, middle % = actively interested / qualified, high % = practically agreed, won = confirmed/booked, lost = cancelled):
   - Caller CONFIRMED / finalized the booking or purchase → the won stage.
   - Caller CANCELLED → the lost stage.
   - The call clearly ADVANCED the deal (caller shared detailed requirements — date, venue, quantities, guest count — asked for a quote, or showed strong buying signals) → the open stage that matches that progress (typically the next one up the ladder).
   - Small talk, a repeated question, or no new progress → null (keep the current stage).
   - Move forward or keep — NEVER move a deal backward down the ladder.
   - newStage must be copied character-for-character from the deal's stage list.
5. updatedValue only when the call itself established a new total (new quote, changed quantity). Never invent or zero it.
6. dealId must be copied exactly from the list — never fabricate an id.`;

export const buildDealMatchUserPrompt = (
  deals: OpenDealForMatch[],
  intent: string,
  transcriptBlock: string,
): string => {
  const dealLines = deals
    .map((d, i) => {
      const stages = d.stages
        .map(
          (s) =>
            `${s.name} (${s.probability}%${s.isWon ? ", won" : s.isLost ? ", lost" : ""})`
        )
        .join(" → ");
      return `Deal ${i + 1}:
  id: ${d.id}
  title: ${d.title}
  current stage: ${d.stage}
  value: ₹${d.value}
  summary: ${d.summary ?? "(none)"}
  last activity: ${d.lastActivityAt ?? "unknown"}
  stage list: ${stages || "(no pipeline stages)"}`;
    })
    .join("\n\n");

  return `EXISTING OPEN DEALS FOR THIS CONTACT:
${dealLines}

DETECTED CALL INTENT: ${intent}

NEW CALL TRANSCRIPT:
${transcriptBlock}`;
};
