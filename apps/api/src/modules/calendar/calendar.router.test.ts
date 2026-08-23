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
    "DELETE /api/v1/calendar/disconnect — disconnects calendar for tenant admin",
    async () => {
      const token = generateAuthToken({
        userId: "admin-disconnect",
        tenantId: "tenant-disconnect",
        role: "ADMIN",
      });

      const originalFindFirst = db.user.findFirst;
      const originalDisconnect = calendarService.disconnect;

      (db.user as any).findFirst = async () => ({
        id: "admin-disconnect",
        tenantId: "tenant-disconnect",
        role: "ADMIN",
      });

      let disconnectedTenantId: string | null = null;
      (calendarService as any).disconnect = async (tenantId: string) => {
        disconnectedTenantId = tenantId;
        return { success: true };
      };

      try {
        const res = await fetch(`${baseUrl}/api/v1/calendar/disconnect`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        assert.equal(res.status, 200);
        const body = (await res.json()) as any;
        assert.equal(body.success, true);
        assert.equal(body.data.disconnected, true);
        assert.equal(disconnectedTenantId, "tenant-disconnect");
      } finally {
        (db.user as any).findFirst = originalFindFirst;
        (calendarService as any).disconnect = originalDisconnect;
      }
    },
  );
});
