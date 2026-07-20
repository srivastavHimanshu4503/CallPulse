import * as React from "react";
import { Search, Check, Play, Pause, Loader2, AudioLines, Star } from "lucide-react";
import { api } from "../../../lib/axios.js";

const VOICE_LIBRARY = [
  // Sarvam bulbul:v3 voices
  { id: "sarvam:priya", name: "Priya", provider: "Sarvam AI", gender: "Female", accent: "Hinglish/Hindi Accent", description: "Warm, polite receptionist tone. Perfect for Indian SMB inbound queries." },
  { id: "sarvam:soham", name: "Aravind", provider: "Sarvam AI", gender: "Male", accent: "Indian English Accent", description: "Professional, authoritative corporate tone. Best for outbound B2B follow-ups." },
  { id: "sarvam:ritu", name: "Aditi", provider: "Sarvam AI", gender: "Female", accent: "Northern Hindi Accent", description: "Soft, formal Hindi voice. Best for service bookings." },
  { id: "sarvam:kabir", name: "Kabir", provider: "Sarvam AI", gender: "Male", accent: "Hinglish Accent", description: "Energetic, clear, conversational tone. Ideal for real-estate sales leads." },
  { id: "sarvam:kavitha", name: "Deepika", provider: "Sarvam AI", gender: "Female", accent: "English/Tamil Accent", description: "Helpful, clear, professional accent. Perfect for customer support." },
  { id: "sarvam:shubh", name: "Shubh", provider: "Sarvam AI", gender: "Male", accent: "Hinglish/Hindi Accent", description: "Clear, friendly Hinglish/Hindi voice. Great for general assistants." },
  { id: "sarvam:anand", name: "Anand", provider: "Sarvam AI", gender: "Male", accent: "Indian English Accent", description: "Calm, clear corporate voice. Ideal for business inquiries." },

  // OpenAI voices
  { id: "openai:alloy", name: "Alloy", provider: "OpenAI", gender: "Female", accent: "American Accent", description: "Balanced, neutral voice. Good for standard tasks." },
  { id: "openai:echo", name: "Echo", provider: "OpenAI", gender: "Male", accent: "American Accent", description: "Warm, deep, resonant voice. Great for announcements." },
  { id: "openai:shimmer", name: "Shimmer", provider: "OpenAI", gender: "Female", accent: "American Accent", description: "Bright, energetic, engaging voice. Best for interactive guidance." },
  { id: "openai:ash", name: "Ash", provider: "OpenAI", gender: "Male", accent: "American Accent", description: "Clear, conversational, and precise expressive voice." },
  { id: "openai:ballad", name: "Ballad", provider: "OpenAI", gender: "Male", accent: "American Accent", description: "Melodic, warm, and natural expressive tone." },
  { id: "openai:coral", name: "Coral", provider: "OpenAI", gender: "Female", accent: "American Accent", description: "Warm, friendly, and highly expressive voice." },
  { id: "openai:sage", name: "Sage", provider: "OpenAI", gender: "Female", accent: "American Accent", description: "Calm, thoughtful, and professional voice." },
  { id: "openai:verse", name: "Verse", provider: "OpenAI", gender: "Male", accent: "American Accent", description: "Versatile, expressive, and conversational voice." },
  { id: "openai:marin", name: "Marin", provider: "OpenAI", gender: "Female", accent: "American Accent", description: "Relaxed, casual, and friendly tone." },
  { id: "openai:cedar", name: "Cedar", provider: "OpenAI", gender: "Male", accent: "American Accent", description: "Warm, steady, and conversational tone." },

  // ElevenLabs voices — default premade voices only: the free tier blocks
  // library voices (incl. Indian-accent ones) over the API with HTTP 402.
  // These are multilingual and speak Hindi/Hinglish via eleven_turbo_v2_5.
  { id: "elevenlabs:EXAVITQu4vr4xnSDxMaL", name: "Sarah", provider: "ElevenLabs", gender: "Female", accent: "Hindi + English", description: "Mature, reassuring, and confident voice." },
  { id: "elevenlabs:XrExE9yKIg1WjnnlVkGX", name: "Matilda", provider: "ElevenLabs", gender: "Female", accent: "Hindi + English", description: "Knowledgeable, professional, and upbeat." },
  { id: "elevenlabs:cgSgspJ2msm6clMCkdW9", name: "Jessica", provider: "ElevenLabs", gender: "Female", accent: "Hindi + English", description: "Playful, bright, and warm voice." },
  { id: "elevenlabs:hpp4J3VqNfWAUOO0d1Us", name: "Bella", provider: "ElevenLabs", gender: "Female", accent: "Hindi + English", description: "Professional, bright, and welcoming." },
  { id: "elevenlabs:Xb7hH8MSUJpSbSDYk0k2", name: "Alice", provider: "ElevenLabs", gender: "Female", accent: "Hindi + English", description: "Clear and engaging, great for support." },
  { id: "elevenlabs:nPczCjzI2devNBz1zQrb", name: "Brian", provider: "ElevenLabs", gender: "Male", accent: "Hindi + English", description: "Deep, resonant, and comforting voice." },
  { id: "elevenlabs:cjVigY5qzO86Huf0OWal", name: "Eric", provider: "ElevenLabs", gender: "Male", accent: "Hindi + English", description: "Smooth and trustworthy tone." },
  { id: "elevenlabs:JBFqnCBsd6RMkjVDRZzb", name: "George", provider: "ElevenLabs", gender: "Male", accent: "Hindi + English", description: "Warm, captivating storyteller voice." },
  { id: "elevenlabs:onwK4e9ZLuTAKqWW03F9", name: "Daniel", provider: "ElevenLabs", gender: "Male", accent: "Hindi + English", description: "Steady, broadcast-style delivery." },
  { id: "elevenlabs:iP95p4xoKVk53GoZ742B", name: "Chris", provider: "ElevenLabs", gender: "Male", accent: "Hindi + English", description: "Charming, casual, down-to-earth voice." }
];

// Hand-picked voices pinned to the top of the grid — the best pick per
// use-case for Indian callers (native Hindi first, then premium multilingual).
const FEATURED_VOICES: { id: string; tag: string }[] = [
  { id: "sarvam:priya", tag: "Hindi native" },
  { id: "sarvam:shubh", tag: "Best for Hindi" },
  { id: "elevenlabs:EXAVITQu4vr4xnSDxMaL", tag: "Default · Most popular" },
  { id: "elevenlabs:nPczCjzI2devNBz1zQrb", tag: "Deep & calm" },
];

const FEATURED_TAGS = new Map(FEATURED_VOICES.map((f) => [f.id, f.tag]));

const featuredRank = (id: string): number => {
  const i = FEATURED_VOICES.findIndex((f) => f.id === id);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
};

interface VoiceSelectorProps {
  voice: string;
  setVoice: (val: string) => void;
  language?: string;
  disabled?: boolean;
}

const normalizeVoiceId = (id: string): string => {
  if (!id) return "elevenlabs:EXAVITQu4vr4xnSDxMaL";
  const lower = id.toLowerCase();
  if (lower.startsWith("sarvam:") || lower.startsWith("openai:")) return id;

  if (lower === "priya (indian female)" || lower === "priya") return "sarvam:priya";
  if (lower === "aravind" || lower === "soham") return "sarvam:soham";
  if (lower === "aditi" || lower === "ritu") return "sarvam:ritu";
  if (lower === "kabir") return "sarvam:kabir";
  if (lower === "deepika" || lower === "kavitha") return "sarvam:kavitha";

  const openaiVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "ash", "ballad", "coral", "sage", "verse", "marin", "cedar"];
  if (openaiVoices.includes(lower)) return `openai:${lower}`;
  
  if (lower.startsWith("elevenlabs:")) return id;

  return `sarvam:${id}`;
};

type ProviderTab = "All" | "Sarvam AI" | "OpenAI" | "ElevenLabs";
type GenderFilter = "All" | "Male" | "Female";

export function VoiceSelector({ voice, setVoice, language, disabled }: VoiceSelectorProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedGender, setSelectedGender] = React.useState<GenderFilter>("All");
  const [selectedProvider, setSelectedProvider] = React.useState<ProviderTab>("All");

  const [playingVoiceId, setPlayingVoiceId] = React.useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const activeVoiceId = normalizeVoiceId(voice);
  const activeVoice = VOICE_LIBRARY.find((v) => v.id === activeVoiceId);

  const handlePlayPreview = async (e: React.MouseEvent, voiceItem: typeof VOICE_LIBRARY[0]) => {
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
        { provider, voice: voiceId, language },
        { responseType: "blob" }
      );

      const blob = new Blob([res.data], { type: provider === "openai" || provider === "elevenlabs" ? "audio/mpeg" : "audio/wav" });
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

  const filteredVoices = VOICE_LIBRARY.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.accent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = selectedGender === "All" || v.gender === selectedGender;
    const matchesProvider = selectedProvider === "All" || v.provider === selectedProvider;
    return matchesSearch && matchesGender && matchesProvider;
  }).sort((a, b) => featuredRank(a.id) - featuredRank(b.id));

  const counts = React.useMemo(() => {
    return {
      All: VOICE_LIBRARY.length,
      "Sarvam AI": VOICE_LIBRARY.filter((v) => v.provider === "Sarvam AI").length,
      OpenAI: VOICE_LIBRARY.filter((v) => v.provider === "OpenAI").length,
      ElevenLabs: VOICE_LIBRARY.filter((v) => v.provider === "ElevenLabs").length,
    };
  }, []);

  return (
    <section className="bg-white border border-[#E5E5E5] rounded-[8px] p-5 sm:p-6 space-y-5 font-sans">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#111111]">Voice library</h3>
          <p className="text-[12px] text-[#666666] mt-1 leading-relaxed">
            Preview any voice with the play button. The selected voice will speak to every caller.
          </p>
        </div>
        {activeVoice && (
          <div className="inline-flex items-center gap-2 bg-[#EFF6FF] border border-[#2563EB]/15 rounded-full pl-2 pr-3 py-1 self-start">
            <span className="h-5 w-5 rounded-full bg-white flex items-center justify-center">
              <AudioLines className="h-3 w-3 text-[#2563EB]" />
            </span>
            <span className="text-[11px] font-semibold text-[#2563EB]">
              Selected: {activeVoice.name}
            </span>
          </div>
        )}
      </header>

      {/* Provider tabs */}
      <div className="flex items-center gap-1 border-b border-[#E5E5E5] -mx-1 px-1 overflow-x-auto">
        {(["All", "Sarvam AI", "OpenAI", "ElevenLabs"] as ProviderTab[]).map((p) => {
          const active = selectedProvider === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedProvider(p)}
              disabled={disabled}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors shrink-0 ${
                active ? "text-[#2563EB]" : "text-[#666666] hover:text-[#111111]"
              }`}
            >
              <span>{p}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  active ? "bg-[#2563EB]/10 text-[#2563EB]" : "bg-[#F7F7F7] text-[#999999]"
                }`}
              >
                {counts[p]}
              </span>
              {active && (
                <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#2563EB] rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Search & gender */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]" />
          <input
            type="text"
            placeholder="Search by name, accent, or provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 pl-9 pr-3 w-full focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F7F7F7] rounded-[6px] border border-[#E5E5E5] self-start">
          {(["All", "Male", "Female"] as GenderFilter[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGender(g)}
              disabled={disabled}
              className={`px-3 h-8 text-xs font-semibold rounded-[4px] transition-all ${
                selectedGender === g
                  ? "bg-white text-[#2563EB] shadow-sm ring-1 ring-[#2563EB]/15"
                  : "text-[#666666] hover:text-[#111111]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Voice grid */}
      <div>
        {filteredVoices.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#666666] bg-[#FAFAFA] border border-dashed border-[#E5E5E5] rounded-[8px] font-medium">
            No voices match those filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1 -mr-1">
            {filteredVoices.map((v) => {
              const isSelected = v.id === activeVoiceId;
              const isPlaying = playingVoiceId === v.id;
              const isLoading = loadingVoiceId === v.id;
              const featuredTag = FEATURED_TAGS.get(v.id);

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => !disabled && setVoice(v.id)}
                  disabled={disabled}
                  className={`text-left p-3.5 rounded-[8px] border transition-all relative ${
                    isSelected
                      ? "bg-[#EFF6FF]/50 border-[#2563EB] ring-1 ring-[#2563EB]/20"
                      : featuredTag
                        ? "bg-gradient-to-br from-white to-[#F5F3FF]/70 border-[#7C3AED]/25 hover:border-[#7C3AED]/50 hover:shadow-[0_2px_10px_rgba(124,58,237,0.08)]"
                        : "bg-white border-[#E5E5E5] hover:border-[#2563EB]/40 hover:shadow-[0_2px_8px_rgba(37,99,235,0.04)]"
                  }`}
                >
                  {isSelected ? (
                    <span className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center">
                      <Check className="h-3 w-3" strokeWidth={3.5} />
                    </span>
                  ) : featuredTag ? (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-0.5 text-[8px] font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#7C3AED]/15 rounded-full px-1.5 py-[2px] leading-none">
                      <Star className="h-2 w-2 fill-current shrink-0" />
                      {featuredTag}
                    </span>
                  ) : null}

                  <div className="flex items-start gap-3">
                    <PlayButton
                      onClick={(e) => handlePlayPreview(e, v)}
                      isPlaying={isPlaying}
                      isLoading={isLoading}
                      disabled={disabled}
                    />

                    <div className={`min-w-0 flex-1 ${featuredTag && !isSelected ? "pr-16" : "pr-6"}`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-[#111111]">{v.name}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            v.gender === "Female"
                              ? "bg-[#FDF2F8] text-[#DB2777] border border-[#DB2777]/10"
                              : "bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/10"
                          }`}
                        >
                          {v.gender}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#666666] mt-1 font-medium leading-tight">
                        {v.accent}
                      </div>
                      <div className="text-[11px] text-[#999999] mt-1.5 font-normal leading-relaxed line-clamp-2">
                        {v.description}
                      </div>
                      <div className="text-[10px] font-bold text-[#999999] uppercase tracking-wider mt-2">
                        {v.provider}
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
          ? "bg-[#2563EB] text-white shadow-[0_0_0_4px_rgba(37,99,235,0.15)]"
          : "bg-white border border-[#E5E5E5] text-[#666666] hover:border-[#2563EB] hover:text-[#2563EB]"
      } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
      ) : isPlaying ? (
        <Pause className="h-4 w-4 fill-current" />
      ) : (
        <Play className="h-4 w-4 fill-current ml-0.5" />
      )}
    </span>
  );
}
