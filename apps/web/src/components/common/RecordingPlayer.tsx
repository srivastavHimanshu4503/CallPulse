import * as React from "react";
import { Play, Pause, Loader2, Download, RotateCcw } from "lucide-react";
import { api } from "../../lib/axios.js";

const fmt = (sec: number): string => {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const SPEEDS = [1, 1.25, 1.5, 2];
const BAR_COUNT = 48;

/** Deterministic pseudo-waveform — same call always draws the same shape. */
const useWaveform = (seed: string): number[] =>
  React.useMemo(() => {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      const base = 0.2 + ((h % 1000) / 1000) * 0.8;
      const edge = Math.min(1, (Math.min(i, BAR_COUNT - 1 - i) + 2) / 6);
      return Math.max(0.12, base * edge);
    });
  }, [seed]);

interface RecordingPlayerProps {
  logId: string;
  /** Call duration from the log — total time shows before any audio loads. */
  fallbackDuration?: number | null;
}

/**
 * Call-recording player with a FIXED layout — the card never changes size,
 * whatever the state. Clicking play fetches a short-lived signed URL and
 * the button keeps spinning until sound actually starts (not just until
 * the URL arrives). Waveform supports click + drag scrubbing.
 */
export function RecordingPlayer({
  logId,
  fallbackDuration,
}: RecordingPlayerProps): React.JSX.Element {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const draggingRef = React.useRef(false);
  const [url, setUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);
  // busy = anything between "user clicked play" and "sound is coming out".
  const [busy, setBusy] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [current, setCurrent] = React.useState(0);
  const [mediaDuration, setMediaDuration] = React.useState(0);
  const [speedIdx, setSpeedIdx] = React.useState(0);
  const bars = useWaveform(logId);

  const ready = Boolean(url);
  const duration =
    Number.isFinite(mediaDuration) && mediaDuration > 0
      ? mediaDuration
      : fallbackDuration && fallbackDuration > 0
        ? fallbackDuration
        : 0;
  const progress = ready && duration ? Math.min(1, current / duration) : 0;

  const handlePlayClick = async () => {
    setError(false);
    if (!url) {
      setBusy(true); // spins until onPlaying fires
      try {
        const res = await api.get(`/recordings/${logId}/url`);
        const base = (api.defaults.baseURL || "").replace(/\/api\/v1\/?$/, "");
        setUrl(`${base}${res.data.data.url}`); // <audio autoPlay> takes over
      } catch {
        setBusy(false);
        setError(true);
      }
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      setBusy(true);
      void a.play().catch(() => setBusy(false));
    } else {
      a.pause();
    }
  };

  const seekTo = (clientX: number) => {
    const a = audioRef.current;
    const track = trackRef.current;
    if (!a || !track || !ready || !duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(a.currentTime);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]!;
  };

  return (
    <div className="flex items-center gap-3 w-full rounded-xl border border-line-default bg-bg-raised shadow-card px-3 py-1.5">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          autoPlay
          preload="auto"
          onPlaying={() => {
            setBusy(false);
            setPlaying(true);
          }}
          onWaiting={() => setBusy(true)}
          onPause={() => {
            setBusy(false);
            setPlaying(false);
          }}
          onEnded={() => {
            setBusy(false);
            setPlaying(false);
          }}
          onError={() => {
            setBusy(false);
            setPlaying(false);
            setError(true);
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            if (Number.isFinite(e.currentTarget.duration))
              setMediaDuration(e.currentTarget.duration);
          }}
          onDurationChange={(e) => {
            if (Number.isFinite(e.currentTarget.duration))
              setMediaDuration(e.currentTarget.duration);
          }}
        />
      )}

      {/* Play / pause — same size in every state */}
      <button
        type="button"
        onClick={() => void handlePlayClick()}
        disabled={busy && !playing}
        className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-[0_2px_10px_-2px_rgba(37,99,235,0.55)] active:scale-95 transition-all disabled:opacity-80"
        aria-label={playing ? "Pause" : "Play recording"}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" fill="currentColor" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform — identical dimensions in every state */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {error ? (
          <div className="flex-1 h-6 flex items-center gap-2 text-[11px] font-medium text-fg-muted">
            Recording unavailable
            <button
              type="button"
              onClick={() => void handlePlayClick()}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
            >
              <RotateCcw className="h-3 w-3" /> Retry
            </button>
          </div>
        ) : (
          <div
            ref={trackRef}
            onPointerDown={(e) => {
              if (!ready) return;
              draggingRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              seekTo(e.clientX);
            }}
            onPointerMove={(e) => {
              if (draggingRef.current) seekTo(e.clientX);
            }}
            onPointerUp={(e) => {
              draggingRef.current = false;
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            className={`flex-1 min-w-0 flex items-center gap-[2px] h-6 select-none touch-none ${
              ready ? "cursor-pointer" : "cursor-default opacity-60"
            }`}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(current)}
            aria-label="Seek"
          >
            {bars.map((b, i) => {
              const filled = (i + 0.5) / BAR_COUNT <= progress;
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-full transition-colors duration-75 ${
                    filled ? "bg-gradient-to-t from-blue-600 to-indigo-500" : "bg-line-strong/60"
                  }`}
                  style={{ height: `${Math.round(b * 100)}%` }}
                />
              );
            })}
          </div>
        )}

        <span className="shrink-0 text-[10.5px] font-bold text-fg-primary tabular-nums">
          {fmt(ready ? current : 0)}
          <span className="text-fg-muted font-semibold"> / {fmt(duration)}</span>
        </span>
        <div className="shrink-0 flex items-center gap-0.5">
          <button
            type="button"
            onClick={cycleSpeed}
            disabled={!ready}
            className={`h-5 min-w-[36px] px-1.5 rounded-full text-[10px] font-bold tabular-nums transition-colors disabled:opacity-40 ${
              speedIdx > 0
                ? "bg-blue-50 text-blue-600 border border-blue-500/25"
                : "text-fg-secondary hover:text-blue-600 hover:bg-blue-50"
            }`}
            title="Playback speed"
          >
            {SPEEDS[speedIdx]}×
          </button>
          <a
            href={url ?? undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!ready}
            onClick={(e) => {
              if (!ready) e.preventDefault();
            }}
            className={`h-5 w-5 rounded-full flex items-center justify-center transition-colors ${
              ready
                ? "text-fg-muted hover:text-blue-600 hover:bg-blue-50"
                : "text-fg-muted/40 cursor-default"
            }`}
            title="Download recording"
          >
            <Download className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
