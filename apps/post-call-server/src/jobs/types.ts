/**
 * Job payload the voice-server dispatches to /ingest. Same shape lands on
 * the queue, and every downstream handler reads from it.
 */
export interface PostCallJob {
  logId: string;
  callSid: string;
  tenantId: string;
  agentId: string;
  contactId: string;
  callerNumber: string;
  startedAt: string; // ISO
  durationSeconds: number;
  direction: "INBOUND" | "OUTBOUND";
  callSource: "sip" | "browser";
  transcript: TranscriptTurn[];
  metadata: Record<string, unknown>;
}

export interface TranscriptTurn {
  role: "user" | "assistant";
  text: string;
  at: string; // ISO
}

/**
 * Accumulator threaded through every handler. Each handler can enrich it;
 * later handlers can read what earlier ones produced.
 */
export interface PostCallContext {
  job: PostCallJob;
  intent?: DetectedIntent;
  extractedFields?: Record<string, unknown>;
  dealId?: string;
  leadScore?: number;
}

export interface DetectedIntent {
  primary: string;
  confidence: number;
  reasons?: string[];
  dealAmount?: number | null;
}

export interface JobHandler {
  name: string;
  run(ctx: PostCallContext): Promise<Partial<PostCallContext>>;
}
