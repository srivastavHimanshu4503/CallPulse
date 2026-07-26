# voice-server (LEGACY) — Deprecation Record

**Status:** Deprecated as of 2026-07-26.
**Replacement:** `voice-server-india` (in-region Mumbai monolith, direct Plivo `<Stream>` WebSocket).
**Migration:** New calls route to `voice-server-india`. This service stays running until the new one has been in production for ≥ 2 weeks with equal-or-better metrics; then this service is deleted.

---

## What this service does

`apps/voice-server/` is a Node/TypeScript LiveKit agent worker built on `@livekit/agents`. It handles both browser test calls (WebRTC via LiveKit Cloud) and real phone calls (SIP inbound via Plivo → LiveKit Cloud → this worker).

Per-call flow:

1. Plivo (real call) or the dashboard (test call) creates a LiveKit room.
2. LiveKit Cloud dispatches this worker into the room (worker name `inbound-agent` on prod, `inbound-agent-local` on laptops).
3. The worker looks up the agent by dialed number (SIP) or room metadata (browser).
4. STT (Sarvam saaras:v3 by default, or Deepgram nova-3) → LLM (OpenAI gpt-4.1 primary, Google Gemini fallback) → TTS (Sarvam bulbul:v3).
5. Post-call, dispatches transcript + metadata to `apps/post-call-server`.

## Why it's being deprecated

The service works, but its architecture makes sub-1-second latency **impossible on real Indian phone calls**, no matter how much we tune it. The root causes are structural, not tunable:

### 1. LiveKit Cloud is a mandatory US-East hop

Real calls travel: **Mumbai (caller) → Plivo (region varies) → LiveKit Cloud (US-East) → our voice-server (Mumbai AWS) → Sarvam (India) → OpenAI us-east-1 → Sarvam → voice-server → LiveKit Cloud (US-East) → Plivo → Mumbai (caller)**.

That's **at least four cross-continental hops per turn** (audio in through LiveKit US, then back out through LiveKit US). Each hop costs ~150-250ms RTT. Test calls feel snappy because both the browser AND LiveKit are in US-East — the audio never crosses oceans, so this cost is invisible in testing. This is why real calls felt like a lag and test calls felt like a human, even though the code path is identical.

Measured impact: **~500-800ms of pure network latency per turn** that has nothing to do with STT, LLM, or TTS quality.

### 2. Every stage is a separate external HTTPS call

Within a single turn, the worker makes independent external calls to Sarvam (STT), OpenAI (LLM), and Sarvam again (TTS). Each is a TLS handshake or long-lived stream over the public internet. Vendor-to-vendor RTT stacks up. Ringg's monolith avoids this entirely — STT/LLM/TTS are in-process function calls.

### 3. Sarvam STT ships only finals

Our current STT provider (Sarvam saaras:v3) does not emit interim transcripts. The LiveKit `preemptiveGeneration` feature — which starts the LLM while the user is still finishing their sentence — has nothing to work with. Every turn pays 450-500ms of dead-air waiting for Sarvam to finalize before the LLM even starts.

We tried Deepgram in July 2026 (see `.env` comment) — better interims but chopped Hinglish into fragments and preemptive replies stuttered. Reverted. Sarvam wins on quality, loses on latency.

### 4. OpenAI in us-east-1

Primary LLM is api.openai.com, ~280ms RTT from the Mumbai box, contributing ~500ms/turn to TTFT that would be ~50ms with an in-region LLM. Attempted Azure OpenAI (Mumbai region) — user could not enable it. Gemini free tier attempted and hit quota (20 RPD on `gemini-flash-latest`).

### 5. LiveKit gives us a lot but we don't use most of it

The LiveKit agents SDK is designed for arbitrary WebRTC + SIP topologies with room-based multiparty voice, transcription streaming, video, etc. For our use case (1:1 phone call, one caller + one AI), 90% of that machinery is overhead. We can replicate the parts we use — VAD, endpointing, tool calling, session state — in a much thinner service.

## Measured baseline (2026-07-26, from prod logs)

Averages across recent real SIP calls:

| Metric | Value |
|---|---|
| `latency: TURN TOTAL` (server-measured) | ~1400-1600ms |
| `eouMs` (STT finalization delay) | ~450-500ms |
| `llmTtftMs` | ~800ms |
| `ttsTtfbMs` | ~200-250ms |
| Caller-perceived latency (incl. carrier RTT) | ~1700-2200ms |

For comparison, Ringg.ai claims < 400ms end-to-end. A human-feeling voice agent needs sub-800ms perceived.

## What stays untouched

- `apps/voice-server/` — running, handling all traffic until cutover verified.
- Browser test calls continue through this stack (they're not the pain point).
- The `AgentPersonaConfig` / `agentConfigProvider` in `apps/voice-server/src/agent-config/` — reusable; the new service imports the same tenant/agent DB rows.
- Tool logic (`buildTools`, `end_call`, `transfer_call`, etc.) — worth porting patterns from, though the exact SDK-bound implementation will change.
- Prompt building (`buildSystemPrompt` in `apps/voice-server/src/agent/prompt.ts`) — pure function, portable as-is.
- Post-call pipeline (`apps/post-call-server`) — the new service dispatches to it the same way.
- `packages/db` (Prisma schema) — single source of truth, both services read from it.
- `packages/llm` — provider abstraction, likely reusable.

## What the new service replaces

- LiveKit rooms, LiveKit Cloud dispatch, LiveKit SIP trunks.
- The whole `apps/voice-server/src/agent/index.ts` job entrypoint.
- Sarvam STT → moving to Soniox (or Ringg Parrot) for interim-transcript-driven preemptive generation.
- OpenAI direct → an in-region LLM (Groq / Together / self-hosted Mumbai).

## Kill criteria

Delete this service when:

1. `voice-server-india` has run in production ≥ 14 days.
2. `latency: TURN TOTAL` p95 on the new service ≤ 700ms sustained.
3. Zero user-reported call quality regressions during that window.
4. All active Plivo numbers point to the new service's inbound webhook.
5. The Prisma schema no longer has fields exclusive to the LiveKit flow (e.g. `livekit-*` inbound trunk IDs on `PhoneNumber` — either dropped or repurposed).
