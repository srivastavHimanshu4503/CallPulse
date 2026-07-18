import { defineAgent, voice, type JobContext, type JobProcess } from "@livekit/agents";
import { RoomEvent } from "@livekit/rtc-node";
import { RoomServiceClient } from "livekit-server-sdk";
import { db, getCreditBalance } from "@antigravity/db";

import { config } from "../config.js";
import { createLogger } from "../logger.js";
import { LocalEventBus } from "../events/emitter.js";
import { appendTurn, createSession, endSession } from "./session.js";
import { persistCallLog } from "../persistence/call-log.js";
import { dispatchPostCall } from "../notifier/post-call.js";
import { buildSystemPrompt } from "./prompt.js";
import { WorkflowTriggerStub } from "../workflows/stub.js";
import { buildTools } from "./tools/index.js";
import { createPipelineLLM } from "@antigravity/llm";
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

interface RoomLookupHint {
  agentId?: string;
  callSource?: "sip" | "browser";
  callerId?: string;
  callerName?: string;
}

/**
 * Room metadata is JSON minted by whoever provisioned the room. For SIP calls
 * LiveKit provides no metadata here; for in-app test calls the api server
 * mints a token with metadata `{ agentId, callSource: "browser" }`.
 */
const parseRoomMetadata = (raw: string | undefined): RoomLookupHint => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return {
      agentId: typeof parsed.agentId === "string" ? parsed.agentId : undefined,
      callSource: parsed.callSource === "browser" ? "browser" : undefined,
      callerId: typeof parsed.callerId === "string" ? parsed.callerId : undefined,
      callerName: typeof parsed.callerName === "string" ? parsed.callerName : undefined,
    };
  } catch {
    return {};
  }
};

export default defineAgent({
  /**
   * Runs ONCE per child job process before it picks up a job. LiveKit keeps
   * `numIdleProcesses` of these warm so the DB pool + Prisma engine + provider
   * singleton are ready when a real call arrives.
   */
  prewarm: async (_proc: JobProcess) => {
    try {
      await db.$connect();
      // Instantiating the provider primes its module graph + Prisma client.
      agentConfigProvider;
      log.info("child process prewarmed");
    } catch (err) {
      log.error("child process prewarm failed", { message: (err as Error)?.message });
    }
  },

  entry: async (ctx: JobContext) => {
    // Start the RTC connection immediately — LiveKit recommends calling
    // connect() as early as possible; a late connect delays the agent's
    // room join past the browser's answer watchdog. Persona loading below
    // runs in parallel; the promise is awaited before session start.
    const connectPromise = ctx.connect();
    connectPromise.catch(() => {
      /* observed via the await below; this guard prevents an unhandled
         rejection if entry aborts before reaching it */
    });

    // IMPORTANT: `ctx.room.*` is empty until connect resolves. Pre-connect,
    // room info + dispatch metadata live on the job proto — reading
    // `ctx.room.name`/`ctx.room.metadata` here silently returns "" and made
    // every browser test call look like a metadata-less SIP call.
    const roomName = ctx.room.name || ctx.job.room?.name || "";
    const callSid = extractCallSidFromRoom(roomName, ctx.job.id);
    const dialedNumber = getDialedNumber();
    const roomHint = parseRoomMetadata(
      ctx.job.metadata || ctx.job.room?.metadata || ctx.room.metadata
    );
    const callSource = roomHint.callSource ?? "sip";
    // Browser test calls have no SIP number in the room name — fall back to
    // the stable caller identity minted by the api server so every test call
    // from the same dashboard user maps to the same contact.
    let callerNumber =
      extractCallerNumberFromRoom(roomName) ?? roomHint.callerId ?? "unknown";
    const callerName = roomHint.callerName;
    const callLog = log.child(callSid);

    callLog.info("job starting", {
      jobId: ctx.job.id,
      room: roomName,
      caller: callerNumber,
      dialed: dialedNumber,
      source: callSource,
      hintAgentId: roomHint.agentId,
    });

    // Which of our numbers the caller dialed — stored in session metadata so
    // the post-call pipeline can find this call's Twilio recording.
    let resolvedDialedNumber: string | null = null;

    // Test calls from the web app pass agentId via room metadata. Real SIP
    // calls resolve the agent by WHICH of our numbers was dialed — LiveKit
    // delivers that as participant attributes, so multiple purchased numbers
    // route to their own agents automatically.
    let persona = null;
    if (roomHint.agentId) {
      persona = await agentConfigProvider.getById(roomHint.agentId);
      if (!persona) {
        callLog.error("no active agent found by hint agentId — aborting call", {
          hintAgentId: roomHint.agentId,
        });
        return;
      }
    } else {
      await connectPromise;
      const participant = await ctx.waitForParticipant();
      const attrs = (participant.attributes ?? {}) as Record<string, string>;
      const dialed = attrs["sip.trunkPhoneNumber"] || dialedNumber;
      if (attrs["sip.phoneNumber"]) callerNumber = attrs["sip.phoneNumber"];

      if (!dialed) {
        callLog.error("no dialed number in SIP attributes and none configured — aborting call");
        return;
      }

      persona =
        (await agentConfigProvider.getByPhoneNumber(dialed)) ??
        (!dialed.startsWith("+")
          ? await agentConfigProvider.getByPhoneNumber(`+${dialed}`)
          : null);
      if (!persona) {
        callLog.error("no agent registered in DB for dialed number — aborting call", {
          dialed,
        });
        return;
      }
      callLog.info("agent resolved from dialed number", {
        dialed,
        caller: callerNumber,
        agentId: persona.ids.agentId,
      });
      resolvedDialedNumber = dialed;
    }

    const languageKey = normalizeLanguage(persona.language);
    const langCodes = resolveLanguageCodes(languageKey);

    callLog.info("persona resolved — using user-configured voice and language", {
      agentId: persona.ids.agentId,
      agentName: persona.agentName,
      role: persona.role,
      tone: persona.tone,
      configuredLanguage: persona.language,
      resolvedLanguageKey: languageKey,
      sttCode: langCodes.stt,
      ttsCode: langCodes.tts,
      configuredVoice: persona.voice,
      knowledgeBases: persona.knowledge.length,
      intakeEnabled: persona.intake.enabled,
      maxDurationMinutes: persona.maxDurationMinutes,
    });

    const session = createSession(callSid, callerNumber, languageKey);
    if (resolvedDialedNumber) session.metadata.dialedNumber = resolvedDialedNumber;

    // Zero-balance guard: with no credits left, the call is answered only to
    // deliver a short "unavailable" notice and hang up. The flag rides in
    // session metadata so the post-call pipeline does NOT charge this call.
    let outOfCredits = false;
    try {
      const balance = await getCreditBalance(persona.ids.tenantId);
      outOfCredits = balance <= 0;
      if (outOfCredits) {
        session.metadata.outOfCredits = true;
        callLog.warn("tenant has zero credits — answering with unavailable notice", {
          tenantId: persona.ids.tenantId,
          balance,
        });
      }
    } catch (err) {
      // Billing must never take a call down — fail open.
      callLog.warn("credit balance check failed — allowing call", {
        message: (err as Error).message,
      });
    }

    eventBus.emit("call.started", {
      callSid,
      callerNumber,
      orgId: persona.ids.tenantId,
      sessionId: session.sessionId,
    });

    await connectPromise;
    callLog.info("participant connected", { agent: persona.agentName, tenant: persona.businessName });

    // Twilio provider retained only for feature-flagged fallback; the primary
    // hangup path is `RoomServiceClient.deleteRoom`, which drops SIP + browser
    // participants uniformly. Deleting the room triggers LiveKit-SIP to tear
    // down the Twilio trunk leg automatically — no Twilio REST call needed.
    void (config.twilio.isConfigured ? new TwilioTelephonyProvider() : undefined);

    let hangupRequested = false;
    const callStartedAt = Date.now();
    // Defensive grace period: refuse to hang up in the first 6 seconds of a
    // call. If the LLM mistakes the greeting acknowledgment ("hello", "hi")
    // for a farewell and calls end_call too early, we ignore it and keep the
    // conversation going. Legitimate goodbyes always happen later.
    const HANGUP_GRACE_MS = 6000;

    // Unified hangup path. Whether the LLM invoked `end_call`, the assistant
    // heuristic fired, the caller said goodbye, the idle timer expired, or
    // the max-duration cap was reached — everything routes through here and
    // deletes the LiveKit room. Room-delete drops every participant in the
    // room (agent, browser test caller, and any SIP participant), and
    // LiveKit-SIP tears down the Twilio trunk leg on its own.
    const endCall = async (reason: string): Promise<void> => {
      const elapsed = Date.now() - callStartedAt;
      if (elapsed < HANGUP_GRACE_MS) {
        callLog.warn("end_call ignored — inside grace period", {
          reason,
          elapsedMs: elapsed,
          graceMs: HANGUP_GRACE_MS,
        });
        return;
      }
      if (hangupRequested) {
        callLog.warn("end_call re-invoked — ignoring (already teardown in progress)", { reason });
        return;
      }
      hangupRequested = true;
      callLog.info("end_call invoked — waiting for TTS to finish then hanging up", {
        reason,
        source: callSource,
        elapsedMs: elapsed,
        room: roomName,
      });
      // Give TTS a beat to finish speaking the goodbye line before tearing
      // down the call. Tuned tight — long enough to avoid mid-word cutoff,
      // short enough to feel snappy.
      setTimeout(async () => {
        const teardownStart = Date.now();
        callLog.info("teardown starting after TTS grace");
        if (config.livekit.url && config.livekit.apiKey && config.livekit.apiSecret) {
          try {
            const rs = new RoomServiceClient(
              config.livekit.url.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://"),
              config.livekit.apiKey,
              config.livekit.apiSecret
            );
            const deleteStart = Date.now();
            await rs.deleteRoom(roomName);
            callLog.info("room deleted — SIP + browser participants dropped", {
              room: roomName,
              deleteMs: Date.now() - deleteStart,
              teardownTotalMs: Date.now() - teardownStart,
            });
            return;
          } catch (err) {
            callLog.warn(
              "deleteRoom failed — falling back to agent-side ctx.room.disconnect (SIP/browser leg may linger)",
              { message: (err as Error).message, room: roomName }
            );
          }
        } else {
          callLog.warn(
            "deleteRoom skipped — missing LiveKit server creds. Only the agent will disconnect; the caller's leg may hang."
          );
        }
        // Fallback: at least drop the agent side.
        try {
          const disconnectStart = Date.now();
          await ctx.room.disconnect();
          callLog.info("agent side ctx.room.disconnect() complete", {
            disconnectMs: Date.now() - disconnectStart,
          });
        } catch (err) {
          callLog.warn("room disconnect failed", { message: (err as Error).message });
        }
      }, 900);
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
      voice: persona.voice,
      language: langCodes.tts,
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
      useTtsAlignedTranscript: true,
      turnHandling: {
        // Silero VAD detects audio-level silence. Sarvam's own END_SPEECH
        // signal arrives ~200ms before its FINAL_TRANSCRIPT, which caused
        // the "reply lands one turn late" bug when using "stt" mode.
        turnDetection: "vad",
        endpointing: { mode: "fixed", minDelay: 300, maxDelay: 2500 },
        // Barge-in with matched thresholds from the reference production
        // system (Python `min_interruption_words=2`, which maps to
        // `min_duration = 0.2 + 0.15*sensitivity = 0.5s` in their v2
        // config). minWords=2 filters out one-word backchannels ("haan",
        // "hmm") that would otherwise cut off the agent's own sentences.
        //
        // `mode: "vad"` pins interruption detection to the Silero VAD we
        // already load — leaving mode `undefined` lets the SDK auto-select
        // "adaptive" which loads an additional ML classifier and adds
        // per-frame processing overhead. Reference uses VAD-based detection.
        interruption: {
          enabled: true,
          mode: "vad",
          minWords: 2,
          minDuration: 500,
        },
        preemptiveGeneration: { enabled: true, preemptiveTts: false, maxSpeechDuration: 10000 },
      },
    });

    // Tracks whether the *caller* has already said a clear goodbye. The
    // next transition of the agent from `speaking` → `listening` (i.e. the
    // agent has just finished its farewell reply) forces a hangup. This
    // path is deterministic — it doesn't depend on the LLM invoking a tool
    // or on parsing the agent's own content shape.
    let userSaidFarewell = false;
    let lastAgentState: string | undefined;

    agentSession.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev: any) => {
      const msg = ev?.item;
      if (!msg || !("role" in msg)) return;
      const text = extractItemText(msg.content);
      if (!text) return;
      callLog.info("transcript", { role: msg.role, text });
      const role: "user" | "assistant" = msg.role === "assistant" ? "assistant" : "user";
      appendTurn(callSid, { role, text, at: new Date() });
      eventBus.emit("transcript.final", {
        callSid,
        sessionId: session.sessionId,
        role,
        text,
      });

      // Safety net #1 (assistant side): gpt-4o-mini reliably *speaks* the
      // goodbye line but frequently skips invoking `end_call` alongside it,
      // stranding the caller on a silent open line. If the assistant's own
      // committed transcript contains an unambiguous farewell phrase and no
      // hangup is in flight, trigger it ourselves.
      if (msg.role === "assistant" && !hangupRequested && ASSISTANT_FAREWELL_RE.test(text)) {
        callLog.warn(
          "assistant spoke farewell without invoking end_call — forcing hangup via heuristic",
          { text }
        );
        void endCall("assistant farewell heuristic fallback");
      }
    });

    // Idle-hangup state. Reference (Python) uses 20s silence → warn → 10s
    // → +5s → hangup (~35s total). We do warn at 30s, hang up at 45s.
    //
    // The clock counts elapsed silence while the agent is IDLE-LISTENING for
    // the caller — it does NOT run while the agent is speaking, thinking,
    // initializing, or during the greeting. This avoids the common bug
    // where the "Hello, are you still there?" prompt fires before the
    // greeting even finishes.
    let idleWindowStart: number | null = null;
    let idleWarnFired = false;
    const IDLE_WARN_MS = 30_000;
    const IDLE_HANGUP_MS = 45_000;
    const resetIdleClock = (reason: string) => {
      idleWindowStart = null;
      idleWarnFired = false;
      callLog.info("idle clock reset", { reason });
    };
    const armIdleClock = (reason: string) => {
      idleWindowStart = Date.now();
      idleWarnFired = false;
      callLog.info("idle clock armed", { reason });
    };

    agentSession.on(voice.AgentSessionEventTypes.AgentStateChanged, (ev: any) => {
      const state = ev?.newState ?? ev;
      if (typeof state !== "string") return;
      callLog.info("agent state", { state });

      // Safety net #3 (state-transition): the caller previously said an
      // unambiguous farewell and the agent has just finished its response
      // (speaking → listening). Force hangup — nothing else is going to
      // happen on this call. Content extraction can't fail us here because
      // this path is driven purely by state transitions.
      if (
        lastAgentState === "speaking" &&
        state === "listening" &&
        userSaidFarewell &&
        !hangupRequested
      ) {
        callLog.warn(
          "agent returned to listening after user farewell — forcing hangup via state transition"
        );
        void endCall("user farewell + agent reply complete");
      }

      // Only arm the idle clock when the agent finishes talking and is now
      // actually waiting on the caller. Reset it any time the agent is
      // doing something (thinking, speaking, initializing).
      if (state === "listening") {
        armIdleClock(`agent state → listening (from ${lastAgentState ?? "?"})`);
      } else if (idleWindowStart !== null) {
        resetIdleClock(`agent state → ${state}`);
      }

      lastAgentState = state;
    });

    agentSession.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev: any) => {
      const text = ev?.transcript ?? "";
      const isFinal = ev?.isFinal ?? false;
      if (!text || !isFinal) return;
      resetIdleClock("user transcript received");
      callLog.info("user said", { text });
      // Safety net #2 (user side): if the caller says an unambiguous
      // farewell, arm the state-transition hangup above so we hang up the
      // moment the agent finishes its reply.
      if (!userSaidFarewell && USER_FAREWELL_RE.test(text)) {
        userSaidFarewell = true;
        callLog.warn("user farewell detected — arming state-transition hangup", { text });
      }
    });

    agentSession.on(voice.AgentSessionEventTypes.SpeechCreated, (ev: any) => {
      callLog.info("speech created", { source: ev?.source, userInitiated: ev?.userInitiated });
    });

    agentSession.on(voice.AgentSessionEventTypes.Error, (err: any) => {
      const detail = err?.error?.message ?? err?.message ?? JSON.stringify(err);
      callLog.error("session error", { detail });
    });

    // Hard idle-hangup timer. Polls every 5s. Only fires while the agent
    // is actively waiting on the caller (state=listening); paused while the
    // agent is thinking, speaking, initializing, or during the greeting.
    // At 30s of silence the agent prompts once; at 45s it hangs up.
    const idleTimer = setInterval(() => {
      if (hangupRequested) return;
      if (idleWindowStart === null) return; // agent isn't in a listening window
      const idleFor = Date.now() - idleWindowStart;
      if (idleFor >= IDLE_HANGUP_MS) {
        callLog.warn("idle hangup — no user activity", { idleForMs: idleFor });
        void endCall("idle timeout");
        return;
      }
      if (idleFor >= IDLE_WARN_MS && !idleWarnFired) {
        idleWarnFired = true;
        callLog.info("idle warn — prompting caller", { idleForMs: idleFor });
        try {
          agentSession.say("Hello, are you still there?", { allowInterruptions: true });
        } catch (err) {
          callLog.warn("idle warn say failed", { message: (err as Error)?.message });
        }
      }
    }, 5_000);

    // Hard max-duration cap with a 10s buffer past the persona's configured
    // maximum. Even if every other safety net misses, we don't leave a call
    // running indefinitely on the LiveKit-SIP meter.
    const maxDurationMs = Math.max(60_000, persona.maxDurationMinutes * 60_000 + 10_000);
    const maxDurationTimer = setTimeout(() => {
      if (hangupRequested) return;
      callLog.warn("max duration reached — forcing hangup", { maxDurationMs });
      void endCall("max duration reached");
    }, maxDurationMs);

    // Caller-hangs-up path. LiveKit fires `ParticipantDisconnected` when the
    // remote SIP or browser participant leaves. `closeOnDisconnect: true` on
    // RoomInputOptions closes the AgentSession automatically for us, but we
    // still want an explicit log and a fast room-delete so any lingering
    // trunk leg drops immediately.
    ctx.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      const identity = participant.identity ?? "";
      // The agent's own participant identity starts with `agent-`. Skip if
      // somehow this fires for the local (agent) side — we only want to
      // react to the *caller* leaving.
      if (identity.startsWith("agent-")) return;
      callLog.info("participant disconnected", {
        identity,
        kind: (participant as unknown as { kind?: number }).kind,
      });
      if (hangupRequested) return;
      hangupRequested = true;
      // No TTS to wait for — the caller is already gone. Fire immediately.
      (async () => {
        if (config.livekit.url && config.livekit.apiKey && config.livekit.apiSecret) {
          try {
            const rs = new RoomServiceClient(
              config.livekit.url.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://"),
              config.livekit.apiKey,
              config.livekit.apiSecret
            );
            await rs.deleteRoom(roomName);
            callLog.info("room deleted after participant disconnect", { room: roomName });
          } catch (err) {
            callLog.warn("deleteRoom on participant disconnect failed", {
              message: (err as Error).message,
            });
          }
        }
      })();
    });

    ctx.addShutdownCallback(async () => {
      clearInterval(idleTimer);
      clearTimeout(maxDurationTimer);
      callLog.info("shutdown", { jobId: ctx.job.id });
      endSession(callSid);

      const durationSeconds = Math.round((Date.now() - session.startedAt.getTime()) / 1000);
      const persistInput = {
        callSid,
        callerNumber,
        callerName,
        tenantId: persona.ids.tenantId,
        agentId: persona.ids.agentId,
        phoneNumberId:
          persona.ids.phoneNumberId && persona.ids.phoneNumberId !== "test-call"
            ? persona.ids.phoneNumberId
            : undefined,
        startedAt: session.startedAt,
        durationSeconds,
        direction: "INBOUND" as const,
        callSource,
        transcript: session.conversationHistory,
        metadata: { ...session.metadata, room: roomName },
      };

      // Durability first: block the shutdown briefly on the DB write so the
      // transcript is safe before the child process may be torn down. The
      // post-call dispatch is fire-and-forget after this.
      let persisted: { logId: string; contactId: string } | null = null;
      try {
        persisted = await persistCallLog(persistInput);
      } catch (err) {
        callLog.error("call log persistence failed — post-call dispatch aborted", {
          message: (err as Error).message,
        });
      }

      if (persisted) {
        // MUST await — the LiveKit child process is torn down as soon as this
        // shutdown callback resolves, so a fire-and-forget fetch gets its
        // socket ripped out before the request lands. dispatchPostCall has
        // its own 5s hard timeout so a slow/down post-call-server won't stall
        // us indefinitely; a timed-out dispatch still leaves the DB row
        // available for a reconciliation job to retry.
        try {
          await dispatchPostCall({
            logId: persisted.logId,
            callSid,
            tenantId: persona.ids.tenantId,
            agentId: persona.ids.agentId,
            contactId: persisted.contactId,
            callerNumber,
            startedAt: session.startedAt,
            durationSeconds,
            direction: "INBOUND",
            callSource,
            transcript: session.conversationHistory,
            metadata: persistInput.metadata,
          });
        } catch (err) {
          callLog.warn("post-call dispatch threw unexpectedly", {
            message: (err as Error).message,
          });
        }
      }

      eventBus.emit("call.ended", {
        callSid,
        callerNumber,
        orgId: persona.ids.tenantId,
        sessionId: session.sessionId,
        duration: durationSeconds,
        transcript: session.conversationHistory,
        metadata: { ...session.metadata, agentId: persona.ids.agentId, logId: persisted?.logId },
      });
    });

    await agentSession.start({
      agent,
      room: ctx.room,
      // Auto-close the session if the linked participant leaves for any
      // reason (mobile hangup, browser tab close, room deleted). Combined
      // with `deleteRoomOnClose`, this closes the loop: caller hangs up →
      // session closes → room is deleted → SIP trunk drops.
      inputOptions: {
        closeOnDisconnect: true,
        deleteRoomOnClose: true,
      },
      // `transcriptionEnabled: true` matches the reference production
      // config — LiveKit auto-publishes STT + agent transcript segments to
      // the room on the `lk.transcription` topic. Defaults to true in this
      // SDK version but we set it explicitly to lock behavior.
      outputOptions: {
        transcriptionEnabled: true,
      },
    });

    if (outOfCredits) {
      // Zero balance: deliver one polite line and hang up. The 8s delay
      // clears the 6s hangup grace period and lets TTS finish speaking.
      const message =
        callSource === "browser"
          ? "You are out of credits, so your AI assistant cannot take calls right now. Please top up from Settings, Billing to continue."
          : "Sorry, our assistant is currently unavailable. Please call back later. Thank you!";
      agentSession.say(message, { allowInterruptions: false, addToChatCtx: true });
      setTimeout(() => {
        void endCall("out of credits");
      }, 8_000);
      return;
    }

    agentSession.say(persona.greetingMessage, {
      allowInterruptions: false,
      addToChatCtx: true,
    });
  },
});

// Assistant-side farewell heuristic. Deliberately narrow — matches phrases
// only the AI would use to *close* the call, not incidental "thanks" or
// polite affirmations. Anchored on \b so "goodbye" matches but "goodbyes"
// doesn't; explicit multi-word Hindi close phrases require the exact form
// the prompt trains the model to produce.
const ASSISTANT_FAREWELL_RE =
  /\b(?:goodbye|bye\s*bye|bye\.?\s*$|phir\s+milte|phir\s+baat\s+karenge|chalo\s+bye)\b/i;

// User-side farewell — matches what the caller is likely to say. Broader
// than the assistant regex because callers hedge ("okay thanks bye", "haan
// thik hai bye"). The word boundary keeps it from firing on "goodbyes",
// "bypass", or "byahaan".
const USER_FAREWELL_RE =
  /\b(?:bye|goodbye|bye\s*bye|thank\s*you\s+bye|thanks?\s+bye|okay\s+bye|ok\s+bye|okay\s+thanks?\s+bye|phir\s+milte|phir\s+baat\s+karenge|chalo\s+bye|alvida)\b/i;

/**
 * `ConversationItemAdded.item.content` can be a plain string OR an array of
 * content parts (each `{ type: "text", text: string }` or similar) depending
 * on the LiveKit agents SDK version and the LLM adapter in use. We flatten
 * to a single string so the assistant farewell heuristic can see the text.
 * Previously we returned "" for anything non-string, which silently
 * disabled the hangup safety net.
 */
const extractItemText = (content: unknown): string => {
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

const normalizeLanguage = (raw: string): VoiceKey => {
  const lower = (raw || "").toLowerCase().trim();
  if (lower.startsWith("hin") && lower.includes("glish")) return "hinglish";
  if (lower.startsWith("hin")) return "hindi";
  if (lower.startsWith("en")) return "english";
  if (lower.startsWith("mar")) return "marathi";
  if (lower.startsWith("tam")) return "tamil";
  if (lower.startsWith("tel")) return "telugu";
  if (lower.startsWith("ben") || lower.startsWith("bang")) return "bengali";
  if (lower.startsWith("guj")) return "gujarati";
  if (lower.startsWith("kan")) return "kannada";
  if (lower.startsWith("mal")) return "malayalam";
  if (lower.startsWith("pun") || lower.startsWith("pan")) return "punjabi";
  if (lower.startsWith("odi") || lower.startsWith("ori")) return "odia";
  return "hinglish";
};
