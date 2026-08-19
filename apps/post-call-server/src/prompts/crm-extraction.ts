import { z } from "zod";

/**
 * Shape of a tenant custom-field definition as the prompt layer needs it.
 * Kept structural (not the Prisma type) so this module stays reusable by
 * any service that has field definitions to extract.
 */
export interface ExtractableFieldDef {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DROPDOWN" | "DATE";
  options: string[];
}

/** Stable JSON-safe key for a custom field (uuid dashes stripped). */
export const customFieldKey = (defId: string): string => `cf_${defId.replace(/-/g, "")}`;

/**
 * Dynamic extraction schema: fixed standard fields + one nullable entry per
 * tenant custom field. Every field is nullable (not optional) because the
 * OpenAI structured-outputs API requires all properties to be present.
 */
export const buildCrmExtractionSchema = (defs: ExtractableFieldDef[]) => {
  const shape: Record<string, z.ZodTypeAny> = {
    name: z
      .string()
      .nullable()
      .describe("Caller's full name exactly as they stated it, or null if never mentioned"),
    email: z
      .string()
      .nullable()
      .describe("Caller's email address in lowercase, or null if never mentioned"),
    company: z
      .string()
      .nullable()
      .describe("Caller's company or organization name, or null if never mentioned"),
    summary: z
      .string()
      .describe("Factual 1-2 sentence summary: who called, what they wanted, what was agreed"),
  };

  for (const def of defs) {
    const key = customFieldKey(def.id);
    let field: z.ZodTypeAny;
    switch (def.type) {
      case "NUMBER":
        field = z.number().nullable();
        break;
      case "BOOLEAN":
        field = z.boolean().nullable();
        break;
      case "DROPDOWN":
        field =
          def.options.length > 0
            ? z.enum(def.options as [string, ...string[]]).nullable()
            : z.string().nullable();
        break;
      case "DATE":
        field = z
          .string()
          .nullable()
          .describe(`"${def.name}" as an ISO 8601 date (YYYY-MM-DD), or null`);
        break;
      default:
        field = z.string().nullable();
        break;
    }
    shape[key] = field.describe(
      def.type === "DROPDOWN" && def.options.length > 0
        ? `"${def.name}" — must be one of: ${def.options.join(", ")}; null if not discussed`
        : `"${def.name}" — null if not discussed on the call`,
    );
  }

  return z.object(shape);
};

export const buildCrmExtractionSystemPrompt = (
  defs: ExtractableFieldDef[],
  callMoment: string,
): string => {
  const customFieldLines =
    defs.length > 0
      ? defs
          .map((d) => {
            const constraint =
              d.type === "DROPDOWN" && d.options.length > 0
                ? ` (choose one of: ${d.options.join(", ")})`
                : d.type === "DATE"
                  ? " (ISO date YYYY-MM-DD)"
                  : ` (${d.type.toLowerCase()})`;
            return `- ${d.name}${constraint}`;
          })
          .join("\n")
      : "- (none configured)";

  return `You are a CRM data-extraction engine processing the transcript of a completed phone call between a CALLER (the customer) and an AGENT (our AI receptionist).

The call took place on ${callMoment}. Use this as "today" when resolving any relative date the caller mentions.

Extract the requested fields about the CALLER.

## Grounding rules (non-negotiable)
1. Every extracted value MUST be traceable to specific words in the CALLER's turns (or a value the CALLER explicitly confirmed when the AGENT repeated it back). If you cannot point to the exact turn that states a value, return null.
2. If a field was not mentioned on the call, return null. A null is always correct; a guessed value is always wrong.
3. Never use the AGENT's own name, the business's name, or example/hypothetical values the AGENT offered ("for example, john@email.com") as caller data.
4. Do not carry over values between fields — a number mentioned as a budget is not a phone number, a city is not a company.

## Field rules
5. name: the caller's own name only. Proper-case it ("john smith" → "John Smith"). No titles (Mr/Mrs/Dr).
6. email: lowercase, exactly as spelled out by the caller. Convert spoken forms ("john dot smith at gmail dot com" → "john.smith@gmail.com"). If never given or too garbled to reconstruct confidently, return null.
7. company: the organization the CALLER works for or represents — never the business they are calling.
8. summary: 1-2 factual sentences covering who called, what they wanted, and any outcome (booking made, callback promised). No speculation, no marketing language.
9. Dropdown fields: return exactly one of the allowed options or null — never invent a new value. Match on meaning ("I'd prefer mornings" → "Morning" if that is an option).
10. Speech-to-text is imperfect: normalize obvious transcription artifacts (spelled-out emails, digit-by-digit numbers) but do not "fix" content you are unsure about.

## Date rules
11. Resolve every relative date to an absolute ISO date (YYYY-MM-DD) computed from the call date above. Work step by step: identify the call's weekday, then count forward.
    - "tomorrow" → call date + 1 day.
    - "day after tomorrow" → call date + 2 days.
    - "this <weekday>" → the next occurrence of that weekday, including later in the current week.
    - "next <weekday>" → the first occurrence of that weekday AFTER the current week ends (e.g. call on Friday 2026-07-17: "next Monday" → 2026-07-20).
    - "in two weeks" → call date + 14 days.
    - "end of the month" → last day of the call's month.
12. If a date is ambiguous ("sometime soon", "in a while") or you cannot resolve it with certainty, return null — never output a guessed date.
13. If the caller gives an explicit date without a year ("March 5th"), use the next future occurrence relative to the call date.

Custom fields requested by this business:
${customFieldLines}`;
};
