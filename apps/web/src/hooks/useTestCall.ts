import * as React from "react";
import { Room, RoomEvent, ConnectionState } from "livekit-client";
import { api } from "../lib/axios.js";

// Namespaced logger — grep browser console for `[test-call]` to see the full
// timeline. Every entry is prefixed with the milliseconds elapsed since the
// call was started so lag is easy to eyeball.
const callStartRef = { t0: 0 };
const t = () => (callStartRef.t0 === 0 ? 0 : Math.round(performance.now() - callStartRef.t0));
const tc = (msg: string, data?: Record<string, unknown>) => {
  if (data) console.log(`[test-call +${t()}ms] ${msg}`, data);
  else console.log(`[test-call +${t()}ms] ${msg}`);
};
const tcWarn = (msg: string, data?: Record<string, unknown>) => {
  if (data) console.warn(`[test-call +${t()}ms] ${msg}`, data);
  else console.warn(`[test-call +${t()}ms] ${msg}`);
};

export type TestCallStatus =
  | "idle"
  | "requesting-token"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

interface TestCallTokenResponse {
  wsUrl: string;
  token: string;
  roomName: string;
  identity: string;
  agentName: string;
}

interface UseTestCallResult {
  room: Room;
  status: TestCallStatus;
  durationSeconds: number;
  micMuted: boolean;
  errorMessage?: string;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMic: () => void;
}

/**
 * Thin control layer for the browser-side test call.
 *
 * Transcripts + agent audio playback are delegated to `@livekit/components-react`
 * hooks (`useVoiceAssistant`, `useTrackTranscription`) and `<RoomAudioRenderer/>`
 * rendered inside `<RoomContext.Provider>`. Those pieces handle interim/final
 * segment merging by stable `id` and audio track attach/detach — code paths
 * we previously reinvented and got wrong (stuck "typing…", audio-element
 * lifecycle bugs, per-event React re-renders).
 *
 * What this hook still owns:
 *   1. Fetching a LiveKit token from the API server.
 *   2. Creating the singleton `Room` instance and connecting it.
 *   3. Publishing the local mic; mute / unmute.
 *   4. Timers: call duration, agent-join watchdog, agent-left grace period.
 *   5. Status: reconnecting / disconnected / error state.
 */
export function useTestCall(agentId: string): UseTestCallResult {
  const [status, setStatus] = React.useState<TestCallStatus>("idle");
  const [durationSeconds, setDurationSeconds] = React.useState(0);
  const [micMuted, setMicMuted] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();

  // A single Room instance lives for the entire hook lifetime. `@livekit/
  // components-react` hooks read it via RoomContext, so this reference must
  // be stable across renders.
  const roomRef = React.useRef<Room | null>(null);
  if (roomRef.current === null) {
    roomRef.current = new Room({ adaptiveStream: true, dynacast: true });
  }
  const room = roomRef.current;

  const startedAtRef = React.useRef<number>(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const agentLeftTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentJoinWatchdogRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = React.useRef(0);
  const startCallRef = React.useRef<((opts?: { isRetry?: boolean }) => Promise<void>) | null>(null);

  const cleanup = React.useCallback(async () => {
    tc("cleanup start");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (agentLeftTimerRef.current) {
      clearTimeout(agentLeftTimerRef.current);
      agentLeftTimerRef.current = null;
    }
    if (agentJoinWatchdogRef.current) {
      clearTimeout(agentJoinWatchdogRef.current);
      agentJoinWatchdogRef.current = null;
    }
    try {
      await room.disconnect();
      tc("room.disconnect() resolved");
    } catch (err) {
      tcWarn("room.disconnect() threw", { message: (err as Error)?.message });
    }
    tc("cleanup done");
  }, [room]);

  const startCall = React.useCallback(async (opts?: { isRetry?: boolean }) => {
    if (!opts?.isRetry) retryRef.current = 0;
    callStartRef.t0 = performance.now();
    tc("startCall invoked", { agentId, isRetry: !!opts?.isRetry });
    setErrorMessage(undefined);
    setStatus("requesting-token");

    try {
      const res = await api.post<{ data: TestCallTokenResponse }>(
        `/agents/${agentId}/test-call/token`,
        {}
      );
      const creds = res.data.data;

      setStatus("connecting");

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        tc("ConnectionStateChanged", { state });
        if (state === ConnectionState.Connected) setStatus("connected");
        else if (state === ConnectionState.Reconnecting) setStatus("reconnecting");
        else if (state === ConnectionState.Disconnected) setStatus("disconnected");
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        tcWarn("RoomEvent.Disconnected", { reason: reason ?? "unknown" });
        setStatus("disconnected");
      });

      // Watchdog: the LiveKit agent worker sometimes fails to spawn a job
      // process before its init budget (heavy imports, DB warmup), and the
      // agent's own room connect can take 20s+ on slow networks (observed
      // in dev). Give it 30s to actually join our room; if nobody remote
      // shows up we tear down and surface a clear error instead of hanging.
      agentJoinWatchdogRef.current = setTimeout(() => {
        if (room.remoteParticipants.size === 0) {
          // One silent retry with a fresh room + dispatch before giving up —
          // covers transient worker restarts and lost dispatches.
          if (retryRef.current === 0) {
            retryRef.current = 1;
            tcWarn("agent didn't join within 30s — retrying with a fresh room");
            void cleanup().then(() => startCallRef.current?.({ isRetry: true }));
            return;
          }
          setErrorMessage("The agent didn't answer. Please try again in a moment.");
          setStatus("error");
          void cleanup();
        }
      }, 30000);

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        tc("ParticipantConnected", {
          participant: participant.identity,
          local: participant.isLocal,
        });
        if (participant.isLocal) return;
        if (agentJoinWatchdogRef.current) {
          clearTimeout(agentJoinWatchdogRef.current);
          agentJoinWatchdogRef.current = null;
        }
        if (agentLeftTimerRef.current) {
          clearTimeout(agentLeftTimerRef.current);
          agentLeftTimerRef.current = null;
        }
      });

      // If the agent leaves — either because the LLM invoked `end_call` and
      // the voice-server deleted the room, OR because the voice-server
      // crashed — give any buffered TTS audio 900ms to finish, then drop
      // our side of the room.
      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        tcWarn("ParticipantDisconnected", {
          participant: participant.identity,
          local: participant.isLocal,
        });
        if (participant.isLocal) return;
        if (agentLeftTimerRef.current) clearTimeout(agentLeftTimerRef.current);
        agentLeftTimerRef.current = setTimeout(() => {
          tc("agent-left timer fired → tearing down");
          setStatus("disconnected");
          void cleanup();
        }, 900);
      });

      tc("room.connect() start", { wsUrl: creds.wsUrl, roomName: creds.roomName });
      await room.connect(creds.wsUrl, creds.token, { autoSubscribe: true });
      tc("room.connect() resolved");
      await room.localParticipant.setMicrophoneEnabled(true);
      tc("mic enabled");

      if (room.remoteParticipants.size > 0 && agentJoinWatchdogRef.current) {
        clearTimeout(agentJoinWatchdogRef.current);
        agentJoinWatchdogRef.current = null;
      }

      startedAtRef.current = Date.now();
      setDurationSeconds(0);
      timerRef.current = setInterval(() => {
        setDurationSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to start test call";
      tcWarn("startCall threw", { message: msg });
      setErrorMessage(msg);
      setStatus("error");
      await cleanup();
    }
  }, [agentId, cleanup, room]);

  startCallRef.current = startCall;

  const endCall = React.useCallback(async () => {
    tc("endCall invoked (user hangup)");
    setStatus("disconnected");
    await cleanup();
  }, [cleanup]);

  const toggleMic = React.useCallback(() => {
    const next = !micMuted;
    void room.localParticipant.setMicrophoneEnabled(!next);
    setMicMuted(next);
  }, [micMuted, room]);

  // Auto-cleanup on unmount.
  React.useEffect(() => {
    return () => {
      void cleanup();
    };
  }, [cleanup]);

  return {
    room,
    status,
    durationSeconds,
    micMuted,
    errorMessage,
    startCall,
    endCall,
    toggleMic,
  };
}
