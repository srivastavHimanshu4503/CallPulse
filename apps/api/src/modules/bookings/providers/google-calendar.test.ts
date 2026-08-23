import test from "node:test";
import assert from "node:assert";
import { google } from "googleapis";
import type { CalendarConnection } from "@antigravity/db";
import { encryptToken } from "@antigravity/utils/crypto";
import { env } from "../../../config/env.js";
import { GoogleCalendarProvider, googleCalendarProvider } from "./google-calendar.js";

const TEST_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Ensure test encryption key and mock OAuth env vars are set
(env as any).CALENDAR_TOKEN_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
(env as any).GOOGLE_CLIENT_ID = "mock-google-client-id";
(env as any).GOOGLE_CLIENT_SECRET = "mock-google-client-secret";
(env as any).GOOGLE_OAUTH_REDIRECT_URL = "https://localhost/oauth2callback";

function createMockConnection(overrides?: Partial<CalendarConnection>): CalendarConnection {
  return {
    id: "conn-123",
    tenantId: "tenant-123",
    provider: "GOOGLE",
    accessTokenEncrypted: encryptToken("mock-access-token", TEST_ENCRYPTION_KEY),
    refreshTokenEncrypted: encryptToken("mock-refresh-token", TEST_ENCRYPTION_KEY),
    expiresAt: new Date(Date.now() + 3600 * 1000),
    connectedById: "user-123",
    connectedAt: new Date(),
    ...overrides,
  };
}

test("checkAvailability — queries FreeBusy, respects busy intervals and working hours in specified timezone", async () => {
  const originalCalendar = google.calendar;
  let capturedFreeBusyParams: any = null;

  try {
    (google as any).calendar = (_config: any) => ({
      freebusy: {
        query: async (params: any) => {
          capturedFreeBusyParams = params;
          // Working hours 10:00 to 12:00 IST on 2026-08-25 (Tuesday)
          // 10:00 IST is 04:30 UTC, 12:00 IST is 06:30 UTC
          // Busy from 10:30 IST to 11:00 IST (05:00 UTC to 05:30 UTC)
          return {
            data: {
              calendars: {
                primary: {
                  busy: [
                    {
                      start: "2026-08-25T05:00:00.000Z",
                      end: "2026-08-25T05:30:00.000Z",
                    },
                  ],
                },
              },
            },
          };
        },
      },
    });

    const provider = new GoogleCalendarProvider();
    const connection = createMockConnection();

    const result = await provider.checkAvailability({
      connection,
      date: "2026-08-25", // Tuesday
      timezone: "Asia/Kolkata",
      workingHours: {
        days: ["MON", "TUE", "WED", "THU", "FRI"],
        start: "10:00",
        end: "12:00",
      },
      durationMin: 30,
    });

    assert.ok(!("error" in result), "Expected successful slots, got error");
    assert.deepStrictEqual(result.slots, ["10:00", "11:00", "11:30"]);

    // Verify Google FreeBusy query parameters
    assert.strictEqual(capturedFreeBusyParams.requestBody.timeZone, "Asia/Kolkata");
    assert.deepStrictEqual(capturedFreeBusyParams.requestBody.items, [{ id: "primary" }]);
    assert.strictEqual(capturedFreeBusyParams.requestBody.timeMin, "2026-08-25T04:30:00.000Z");
    assert.strictEqual(capturedFreeBusyParams.requestBody.timeMax, "2026-08-25T06:30:00.000Z");
  } finally {
    (google as any).calendar = originalCalendar;
  }
});

test("checkAvailability — returns empty slots when day is outside workingHours.days", async () => {
  let freeBusyCalled = false;
  const originalCalendar = google.calendar;

  try {
    (google as any).calendar = () => ({
      freebusy: {
        query: async () => {
          freeBusyCalled = true;
          return { data: { calendars: { primary: { busy: [] } } } };
        },
      },
    });

    const provider = new GoogleCalendarProvider();
    const connection = createMockConnection();

    const result = await provider.checkAvailability({
      connection,
      date: "2026-08-23", // Sunday
      timezone: "Asia/Kolkata",
      workingHours: {
        days: ["MON", "TUE", "WED", "THU", "FRI"],
        start: "09:00",
        end: "17:00",
      },
      durationMin: 30,
    });

    assert.ok(!("error" in result));
    assert.deepStrictEqual(result.slots, []);
    assert.strictEqual(freeBusyCalled, false, "Should not call FreeBusy API on non-working day");
  } finally {
    (google as any).calendar = originalCalendar;
  }
});

test("checkAvailability — correctly handles America/New_York timezone conversion", async () => {
  const originalCalendar = google.calendar;
  let capturedTimeMin = "";
  let capturedTimeMax = "";

  try {
    (google as any).calendar = () => ({
      freebusy: {
        query: async (params: any) => {
          capturedTimeMin = params.requestBody.timeMin;
          capturedTimeMax = params.requestBody.timeMax;
          return {
            data: {
              calendars: {
                primary: { busy: [] },
              },
            },
          };
        },
      },
    });

    const provider = new GoogleCalendarProvider();
    const connection = createMockConnection();

    const result = await provider.checkAvailability({
      connection,
      date: "2026-08-25", // Tuesday (EDT = UTC-4 in August)
      timezone: "America/New_York",
      workingHours: {
        days: ["TUE"],
        start: "09:00",
        end: "10:00",
      },
      durationMin: 30,
    });

    assert.ok(!("error" in result));
    assert.deepStrictEqual(result.slots, ["09:00", "09:30"]);
    // 09:00 EDT = 13:00 UTC, 10:00 EDT = 14:00 UTC
    assert.strictEqual(capturedTimeMin, "2026-08-25T13:00:00.000Z");
    assert.strictEqual(capturedTimeMax, "2026-08-25T14:00:00.000Z");
  } finally {
    (google as any).calendar = originalCalendar;
  }
});

test("createEvent — inserts event with correct parameters and maps attendee", async () => {
  const originalCalendar = google.calendar;
  let capturedInsertParams: any = null;

  try {
    (google as any).calendar = () => ({
      events: {
        insert: async (params: any) => {
          capturedInsertParams = params;
          return {
            data: {
              id: "google-event-xyz-789",
            },
          };
        },
      },
    });

    const connection = createMockConnection();
    const startTime = new Date("2026-08-25T10:00:00.000Z");
    const endTime = new Date("2026-08-25T10:30:00.000Z");

    const result = await googleCalendarProvider.createEvent({
      connection,
      startTime,
      endTime,
      timezone: "Asia/Kolkata",
      purpose: "Consultation Call",
      customerName: "Priya Sharma",
      customerEmail: "priya@example.com",
    });

    assert.ok(!("error" in result));
    assert.strictEqual(result.externalEventId, "google-event-xyz-789");

    assert.strictEqual(capturedInsertParams.calendarId, "primary");
    assert.strictEqual(
      capturedInsertParams.requestBody.summary,
      "Consultation Call - Priya Sharma",
    );
    assert.strictEqual(
      capturedInsertParams.requestBody.description,
      "Booking for Priya Sharma\nPurpose: Consultation Call",
    );
    assert.strictEqual(capturedInsertParams.requestBody.start.dateTime, "2026-08-25T10:00:00.000Z");
    assert.strictEqual(capturedInsertParams.requestBody.start.timeZone, "Asia/Kolkata");
    assert.deepStrictEqual(capturedInsertParams.requestBody.attendees, [
      { email: "priya@example.com", displayName: "Priya Sharma" },
    ]);
  } finally {
    (google as any).calendar = originalCalendar;
  }
});

test("createEvent — works without optional customerEmail", async () => {
  const originalCalendar = google.calendar;
  let capturedInsertParams: any = null;

  try {
    (google as any).calendar = () => ({
      events: {
        insert: async (params: any) => {
          capturedInsertParams = params;
          return {
            data: {
              id: "google-event-no-email-123",
            },
          };
        },
      },
    });

    const connection = createMockConnection();
    const startTime = new Date("2026-08-25T10:00:00.000Z");
    const endTime = new Date("2026-08-25T10:30:00.000Z");

    const result = await googleCalendarProvider.createEvent({
      connection,
      startTime,
      endTime,
      timezone: "Asia/Kolkata",
      purpose: "Quick Followup",
      customerName: "Rahul Verma",
    });

    assert.ok(!("error" in result));
    assert.strictEqual(result.externalEventId, "google-event-no-email-123");
    assert.strictEqual(capturedInsertParams.requestBody.attendees, undefined);
  } finally {
    (google as any).calendar = originalCalendar;
  }
});

test("refreshAccessToken — decrypts refresh token, exchanges with Google and derives expiresAt without DB persistence", async () => {
  const originalOAuth2 = google.auth.OAuth2;
  let setCredentialsArg: any = null;
  let refreshCalled = false;

  try {
    const mockExpiryMs = Date.now() + 3600 * 1000;

    (google.auth as any).OAuth2 = class MockOAuth2 {
      setCredentials(creds: any) {
        setCredentialsArg = creds;
      }
      async refreshAccessToken() {
        refreshCalled = true;
        return {
          credentials: {
            access_token: "refreshed-google-access-token-456",
            expiry_date: mockExpiryMs,
          },
        };
      }
    };

    const connection = createMockConnection();
    const result = await googleCalendarProvider.refreshAccessToken(connection);

    assert.strictEqual(refreshCalled, true);
    assert.strictEqual(setCredentialsArg.refresh_token, "mock-refresh-token");
    assert.strictEqual(result.accessToken, "refreshed-google-access-token-456");
    assert.strictEqual(result.expiresAt.getTime(), mockExpiryMs);
  } finally {
    (google.auth as any).OAuth2 = originalOAuth2;
  }
});

test("transparent refresh — OAuth client is configured with refresh token and expiry for transparent SDK handling", async () => {
  const originalOAuth2 = google.auth.OAuth2;
  const originalCalendar = google.calendar;
  let capturedOAuthCredentials: any = null;

  try {
    (google.auth as any).OAuth2 = class MockOAuth2 {
      setCredentials(creds: any) {
        capturedOAuthCredentials = creds;
      }
    };

    (google as any).calendar = () => ({
      freebusy: {
        query: async () => ({
          data: { calendars: { primary: { busy: [] } } },
        }),
      },
    });

    const expiredDate = new Date(Date.now() - 60000); // 1 min ago
    const connection = createMockConnection({ expiresAt: expiredDate });

    await googleCalendarProvider.checkAvailability({
      connection,
      date: "2026-08-25",
      timezone: "Asia/Kolkata",
      workingHours: {
        days: ["TUE"],
        start: "10:00",
        end: "11:00",
      },
      durationMin: 30,
    });

    assert.strictEqual(capturedOAuthCredentials.access_token, "mock-access-token");
    assert.strictEqual(capturedOAuthCredentials.refresh_token, "mock-refresh-token");
    assert.strictEqual(capturedOAuthCredentials.expiry_date, expiredDate.getTime());
  } finally {
    (google.auth as any).OAuth2 = originalOAuth2;
    (google as any).calendar = originalCalendar;
  }
});

test("error handling — returns provider-neutral error object on Google API failure", async () => {
  const originalCalendar = google.calendar;

  try {
    (google as any).calendar = () => ({
      freebusy: {
        query: async () => {
          throw new Error("Google FreeBusy service unavailable");
        },
      },
    });

    const connection = createMockConnection();
    const result = await googleCalendarProvider.checkAvailability({
      connection,
      date: "2026-08-25",
      timezone: "Asia/Kolkata",
      workingHours: {
        days: ["TUE"],
        start: "10:00",
        end: "11:00",
      },
      durationMin: 30,
    });

    assert.ok("error" in result);
    assert.strictEqual(result.error, "Google FreeBusy service unavailable");
  } finally {
    (google as any).calendar = originalCalendar;
  }
});

test("security regression test — does not expose Authorization header or secrets in errors", async () => {
  const originalCalendar = google.calendar;

  try {
    (google as any).calendar = () => ({
      events: {
        insert: async () => {
          const sensitiveError: any = new Error("Request failed with status code 401");
          sensitiveError.config = {
            headers: {
              Authorization: "Bearer sensitive-access-token-leak-check",
            },
          };
          sensitiveError.response = {
            data: {
              error: {
                message: "Invalid Credentials",
              },
            },
          };
          throw sensitiveError;
        },
      },
    });

    const connection = createMockConnection();
    const result = await googleCalendarProvider.createEvent({
      connection,
      startTime: new Date("2026-08-25T10:00:00.000Z"),
      endTime: new Date("2026-08-25T10:30:00.000Z"),
      timezone: "Asia/Kolkata",
      purpose: "Confidential Discussion",
      customerName: "Secret Client",
    });

    assert.ok("error" in result);
    assert.strictEqual(result.error, "Request failed with status code 401");
    assert.strictEqual(
      result.error.includes("sensitive-access-token-leak-check"),
      false,
      "Error string must not expose access token",
    );
    assert.strictEqual(
      result.error.includes("Authorization"),
      false,
      "Error string must not expose Authorization header",
    );
  } finally {
    (google as any).calendar = originalCalendar;
  }
});
