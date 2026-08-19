# Calendar, Scheduling & Booking System — Design Doc

Owner: @yogendraft21
Status: Draft — under review
Linear: DES-63

## 1. Problem

Booking is real internally (`Booking` model, CRM UI) but has no connection to any external calendar, and the AI agent cannot check availability or book anything live on a call — `AIAgent.bookingConfig` is a cosmetic provider dropdown plus a free-text link the agent just reads aloud.

Confirmed by reading the code:

- **`Booking` model** (`packages/db/prisma/schema.prisma:486-508`) is internal-only — `tenantId`, `contactId`, `title`, `startTime`, `endTime`, `status` (plain `String`, not an enum), `agentId?`, `assigneeId?`, `ccEmails[]`, `notes?`. No provider field, no external event ID, no sync state.
- **`createBooking()`** (`apps/api/src/modules/crm/crm.service.ts:1048-1088`) inserts a `Booking` row and an `Activity` row inside a transaction. No availability/conflict check against existing bookings, no external calendar call, no email send.
- **`AIAgent.bookingConfig`** is a JSON column shaped by `AgentBookingConfig` (`apps/web/src/pages/agents/components/WorkflowSetup.tsx:87-95`): `{ triggerCondition, provider: "google"|"calcom"|"link", calendarLink, meetingDurationMin, workingHoursNote, confirmationMessage, askEmail }`. `calendarLink` is a **free-text string** (line 685-696) — for `provider: "google"` it's literally a placeholder text field ("yourbusiness@gmail.com or booking-page link"), not a real connection.
- **Nothing in `apps/voice-server/src`** reads `bookingConfig` at all — `AgentPersonaConfig` (`apps/voice-server/src/agent-config/types.ts`) has no `booking` field, and there is no `check_availability`/`book_appointment` tool in `apps/voice-server/src/agent/tools/index.ts`.
- **No Google API dependency is wired for Calendar.** `google-auth-library` exists in the lockfile only as a transitive dependency of `@google/genai` (the Gemini LLM SDK) — unrelated, provides no OAuth scaffolding for this.
- **No Google login exists either** — `apps/web/src/pages/auth/Login.tsx`/`Register.tsx` and `apps/api/src/modules/auth/` have zero OAuth code. `User` (`schema.prisma:217-234`) has no `googleId` or any external-identity column — auth is `email` + `passwordHash` only, checked in `AuthService.login()`/`register()` (`apps/api/src/modules/auth/auth.service.ts:13`, `:145`).
- **Env var convention** (`apps/api/src/config/env.ts`) — every third-party integration is a set of `optional()` Zod fields (see `TWILIO_*`, `PLIVO_*`, `RAZORPAY_*`) so the API boots fine without them configured. Google OAuth follows the same pattern.

## 2. What this design covers

Per direction from @yogendraft21: **one shared Google OAuth setup**, used for two distinct purposes, plus a live-call booking tool-call flow.

1. Google OAuth — shared client, two flows: **sign-in with Google** (platform login) and **connect Google Calendar** (tenant-level, for sync + booking).
2. Google Calendar sync — pull the connected calendar's existing events into the product's internal Calendar page.
3. In-call booking tool-calls — the AI agent checks real availability during a live call, offers a time slot, confirms the booking, creates the external calendar event, and triggers a confirmation email to the customer.

Cal.com integration and internal double-booking prevention (previously separate tickets, DES-36/39) are **out of scope for this doc** — Google is the v1 provider per this direction. Cal.com can follow the same pattern later if/when prioritized.

## 3. Proposed architecture

### 3.1 Google OAuth — one client, two flows

A single Google Cloud OAuth Client (Client ID + Secret) is configured once, added to `apps/api/src/config/env.ts` following the existing optional-field convention:

```
GOOGLE_CLIENT_ID: z.string().min(1).optional(),
GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
GOOGLE_OAUTH_REDIRECT_URL: z.string().url().optional(),
```

**Flow A — Sign in with Google** (platform login, narrow scope: `openid email profile`)

- New route, e.g. `GET /auth/google` → redirect to Google consent → `GET /auth/google/callback`.
- On callback: look up `User` by the Google account's email. If found, log in (issue tokens via the existing `generateTokens()` helper, same as `AuthService.login()`). If not found, this is a new signup — create `Tenant` + `User` the same way `AuthService.register()` does today, minus password (no `passwordHash` needed for a Google-only account — needs a schema decision, see §5).
- Needs a `User.googleId String? @unique` column to link the Google account id to the row, so re-logins don't depend on email matching alone.

**Flow B — Connect Google Calendar** (tenant-level, broader scope: `calendar.readonly` + `calendar.events`)

- Initiated from Settings by a logged-in tenant admin — this is a **separate, explicit consent step**, not implied by Flow A. Signing in with Google does not automatically connect a calendar.
- New table to store the connection (see §3.3) — access token, refresh token, expiry, connected-by user, connected-at.
- Standard OAuth refresh-token handling: access tokens expire (~1hr); refresh transparently using the stored refresh token, re-prompt for consent only if the refresh token itself is revoked.

Both flows share the same Google Client ID/Secret and the same `googleapis`/`google-auth-library` dependency (add `googleapis` for real, it's not currently a project dependency despite being in the lockfile transitively) but are otherwise independent — different scopes requested, different consent screens, different storage.

### 3.2 Calendar sync (pull)

Once a tenant connects their Google Calendar (Flow B), the internal Calendar page (`apps/web/src/pages/calendar/Calendar.tsx`) should reflect the connected calendar's existing events, not just internally-created `Booking` rows.

**Approach — resolved (raised in review by Kapil): live-fetch for v1, not a mirrored/synced copy.** When the Calendar page loads a date range, the API calls Google's Calendar API directly for that range and returns the events alongside internal `Booking` rows — no local mirror table, no polling job, no webhook/watch-channel subscription to manage. Reasoning: a mirror buys faster page loads and resilience to a brief Google outage, but it costs a sync job (polling or watch-channel renewal, either way ongoing infrastructure to run and monitor) and a staleness window to reason about — for v1, "always current, simpler to build and operate" outweighs "always fast." This is not a permanent decision: if real usage shows the Calendar page is slow or Google's API is a reliability problem, the escalation path is a mirror table fed by a polling sync job (same shape as the `transfer-reconciliation.ts` sweeper already in this codebase) — revisit once there's a real signal to justify it, not speculatively.

- This is display-only sync (see external events, avoid double-booking against them). It does not need to create `Booking` rows for events that didn't originate from this product.

### 3.3 Data model changes

Extend `Booking`:

```prisma
model Booking {
  // ...existing fields...
  externalProvider   String?   // "GOOGLE" | null
  externalEventId    String?   // Google Calendar event ID, for update/cancel later
  externalSyncStatus String?   // "SYNCED" | "FAILED" | null
  purpose            String?   // customer-stated reason, distinct from `notes` (internal)
}
```

New table for the OAuth connection (tenant-scoped, not user-scoped — booking is a business capability):

```prisma
model CalendarConnection {
  id                  String   @id @default(uuid())
  tenantId            String   @unique
  provider            String   // "GOOGLE"
  accessTokenEncrypted  String // encrypted at rest — see below
  refreshTokenEncrypted String // encrypted at rest — see below
  expiresAt           DateTime
  connectedById       String   // User who authorized it
  connectedAt         DateTime @default(now())

  tenant      Tenant @relation(fields: [tenantId], references: [id])
  connectedBy User   @relation(fields: [connectedById], references: [id])

  @@map("calendar_connections")
}
```

**Credential storage — resolved (raised in review by Arjun):** these tokens grant direct access to a customer's personal/business calendar, which is a materially more sensitive credential class than the platform-level provider keys already in this codebase (Twilio/Plivo/Razorpay — all single, ops-controlled secrets, not per-tenant, per-customer-data-access tokens). No plaintext option — commit to field-level encryption at rest regardless of whether a specific compliance mandate exists yet, since it's low-cost to do from day one and expensive to retrofit later. Concretely: encrypt `accessToken`/`refreshToken` with a server-held symmetric key (e.g. AES-256-GCM) before writing, decrypt only in-process when a request needs to call Google's API, following the same `optional()` env-var pattern as every other secret in `apps/api/src/config/env.ts` for where the encryption key itself lives (e.g. `CALENDAR_TOKEN_ENCRYPTION_KEY`). This is an engineering default, not a compliance determination — still flagging to whoever owns security/compliance sign-off in case there's a specific requirement (KMS-backed envelope encryption, key rotation policy, etc.) that should shape the implementation further; the encryption itself is not optional either way.

`User` gains `googleId String? @unique` for Flow A.

### 3.3.1 Timezone & working hours — resolved (raised in review by Kapil)

`AgentBookingConfig.workingHoursNote` is a free-text string today ("Mon–Sat, 10:00 AM – 7:00 PM IST") — fine for display, useless for computing availability, since `check_calendar_availability` needs to reliably intersect real open slots with business hours and cannot parse arbitrary text. This needs structuring, and it's in scope for this doc, not deferred — the availability tool genuinely doesn't work without it.

Add to `AgentBookingConfig`:

```ts
interface AgentBookingConfig {
  // ...existing fields...
  timezone: string; // IANA timezone, e.g. "Asia/Kolkata" — required once booking is enabled, no guessed default
  workingHours: {
    days: Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN">;
    start: string; // 24h local time in `timezone`, e.g. "10:00"
    end: string; // e.g. "19:00"
  };
}
```

`workingHoursNote` stays as-is for existing agents' display text (no migration required — it's cosmetic), but `check_calendar_availability` reads `timezone`/`workingHours`, not the free-text note. The Agent Wizard's booking config UI (§3.5) needs a timezone picker + simple hours editor to replace the current single text input — a small, contained UI change, not a redesign.

**Why this matters beyond just parsing**: every Google Calendar API call (FreeBusy query, event creation) takes an explicit `timeZone` — if we don't pass the tenant's actual timezone, slots get computed and displayed in the wrong hour relative to what the business and caller actually mean by "10 AM." The confirmation message read back to the caller, and the email sent to them, both need to state the time in `timezone`, not server-local or UTC.

### 3.4 In-call booking tool-calls

Mirrors the existing tool pattern in `apps/voice-server/src/agent/tools/index.ts` (see `transfer_call`, `collect_callback_details` — tools are conditionally registered based on config presence on `ToolContext`, e.g. `if (ctx.transfer && ctx.transferCall)`).

Add `booking?: BookingConfig | null` to `AgentPersonaConfig` (`apps/voice-server/src/agent-config/types.ts`), populated in `prisma-provider.ts`'s `shape()` from `AIAgent.bookingConfig` — only when a `CalendarConnection` exists for the tenant (no config, no tools registered, same fail-safe pattern as `transfer`).

Two tools, registered together when booking is enabled and connected:

```ts
if (ctx.booking) {
  tools.check_calendar_availability = llm.tool({
    description:
      "Check real calendar availability for a date the caller mentioned. Use this BEFORE offering or confirming any appointment time. If this returns an error/unavailable result, tell the caller availability can't be confirmed right now and offer to have someone follow up — never guess or invent a time.",
    parameters: z.object({
      date: z.string().describe("Date the caller wants, as YYYY-MM-DD"),
      preferredTime: z.string().optional().describe("Caller's preferred time of day, if mentioned"),
    }),
    execute: async (args) => {
      // Query Google Calendar freebusy for the connected calendar on `args.date`,
      // intersected with AIAgent.bookingConfig.workingHoursNote and meetingDurationMin.
      // Returns a short list of open slots as a string for the LLM to read aloud.
      //
      // Failure handling (raised in review by Arjun): one retry with a short
      // timeout (a few seconds — the caller is on hold, this can't retry
      // indefinitely). If the FreeBusy call still fails or Google Calendar is
      // unavailable, return a distinct "couldn't check availability right now"
      // result — never a list of slots and never silence. The tool's
      // description instructs the agent to tell the caller availability
      // can't be confirmed live and offer a manual follow-up (the same
      // "someone will reach out" fallback used when a call fails to connect
      // to a real callback elsewhere in this codebase), not to guess or
      // invent a time. book_appointment must never be invoked off the back
      // of a failed availability check — there is no assumed-available
      // fallback, since that risks double-booking the connected calendar.
    },
  });

  tools.book_appointment = llm.tool({
    description:
      "Confirm and create a real appointment. Invoke ONLY after the caller has explicitly agreed to a specific date and time returned by check_calendar_availability.",
    parameters: z.object({
      date: z.string(),
      time: z.string(),
      customerName: z.string(),
      customerEmail: z.string().optional().describe("Required to send a confirmation email"),
      purpose: z.string().describe("Short reason for the appointment, in the caller's words"),
    }),
    execute: async (args) => {
      // 1. Create the internal Booking row (mirrors crm.service.ts createBooking()).
      // 2. Create the Google Calendar event via the tenant's CalendarConnection,
      //    store externalEventId/externalProvider/externalSyncStatus on the Booking.
      // 3. Trigger a confirmation email to customerEmail (depends on DES-44/DES-12 —
      //    see cross-project dependency below).
      // 4. Return a confirmation string for the LLM to relay to the caller.
    },
  });
}
```

Two tools rather than one, because a real conversation needs to present options before confirming — matches the flow described: check availability → tell the caller the slot → get explicit confirmation → book.

**Booking works independently of the email step — resolved (raised in review by Kapil):** confirming this explicitly rather than leaving it implied. Step 3 (confirmation email) needs real email-sending infrastructure, which doesn't exist yet anywhere in the codebase — it's the same gap tracked in the Notifications project (DES-44) and the Onboarding project (DES-12). `book_appointment`'s steps 1-2 (the internal `Booking` row and the real Google Calendar event) are **not gated on step 3 succeeding or even existing yet** — the appointment is genuinely booked, on the real calendar, whether or not the email goes out. If email infra isn't live, step 3 logs/no-ops rather than throwing, so it can never fail the booking that already happened — same "recordings are a nice-to-have, don't break the pipeline" pattern already used in `apps/post-call-server/src/jobs/recording-fetch.ts`. This means the in-call booking flow can ship and be fully usable before DES-44/DES-12 land; the email is a backfilled enhancement, not a blocking dependency.

### 3.5 Frontend + notifications

- Settings: "Connect your Google Calendar" section (Flow B's entry point), connection status, disconnect.
- Agent Wizard: `WorkflowSetup.tsx`'s booking config UI needs to react to real connection state — hide/disable "google" as a provider option until a `CalendarConnection` exists for the tenant, instead of always allowing it to be selected.
- Calendar page (`apps/web/src/pages/calendar/Calendar.tsx`): show synced external events per §3.2.
- Notification system: once a booking is created (via the tool-call or the CRM UI), the existing in-app/email notification surfaces (Notifications project) should be able to fire a "new booking" event — this is the same notification-rules infrastructure being built in DES-43/DES-44, not something new to invent here. Wire booking creation as one more event type once that infra exists.

## 4. Task split (3 people, no overlap)

Per direction, each person owns one clean vertical slice — no shared files where avoidable:

1. **In-call booking integration** — §3.4 (voice-server tools, `AgentPersonaConfig` extension, availability/booking logic, `Booking` row creation + external event creation).
2. **Google Authentication** — §3.1 both flows (login route + callback, calendar-connect route + callback, `User.googleId`, `CalendarConnection` table + refresh-token handling).
3. **Frontend + notifications** — §3.5 (Settings connect UI, Agent Wizard provider-state wiring, Calendar page sync display, wiring booking events into the notification system once its infra lands).

Implementation tickets for each of these three will be created **after this doc is reviewed and approved** — no point assigning detailed scope that might change during review.

## 5. Open questions for review

- [ ] Google-only signup (Flow A, new user) — is a `User` row without a `passwordHash` acceptable, or should we require setting a password on first Google signup? Affects whether `passwordHash` becomes nullable.
