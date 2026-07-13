import * as React from "react";
import { PhoneOff, Mic, MicOff, Phone, AlertCircle, Loader2, X, Radio } from "lucide-react";
import { Modal, cn } from "@antigravity/ui";
import {
  RoomAudioRenderer,
  RoomContext,
  useLocalParticipant,
  useTrackTranscription,
  useVoiceAssistant,
  type AgentState,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useTestCall, type TestCallStatus } from "../../../hooks/useTestCall.js";

interface TestCallModalProps {
  agentId: string;
  agentName: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Root of the test-call UI.
 *
 * Everything transcript- or audio-related has to live *inside* the
 * `<RoomContext.Provider>` so `useVoiceAssistant` and `useTrackTranscription`
 * can read the Room. The outer component owns just the modal shell + the
 * `useTestCall` control layer.
 */
export function TestCallModal({ agentId, agentName, isOpen, onClose }: TestCallModalProps): React.JSX.Element {
  const call = useTestCall(agentId);

  const handleClose = React.useCallback(() => {
    void call.endCall();
    onClose();
  }, [call, onClose]);

  React.useEffect(() => {
    if (!isOpen && (call.status === "connected" || call.status === "connecting")) {
      void call.endCall();
    }
  }, [isOpen, call]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      className="h-[640px] max-h-[90vh]"
      backdropBlur={false}
      header={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-full bg-active-nav border border-primary/15 flex items-center justify-center shrink-0">
              <Radio className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-placeholder">Test Call</div>
              <div className="text-xs font-semibold text-text-primary truncate">{agentName}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-md hover:bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <RoomContext.Provider value={call.room}>
        <CallBody call={call} agentName={agentName} />
        {/* Auto-attaches every remote audio track to hidden <audio> elements.
            Replaces the manual TrackSubscribed + audioRef.attach() dance we
            used to run — with far fewer edge cases around the audio element
            lifecycle. */}
        <RoomAudioRenderer />
      </RoomContext.Provider>
    </Modal>
  );
}

interface CallLike {
  status: TestCallStatus;
  durationSeconds: number;
  micMuted: boolean;
  errorMessage?: string;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMic: () => void;
}

function CallBody({ call, agentName }: { call: CallLike; agentName: string }): React.JSX.Element {
  const voice = useVoiceAssistant();
  const agentState = voice.state ?? "disconnected";

  return (
    <>
      <StatusStrip call={call} agentState={agentState} />
      <TranscriptView call={call} agentName={agentName} />
    </>
  );
}

/**
 * Combines the agent's transcription stream (from `useVoiceAssistant`) with
 * the user's transcription stream (from `useTrackTranscription` bound to the
 * local mic track). Segments merge in `firstReceivedTime` order and dedupe
 * by their stable `id` — LiveKit re-emits the same id as text goes from
 * interim to final, so React reconciliation updates in place.
 */
function useCombinedTranscripts(): Array<{
  id: string;
  role: "user" | "agent";
  text: string;
  final: boolean;
}> {
  const { agentTranscriptions } = useVoiceAssistant();
  const { localParticipant, microphoneTrack } = useLocalParticipant();
  const micRef: TrackReferenceOrPlaceholder = React.useMemo(
    () => ({
      participant: localParticipant,
      source: Track.Source.Microphone,
      publication: microphoneTrack,
    }),
    [localParticipant, microphoneTrack]
  );
  const { segments: userTranscriptions } = useTrackTranscription(micRef);

  return React.useMemo(() => {
    // Merge both streams, drop internal prompt fragments, sort by arrival
    // time so user + agent turns interleave chronologically. Previously the
    // filter+sort result was computed but never assigned, so agent segments
    // always rendered first and user segments always appeared below them —
    // that's the "agent on top, user at bottom, not interleaved" bug.
    return [
      ...agentTranscriptions.map((v) => ({
        id: v.id,
        role: "agent" as const,
        text: v.text,
        final: v.final,
        firstReceivedTime: v.firstReceivedTime,
      })),
      ...userTranscriptions.map((v) => ({
        id: v.id,
        role: "user" as const,
        text: v.text,
        final: v.final,
        firstReceivedTime: v.firstReceivedTime,
      })),
    ]
      .filter(
        (seg) => !seg.text.includes("<instruction>") && !seg.text.includes("</instruction>")
      )
      .sort((a, b) => (a.firstReceivedTime ?? 0) - (b.firstReceivedTime ?? 0));
  }, [agentTranscriptions, userTranscriptions]);
}

function TranscriptView({ call, agentName }: { call: CallLike; agentName: string }): React.JSX.Element {
  const segments = useCombinedTranscripts();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el || !autoScroll) return;
    el.scrollTop = el.scrollHeight;
  }, [segments.length, autoScroll]);

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }, []);

  return (
    <>
      <div className="px-5 py-2.5 border-b border-border bg-background shrink-0 flex items-center justify-between">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Live Transcript</span>
        {segments.length > 0 && (
          <span className="text-[10px] font-semibold text-text-placeholder tabular-nums">
            {segments.length} {segments.length === 1 ? "message" : "messages"}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto bg-sidebar-bg"
      >
        {segments.length === 0 ? (
          <div className="h-full flex items-center justify-center px-6 text-center">
            <div className="text-xs text-text-placeholder font-medium">{emptyStateText(call.status)}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 px-5 py-4 pb-6">
            {segments.map((seg) => (
              <Bubble
                key={seg.id}
                role={seg.role}
                text={seg.text}
                isFinal={seg.final}
                agentName={agentName}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function StatusStrip({
  call,
  agentState,
}: {
  call: CallLike;
  agentState: AgentState;
}): React.JSX.Element {
  const canStart = call.status === "idle" || call.status === "disconnected" || call.status === "error";
  const showTimer = call.status === "connected" || call.status === "reconnecting" || call.status === "disconnected";

  return (
    <section className="px-4 py-3 border-b border-border bg-background shrink-0">
      <div className="flex items-center gap-3">
        <StatusIndicator status={call.status} agentState={agentState} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-text-primary tracking-tight truncate leading-tight">
            {statusLabel(call.status, agentState)}
          </div>
          <div className="text-[10px] text-text-secondary tabular-nums font-medium leading-tight mt-0.5">
            {showTimer ? formatDuration(call.durationSeconds) : "—:—"}
          </div>
        </div>
        <div className="w-[160px] flex items-center justify-end gap-2 shrink-0">
          {canStart ? (
            <button
              type="button"
              onClick={() => void call.startCall()}
              className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-primary-text font-semibold text-xs h-9 rounded-full shadow-sm w-[130px] transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              {call.status === "disconnected" || call.status === "error" ? "Call Again" : "Start"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => call.toggleMic()}
                disabled={call.status !== "connected"}
                className={cn(
                  "inline-flex items-center justify-center h-9 w-9 rounded-full border transition-colors shrink-0",
                  call.micMuted
                    ? "bg-error/10 border-error/30 text-error"
                    : "bg-background border-border text-text-primary hover:bg-surface",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label={call.micMuted ? "Unmute" : "Mute"}
              >
                {call.micMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => void call.endCall()}
                className="inline-flex items-center justify-center gap-1.5 bg-error hover:opacity-90 text-white font-semibold text-xs h-9 rounded-full shadow-sm w-[105px] transition-opacity"
              >
                <PhoneOff className="h-3.5 w-3.5" />
                End
              </button>
            </>
          )}
        </div>
      </div>

      {call.errorMessage && (
        <div className="mt-2 flex items-start gap-2 text-[11px] text-error font-medium bg-error/10 border border-error/20 rounded-md px-2.5 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="break-words">{call.errorMessage}</span>
        </div>
      )}
    </section>
  );
}

const Bubble = React.memo(function Bubble({
  role,
  text,
  isFinal,
  agentName,
}: {
  role: "user" | "agent";
  text: string;
  isFinal: boolean;
  agentName: string;
}): React.JSX.Element {
  const isAgent = role === "agent";
  const label = isAgent ? agentName : "You";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className={cn("flex gap-2", isAgent ? "justify-start" : "justify-end")}>
      {isAgent && (
        <div className="h-6 w-6 rounded-full bg-primary text-primary-text text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
          {initial}
        </div>
      )}
      <div className={cn("flex flex-col max-w-[78%]", isAgent ? "items-start" : "items-end")}>
        <div className="text-[10px] font-semibold text-text-secondary mb-0.5 px-1">
          {label}
          {!isFinal && <span className="text-primary ml-1">· typing…</span>}
        </div>
        <div
          className={cn(
            "rounded-[10px] px-3 py-2 text-[13px] leading-relaxed shadow-sm",
            isAgent
              ? "bg-background border border-border text-text-primary rounded-tl-[3px]"
              : "bg-primary text-primary-text rounded-tr-[3px]",
            !isFinal && "opacity-80"
          )}
        >
          <div className="whitespace-pre-wrap break-words">{text}</div>
        </div>
      </div>
      {!isAgent && (
        <div className="h-6 w-6 rounded-full bg-text-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
          {initial}
        </div>
      )}
    </div>
  );
});

function StatusIndicator({ status, agentState }: { status: TestCallStatus; agentState: AgentState }): React.JSX.Element {
  const p = presentation(status, agentState);
  return (
    <div className={cn("relative h-10 w-10 rounded-full flex items-center justify-center transition-colors duration-200 shrink-0", p.ring)}>
      {p.isLoading ? (
        <Loader2 className={cn("h-4 w-4 animate-spin", p.fill)} />
      ) : (
        <div className={cn("h-2.5 w-2.5 rounded-full transition-colors duration-200", p.dot)} />
      )}
    </div>
  );
}

const statusLabel = (s: TestCallStatus, a: AgentState): string => presentation(s, a).label;

interface Presentation {
  label: string;
  ring: string;
  fill: string;
  dot: string;
  isLoading: boolean;
}

const presentation = (status: TestCallStatus, agentState: AgentState): Presentation => {
  if (status === "requesting-token" || status === "connecting") {
    return { label: "Preparing…", ring: "bg-warning/10 border border-warning/20", fill: "text-warning", dot: "", isLoading: true };
  }
  if (status === "reconnecting") {
    return { label: "Reconnecting…", ring: "bg-warning/10 border border-warning/20", fill: "text-warning", dot: "", isLoading: true };
  }
  if (status === "error") {
    return { label: "Couldn't Connect", ring: "bg-error/10 border border-error/20", fill: "text-error", dot: "bg-error", isLoading: false };
  }
  if (status === "disconnected") {
    return { label: "Call Ended", ring: "bg-surface border border-border", fill: "text-text-secondary", dot: "bg-text-placeholder", isLoading: false };
  }
  if (status === "idle") {
    return { label: "Ready", ring: "bg-surface border border-border", fill: "text-text-secondary", dot: "bg-text-secondary", isLoading: false };
  }
  if (agentState === "speaking") {
    return { label: "Agent Speaking", ring: "bg-primary/10 border border-primary/30", fill: "text-primary", dot: "bg-primary", isLoading: false };
  }
  if (agentState === "thinking") {
    return { label: "Thinking…", ring: "bg-primary/10 border border-primary/30", fill: "text-primary", dot: "bg-primary", isLoading: false };
  }
  if (agentState === "listening") {
    return { label: "Listening", ring: "bg-success/10 border border-success/30", fill: "text-success", dot: "bg-success", isLoading: false };
  }
  return { label: "Getting ready…", ring: "bg-warning/10 border border-warning/20", fill: "text-warning", dot: "", isLoading: true };
};

const emptyStateText = (status: TestCallStatus): string => {
  switch (status) {
    case "idle": return "Click Start to begin the test call.";
    case "requesting-token":
    case "connecting": return "Preparing the call…";
    case "reconnecting": return "Reconnecting…";
    case "connected": return "Agent is coming online…";
    case "disconnected": return "This call has ended.";
    case "error": return "Something went wrong. Please try again.";
  }
};

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};
