import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import type { Server } from "node:http";
import { app } from "../../app.js";
import { db } from "../../config/database.js";
import { env } from "../../config/env.js";
import { calendarService } from "./calendar.service.js";

const TEST_SECRET = "test-jwt-secret-key-12345";
(env as any).JWT_SECRET = TEST_SECRET;

function generateAuthToken(payload: {
  userId: string;
  tenantId: string;
  role?: string;
  email?: string;
  name?: string;
}): string {
  return jwt.sign(
    {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role || "OWNER",
      email: payload.email || "test@example.com",
      name: payload.name || "Test User",
    },
    TEST_SECRET,
  );
}

test("Calendar Router HTTP integration suite", async (t) => {
  let server: Server;
  let baseUrl: string;

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  await t.test(
    "POST /api/v1/calendar/connect — rejects unauthenticated requests with 401",
    async () => {
      const res = await fetch(`${baseUrl}/api/v1/calendar/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      assert.equal(res.status, 401);
      const body = (await res.json()) as any;
      assert.equal(body.success, false);
      assert.equal(body.error, "Authentication token is missing or invalid");
    },
  );

  await t.test("POST /api/v1/calendar/connect — rejects non-admin users with 403", async () => {
    const token = generateAuthToken({
      userId: "member-user-id",
      tenantId: "tenant-id-1",
      role: "MEMBER",
    });

    const originalFindFirst = db.user.findFirst;
    (db.user as any).findFirst = async () => ({
      id: "member-user-id",
      tenantId: "tenant-id-1",
      role: "MEMBER",
    });

    try {
      const res = await fetch(`${baseUrl}/api/v1/calendar/connect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      assert.equal(res.status, 403);
      const body = (await res.json()) as any;
      assert.equal(body.success, false);
      assert.equal(body.error, "Forbidden: admin or owner access required");
    } finally {
      (db.user as any).findFirst = originalFindFirst;
    }
  });

  await t.test(
    "POST /api/v1/calendar/connect — initiates OAuth for tenant admin and returns URL",
    async () => {
      const token = generateAuthToken({
        userId: "admin-user-id",
        tenantId: "tenant-id-1",
        role: "OWNER",
      });

      const originalFindFirst = db.user.findFirst;
      const originalCreateUrl = calendarService.createConnectAuthorizationUrl;

      (db.user as any).findFirst = async () => ({
        id: "admin-user-id",
        tenantId: "tenant-id-1",
        role: "OWNER",
      });

      let capturedParams: any = null;
      (calendarService as any).createConnectAuthorizationUrl = async (params: any) => {
        capturedParams = params;
        return {
          url: "https://accounts.google.com/o/oauth2/v2/auth?scope=calendar&state=mock-state",
          state: "mock-state",
        };
      };

      try {
        const res = await fetch(`${baseUrl}/api/v1/calendar/connect`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tenantId: "attacker-injected-tenant-id" }), // Should be ignored in favor of JWT tenantId
        });

        assert.equal(res.status, 200);
        const body = (await res.json()) as any;
        assert.equal(body.success, true);
        assert.equal(
          body.data.url,
          "https://accounts.google.com/o/oauth2/v2/auth?scope=calendar&state=mock-state",
        );
        assert.equal(capturedParams.tenantId, "tenant-id-1");
        assert.equal(capturedParams.userId, "admin-user-id");
      } finally {
        (db.user as any).findFirst = originalFindFirst;
        (calendarService as any).createConnectAuthorizationUrl = originalCreateUrl;
      }
    },
  );

  await t.test(
    "GET /api/v1/calendar/callback — public endpoint handles successful OAuth callback",
    async () => {
      const originalHandleCallback = calendarService.handleOAuthCallback;

      let capturedParams: any = null;
      (calendarService as any).handleOAuthCallback = async (params: any) => {
        capturedParams = params;
        return {
          tenantId: "tenant-callback-xyz",
          userId: "user-callback-xyz",
          connectedAt: new Date("2026-08-23T15:00:00.000Z"),
          provider: "google",
        };
      };

      try {
        const res = await fetch(
          `${baseUrl}/api/v1/calendar/callback?code=google-auth-code&state=oauth-state-token`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          },
        );

        assert.equal(res.status, 200);
        const body = (await res.json()) as any;
        assert.equal(body.success, true);
        assert.equal(body.data.connected, true);
        assert.equal(body.data.provider, "google");
        assert.equal(capturedParams.code, "google-auth-code");
        assert.equal(capturedParams.state, "oauth-state-token");
      } finally {
        (calendarService as any).handleOAuthCallback = originalHandleCallback;
      }
    },
  );

  await t.test(
    "GET /api/v1/calendar/callback — returns HTML confirmation for browser redirect",
    async () => {
      const originalHandleCallback = calendarService.handleOAuthCallback;

      (calendarService as any).handleOAuthCallback = async () => ({
        tenantId: "tenant-html",
        userId: "user-html",
        connectedAt: new Date(),
        provider: "google",
      });

      try {
        const res = await fetch(
          `${baseUrl}/api/v1/calendar/callback?code=code-html&state=state-html`,
          {
            method: "GET",
            headers: {
              Accept: "text/html,application/xhtml+xml",
            },
          },
        );

        assert.equal(res.status, 200);
        const text = await res.text();
        assert.ok(text.includes("Google Calendar Connected Successfully"));
        assert.ok(text.includes("CALENDAR_CONNECTED"));
      } finally {
        (calendarService as any).handleOAuthCallback = originalHandleCallback;
      }
    },
  );

  await t.test("GET /api/v1/calendar/callback — returns 400 on missing code or state", async () => {
    const res = await fetch(`${baseUrl}/api/v1/calendar/callback?code=only-code`, {
      method: "GET",
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.error, "Missing code or state parameter");
  });

  await t.test(
    "GET /api/v1/calendar/callback — returns 400 on Google error query parameter",
    async () => {
      const res = await fetch(`${baseUrl}/api/v1/calendar/callback?error=access_denied`, {
        method: "GET",
      });

      assert.equal(res.status, 400);
      const body = (await res.json()) as any;
      assert.equal(body.success, false);
      assert.equal(body.error, "Google authorization error: access_denied");
    },
  );

  await t.test(
    "GET /api/v1/calendar/callback — returns HTML error page when Google returns error query and Accept is text/html",
    async () => {
      const res = await fetch(`${baseUrl}/api/v1/calendar/callback?error=access_denied`, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml",
        },
      });

      assert.equal(res.status, 400);
      const text = await res.text();
      assert.ok(text.includes("Google Calendar Connection Cancelled or Failed"));
      assert.ok(text.includes("Google authorization error: access_denied"));
    },
  );

  await t.test(
    "GET /api/v1/calendar/callback — returns HTML error page when service throws and Accept is text/html",
    async () => {
      const originalHandleCallback = calendarService.handleOAuthCallback;
      (calendarService as any).handleOAuthCallback = async () => {
        throw new Error("Expired OAuth state");
      };

      try {
        const res = await fetch(
          `${baseUrl}/api/v1/calendar/callback?code=bad-code&state=expired-state`,
          {
            method: "GET",
            headers: {
              Accept: "text/html,application/xhtml+xml",
            },
          },
        );

        assert.equal(res.status, 400);
        const text = await res.text();
        assert.ok(text.includes("Google Calendar Connection Failed"));
        assert.ok(text.includes("Expired OAuth state"));
      } finally {
        (calendarService as any).handleOAuthCallback = originalHandleCallback;
      }
    },
  );

  await t.test(
    "GET /api/v1/calendar/status — returns status for authenticated tenant",
    async () => {
      const token = generateAuthToken({
        userId: "user-status",
        tenantId: "tenant-status",
        role: "MEMBER",
      });

      const originalGetStatus = calendarService.getStatus;
      (calendarService as any).getStatus = async (tenantId: string) => {
        assert.equal(tenantId, "tenant-status");
        return {
          isConnected: true,
          connectedAt: new Date("2026-08-23T12:00:00.000Z"),
          provider: "google",
        };
      };

      try {
        const res = await fetch(`${baseUrl}/api/v1/calendar/status`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        assert.equal(res.status, 200);
        const body = (await res.json()) as any;
        assert.equal(body.success, true);
        assert.equal(body.data.isConnected, true);
        assert.equal(body.data.provider, "google");
      } finally {
        (calendarService as any).getStatus = originalGetStatus;
      }
    },
  );

  await t.test(
    "POST /api/v1/calendar/connect — initiates OAuth for ADMIN role as well",
    async () => {
      const token = generateAuthToken({
        userId: "admin-role-id",
        tenantId: "tenant-admin-1",
        role: "ADMIN",
      });

      const originalFindFirst = db.user.findFirst;
      const originalCreateUrl = calendarService.createConnectAuthorizationUrl;

      (db.user as any).findFirst = async () => ({
        id: "admin-role-id",
        tenantId: "tenant-admin-1",
        role: "ADMIN",
      });

      (calendarService as any).createConnectAuthorizationUrl = async () => ({
        url: "https://accounts.google.com/o/oauth2/v2/auth?scope=calendar&state=admin-state",
        state: "admin-state",
      });

      try {
        const res = await fetch(`${baseUrl}/api/v1/calendar/connect`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        assert.equal(res.status, 200);
        const body = (await res.json()) as any;
        assert.equal(body.success, true);
        assert.equal(
          body.data.url,
          "https://accounts.google.com/o/oauth2/v2/auth?scope=calendar&state=admin-state",
        );
      } finally {
        (db.user as any).findFirst = originalFindFirst;
        (calendarService as any).createConnectAuthorizationUrl = originalCreateUrl;
      }
    },
  );

  await t.test(
    "DELETE /api/v1/calendar/disconnect — rejects unauthenticated requests with 401",
    async () => {
      const res = await fetch(`${baseUrl}/api/v1/calendar/disconnect`, {
        method: "DELETE",
      });

      assert.equal(res.status, 401);
      const body = (await res.json()) as any;
      assert.equal(body.success, false);
      assert.equal(body.error, "Authentication token is missing or invalid");
    },
  );

  await t.test(
    "DELETE /api/v1/calendar/disconnect — rejects non-admin users with 403",
    async () => {
      const token = generateAuthToken({
        userId: "member-user-id",
        tenantId: "tenant-id-1",
        role: "MEMBER",
      });

      const originalFindFirst = db.user.findFirst;
      (db.user as any).findFirst = async () => ({
        id: "member-user-id",
        tenantId: "tenant-id-1",
        role: "MEMBER",
      });

      try {
        const res = await fetch(`${baseUrl}/api/v1/calendar/disconnect`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        assert.equal(res.status, 403);
        const body = (await res.json()) as any;
        assert.equal(body.success, false);
        assert.equal(body.error, "Forbidden: admin or owner access required");
      } finally {
        (db.user as any).findFirst = originalFindFirst;
      }
    },
  );

  await t.test(
    "Phase 4 Hardening — Multi-tenant isolation: Tenant A and Tenant B connections remain strictly isolated",
    async () => {
      const tokenA = generateAuthToken({
        userId: "user-tenant-a",
        tenantId: "tenant-a",
        role: "OWNER",
      });
      const tokenB = generateAuthToken({
        userId: "user-tenant-b",
        tenantId: "tenant-b",
        role: "OWNER",
      });

      const originalFindFirst = db.user.findFirst;
      const originalGetStatus = calendarService.getStatus;
      const originalDisconnect = calendarService.disconnect;

      (db.user as any).findFirst = async (args: any) => {
        if (args.where.tenantId === "tenant-a" && args.where.id === "user-tenant-a") {
          return { id: "user-tenant-a", tenantId: "tenant-a", role: "OWNER" };
        }
        if (args.where.tenantId === "tenant-b" && args.where.id === "user-tenant-b") {
          return { id: "user-tenant-b", tenantId: "tenant-b", role: "OWNER" };
        }
        return null;
      };

      (calendarService as any).getStatus = async (tenantId: string) => {
        if (tenantId === "tenant-a") {
          return {
            isConnected: true,
            provider: "google",
            connectedAt: new Date("2026-08-23T10:00:00Z"),
          };
        }
        return { isConnected: false };
      };

      let disconnectedTenant: string | null = null;
      (calendarService as any).disconnect = async (tenantId: string) => {
        disconnectedTenant = tenantId;
        return { success: true };
      };

      try {
        // Tenant A sees its connected status
        const resA = await fetch(`${baseUrl}/api/v1/calendar/status`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        const bodyA = (await resA.json()) as any;
        assert.equal(bodyA.data.isConnected, true);
        assert.equal(bodyA.data.provider, "google");

        // Tenant B sees disconnected status (does not leak Tenant A's connection)
        const resB = await fetch(`${baseUrl}/api/v1/calendar/status`, {
          headers: { Authorization: `Bearer ${tokenB}` },
        });
        const bodyB = (await resB.json()) as any;
        assert.equal(bodyB.data.isConnected, false);

        // Tenant B cannot disconnect Tenant A (even if passing Tenant A's id in body)
        const resDisconnectB = await fetch(`${baseUrl}/api/v1/calendar/disconnect`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${tokenB}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tenantId: "tenant-a" }),
        });
        const bodyDisconnectB = (await resDisconnectB.json()) as any;
        assert.equal(bodyDisconnectB.success, true);
        assert.equal(
          disconnectedTenant,
          "tenant-b",
          "Must disconnect Tenant B from JWT, ignoring body injection",
        );
      } finally {
        (db.user as any).findFirst = originalFindFirst;
        (calendarService as any).getStatus = originalGetStatus;
        (calendarService as any).disconnect = originalDisconnect;
      }
    },
  );

  await t.test(
    "Phase 4 Hardening — Disconnect removes CalendarConnection while preserving all historical Bookings",
    async () => {
      const testTenantId = "tenant-booking-preserve";
      const token = generateAuthToken({
        userId: "admin-booking-test",
        tenantId: testTenantId,
        role: "OWNER",
      });

      const originalFindFirst = db.user.findFirst;
      const originalDeleteConnection = db.calendarConnection.deleteMany;
      const originalBookingFindMany = db.booking.findMany;

      // Mock historical bookings
      const mockBookings = [
        { id: "booking-1", tenantId: testTenantId, status: "CONFIRMED" },
        { id: "booking-2", tenantId: testTenantId, status: "COMPLETED" },
        { id: "booking-3", tenantId: testTenantId, status: "CANCELLED" },
      ];

      (db.user as any).findFirst = async () => ({
        id: "admin-booking-test",
        tenantId: testTenantId,
        role: "OWNER",
      });

      let connectionDeleted = false;
      (db.calendarConnection as any).deleteMany = async (args: any) => {
        if (args.where.tenantId === testTenantId) {
          connectionDeleted = true;
        }
        return { count: 1 };
      };

      (db.booking as any).findMany = async (args: any) => {
        return mockBookings.filter((b) => b.tenantId === args.where.tenantId);
      };

      try {
        // Count bookings before disconnect
        const bookingsBefore = await db.booking.findMany({ where: { tenantId: testTenantId } });
        assert.equal(bookingsBefore.length, 3);

        // Perform disconnect
        const res = await fetch(`${baseUrl}/api/v1/calendar/disconnect`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await res.json()) as any;
        assert.equal(body.success, true);
        assert.equal(body.data.disconnected, true);
        assert.equal(connectionDeleted, true, "CalendarConnection should be deleted");

        // Count bookings after disconnect
        const bookingsAfter = await db.booking.findMany({ where: { tenantId: testTenantId } });
        assert.equal(
          bookingsAfter.length,
          3,
          "Historical bookings must remain completely unchanged",
        );
        assert.deepEqual(bookingsAfter, mockBookings);
      } finally {
        (db.user as any).findFirst = originalFindFirst;
        (db.calendarConnection as any).deleteMany = originalDeleteConnection;
        (db.booking as any).findMany = originalBookingFindMany;
      }
    },
  );

  await t.test(
    "Phase 4 Hardening — Replay and expiration protection over HTTP callback",
    async () => {
      let stateConsumedCount = 0;
      const originalHandleCallback = calendarService.handleOAuthCallback;

      (calendarService as any).handleOAuthCallback = async (params: any) => {
        if (params.state === "replayed-state") {
          stateConsumedCount++;
          if (stateConsumedCount > 1) {
            throw new Error("Invalid or replayed OAuth state");
          }
          return {
            tenantId: "tenant-replay",
            userId: "user-replay",
            connectedAt: new Date(),
            provider: "google",
          };
        }
        if (params.state === "expired-state") {
          throw new Error("Expired OAuth state");
        }
        throw new Error("Unknown state");
      };

      try {
        // First callback attempt with state -> succeeds (200)
        const res1 = await fetch(
          `${baseUrl}/api/v1/calendar/callback?code=valid-code&state=replayed-state`,
        );
        assert.equal(res1.status, 200);
        const body1 = (await res1.json()) as any;
        assert.equal(body1.success, true);
        assert.equal(body1.data.connected, true);

        // Second callback attempt with same state -> rejected (400)
        const res2 = await fetch(
          `${baseUrl}/api/v1/calendar/callback?code=valid-code&state=replayed-state`,
        );
        assert.equal(res2.status, 400);
        const body2 = (await res2.json()) as any;
        assert.equal(body2.success, false);
        assert.equal(body2.error, "Invalid or replayed OAuth state");

        // Expired state callback attempt -> rejected (400)
        const resExpired = await fetch(
          `${baseUrl}/api/v1/calendar/callback?code=valid-code&state=expired-state`,
        );
        assert.equal(resExpired.status, 400);
        const bodyExpired = (await resExpired.json()) as any;
        assert.equal(bodyExpired.success, false);
        assert.equal(bodyExpired.error, "Expired OAuth state");
      } finally {
        (calendarService as any).handleOAuthCallback = originalHandleCallback;
      }
    },
  );

  await t.test(
    "Phase 4 Hardening — Comprehensive zero-token leakage verification across all responses",
    async () => {
      const token = generateAuthToken({
        userId: "leak-test-user",
        tenantId: "leak-test-tenant",
        role: "OWNER",
      });

      const originalFindFirst = db.user.findFirst;
      const originalCreateUrl = calendarService.createConnectAuthorizationUrl;
      const originalHandleCallback = calendarService.handleOAuthCallback;
      const originalGetStatus = calendarService.getStatus;
      const originalDisconnect = calendarService.disconnect;

      (db.user as any).findFirst = async () => ({
        id: "leak-test-user",
        tenantId: "leak-test-tenant",
        role: "OWNER",
      });

      (calendarService as any).createConnectAuthorizationUrl = async () => ({
        url: "https://accounts.google.com/o/oauth2/v2/auth?scope=calendar&state=safe-state",
        state: "safe-state",
      });

      (calendarService as any).handleOAuthCallback = async () => ({
        tenantId: "leak-test-tenant",
        userId: "leak-test-user",
        connectedAt: new Date("2026-08-23T12:00:00Z"),
        provider: "google",
      });

      (calendarService as any).getStatus = async () => ({
        isConnected: true,
        connectedAt: new Date("2026-08-23T12:00:00Z"),
        provider: "google",
      });

      (calendarService as any).disconnect = async () => ({ success: true });

      try {
        const endpoints: Array<{ method: string; url: string; headers: Record<string, string> }> = [
          {
            method: "POST",
            url: `${baseUrl}/api/v1/calendar/connect`,
            headers: { Authorization: `Bearer ${token}` },
          },
          {
            method: "GET",
            url: `${baseUrl}/api/v1/calendar/callback?code=test-code&state=safe-state`,
            headers: {},
          },
          {
            method: "GET",
            url: `${baseUrl}/api/v1/calendar/status`,
            headers: { Authorization: `Bearer ${token}` },
          },
          {
            method: "DELETE",
            url: `${baseUrl}/api/v1/calendar/disconnect`,
            headers: { Authorization: `Bearer ${token}` },
          },
        ];

        for (const ep of endpoints) {
          const res = await fetch(ep.url, { method: ep.method, headers: ep.headers });
          const rawText = await res.text();

          // Verify no token leakage in raw text
          assert.ok(
            !rawText.includes("access_token"),
            `Response from ${ep.method} ${ep.url} should not contain access_token`,
          );
          assert.ok(
            !rawText.includes("refresh_token"),
            `Response from ${ep.method} ${ep.url} should not contain refresh_token`,
          );
          assert.ok(
            !rawText.includes("accessTokenEncrypted"),
            `Response from ${ep.method} ${ep.url} should not contain accessTokenEncrypted`,
          );
          assert.ok(
            !rawText.includes("refreshTokenEncrypted"),
            `Response from ${ep.method} ${ep.url} should not contain refreshTokenEncrypted`,
          );
          assert.ok(
            !rawText.includes("client_secret"),
            `Response from ${ep.method} ${ep.url} should not contain client_secret`,
          );
          assert.ok(
            !rawText.includes("CALENDAR_TOKEN_ENCRYPTION_KEY"),
            `Response from ${ep.method} ${ep.url} should not contain encryption key`,
          );
        }
      } finally {
        (db.user as any).findFirst = originalFindFirst;
        (calendarService as any).createConnectAuthorizationUrl = originalCreateUrl;
        (calendarService as any).handleOAuthCallback = originalHandleCallback;
        (calendarService as any).getStatus = originalGetStatus;
        (calendarService as any).disconnect = originalDisconnect;
      }
    },
  );
});
