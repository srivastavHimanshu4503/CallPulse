/**
 * Centralised design tokens for the Indi AI app.
 * Use semantic aliases (bg-*, fg-*, line-*) in new code so themes stay
 * consistent. Legacy tokens (background, surface, text-*, primary, etc.)
 * are preserved for existing pages.
 */
export default {
  theme: {
    extend: {
      colors: {
        // ───────── Semantic surfaces ─────────
        bg: {
          canvas: "#FFFFFF",       // main page background
          subtle: "#FAFAFA",       // sidebar, subtle sections
          muted: "#F5F5F7",        // muted panels, chip fills
          raised: "#FFFFFF",       // cards
          inverse: "#0A0416",      // dark auth panel
          highlight: "#EFF6FF",    // brand-tinted highlight
        },

        // ───────── Foregrounds ─────────
        fg: {
          primary: "#0F172A",      // headings & body
          secondary: "#475569",    // sub-copy
          muted: "#94A3B8",        // captions, hints
          inverse: "#FFFFFF",
          onBrand: "#FFFFFF",
          onAccent: "#0A0416",
        },

        // ───────── Lines / borders ─────────
        line: {
          subtle: "#F1F5F9",
          default: "#E5E7EB",
          strong: "#CBD5E1",
        },

        // ───────── Brand (blue) ─────────
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1E40AF",
          800: "#1E3A8A",
          900: "#172554",
          DEFAULT: "#2563EB",
        },

        // ───────── Metallic amber accent (used on auth CTAs) ─────────
        accent: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F5B849",
          600: "#F97316",
          700: "#EA580C",
          DEFAULT: "#F5B849",
        },

        // ───────── Semantic status ─────────
        positive: {
          50: "#F0FDF4",
          500: "#16A34A",
          600: "#15803D",
          DEFAULT: "#16A34A",
        },
        negative: {
          50: "#FEF2F2",
          500: "#DC2626",
          600: "#B91C1C",
          DEFAULT: "#DC2626",
        },
        attention: {
          50: "#FFFBEB",
          500: "#D97706",
          600: "#B45309",
          DEFAULT: "#D97706",
        },

        // ───────── Legacy (kept for backwards-compat) ─────────
        background: "#FFFFFF",
        surface: "#F7F7F7",
        border: "#E5E5E5",
        text: {
          primary: "#111111",
          secondary: "#666666",
          placeholder: "#999999",
        },
        primary: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          text: "#FFFFFF",
        },
        error: "#DC2626",
        success: "#16A34A",
        warning: "#D97706",
        sidebar: {
          bg: "#FAFAFA",
          border: "#E5E5E5",
        },
        active: {
          nav: "#EFF6FF",
          navText: "#2563EB",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Inter", "sans-serif"],
      },
      fontSize: {
        // Precise scale for dashboards
        "2xs": ["10px", { lineHeight: "1.3" }],
        xs: ["11px", { lineHeight: "1.4" }],
        sm: ["12.5px", { lineHeight: "1.5" }],
        base: ["14px", { lineHeight: "1.55" }],
        lg: ["16px", { lineHeight: "1.5" }],
        xl: ["18px", { lineHeight: "1.4" }],
        "2xl": ["22px", { lineHeight: "1.25" }],
        "3xl": ["28px", { lineHeight: "1.2" }],
        "4xl": ["34px", { lineHeight: "1.15" }],
      },
      borderRadius: {
        md: "6px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03)",
        raised: "0 1px 2px rgba(15,23,42,0.05), 0 8px 20px -8px rgba(15,23,42,0.08)",
        pop: "0 10px 30px -8px rgba(15,23,42,0.15), 0 4px 12px -6px rgba(15,23,42,0.08)",
        goldGlow: "0 8px 24px -8px rgba(245,184,73,0.55)",
      },
      spacing: {
        "13": "3.25rem",
      },
    },
  },
};
