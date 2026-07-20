# DeskBuddy Marketing Website — Build Specification

Complete spec for building the public marketing site. Hand this document to any
LLM/developer — everything needed is here. The site is a NEW app in this
monorepo at `apps/website`, deployed on Vercel at the root domain
`deskbuddy.in` (the product app already lives at `app.deskbuddy.in`).

---

## 1. Product context (what DeskBuddy is)

DeskBuddy is an AI receptionist for Indian small businesses (salons, clinics,
garages, real-estate, tent houses, e-commerce). It answers every phone call
24/7 with a natural voice, in the caller's language, and runs the front desk:

- **AI voice calls** — answers instantly, speaks Hindi, Hinglish, English,
  Marathi, Tamil, Telugu; premium ElevenLabs voices
- **Auto knowledge base** — the agent learns the business automatically at
  signup (LLM-generated from business info); owner can edit anytime
- **Bookings & calendar** — takes appointments on the call
- **Smart CRM** — every caller becomes a contact; calls, notes, deals tracked
- **WhatsApp & SMS follow-ups** — automatic post-call messages
- **Call transfer** — warm-transfers hot leads to the owner's phone
- **Call recordings + transcripts + analytics dashboard**
- **Workflows** — no-code automation builder
- Browser "test call" lets owners talk to their agent before going live

Audience: Indian SMB owners, mobile-first, not deeply technical. Tone:
confident, plain-spoken, a little warm. Hinglish flavor is welcome in example
snippets (e.g. a sample call transcript), but body copy stays English.

---

## 2. Repo & tech setup (step-by-step)

Monorepo: pnpm workspaces + TypeScript. Existing apps: `apps/web` (product
React app), `apps/api`, `apps/voice-server`, `apps/post-call-server`.

1. Create `apps/website` with **Vite + React + TypeScript** (mirror
   `apps/web`'s setup — copy its `tsconfig.json`/`vite.config.ts` shape).
2. `package.json` name: `@antigravity/website`. Scripts: `dev`, `build`
   (`tsc && vite build`), `preview`.
3. Tailwind: create `tailwind.config.ts` that uses the shared preset — this is
   mandatory, it carries every design token:
   ```ts
   import preset from "../../packages/config/tailwind.preset.js";
   export default {
     content: ["./index.html", "./src/**/*.{ts,tsx}",
               "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"],
     presets: [preset],
   };
   ```
4. Reuse workspace packages (add as deps): `@antigravity/ui` (Button, Badge,
   Input, Modal), `@antigravity/types` (import pricing constants — see §6).
   Icons: `lucide-react` (already used across the repo). No other UI deps.
5. Font: Inter via Google Fonts `<link>` in `index.html` (weights
   300–800), same as `apps/web/index.html`.
6. Favicon: copy the inline SVG data-URI favicon from `apps/web/index.html`
   (blue rounded square, white "DB").
7. `<title>`: `DeskBuddy — AI Receptionist for Indian Businesses`.
   Meta description: "DeskBuddy answers every call for your business — in
   Hindi, English, and 4 more languages. Bookings, CRM, and follow-ups on
   autopilot. Built for Indian SMBs."
8. Add `apps/website/vercel.json`:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
9. Routing: single page is fine (`/` with anchor scroll). If react-router is
   used, keep it minimal (`/`, `/privacy`, `/terms` stubs).

---

## 3. Design system (match the product exactly)

Tokens come from `packages/config/tailwind.preset.js` — use the semantic
classes, never raw hex.

| Purpose | Class | Hex |
|---|---|---|
| Page background | `bg-bg-canvas` | #FFFFFF |
| Subtle section bg | `bg-bg-subtle` | #FAFAFA |
| Muted panel / chip | `bg-bg-muted` | #F5F5F7 |
| Brand-tinted highlight | `bg-bg-highlight` | #EFF6FF |
| Dark section (footer/CTA) | `bg-bg-inverse` | #0A0416 |
| Headings & body | `text-fg-primary` | #0F172A |
| Sub-copy | `text-fg-secondary` | #475569 |
| Captions / hints | `text-fg-muted` | #94A3B8 |
| Borders | `border-line-default` | #E5E7EB |
| **Brand blue (the ONE accent)** | `bg-brand` / `text-brand` | #2563EB |
| Brand hover | `bg-brand-600` | #1D4ED8 |
| Success ticks | `text-positive` | #16A34A |

**Design taste rules (non-negotiable, matches the product):**
- ONE blue accent + neutrals. No gradients-everywhere, no rainbow feature
  cards, no purple/teal "AI" clichés. White canvas, generous whitespace.
- Small, quiet badges (`text-[11px]`, `bg-bg-highlight text-brand`).
- Plain verbs on buttons: "Get started", "See pricing", "Talk to us" — never
  "Unleash", "Supercharge", "Revolutionize".
- Rounded corners `rounded-[8px]` cards / `rounded-[6px]` inputs & buttons,
  `border border-line-default`, `shadow-sm` max. No heavy drop shadows.
- Type scale: hero `text-4xl sm:text-5xl font-extrabold tracking-tight`;
  section titles `text-2xl sm:text-3xl font-bold`; body `text-sm/text-base
  text-fg-secondary leading-relaxed`.

**Logo — text only, NO image.** Replicate `apps/web/src/components/common/Logo.tsx`:
`Desk` in `text-fg-primary` + `Buddy` in `text-blue-600`, `font-extrabold
tracking-tight`. Compact "DB" mark for small contexts.

---

## 4. Page structure — top to bottom

### 4.1 Nav (sticky, `bg-bg-canvas/80 backdrop-blur`, bottom border `line-subtle`)
- Left: DeskBuddy wordmark (links to `/`)
- Center links (anchor scroll): Features · How it works · Pricing · FAQ
- Right: `Log in` (ghost link → https://app.deskbuddy.in/login) and
  `Get started` (solid `bg-brand text-white` → https://app.deskbuddy.in/register)
- Mobile: hamburger → slide-down menu, same items.

### 4.2 Hero (`bg-bg-canvas`, centered, py-24)
- Tiny badge: "Made for Indian businesses 🇮🇳" (flag emoji allowed here only)
- H1: **"Every call answered. Every customer kept."**
- Sub (max-w-xl): "DeskBuddy is an AI receptionist that picks up 24/7, speaks
  your customer's language, books appointments, and follows up on WhatsApp —
  while you run your business."
- CTAs: `Get started free` (brand) + `See how it works` (outline, scrolls down)
- Under CTAs, muted caption: "Free plan · 30 credits · no card required"
- Visual: a clean mock "live call card" (bordered card showing a Hinglish
  call transcript: caller asks for salon appointment, agent answers warmly,
  books 5 PM slot). Pure HTML/CSS — no screenshots, no stock images.

### 4.3 Social-proof strip (`bg-bg-subtle`, py-8)
- One line of muted text: "Answering calls for salons, clinics, garages,
  real-estate and more across India" + 5–6 plain-text business-type chips.
  (No fake logos, no fake numbers.)

### 4.4 How it works (3 steps, numbered cards in a row)
1. **Create your agent** — "Sign up, tell us your business name — DeskBuddy
   writes your agent's knowledge base automatically."
2. **Test it in your browser** — "Talk to your agent before customers do.
   Tweak the voice, language, and greeting."
3. **Go live on your number** — "Connect a phone number. Every missed call
   becomes an answered one."

### 4.5 Features grid (2×3 or 3×2 cards, `bg-bg-canvas`)
Each card: lucide icon in a `bg-bg-highlight text-brand` square, title, 2-line
description. Cards: AI voice calls (6 languages) · Auto knowledge base ·
Bookings & calendar · Smart CRM · WhatsApp/SMS follow-ups · Call transfer to
your phone. Icons: Phone, BookOpen, Calendar, Users, MessageCircle, PhoneForwarded.

### 4.6 Languages / voice section (`bg-bg-subtle`)
- Title: "Speaks like your front desk, not a robot"
- Chips for: Hindi · Hinglish · English · Marathi · Tamil · Telugu
- One line about premium natural voices (ElevenLabs-powered — say "studio-quality
  voices", don't name vendors).

### 4.7 Pricing (`bg-bg-canvas`)
Import real numbers from `@antigravity/types` (`PLAN_PRICE_INR`,
`PLAN_CREDITS`, `PLAN_AGENT_LIMITS`, `CREDIT_COSTS`) — do NOT hardcode.
Current values: FREE ₹0 (30 credits, 1 agent) · PRO ₹2,999/mo (500 credits,
10 agents) · GROWTH "Coming soon" (3 agents, greyed card). Notes under grid:
"Calls use 5 credits/minute · WhatsApp 5 · SMS 10. Top-up packs from ₹799."
PRO card gets `border-brand` + small "Most popular" badge. CTAs →
https://app.deskbuddy.in/register.

### 4.8 FAQ (accordion, 6 items, `bg-bg-subtle`)
Suggested Qs: Does it really speak Hindi? · What happens when it can't answer?
(→ transfers to you / takes a message) · Do I need new hardware? (no — cloud
number) · Can I hear my calls? (recordings + transcripts) · How fast is setup?
(under 10 minutes) · Can I cancel anytime? (yes)

### 4.9 Final CTA banner (`bg-bg-inverse`, white text, py-20, centered)
- H2: "Your next customer is calling. Answer every time."
- `Get started free` button (brand blue on dark).

### 4.10 Footer (`bg-bg-inverse`, `text-fg-inverse`, muted secondary text)
- Col 1: DB wordmark (white "Desk", blue "Buddy") + one-liner + "Made in India"
- Col 2 Product: Features, Pricing, Log in, Get started
- Col 3 Company: Contact (mailto), Privacy, Terms (stub pages OK)
- Bottom line: `© {year} DeskBuddy · Made in India`

---

## 5. Copy rules

- Short sentences. Concrete outcomes ("books the appointment"), not tech
  ("leverages LLMs"). Never mention OpenAI/ElevenLabs/LiveKit by name.
- No fake stats, no fake testimonials, no fake customer logos.
- All CTAs point to `https://app.deskbuddy.in/register` (primary) or
  `https://app.deskbuddy.in/login`.

## 6. Acceptance checklist

- [ ] `pnpm --filter "@antigravity/website..." build` passes clean
- [ ] Pricing rendered from `@antigravity/types` constants, not hardcoded
- [ ] No `<img>` for branding — text wordmark only; no stock images anywhere
- [ ] Fully responsive 360px → 1440px; nav collapses on mobile
- [ ] Lighthouse: no console errors, semantic headings (single h1)
- [ ] Only colors from the preset tokens; single blue accent maintained

## 7. Vercel deployment (after build)

1. Vercel → Add New Project → same GitHub repo (`yogendraft21/IndiAi`)
2. Root Directory: `apps/website`
3. Build Command (override): `pnpm --filter "@antigravity/website..." build`
4. Output: `dist` · Install: default · Env vars: none needed
5. Settings → Domains → add `deskbuddy.in` (and `www.deskbuddy.in`)
6. At the registrar add the records Vercel shows (root: A `76.76.21.21`,
   www: CNAME) — exact values come from the Vercel domain screen.
