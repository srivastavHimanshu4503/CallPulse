/**
 * Centralised design tokens for the Indi AI app.
 * All colors resolve to CSS variables defined in packages/config/theme.css
 * (light values on :root, dark values on .dark) so the whole app themes
 * from one place. Use semantic aliases (bg-*, fg-*, line-*) in new code.
 *
 * Note: the raw palettes below (slate/blue/emerald/rose/amber) are ALSO
 * theme-aware — e.g. bg-emerald-50 becomes a dark green in dark mode.
 * For colors that must never change with the theme, use black/white or an
 * arbitrary value like bg-[#0F172A].
 */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (name, stops, extra = {}) => ({
  ...Object.fromEntries(stops.map((s) => [s, v(`${name}-${s}`)])),
  ...extra,
});
const S10 = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ───────── Semantic surfaces ─────────
        bg: {
          canvas: v("bg-canvas"),       // main page background
          subtle: v("bg-subtle"),       // sidebar, subtle sections
          muted: v("bg-muted"),         // muted panels, chip fills
          raised: v("bg-raised"),       // cards
          inverse: v("bg-inverse"),     // dark auth panel (dark in both themes)
          highlight: v("bg-highlight"), // brand-tinted highlight
        },

        // ───────── Foregrounds ─────────
        fg: {
          primary: v("fg-primary"),     // headings & body
          secondary: v("fg-secondary"), // sub-copy
          muted: v("fg-muted"),         // captions, hints
          inverse: v("fg-inverse"),
          onBrand: v("fg-on-brand"),
          onAccent: v("fg-on-accent"),
        },

        // ───────── Lines / borders ─────────
        line: {
          subtle: v("line-subtle"),
          default: v("line-default"),
          strong: v("line-strong"),
        },

        // ───────── Brand (blue) ─────────
        brand: scale("brand", S10, { DEFAULT: v("brand-500") }),

        // ───────── Metallic amber accent (used on auth CTAs) ─────────
        accent: scale("accent", [50, 100, 200, 300, 400, 500, 600, 700], {
          DEFAULT: v("accent-500"),
        }),

        // ───────── Semantic status ─────────
        positive: scale("positive", [50, 100, 200, 500, 600, 700], {
          DEFAULT: v("positive-500"),
        }),
        negative: scale("negative", [50, 100, 200, 500, 600, 700], {
          DEFAULT: v("negative-500"),
        }),
        attention: scale("attention", [50, 100, 200, 500, 600, 700], {
          DEFAULT: v("attention-500"),
        }),

        // ───────── Theme-aware raw palettes ─────────
        slate: scale("slate", S10),
        blue: scale("blue", S10),
        emerald: scale("emerald", S10),
        rose: scale("rose", S10),
        amber: scale("amber", S10),
        red: scale("red", S10),
        orange: scale("orange", S10),
        indigo: scale("indigo", S10),

        // ───────── Legacy (kept for backwards-compat) ─────────
        background: v("background"),
        surface: v("surface"),
        border: v("border-default"),
        text: {
          primary: v("text-primary"),
          secondary: v("text-secondary"),
          placeholder: v("text-placeholder"),
        },
        primary: {
          DEFAULT: v("primary"),
          hover: v("primary-hover"),
          text: "#FFFFFF",
        },
        error: v("error"),
        success: v("success"),
        warning: v("warning"),
        sidebar: {
          bg: v("sidebar-bg"),
          border: v("sidebar-border"),
        },
        active: {
          nav: v("active-nav"),
          navText: v("active-nav-text"),
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
