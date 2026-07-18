import type { TranscriptTurn } from "../jobs/types.js";

/**
 * Canonical transcript rendering shared by every prompt. Labels are chosen
 * so the LLM never confuses who is who: CALLER is the human customer,
 * AGENT is our AI receptionist.
 */
export const formatTranscript = (turns: TranscriptTurn[]): string =>
  turns
    .map((t) => `${t.role === "assistant" ? "AGENT" : "CALLER"}: ${t.text.trim()}`)
    .join("\n");

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Render the call's start moment with an explicit weekday. LLMs are
 * unreliable at deriving the weekday from a raw date, so we hand it over —
 * without it, "next Monday" style arithmetic silently goes wrong.
 */
export const describeCallMoment = (startedAtIso: string): string => {
  const d = new Date(startedAtIso);
  if (Number.isNaN(d.getTime())) return `an unknown time (bad timestamp: ${startedAtIso})`;
  const weekday = WEEKDAYS[d.getUTCDay()];
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${weekday}, ${date} at ${time} UTC`;
};

/** Wraps the transcript in delimiters so instructions and data never blur. */
export const buildTranscriptUserPrompt = (
  turns: TranscriptTurn[],
  extraContext?: string
): string => {
  const sections = [
    "<transcript>",
    formatTranscript(turns),
    "</transcript>",
  ];
  if (extraContext) sections.push("", "<context>", extraContext, "</context>");
  return sections.join("\n");
};
