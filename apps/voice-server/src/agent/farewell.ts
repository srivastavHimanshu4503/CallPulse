/**
 * Multilingual Farewell Detection and Transcript Item Text Extraction.
 * Anchored heuristics ensure calls do not hang open indefinitely when users or models speak goodbyes.
 */

export const ASSISTANT_FAREWELL_RE =
  /\b(?:goodbye|bye\s*bye|bye\.?\s*$|phir\s+milte|phir\s+baat\s+karenge|chalo\s+bye|(?:aapka\s+)?din\s+shubh\s+ho|have\s+a\s+(?:great|good|nice|wonderful|lovely)\s+day)\b/i;

export const USER_FAREWELL_RE =
  /\b(?:bye|goodbye|bye\s*bye|thank\s*you\s+bye|thanks?\s+bye|okay\s+bye|ok\s+bye|okay\s+thanks?\s+bye|phir\s+milte|phir\s+baat\s+karenge|chalo\s+bye|alvida)\b/i;

export const isAssistantFarewell = (text: string): boolean => ASSISTANT_FAREWELL_RE.test(text);

export const isUserFarewell = (text: string): boolean => USER_FAREWELL_RE.test(text);

/**
 * `ConversationItemAdded.item.content` can be a plain string OR an array of
 * content parts (each `{ type: "text", text: string }` or similar) depending
 * on the LiveKit agents SDK version and the LLM adapter in use. We flatten
 * to a single string so the assistant farewell heuristic can inspect the text.
 */
export const extractItemText = (content: unknown): string => {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const p = part as Record<string, unknown>;
          if (typeof p.text === "string") return p.text;
          if (typeof p.content === "string") return p.content;
        }
        return "";
      })
      .join(" ")
      .trim();
  }
  if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (typeof c.text === "string") return c.text.trim();
  }
  return "";
};
