import { defineAgent, voice, type JobContext } from "@livekit/agents";

import { config } from "../config.js";
import { createLogger } from "../logger.js";
import { LocalEventBus } from "../events/emitter.js";
import { createSession, endSession } from "./session.js";
import { buildSystemPrompt } from "./prompt.js";
import { WorkflowTriggerStub } from "../workflows/stub.js";
import { buildTools } from "./tools/index.js";
import { createPipelineLLM } from "../llm/index.js";
import { createSTT } from "../stt/index.js";
import { createTTS, type TTSBuildOptions } from "../tts/index.js";
import { getAgentConfigProvider } from "../agent-config/index.js";
import { TwilioTelephonyProvider } from "../telephony/twilio/provider.js";
import { resolveLanguageCodes, type VoiceKey } from "../voices/config.js";

const log = createLogger("agent");
const eventBus = new LocalEventBus();
const agentConfigProvider = getAgentConfigProvider();

const extractCallSidFromRoom = (roomName: string, jobId: string): string => {
  if (!roomName.startsWith("call-")) return `mock_${jobId}`;
  const rest = roomName.slice("call-".length);
  const parts = rest.split("_").filter(Boolean);
  return parts[parts.length - 1] || rest;
};

const extractCallerNumberFromRoom = (roomName: string): string | undefined => {
  const match = roomName.match(/\+\d{6,15}/);
  return match ? match[0] : undefined;
};

/**
 * The number the *caller dialed* — used to look up which AI agent should
 * answer. For a single-Twilio-number deployment this is the number
 * configured in env. Multi-number deployments will need to read the
 * dialed number from participant attributes.
 */
const getDialedNumber = (): string | undefined => config.twilio.phoneNumber;

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const roomName = ctx.room.name || "";
    const callSid = extractCallSidFromRoom(roomName, ctx.job.id);
    const callerNumber = extractCallerNumberFromRoom(roomName) ?? "unknown";
    const dialedNumber = getDialedNumber();
    const callLog = log.child(callSid);

    callLog.info("job starting", {
      jobId: ctx.job.id,
      room: roomName,
      caller: callerNumber,
      dialed: dialedNumber,
    });

    if (!dialedNumber) {
      callLog.error("no dialed number configured — cannot look up agent config");
      return;
    }

    const persona = await agentConfigProvider.getByPhoneNumber(dialedNumber);
    if (!persona) {
      callLog.error("no agent registered in DB for dialed number — aborting call", {
        dialedNumber,
      });
      return;
    }

    const languageKey = normalizeLanguage(persona.language);
    const langCodes = resolveLanguageCodes(languageKey);

    const session = createSession(callSid, callerNumber, languageKey);

    eventBus.emit("call.started", {
      callSid,
      callerNumber,
      orgId: persona.ids.tenantId,
      sessionId: session.sessionId,
    });

    await ctx.connect();
    callLog.info("participant connected", { agent: persona.agentName, tenant: persona.businessName });

    const twilio = config.twilio.isConfigured ? new TwilioTelephonyProvider() : undefined;

    let hangupRequested = false;
    const endCall = async (reason: string): Promise<void> => {
      if (hangupRequested) return;
      hangupRequested = true;
      callLog.info("end_call invoked — waiting for TTS to finish then hanging up", { reason });
      // Give TTS a beat to finish speaking the goodbye line before tearing
      // down the SIP leg. Otherwise the caller hears mid-word cut-off.
      setTimeout(async () => {
        try {
          if (twilio && callSid.startsWith("CA")) {
            await twilio.endCall(callSid);
          }
        } catch (err) {
          callLog.warn("twilio.endCall failed", { message: (err as Error).message });
        }
        try {
          await ctx.room.disconnect();
        } catch (err) {
          callLog.warn("room disconnect failed", { message: (err as Error).message });
        }
      }, 1500);
    };

    const systemPrompt = buildSystemPrompt(persona);

    const tools = buildTools({
      callSid,
      callerNumber,
      sessionId: session.sessionId,
      tenantId: persona.ids.tenantId,
      agentId: persona.ids.agentId,
      workflowTrigger: new WorkflowTriggerStub(),
      endCall,
    });

    const ttsOptions: TTSBuildOptions = {
      language: langCodes.tts,
      speaker: langCodes.speaker,
    };

    const pipelineLLM = createPipelineLLM({
      primary: config.llm.primary,
      fallbacks: config.llm.fallbacks,
    });
    // Prewarm to eliminate cold-start latency on the first user turn.
    try {
      pipelineLLM.prewarm();
    } catch {
      /* prewarm is best-effort */
    }

    const agent = new voice.Agent({
      instructions: systemPrompt,
      tools,
      stt: createSTT({ language: langCodes.stt }),
      llm: pipelineLLM,
      tts: createTTS(ttsOptions),
    });

    const agentSession = new voice.AgentSession({
      turnHandling: {
        // Silero VAD detects audio-level silence. Sarvam's own END_SPEECH
        // signal arrives ~200ms before its FINAL_TRANSCRIPT, which caused
        // the "reply lands one turn late" bug when using "stt" mode.
        turnDetection: "vad",
        endpointing: {
          mode: "fixed",
          // 500ms is enough for Sarvam's ~200-300ms transcript latency and
          // trims the perceived pause between user's silence and reply.
          minDelay: 500,
          maxDelay: 3000,
        },
        interruption: { enabled: false },
        // LLM starts generating on the interim transcript so by the time
        // the turn commits, we already have partial output. TTS still waits
        // for turn commit (preemptiveTts: false) so nothing gets played
        // prematurely.
        preemptiveGeneration: {
          enabled: true,
          preemptiveTts: false,
          maxSpeechDuration: 10000,
        },
      },
    });

    agentSession.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev: any) => {
      const msg = ev?.item;
      if (!msg || !("role" in msg)) return;
      const text = typeof msg.content === "string" ? msg.content : "";
      if (!text) return;
      callLog.info("transcript", { role: msg.role, text });
      eventBus.emit("transcript.final", {
        callSid,
        sessionId: session.sessionId,
        role: msg.role,
        text,
      });
    });

    agentSession.on(voice.AgentSessionEventTypes.AgentStateChanged, (ev: any) => {
      const state = ev?.newState ?? ev;
      if (typeof state === "string") callLog.info("agent state", { state });
    });

    agentSession.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev: any) => {
      const text = ev?.transcript ?? "";
      const isFinal = ev?.isFinal ?? false;
      if (text && isFinal) callLog.info("user said", { text });
    });

    agentSession.on(voice.AgentSessionEventTypes.SpeechCreated, (ev: any) => {
      callLog.info("speech created", { source: ev?.source, userInitiated: ev?.userInitiated });
    });

    agentSession.on(voice.AgentSessionEventTypes.Error, (err: any) => {
      const detail = err?.error?.message ?? err?.message ?? JSON.stringify(err);
      callLog.error("session error", { detail });
    });

    ctx.addShutdownCallback(async () => {
      callLog.info("shutdown", { jobId: ctx.job.id });
      endSession(callSid);
      eventBus.emit("call.ended", {
        callSid,
        callerNumber,
        orgId: persona.ids.tenantId,
        sessionId: session.sessionId,
        duration: Math.round((Date.now() - session.startedAt.getTime()) / 1000),
        transcript: session.conversationHistory,
        metadata: { ...session.metadata, agentId: persona.ids.agentId },
      });
    });

    await agentSession.start({ agent, room: ctx.room });

    agentSession.say(persona.greetingMessage, {
      allowInterruptions: false,
      addToChatCtx: true,
    });
  },
});

const normalizeLanguage = (raw: string): VoiceKey => {
  const lower = raw.toLowerCase();
  if (lower.startsWith("hin") && lower.includes("glish")) return "hinglish";
  if (lower.startsWith("hin")) return "hindi";
  if (lower.startsWith("en")) return "english";
  return "hinglish";
};
