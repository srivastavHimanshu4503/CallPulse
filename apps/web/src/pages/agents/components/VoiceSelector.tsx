import * as React from "react";
import { Volume2, Search, Check } from "lucide-react";

export const VOICE_LIBRARY = [
  { id: "priya", name: "Priya", gender: "Female", accent: "Hinglish/Hindi Accent", description: "Warm, polite receptionist tone. Perfect for Indian SMB inbound queries." },
  { id: "aravind", name: "Aravind", gender: "Male", accent: "Indian English Accent", description: "Professional, authoritative corporate tone. Best for outbound B2B follow-ups." },
  { id: "aditi", name: "Aditi", gender: "Female", accent: "Northern Hindi Accent", description: "Soft, formal Hindi voice. Best for service bookings." },
  { id: "kabir", name: "Kabir", gender: "Male", accent: "Hinglish Accent", description: "Energetic, clear, conversational tone. Ideal for real-estate sales leads." },
  { id: "deepika", name: "Deepika", gender: "Female", accent: "English/Tamil Accent", description: "Helpful, clear, professional accent. Perfect for customer support." }
];

interface VoiceSelectorProps {
  voice: string;
  setVoice: (val: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({ voice, setVoice, disabled }: VoiceSelectorProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedGender, setSelectedGender] = React.useState<"All" | "Male" | "Female">("All");
  const [selectedLanguage, setSelectedLanguage] = React.useState("All");

  const filteredVoices = VOICE_LIBRARY.filter((v) => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.accent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = selectedGender === "All" || v.gender === selectedGender;
    const matchesLang = selectedLanguage === "All" || v.accent.toLowerCase().includes(selectedLanguage.toLowerCase()) || v.name.toLowerCase().includes(selectedLanguage.toLowerCase());
    return matchesSearch && matchesGender && matchesLang;
  });

  return (
    <div className="space-y-3 font-sans">
      <label className="block text-[13px] font-semibold text-[#111111]">
        Voice Library Configuration *
      </label>

      <p className="text-[11px] text-[#666666] leading-relaxed font-medium">
        Select a highly realistic regional voice avatar. Non-tech users can use the filters below to instantly narrow down options by gender and regional language accent.
      </p>

      {/* Scalable Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#999999]" />
        <input
          type="text"
          placeholder="Search accents, voice name or gender (e.g. Priya, Hindi)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 pl-9 pr-3 w-full focus:outline-none focus:ring-0"
        />
      </div>

      {/* FILTER CHIPS */}
      <div className="space-y-2 pt-1 pb-1">
        {/* Gender Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-bold text-[#666666] uppercase tracking-wider mr-1">Gender:</span>
          {(["All", "Male", "Female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGender(g)}
              disabled={disabled}
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold border transition-colors focus:outline-none ${
                selectedGender === g
                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                  : "bg-white text-[#666666] border-[#E5E5E5] hover:bg-[#F7F7F7]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Language Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-bold text-[#666666] uppercase tracking-wider mr-1">Accent:</span>
          {["All", "Hinglish", "Hindi", "English", "Tamil"].map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setSelectedLanguage(lang)}
              disabled={disabled}
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold border transition-colors focus:outline-none ${
                selectedLanguage === lang
                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                  : "bg-white text-[#666666] border-[#E5E5E5] hover:bg-[#F7F7F7]"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Voice List - grid list with internal scrollbox */}
      <div className="border border-[#E5E5E5] rounded-[6px] bg-[#FAFAFA]/30 max-h-[240px] overflow-y-auto p-3">
        {filteredVoices.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#666666] bg-white border border-dashed border-[#E5E5E5] rounded-[6px] font-medium">
            No matching voices found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredVoices.map((v) => {
              const isSelected = v.id === voice;
              return (
                <div
                  key={v.id}
                  onClick={() => !disabled && setVoice(v.id)}
                  className={`p-3 cursor-pointer transition-all flex items-start justify-between rounded-[6px] border ${
                    isSelected
                      ? "bg-[#EFF6FF]/40 border-[#2563EB] text-[#2563EB]"
                      : "bg-white border-[#E5E5E5] hover:border-[#2563EB]/40 hover:bg-[#F7F7F7]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Volume2 className={`h-4.5 w-4.5 mt-0.5 shrink-0 ${isSelected ? "text-[#2563EB]" : "text-[#999999]"}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#111111] flex items-center gap-1.5 flex-wrap">
                        <span>{v.name}</span>
                        <span className="text-[8px] font-bold bg-[#EFF6FF] border border-[#2563EB]/10 text-[#2563EB] px-1.5 py-0.5 rounded-full shrink-0">
                          {v.gender}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#666666] mt-0.5 font-medium leading-relaxed truncate" title={v.accent}>
                        {v.accent}
                      </div>
                      <div className="text-[9px] text-[#999999] mt-1 font-normal leading-snug line-clamp-2">
                        {v.description}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-[#2563EB] shrink-0 ml-1.5 mt-0.5" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
