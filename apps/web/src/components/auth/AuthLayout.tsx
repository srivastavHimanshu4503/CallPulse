import * as React from "react";
import { Logo } from "../common/Logo.js";

interface AuthLayoutProps {
  children: React.ReactNode;
}

// Backend voice-sample endpoint (Sarvam bulbul:v3 male voice, cached server-side).
// Matches /api/v1/auth/voice-sample?lang=hi|en on the API server.
const API_BASE = `${(import.meta as any).env?.VITE_API_URL || "http://localhost:3000"}/api/v1`;

const GREETINGS: Record<
  "hi" | "en",
  { label: string; native: string; text: string; lang: string }
> = {
  hi: {
    label: "हिन्दी",
    native: "Hindi",
    text: "नमस्ते! राजेश डिस्ट्रीब्यूटर्स में आपका स्वागत है। मैं आपकी क्या सहायता कर सकता हूं?",
    lang: "hi-IN",
  },
  en: {
    label: "English",
    native: "English",
    text: "Hello! Welcome to Rajesh Distributors. How may I help you today?",
    lang: "en-IN",
  },
};

const LANGUAGES = [
  "हिन्दी",
  "English",
  "தமிழ்",
  "తెలుగు",
  "বাংলা",
  "मराठी",
  "ગુજરાતી",
  "ಕನ್ನಡ",
  "മലയാളം",
  "ਪੰਜਾਬੀ",
];

const STATS = [
  { value: "500+", label: "Businesses" },
  { value: "10+", label: "Languages" },
  { value: "24/7", label: "Uptime" },
  { value: "1M+", label: "Calls handled" },
];

const BUSINESS_TYPES = [
  {
    label: "Salons",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
        <circle cx="6" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="6" cy="17" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M20 5L8.5 15.5M20 19L8.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Clinics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
        <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    label: "Real Estate",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
        <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Restaurants",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
        <path d="M5 3v18M5 3c1.5 0 3 1 3 3v4c0 1-1 2-3 2M19 3v18M19 3c-1 3-2 5-2 7 0 2 1 3 2 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Repair",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
        <path d="M14 6a4 4 0 015 5l-9 9-5-5 9-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M13 8l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Coaching",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
        <path d="M4 6l8-3 8 3-8 3-8-3zM6 8v6c0 1.5 3 3 6 3s6-1.5 6-3V8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const TESTIMONIAL = {
  quote:
    "DeskBuddy answers every call in Marathi and Hindi. My salon never misses a booking now — even at 11 PM.",
  author: "Priya Deshmukh",
  role: "Owner, Glow Studio · Pune",
  initials: "PD",
};

// Compact animated visualizer, only while playing
function LiveVisualizer(): React.JSX.Element {
  const bars = React.useMemo(
    () => Array.from({ length: 36 }, (_, i) => 8 + Math.abs(Math.sin(i * 0.6)) * 22 + (i % 3) * 3),
    []
  );
  return (
    <div className="relative rounded-lg border border-white/10 bg-black/45 px-2.5 py-2 overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(37,99,235,0.4) 0%, transparent 75%)",
          animation: "authBreathe 2s ease-in-out infinite",
        }}
      />
      <div className="relative flex items-center justify-between gap-[2.5px] h-7">
        {bars.map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-full bg-brand-400"
            style={{
              height: `${h}px`,
              minWidth: "2.5px",
              animation: `authWave ${0.45 + (i % 5) * 0.08}s ease-in-out ${i * 0.03}s infinite alternate`,
            }}
          />
        ))}
      </div>
      <div className="relative mt-1.5 flex items-center justify-between text-[9.5px] font-semibold uppercase tracking-wider text-brand-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
          </span>
          Live · AI speaking
        </span>
      </div>
    </div>
  );
}

export function AuthLayout({ children }: AuthLayoutProps): React.JSX.Element {
  const [lang, setLang] = React.useState<"hi" | "en">("hi");
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = React.useState(false);
  const [audioError, setAudioError] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const audioCache = React.useRef<Record<"hi" | "en", string | null>>({ hi: null, en: null });

  const stopAudio = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  React.useEffect(() => () => stopAudio(), [stopAudio]);

  // Stop playback when the user switches language
  React.useEffect(() => {
    stopAudio();
  }, [lang, stopAudio]);

  const playGreeting = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
    setAudioError(false);

    try {
      // Serve from client cache when possible (Sarvam is also cached on the
      // server, but skipping the network hop makes replays feel instant).
      let objectUrl = audioCache.current[lang];
      if (!objectUrl) {
        setIsLoadingAudio(true);
        const res = await fetch(`${API_BASE}/auth/voice-sample?lang=${lang}`);
        if (!res.ok) throw new Error("voice-sample failed");
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        audioCache.current[lang] = objectUrl;
        setIsLoadingAudio(false);
      }

      const audio = new Audio(objectUrl);
      audio.playbackRate = 1.05;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        setAudioError(true);
      };
      await audio.play();
      audioRef.current = audio;
      setIsPlaying(true);
    } catch {
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setAudioError(true);
    }
  };

  const g = GREETINGS[lang];

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden w-full flex bg-white font-sans antialiased text-[#111111]">
      <style>{`
        @keyframes authWave {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
        @keyframes authFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes authOrb {
          0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: 0.55; }
          50% { transform: translate3d(20px,-30px,0) scale(1.08); opacity: 0.85; }
        }
        @keyframes authMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes authTwinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.6; }
        }
        @keyframes authRing {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes authBreathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.08); }
        }
        @keyframes authShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .auth-hide-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .auth-hide-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
      `}</style>

      {/* ============ LEFT: BRAND / STORY PANEL ============ */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden">
        {/* Clean minimal dark background (Linear style) */}
        <div className="absolute inset-0 bg-[#0A0A0A]" />
        
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse at center, black 50%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 80%)",
          }}
        />
        
        {/* Subtle brand glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-brand-500/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Content — full-width, scrollable if viewport short, hidden scrollbar */}
        <div className="relative z-10 w-full h-full overflow-y-auto auth-hide-scroll">
          <div className="min-h-full flex flex-col justify-center px-8 xl:px-10 py-8 w-full">
            {/* Two-column: text left, voice preview right (aligned bottom) */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 xl:gap-8 items-end w-full">
              {/* LEFT COLUMN — text content, uses full available width */}
              <div className="space-y-5 w-full">
                {/* Made-in-Bharat badge with tricolor accent */}
                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/40 backdrop-blur px-3.5 py-1.5">
                  <span className="inline-flex items-center gap-[3px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
                  </span>
                  <span className="text-[10.5px] font-bold text-white uppercase tracking-[0.14em]">
                    Made in Bharat · AI Receptionist
                  </span>
                </div>

                {/* Headline — Clean and sharp */}
                <div className="space-y-3">
                  <h1 className="text-[32px] xl:text-[38px] leading-[1.1] font-bold tracking-tight text-white">
                    Answer every call —{" "}
                    <span className="text-brand-400">
                      in every Indian language.
                    </span>
                  </h1>
                  <p
                    className="text-[13.5px] xl:text-[14.5px] leading-[1.6] text-white/85"
                    style={{ textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}
                  >
                    Always-on receptionist that greets customers in Hindi, Tamil, Bengali, Marathi and 10+ regional languages — books appointments, answers queries, captures leads.
                  </p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2.5">
                  {STATS.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-white/15 bg-black/35 backdrop-blur px-3 py-2.5"
                    >
                      <div className="text-[20px] font-bold leading-none text-white">
                        {s.value}
                      </div>
                      <div className="mt-1.5 text-[10px] text-white/70 font-semibold uppercase tracking-wider">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Business types row */}
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/55 mb-2.5">
                    Trusted across
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_TYPES.map((b) => (
                      <div
                        key={b.label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur px-2.5 py-1 transition-colors hover:bg-white/[0.06]"
                      >
                        <span className="text-brand-400">{b.icon}</span>
                        <span className="text-[11px] font-semibold text-white/90">{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Testimonial */}
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                  <div className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-white bg-brand-500 text-[11.5px] font-bold ring-2 ring-white/10">
                    {TESTIMONIAL.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-white/95 leading-relaxed italic">
                      "{TESTIMONIAL.quote}"
                    </p>
                    <p className="mt-1 text-[11px] text-white/60 font-medium">
                      — {TESTIMONIAL.author} · {TESTIMONIAL.role}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN — Voice preview card */}
              <div className="relative rounded-xl border border-white/10 bg-white/[0.03] p-1 shadow-2xl backdrop-blur-xl">
                <div className="relative rounded-xl bg-[#0A0A0A]/90 p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {isPlaying && (
                        <>
                          <span
                            className="absolute inset-0 rounded-full bg-brand-500/40"
                            style={{ animation: "authRing 1.8s ease-out infinite" }}
                          />
                          <span
                            className="absolute inset-0 rounded-full bg-brand-500/20"
                            style={{ animation: "authRing 1.8s ease-out 0.6s infinite" }}
                          />
                        </>
                      )}
                      <div className="relative h-9 w-9 rounded-full flex items-center justify-center text-white bg-brand-600 font-bold text-[11px] shadow-lg ring-2 ring-white/10">
                        IA
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0416]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-[12.5px] font-semibold leading-tight">Voice preview</div>
                      <div className="text-white/65 text-[10.5px]">
                        {isPlaying ? "Speaking now…" : `${g.native} · Sarvam bulbul v3`}
                      </div>
                    </div>
                  </div>

                  {/* Language toggle */}
                  <div className="inline-flex items-center gap-1 rounded-lg bg-black/40 border border-white/15 p-1">
                    {(Object.keys(GREETINGS) as Array<"hi" | "en">).map((code) => {
                      const item = GREETINGS[code];
                      const active = lang === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setLang(code)}
                          className={`px-3 py-1 rounded-md text-[11.5px] font-semibold transition-all ${
                            active
                              ? "bg-white text-[#0a0416] shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
                              : "text-white/70 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Greeting text */}
                  <div className="rounded-lg bg-black/55 border border-white/10 px-3 py-2.5 min-h-[76px]">
                    <p
                      className="text-[12.5px] text-white leading-relaxed"
                      lang={g.lang}
                      style={{ fontFeatureSettings: "'liga'" }}
                    >
                      "{g.text}"
                    </p>
                  </div>

                  {/* Visualizer while playing */}
                  {isPlaying && <LiveVisualizer />}

                  {/* Play button */}
                  <button
                    type="button"
                    onClick={playGreeting}
                    disabled={isLoadingAudio}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold transition-all text-white hover:bg-brand-600 disabled:opacity-70 bg-brand-500 shadow-sm"
                  >
                    {isLoadingAudio ? (
                      <>
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Loading voice…
                      </>
                    ) : isPlaying ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                        Stop preview
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M8 5v14l11-7L8 5z" />
                        </svg>
                        Hear it live
                      </>
                    )}
                  </button>

                  {audioError && (
                    <p className="text-[10.5px] text-rose-200 text-center">
                      Couldn't load voice preview. Please try again.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Language marquee — full width, below both columns */}
            <div className="mt-7 w-full">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/55 mb-3">
                Speaks natively in
              </div>
            <div className="relative overflow-hidden">
              <div
                className="flex gap-2 whitespace-nowrap w-max"
                style={{ animation: "authMarquee 30s linear infinite" }}
              >
                {[...LANGUAGES, ...LANGUAGES].map((item, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-white/20 bg-black/35 backdrop-blur px-3 py-1.5 text-[12px] text-white font-medium"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050214] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050214] to-transparent" />
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* ============ RIGHT: FORM PANEL — clean light theme ============ */}
      <div className="relative flex-1 lg:w-1/2 flex flex-col min-h-screen lg:h-screen lg:overflow-y-auto auth-hide-scroll bg-white">
        {/* Top-right logo */}
        <div className="flex items-center justify-end px-6 sm:px-10 pt-5 shrink-0">
          <Logo height={26} />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-12 py-4">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        <div className="px-6 sm:px-10 pb-5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#999999]">
          <div>© {new Date().getFullYear()} DeskBuddy · Made in India</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[#111111] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#111111] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#111111] transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
