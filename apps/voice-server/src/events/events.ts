import type { llm } from "@livekit/agents";
type Message = llm.ChatMessage;

export type VoiceEvent =
  | { type: "call.started"; payload: CallStartedPayload }
  | { type: "call.ended"; payload: CallEndedPayload }
  | { type: "call.transferred"; payload: CallTransferredPayload }
  | { type: "tool.executed"; payload: ToolExecutedPayload }
  | { type: "transcript.final"; payload: TranscriptPayload };

export interface CallStartedPayload {
  callSid: string;
  callerNumber: string;
  orgId: string;
  sessionId: string;
}

export interface CallEndedPayload {
  callSid: string;
  callerNumber: string;
  orgId: string;
  sessionId: string;
  duration: number;
  transcript: Message[];
  metadata: Record<string, any>;
}

export interface CallTransferredPayload {
  callSid: string;
  callerNumber: string;
  orgId: string;
  sessionId: string;
  to: string;
}

export interface ToolExecutedPayload {
  callSid: string;
  sessionId: string;
  toolName: string;
  arguments: Record<string, any>;
  result: string;
}

export interface TranscriptPayload {
  callSid: string;
  sessionId: string;
  role: "user" | "assistant";
  text: string;
}
