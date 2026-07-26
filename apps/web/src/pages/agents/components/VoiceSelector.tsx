import * as React from "react";
import { Search, Check, Play, Pause, Loader2, AudioLines, Star, Plus, X } from "lucide-react";
import { api } from "../../../lib/axios.js";
import type { AgentVoiceSettings } from "@antigravity/types";

// Every language the agent can speak. The voice grid is strictly filtered by
// this selection — a voice that isn't tuned for the chosen language is never
// shown, so users can't pick a combination that sounds broken on calls.
export const AGENT_LANGUAGES = [
  "English",
  "Hindi",
  "Hinglish",
  "Marathi",
  "Tamil",
  "Telugu",
  "Bengali",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
];

// Our voice catalog. Language lists follow the per-language quality
// recommendations of the underlying speech engine — a voice only appears
// for languages it genuinely sounds native in. (Provider is deliberately
// NOT shown in the UI — these are presented as our own voices.)
const VOICE_LIBRARY = [
  { id: "sarvam:priya", name: "Priya", gender: "Female", accent: "Hindi · North Indian", description: "Warm, polite receptionist tone. Perfect for inbound business calls.", languages: ["Hindi", "Hinglish", "Telugu", "Marathi", "Gujarati"] },
  { id: "sarvam:shubh", name: "Shubh", gender: "Male", accent: "Hindi · North Indian", description: "Clear, friendly voice. Great all-rounder for Hindi callers.", languages: ["Hindi", "Hinglish", "Telugu", "Kannada", "Odia", "Malayalam"] },
  { id: "sarvam:ratan", name: "Ratan", gender: "Male", accent: "Indian English", description: "Polished, confident voice. Our top male pick for English.", languages: ["English", "Telugu", "Kannada", "Tamil", "Marathi", "Gujarati"] },
  { id: "sarvam:ishita", name: "Ishita", gender: "Female", accent: "Indian English", description: "Bright, professional voice. Our top female pick for English and Tamil.", languages: ["English", "Kannada", "Tamil"] },
  { id: "sarvam:suhani", name: "Suhani", gender: "Female", accent: "Hindi · Bengali", description: "Soft, friendly voice for Hindi, Bengali, and Punjabi callers.", languages: ["Hindi", "Hinglish", "Bengali", "Punjabi"] },
  { id: "sarvam:ashutosh", name: "Ashutosh", gender: "Male", accent: "Hindi", description: "Steady, trustworthy voice. Great for confirmations and updates.", languages: ["Hindi", "Hinglish"] },
  { id: "sarvam:neha", name: "Neha", gender: "Female", accent: "Telugu · Kannada", description: "Clear, welcoming voice for Telugu and Kannada callers.", languages: ["Telugu", "Kannada"] },
  { id: "sarvam:pooja", name: "Pooja", gender: "Female", accent: "Malayalam · Odia", description: "Warm, patient voice for Malayalam and Odia callers.", languages: ["Malayalam", "Odia"] },
  { id: "sarvam:roopa", name: "Roopa", gender: "Female", accent: "Bengali · Punjabi", description: "Gentle, expressive voice for Bengali and Punjabi callers.", languages: ["Bengali", "Punjabi"] },
  { id: "sarvam:mani", name: "Mani", gender: "Male", accent: "Punjabi", description: "Energetic, hearty voice. Our top pick for Punjabi.", languages: ["Punjabi"] },
  { id: "sarvam:rohan", name: "Rohan", gender: "Male", accent: "Tamil", description: "Crisp, conversational voice for Tamil callers.", languages: ["Tamil"] },
  { id: "sarvam:rehan", name: "Rehan", gender: "Male", accent: "Bengali", description: "Smooth, calm voice for Bengali callers.", languages: ["Bengali"] },
  { id: "sarvam:ritu", name: "Aditi", gender: "Female", accent: "Hindi · North Indian", description: "Soft, formal voice. Best for service bookings.", languages: ["Hindi", "Hinglish", "Tamil", "Marathi", "Gujarati", "Odia"] },
  { id: "sarvam:kabir", name: "Kabir", gender: "Male", accent: "Hinglish", description: "Energetic, conversational tone. Ideal for sales conversations.", languages: ["Hindi", "Hinglish"] },
  { id: "sarvam:kavitha", name: "Deepika", gender: "Female", accent: "English · Tamil", description: "Helpful, clear voice. Perfect for customer support.", languages: ["English", "Tamil"] },
  { id: "sarvam:soham", name: "Aravind", gender: "Male", accent: "Indian English", description: "Professional, authoritative tone. Best for B2B follow-ups.", languages: ["English"] },
  { id: "sarvam:anand", name: "Anand", gender: "Male", accent: "Indian English", description: "Calm, clear corporate voice for business inquiries.", languages: ["English"] },

  // ─── ElevenLabs voices — temporarily disabled. We currently offer only
  // our native Indian voices; re-enable this block (and the ElevenLabs
  // branches in the api/voice-server) when we bring premium voices back.
  // { id: "elevenlabs:EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "Female", accent: "Hindi + English", description: "Mature, reassuring, and confident voice.", languages: ["English", "Hindi", "Hinglish", "Tamil"] },
  // { id: "elevenlabs:XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "Female", accent: "Hindi + English", description: "Knowledgeable, professional, and upbeat.", languages: ["English", "Hindi", "Hinglish", "Tamil"] },
  // { id: "elevenlabs:cgSgspJ2msm6clMCkdW9", name: "Jessica", gender: "Female", accent: "Hindi + English", description: "Playful, bright, and warm voice.", languages: ["English", "Hindi", "Hinglish", "Tamil"] },
  // { id: "elevenlabs:hpp4J3VqNfWAUOO0d1Us", name: "Bella", gender: "Female", accent: "Hindi + English", description: "Professional, bright, and welcoming.", languages: ["English", "Hindi", "Hinglish", "Tamil"] },
  // { id: "elevenlabs:Xb7hH8MSUJpSbSDYk0k2", name: "Alice", gender: "Female", accent: "Hindi + English", description: "Clear and engaging, great for support.", languages: ["English", "Hindi", "Hinglish", "Tamil"] },
  // { id: "elevenlabs:nPczCjzI2devNBz1zQrb", name: "Brian", gender: "Male", accent: "Hindi + English", description: "Deep, resonant, and comforting voice.", languages: ["English", "Hindi", "Hinglish", "Tamil"] },
  // { id: "elevenlabs:cjVigY5qzO86Huf0OWal", name: "Eric", gender: "Male", accent: "Hindi + English", description: "Smooth and trustworthy tone.", languages: ["English", "Hindi", "Hinglish", "Tamil"] },
  // { id: "elevenlabs:JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "Male", accent: "Hindi + English", description: "Warm, captivating storyteller voice.", languages: ["English", "Hindi", "Hinglish", "Tamil"] },
  // { id: "elevenlabs:onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "Male", accent: "Hindi + English", description: "Steady, broadcast-style delivery.", languages: ["English", "Hindi", "Hinglish", "Tamil"] },
  // { id: "elevenlabs:iP95p4xoKVk53GoZ742B", name: "Chris", gender: "Male", accent: "Hindi + English", description: "Charming, casual, down-to-earth voice.", languages: ["English", "Hindi", "Hinglish", "Tamil"] },
];

// Per-language recommended voices. Order matters — the first entry is the
// auto-pick when the user switches to a language the current voice can't
// speak. For Hindi/Hinglish (our biggest audience) the male voice is picked
// first because owners consistently prefer the male receptionist tone for
// business calls; the female voice stays one tap away in the grid.
const RECOMMENDED_BY_LANGUAGE: Record<string, string[]> = {
  English: ["sarvam:ishita", "sarvam:ratan"],
  Hindi: ["sarvam:shubh", "sarvam:priya"],
  Hinglish: ["sarvam:shubh", "sarvam:priya"],
  Marathi: ["sarvam:priya", "sarvam:ratan"],
  Tamil: ["sarvam:ishita", "sarvam:ratan"],
  Telugu: ["sarvam:shubh", "sarvam:priya"],
  Bengali: ["sarvam:rehan", "sarvam:roopa"],
  Gujarati: ["sarvam:priya", "sarvam:ratan"],
  Kannada: ["sarvam:shubh", "sarvam:neha"],
  Malayalam: ["sarvam:shubh", "sarvam:pooja"],
  Punjabi: ["sarvam:mani", "sarvam:roopa"],
  Odia: ["sarvam:shubh", "sarvam:ritu"],
};

const recommendedFor = (language: string): string[] =>
  RECOMMENDED_BY_LANGUAGE[language] ?? RECOMMENDED_BY_LANGUAGE.Hinglish!;

const DEFAULT_VOICE = "sarvam:shubh";

const normalizeVoiceId = (id: string): string => {
  if (!id) return DEFAULT_VOICE;
  const lower = id.toLowerCase();
  if (lower.startsWith("sarvam:")) return id;

  if (lower === "priya (indian female)" || lower === "priya") return "sarvam:priya";
  if (lower === "aravind" || lower === "soham") return "sarvam:soham";
  if (lower === "aditi" || lower === "ritu") return "sarvam:ritu";
  if (lower === "kabir") return "sarvam:kabir";
  if (lower === "deepika" || lower === "kavitha") return "sarvam:kavitha";

  // Legacy OpenAI voice ids — OpenAI TTS was removed; the backend maps these
  // to the default voice, and the auto-pick effect below migrates the agent.
  const openaiVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "ash", "ballad", "coral", "sage", "verse", "marin", "cedar"];
  if (openaiVoices.includes(lower) || lower.startsWith("openai:")) return DEFAULT_VOICE;

  if (lower.startsWith("elevenlabs:")) return id;

  return `sarvam:${id}`;
};

/** Provider prefix of a (possibly legacy) voice id — drives the tuning panel. */
export const getVoiceProvider = (voice: string): "sarvam" | "elevenlabs" => {
  const normalized = normalizeVoiceId(voice);
  if (normalized.startsWith("elevenlabs:")) return "elevenlabs";
  return "sarvam";
};

type GenderFilter = "All" | "Male" | "Female";

interface VoiceSelectorProps {
  voice: string;
  setVoice: (val: string) => void;
  language: string;
  setLanguage: (val: string) => void;
  voiceSettings?: AgentVoiceSettings | null;
  disabled?: boolean;
}

export function VoiceSelector({ voice, setVoice, language, setLanguage, voiceSettings, disabled }: VoiceSelectorProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedGender, setSelectedGender] = React.useState<GenderFilter>("All");

  const [playingVoiceId, setPlayingVoiceId] = React.useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const activeVoiceId = normalizeVoiceId(voice);
  const activeVoice = VOICE_LIBRARY.find((v) => v.id === activeVoiceId);

  const languageVoices = React.useMemo(
    () => VOICE_LIBRARY.filter((v) => v.languages.includes(language)),
    [language]
  );
  const recommended = recommendedFor(language);

  // Self-healing selection: whenever the chosen voice can't speak the chosen
  // language (language switched, or a legacy/retired voice on an old agent),
  // silently move to the recommended voice for that language. The "Selected"
  // chip makes the change visible; the user never ends up with a broken pair.
  React.useEffect(() => {
    if (disabled) return;
    const current = VOICE_LIBRARY.find((v) => v.id === activeVoiceId);
    if (!current || !current.languages.includes(language)) {
      const fallback = recommended.find((id) => VOICE_LIBRARY.some((v) => v.id === id));
      if (fallback && fallback !== activeVoiceId) setVoice(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, activeVoiceId]);

  const handlePlayPreview = async (e: React.MouseEvent, voiceItem: (typeof VOICE_LIBRARY)[0]) => {
    e.stopPropagation();

    if (playingVoiceId === voiceItem.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingVoiceId(null);
      return;
    }

    setLoadingVoiceId(voiceItem.id);
    try {
      const parts = voiceItem.id.split(":");
      const provider = parts[0];
      const voiceId = parts[1];

      const res = await api.post(
        "/agents/test-voice",
        { provider, voice: voiceId, language, voiceSettings: voiceSettings ?? undefined },
        { responseType: "blob" }
      );

      const blob = new Blob([res.data], { type: provider === "sarvam" ? "audio/wav" : "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      if (audioRef.current) audioRef.current.pause();

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => setPlayingVoiceId(null);

      setPlayingVoiceId(voiceItem.id);
      await audio.play();
    } catch (err) {
      console.error("Failed to play voice preview", err);
    } finally {
      setLoadingVoiceId(null);
    }
  };

  React.useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const rank = (id: string): number => {
    const i = recommended.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const filteredVoices = languageVoices
    .filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.accent.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGender = selectedGender === "All" || v.gender === selectedGender;
      return matchesSearch && matchesGender;
    })
    .sort((a, b) => rank(a.id) - rank(b.id));

  return (
    <section className="bg-bg-raised border border-border rounded-[8px] p-5 sm:p-6 space-y-5 font-sans">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Language & voice</h3>
          <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
            Pick the language your agent speaks with callers — we'll show only the voices that sound natural in it.
          </p>
        </div>
        {activeVoice && (
          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-500/15 rounded-full pl-2 pr-3 py-1 self-start">
            <span className="h-5 w-5 rounded-full bg-white flex items-center justify-center">
              <AudioLines className="h-3 w-3 text-brand-600" />
            </span>
            <span className="text-[11px] font-semibold text-brand-600">
              Selected: {activeVoice.name}
            </span>
          </div>
        )}
      </header>

      {/* Language selector — same setting as the General tab, editable here
          because it decides which voices make sense. */}
      <div>
        <label className="block text-[12px] font-semibold text-text-primary mb-2">
          Agent language
        </label>
        <div className="flex flex-wrap gap-1.5">
          {AGENT_LANGUAGES.map((l) => {
            const active = language === l;
            return (
              <button
                key={l}
                type="button"
                disabled={disabled}
                onClick={() => setLanguage(l)}
                className={`px-3 h-8 text-xs font-semibold rounded-full border transition-all ${
                  active
                    ? "bg-primary border-brand-500 text-white"
                    : "bg-bg-raised border-border text-text-secondary hover:border-brand-500/40 hover:text-text-primary"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & gender */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
          <input
            type="text"
            placeholder="Search voices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] h-10 pl-9 pr-3 w-full focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-surface rounded-[6px] border border-border self-start">
          {(["All", "Male", "Female"] as GenderFilter[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGender(g)}
              disabled={disabled}
              className={`px-3 h-8 text-xs font-semibold rounded-[4px] transition-all ${
                selectedGender === g
                  ? "bg-bg-raised text-brand-600 shadow-sm ring-1 ring-brand-500/15"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Voice grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-text-placeholder uppercase tracking-wider">
            {filteredVoices.length} {filteredVoices.length === 1 ? "voice" : "voices"} for {language}
          </span>
        </div>
        {filteredVoices.length === 0 ? (
          <div className="py-10 text-center text-xs text-text-secondary bg-bg-subtle border border-dashed border-border rounded-[8px] font-medium">
            No voices match those filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1 -mr-1">
            {filteredVoices.map((v) => {
              const isSelected = v.id === activeVoiceId;
              const isPlaying = playingVoiceId === v.id;
              const isLoading = loadingVoiceId === v.id;
              const isRecommended = recommended.includes(v.id);

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => !disabled && setVoice(v.id)}
                  disabled={disabled}
                  className={`text-left p-3.5 rounded-[8px] border transition-all relative ${
                    isSelected
                      ? "bg-brand-50/50 border-brand-500 ring-1 ring-brand-500/20"
                      : "bg-bg-raised border-border hover:border-brand-500/40 hover:shadow-[0_2px_8px_rgba(37,99,235,0.04)]"
                  }`}
                >
                  {isSelected ? (
                    <span className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="h-3 w-3" strokeWidth={3.5} />
                    </span>
                  ) : isRecommended ? (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-0.5 text-[8px] font-semibold text-brand-600 bg-brand-50 border border-brand-500/15 rounded-full px-1.5 py-[2px] leading-none">
                      <Star className="h-2 w-2 fill-current shrink-0" />
                      Recommended
                    </span>
                  ) : null}

                  <div className="flex items-start gap-3">
                    <PlayButton
                      onClick={(e) => handlePlayPreview(e, v)}
                      isPlaying={isPlaying}
                      isLoading={isLoading}
                      disabled={disabled}
                    />

                    <div className="min-w-0 flex-1 pr-6">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-text-primary">{v.name}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            v.gender === "Female"
                              ? "bg-rose-50 text-rose-600 border border-rose-600/10"
                              : "bg-brand-50 text-brand-600 border border-brand-500/10"
                          }`}
                        >
                          {v.gender}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-secondary mt-1 font-medium leading-tight">
                        {v.accent}
                      </div>
                      <div className="text-[11px] text-text-placeholder mt-1.5 font-normal leading-relaxed line-clamp-2">
                        {v.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

interface VoiceSpeedControlProps {
  /** null = default speed */
  value: number | null;
  onChange: (val: number | null) => void;
  disabled?: boolean;
}

export function VoiceSpeedControl({ value, onChange, disabled }: VoiceSpeedControlProps): React.JSX.Element {
  const effective = value ?? 1.0;
  return (
    <section className="bg-bg-raised border border-border rounded-[8px] p-5 sm:p-6 font-sans">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Speaking speed</h3>
          <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
            How fast the agent talks on calls. 1× is natural — most businesses keep it between 0.9× and 1.1×.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-500/15 rounded-full px-2.5 py-1 shrink-0">
          {value === null ? "Default" : `${effective.toFixed(2)}×`}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-[11px] font-medium text-text-placeholder shrink-0">Slower</span>
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.05}
          value={effective}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-[#2563EB] h-1.5 cursor-pointer"
        />
        <span className="text-[11px] font-medium text-text-placeholder shrink-0">Faster</span>
      </div>

      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="mt-3 text-[11px] font-semibold text-text-secondary hover:text-brand-600 transition-colors"
        >
          Reset to default
        </button>
      )}
    </section>
  );
}

// Which tunables each voice family exposes, with the engine default (shown
// when the user hasn't touched the slider). Values are 0–1 floats in the
// payload; the sliders render them as 0–100. The elevenlabs entry stays for
// legacy agents that still carry a premium voice.
const TUNING_FIELDS: Record<
  "sarvam" | "elevenlabs",
  { key: keyof AgentVoiceSettings; label: string; help: string; defaultValue: number }[]
> = {
  sarvam: [
    { key: "temperature", label: "Expressiveness", help: "Higher is more varied and animated, lower is calmer and more consistent.", defaultValue: 0.6 },
  ],
  elevenlabs: [
    { key: "stability", label: "Stability", help: "Lower is more expressive and lively, higher is steadier and flatter.", defaultValue: 0.5 },
    { key: "similarityBoost", label: "Similarity", help: "How closely the output sticks to the original voice character.", defaultValue: 0.75 },
    { key: "style", label: "Style", help: "Delivery drama. Keep low for a natural receptionist tone.", defaultValue: 0 },
  ],
};

interface VoiceTuningControlProps {
  /** Full voice string — the panel adapts to the selected voice. */
  voice: string;
  value: AgentVoiceSettings | null;
  onChange: (val: AgentVoiceSettings | null) => void;
  disabled?: boolean;
}

export function VoiceTuningControl({ voice, value, onChange, disabled }: VoiceTuningControlProps): React.JSX.Element {
  const provider = getVoiceProvider(voice);
  const fields = TUNING_FIELDS[provider];
  const hasCustom = fields.some((f) => value?.[f.key] !== undefined);

  const setField = (key: keyof AgentVoiceSettings, val: number) => {
    onChange({ ...(value ?? {}), [key]: val });
  };

  return (
    <section className="bg-bg-raised border border-border rounded-[8px] p-5 sm:p-6 font-sans">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Voice tuning</h3>
          <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
            Fine-tune how the selected voice sounds on calls. Use the preview button above to hear changes.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-500/15 rounded-full px-2.5 py-1 shrink-0">
          {hasCustom ? "Custom" : "Default"}
        </span>
      </div>

      {fields.length === 0 ? (
        <p className="mt-4 text-[12px] text-text-placeholder">
          This voice has no extra tuning options — only the speaking speed above applies.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {fields.map((f) => {
            const raw = value?.[f.key];
            const effective = typeof raw === "number" ? raw : f.defaultValue;
            const display = Math.round(effective * 100);
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-semibold text-text-primary">{f.label}</label>
                  <span className="text-[11px] font-semibold text-text-secondary tabular-nums">
                    {typeof raw === "number" ? display : `${display} · default`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={display}
                  disabled={disabled}
                  onChange={(e) => setField(f.key, Number(e.target.value) / 100)}
                  className="w-full accent-[#2563EB] h-1.5 cursor-pointer"
                />
                <p className="text-[11px] text-text-placeholder mt-1">{f.help}</p>
              </div>
            );
          })}

          {hasCustom && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="text-[11px] font-semibold text-text-secondary hover:text-brand-600 transition-colors"
            >
              Reset to defaults
            </button>
          )}
        </div>
      )}
    </section>
  );
}

interface PronunciationControlProps {
  /** Full voice string (kept for future per-voice behavior). */
  voice: string;
  value: Record<string, string> | null;
  onChange: (val: Record<string, string> | null) => void;
  disabled?: boolean;
}

const MAX_PRONUNCIATIONS = 100;

/**
 * Word → spoken-form overrides. Rows are kept as an ordered local array so
 * the user can edit the word itself; only complete rows are propagated up
 * (and later synced to the speech engine's pronunciation dictionary).
 */
export function PronunciationControl({ value, onChange, disabled }: PronunciationControlProps): React.JSX.Element {
  const [rows, setRows] = React.useState<{ word: string; sayAs: string }[]>(() =>
    Object.entries(value ?? {}).map(([word, sayAs]) => ({ word, sayAs }))
  );

  const propagate = (next: { word: string; sayAs: string }[]) => {
    setRows(next);
    const complete = next.filter((r) => r.word.trim() && r.sayAs.trim());
    onChange(
      complete.length === 0
        ? null
        : Object.fromEntries(complete.map((r) => [r.word.trim(), r.sayAs.trim()]))
    );
  };

  const setRow = (i: number, patch: Partial<{ word: string; sayAs: string }>) => {
    propagate(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  return (
    <section className="bg-bg-raised border border-border rounded-[8px] p-5 sm:p-6 font-sans">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Pronunciation</h3>
          <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
            If the agent says a word wrong — your brand name, an acronym — tell it exactly how to say it.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-text-secondary bg-surface border border-border rounded-full px-2.5 py-1 shrink-0 tabular-nums">
          {rows.length}/{MAX_PRONUNCIATIONS}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {rows.length === 0 && (
          <p className="text-[12px] text-text-placeholder bg-bg-subtle border border-dashed border-border rounded-[8px] px-3 py-3">
            No overrides yet. Example: <span className="font-semibold text-text-secondary">NAIC</span> → <span className="font-semibold text-text-secondary">N A I C</span>, or <span className="font-semibold text-text-secondary">PhonePe</span> → <span className="font-semibold text-text-secondary">फ़ोन पे</span>.
          </p>
        )}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Word (e.g. NAIC)"
              value={r.word}
              disabled={disabled}
              onChange={(e) => setRow(i, { word: e.target.value })}
              className="bg-bg-raised border border-border focus:border-brand-500 text-[13px] text-text-primary placeholder-text-placeholder rounded-[6px] h-9 px-3 w-2/5 focus:outline-none focus:ring-0"
            />
            <span className="text-text-placeholder text-xs shrink-0">→</span>
            <input
              type="text"
              placeholder="Spoken as (e.g. N A I C)"
              value={r.sayAs}
              disabled={disabled}
              onChange={(e) => setRow(i, { sayAs: e.target.value })}
              className="bg-bg-raised border border-border focus:border-brand-500 text-[13px] text-text-primary placeholder-text-placeholder rounded-[6px] h-9 px-3 flex-1 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              aria-label="Remove word"
              disabled={disabled}
              onClick={() => propagate(rows.filter((_, idx) => idx !== i))}
              className="h-9 w-9 shrink-0 rounded-[6px] border border-border text-text-placeholder hover:text-negative-500 hover:border-negative-500/40 transition-colors flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {rows.length < MAX_PRONUNCIATIONS && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setRows([...rows, { word: "", sayAs: "" }])}
            className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-600 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add word
          </button>
        )}
      </div>
    </section>
  );
}

interface PlayButtonProps {
  onClick: (e: React.MouseEvent) => void;
  isPlaying: boolean;
  isLoading: boolean;
  disabled?: boolean;
}

function PlayButton({ onClick, isPlaying, isLoading, disabled }: PlayButtonProps): React.JSX.Element {
  return (
    <span
      onClick={onClick as any}
      role="button"
      aria-label={isPlaying ? "Pause preview" : "Play preview"}
      aria-disabled={disabled}
      className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
        isPlaying
          ? "bg-primary text-white shadow-[0_0_0_4px_rgba(37,99,235,0.15)]"
          : "bg-bg-raised border border-border text-text-secondary hover:border-brand-500 hover:text-brand-600"
      } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
      ) : isPlaying ? (
        <Pause className="h-4 w-4 fill-current" />
      ) : (
        <Play className="h-4 w-4 fill-current ml-0.5" />
      )}
    </span>
  );
}
