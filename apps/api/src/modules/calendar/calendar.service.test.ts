import test from "node:test";
import assert from "node:assert/strict";
import { google } from "googleapis";
import { db } from "../../config/database.js";
import { env } from "../../config/env.js";
import { decryptToken } from "@antigravity/utils/crypto";
import { calendarService, GOOGLE_CALENDAR_SCOPES } from "./calendar.service.js";

// Ensure a valid 64-character test encryption key is configured
const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
(env as any).CALENDAR_TOKEN_ENCRYPTION_KEY = TEST_KEY;
(env as any).GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
(env as any).GOOGLE_CLIENT_SECRET = "test-google-client-secret";
(env as any).GOOGLE_OAUTH_REDIRECT_URL = "http://localhost:3000/api/v1/calendar/callback";

test("createConnectAuthorizationUrl — generates opaque 256-bit state, 10-min TTL, and Google consent URL", async () => {
  let createdStateData: any = null;

  const originalCreate = db.calendarOAuthState.create;
  (db.calendarOAuthState as any).create = async (args: any) => {
    createdStateData = args.data;
    return { id: "test-state-id", ...args.data, createdAt: new Date() };
  };

  try {
    const result = await calendarService.createConnectAuthorizationUrl({
      tenantId: "tenant-uuid-101",
      userId: "user-uuid-202",
    });

    assert.ok(result.url, "Should return an authorization URL");
    assert.ok(result.state, "Should return the generated state");

    // 1. 32 bytes = 64 hex characters = 256 bits entropy
    assert.equal(result.state.length, 64, "State must be a 64-character hex string (256 bits)");
    assert.match(result.state, /^[0-9a-f]{64}$/, "State must be valid hex");

    // 2. Database persistence verification
    assert.ok(createdStateData, "State should be persisted to database");
    assert.equal(createdStateData.state, result.state);
    assert.equal(createdStateData.tenantId, "tenant-uuid-101");
    assert.equal(createdStateData.userId, "user-uuid-202");

    // 3. Expiration window verification (~10 minutes)
    const expectedExpiryMin = Date.now() + 9.5 * 60 * 1000;
    const expectedExpiryMax = Date.now() + 10.5 * 60 * 1000;
    assert.ok(
      createdStateData.expiresAt.getTime() >= expectedExpiryMin &&
        createdStateData.expiresAt.getTime() <= expectedExpiryMax,
      "expiresAt must be set to ~10 minutes in the future",
    );

    // 4. URL scopes and parameters verification
    const parsedUrl = new URL(result.url);
    assert.deepEqual(GOOGLE_CALENDAR_SCOPES, [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ]);
    assert.ok(parsedUrl.searchParams.get("scope")?.includes("calendar.readonly"));
    assert.ok(parsedUrl.searchParams.get("scope")?.includes("calendar.events"));
    assert.equal(parsedUrl.searchParams.get("state"), result.state);
    assert.equal(parsedUrl.searchParams.get("access_type"), "offline");
    assert.equal(parsedUrl.searchParams.get("prompt"), "consent");

    // 5. Zero tenant/user leak in state string
    assert.ok(!result.state.includes("tenant-uuid-101"));
    assert.ok(!result.state.includes("user-uuid-202"));
  } finally {
    (db.calendarOAuthState as any).create = originalCreate;
  }
});

test("consumeOAuthState — atomically consumes valid state and returns trusted tenant/user", async () => {
  const testState = "a".repeat(64);
  let deletedArgs: any = null;

  const originalDelete = db.calendarOAuthState.delete;
  (db.calendarOAuthState as any).delete = async (args: any) => {
    deletedArgs = args;
    return {
      tenantId: "tenant-trusted-456",
      userId: "user-trusted-789",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Valid (5 min remaining)
    };
  };

  try {
    const consumed = await calendarService.consumeOAuthState(testState);

    assert.equal(deletedArgs?.where?.state, testState);
    assert.equal(consumed.tenantId, "tenant-trusted-456");
    assert.equal(consumed.userId, "user-trusted-789");
  } finally {
    (db.calendarOAuthState as any).delete = originalDelete;
  }
});

test("consumeOAuthState — rejects nonexistent or already replayed state", async () => {
  const originalDelete = db.calendarOAuthState.delete;
  (db.calendarOAuthState as any).delete = async () => {
    const err: any = new Error("Record to delete does not exist.");
    err.code = "P2025";
    throw err;
  };

  try {
    await assert.rejects(
      async () => {
        await calendarService.consumeOAuthState("replayed-or-fake-state");
      },
      {
        message: "Invalid or replayed OAuth state",
      },
    );
  } finally {
    (db.calendarOAuthState as any).delete = originalDelete;
  }
});

test("consumeOAuthState — rejects expired state", async () => {
  const originalDelete = db.calendarOAuthState.delete;
  (db.calendarOAuthState as any).delete = async () => {
    return {
      tenantId: "tenant-expired",
      userId: "user-expired",
      expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 min ago
    };
  };

  try {
    await assert.rejects(
      async () => {
        await calendarService.consumeOAuthState("expired-state-test");
      },
      {
        message: "Expired OAuth state",
      },
    );
  } finally {
    (db.calendarOAuthState as any).delete = originalDelete;
  }
});

test("handleOAuthCallback — exchanges code, encrypts tokens, and upserts CalendarConnection", async () => {
  const testState = "b".repeat(64);
  const testCode = "google-auth-code-12345";

  let upsertData: any = null;

  const originalDelete = db.calendarOAuthState.delete;
  const originalUpsert = db.calendarConnection.upsert;
  const originalOAuth2 = google.auth.OAuth2;

  (db.calendarOAuthState as any).delete = async () => ({
    tenantId: "tenant-callback-100",
    userId: "user-callback-200",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  (db.calendarConnection as any).upsert = async (args: any) => {
    upsertData = args;
    return {
      id: "conn-123",
      tenantId: args.create.tenantId,
      provider: args.create.provider,
      connectedById: args.create.connectedById,
      connectedAt: new Date("2026-08-23T12:00:00Z"),
    };
  };

  (google.auth as any).OAuth2 = class {
    async getToken(code: string) {
      assert.equal(code, testCode);
      return {
        tokens: {
          access_token: "ya29.google-raw-access-token",
          refresh_token: "1//google-raw-refresh-token",
          expiry_date: Date.now() + 3600 * 1000,
        },
      };
    }
  };

  try {
    const result = await calendarService.handleOAuthCallback({
      code: testCode,
      state: testState,
    });

    assert.equal(result.tenantId, "tenant-callback-100");
    assert.equal(result.userId, "user-callback-200");
    assert.equal(result.provider, "google");

    // 1. Verify encrypted token persistence
    assert.ok(upsertData, "CalendarConnection should be upserted");
    assert.notEqual(upsertData.create.accessTokenEncrypted, "ya29.google-raw-access-token");
    assert.notEqual(upsertData.create.refreshTokenEncrypted, "1//google-raw-refresh-token");

    // 2. Decrypt verification
    const decryptedAccess = decryptToken(upsertData.create.accessTokenEncrypted, TEST_KEY);
    const decryptedRefresh = decryptToken(upsertData.create.refreshTokenEncrypted, TEST_KEY);
    assert.equal(decryptedAccess, "ya29.google-raw-access-token");
    assert.equal(decryptedRefresh, "1//google-raw-refresh-token");

    // 3. Verify zero token exposure in return payload
    assert.equal((result as any).accessToken, undefined);
    assert.equal((result as any).refreshToken, undefined);
    assert.equal((result as any).accessTokenEncrypted, undefined);
  } finally {
    (db.calendarOAuthState as any).delete = originalDelete;
    (db.calendarConnection as any).upsert = originalUpsert;
    (google.auth as any).OAuth2 = originalOAuth2;
  }
});

test("handleOAuthCallback — preserves existing refresh token on reconnect when Google omits it", async () => {
  const testState = "c".repeat(64);
  const testCode = "google-reconnect-code";

  let upsertData: any = null;

  const originalDelete = db.calendarOAuthState.delete;
  const originalFindUnique = db.calendarConnection.findUnique;
  const originalUpsert = db.calendarConnection.upsert;
  const originalOAuth2 = google.auth.OAuth2;

  const existingEncryptedRefresh = "encrypted-existing-refresh-token";

  (db.calendarOAuthState as any).delete = async () => ({
    tenantId: "tenant-reconnect-100",
    userId: "user-reconnect-200",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  (db.calendarConnection as any).findUnique = async () => ({
    refreshTokenEncrypted: existingEncryptedRefresh,
  });

  (db.calendarConnection as any).upsert = async (args: any) => {
    upsertData = args;
    return {
      id: "conn-reconnect",
      tenantId: args.create.tenantId,
      provider: args.create.provider,
      connectedById: args.create.connectedById,
      connectedAt: new Date(),
    };
  };

  (google.auth as any).OAuth2 = class {
    async getToken() {
      return {
        tokens: {
          access_token: "ya29.new-access-token",
          // Google omits refresh_token on re-consent!
          refresh_token: undefined,
          expiry_date: Date.now() + 3600 * 1000,
        },
      };
    }
  };

  try {
    const result = await calendarService.handleOAuthCallback({
      code: testCode,
      state: testState,
    });

    assert.equal(result.tenantId, "tenant-reconnect-100");
    assert.equal(upsertData.create.refreshTokenEncrypted, existingEncryptedRefresh);
    assert.equal(upsertData.update.refreshTokenEncrypted, existingEncryptedRefresh);
  } finally {
    (db.calendarOAuthState as any).delete = originalDelete;
    (db.calendarConnection as any).findUnique = originalFindUnique;
    (db.calendarConnection as any).upsert = originalUpsert;
    (google.auth as any).OAuth2 = originalOAuth2;
  }
});

test("handleOAuthCallback — fails safely if no refresh token exists and Google omits it", async () => {
  const originalDelete = db.calendarOAuthState.delete;
  const originalFindUnique = db.calendarConnection.findUnique;
  const originalOAuth2 = google.auth.OAuth2;

  (db.calendarOAuthState as any).delete = async () => ({
    tenantId: "tenant-no-refresh",
    userId: "user-no-refresh",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  (db.calendarConnection as any).findUnique = async () => null; // No existing connection

  (google.auth as any).OAuth2 = class {
    async getToken() {
      return {
        tokens: {
          access_token: "ya29.access-only",
          refresh_token: undefined,
        },
      };
    }
  };

  try {
    await assert.rejects(
      async () => {
        await calendarService.handleOAuthCallback({
          code: "test-code",
          state: "test-state",
        });
      },
      {
        message: "No refresh token returned by Google and no existing connection found",
      },
    );
  } finally {
    (db.calendarOAuthState as any).delete = originalDelete;
    (db.calendarConnection as any).findUnique = originalFindUnique;
    (google.auth as any).OAuth2 = originalOAuth2;
  }
});

test("handleOAuthCallback — fails safely and does NOT create connection when access token is missing", async () => {
  let upsertCalled = false;

  const originalDelete = db.calendarOAuthState.delete;
  const originalUpsert = db.calendarConnection.upsert;
  const originalOAuth2 = google.auth.OAuth2;

  (db.calendarOAuthState as any).delete = async () => ({
    tenantId: "tenant-no-access-token",
    userId: "user-no-access-token",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  (db.calendarConnection as any).upsert = async () => {
    upsertCalled = true;
    return {};
  };

  (google.auth as any).OAuth2 = class {
    async getToken() {
      return {
        tokens: {
          access_token: undefined, // Missing access token!
          refresh_token: "1//valid-refresh-token",
        },
      };
    }
  };

  try {
    await assert.rejects(
      async () => {
        await calendarService.handleOAuthCallback({
          code: "test-code",
          state: "test-state",
        });
      },
      {
        message: "Google did not return an access token",
      },
    );
    assert.equal(
      upsertCalled,
      false,
      "CalendarConnection.upsert must not be called when access token is missing",
    );
  } finally {
    (db.calendarOAuthState as any).delete = originalDelete;
    (db.calendarConnection as any).upsert = originalUpsert;
    (google.auth as any).OAuth2 = originalOAuth2;
  }
});

test("handleOAuthCallback — security test: does not leak sensitive tokens in thrown errors on Google exchange failure", async () => {
  const originalDelete = db.calendarOAuthState.delete;
  const originalOAuth2 = google.auth.OAuth2;

  (db.calendarOAuthState as any).delete = async () => ({
    tenantId: "tenant-leak-test",
    userId: "user-leak-test",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  (google.auth as any).OAuth2 = class {
    async getToken() {
      const err: any = new Error("invalid_grant");
      err.response = {
        data: {
          error: "invalid_grant",
          sensitive_secret: "secret-leak-12345",
          Authorization: "Bearer sensitive-leak-token",
        },
      };
      throw err;
    }
  };

  try {
    let thrownError: any = null;
    try {
      await calendarService.handleOAuthCallback({
        code: "bad-code",
        state: "valid-state",
      });
    } catch (e: any) {
      thrownError = e;
    }

    assert.ok(thrownError, "Should throw an error");
    assert.equal(thrownError.message, "Failed to exchange authorization code with Google");
    assert.ok(!thrownError.message.includes("secret-leak-12345"));
    assert.ok(!thrownError.message.includes("sensitive-leak-token"));
  } finally {
    (db.calendarOAuthState as any).delete = originalDelete;
    (google.auth as any).OAuth2 = originalOAuth2;
  }
});

test("getStatus and disconnect — query status and delete CalendarConnection", async () => {
  let deletedTenantId: string | null = null;

  const originalFindUnique = db.calendarConnection.findUnique;
  const originalDeleteMany = db.calendarConnection.deleteMany;

  (db.calendarConnection as any).findUnique = async (args: any) => {
    if (args.where.tenantId === "tenant-connected") {
      return {
        connectedAt: new Date("2026-08-23T10:00:00Z"),
        provider: "google",
      };
    }
    return null;
  };

  (db.calendarConnection as any).deleteMany = async (args: any) => {
    deletedTenantId = args.where.tenantId;
    return { count: 1 };
  };

  try {
    const connectedStatus = await calendarService.getStatus("tenant-connected");
    assert.equal(connectedStatus.isConnected, true);
    assert.equal(connectedStatus.provider, "google");

    const disconnectedStatus = await calendarService.getStatus("tenant-not-connected");
    assert.equal(disconnectedStatus.isConnected, false);

    const disconnectRes = await calendarService.disconnect("tenant-connected");
    assert.equal(disconnectRes.success, true);
    assert.equal(deletedTenantId, "tenant-connected");
  } finally {
    (db.calendarConnection as any).findUnique = originalFindUnique;
    (db.calendarConnection as any).deleteMany = originalDeleteMany;
  }
});
