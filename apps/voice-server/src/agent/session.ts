import type { VoiceKey } from "../voices/config.js";

export interface TranscriptTurn {
  role: "user" | "assistant";
  text: string;
  at: Date;
}

export interface CallSession {
  callSid: string;
  callerNumber: string;
  orgId: string; // Empty now, per-org later
  sessionId: string;
  startedAt: Date;
  endedAt?: Date;
  conversationHistory: TranscriptTurn[];
  language: VoiceKey;
  status: "active" | "ended" | "transferred";
  metadata: Record<string, any>; // Extensible — anything future needs
}

// In-memory store now. Redis/DB store plugs in later via same interface.
const sessions = new Map<string, CallSession>();

export const getSession = (callSid: string): CallSession | undefined => {
  return sessions.get(callSid);
};

export const createSession = (
  callSid: string,
  callerNumber: string,
  language: VoiceKey = "hinglish"
): CallSession => {
  const session: CallSession = {
    callSid,
    callerNumber,
    orgId: "",
    sessionId: `sess_${Math.random().toString(36).substring(2, 11)}`,
    startedAt: new Date(),
    conversationHistory: [],
    language,
    status: "active",
    metadata: {},
  };
  sessions.set(callSid, session);
  console.log(`[CallSession] Created session for call ${callSid} (session: ${session.sessionId})`);
  return session;
};

export const appendTurn = (callSid: string, turn: TranscriptTurn): void => {
  const session = sessions.get(callSid);
  if (!session) return;
  session.conversationHistory.push(turn);
};

export const updateSession = (callSid: string, updates: Partial<CallSession>): void => {
  const session = sessions.get(callSid);
  if (session) {
    sessions.set(callSid, { ...session, ...updates });
    console.log(`[CallSession] Updated session for call ${callSid}`);
  }
};

export const endSession = (callSid: string): void => {
  const session = sessions.get(callSid);
  if (session && session.status === "active") {
    sessions.set(callSid, {
      ...session,
      status: "ended",
      endedAt: new Date(),
    });
    console.log(`[CallSession] Ended session for call ${callSid}`);
  }
};
