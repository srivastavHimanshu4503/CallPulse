import crypto from "node:crypto";
import { google } from "googleapis";
import { db } from "../../config/database.js";
import { env } from "../../config/env.js";
import { encryptToken } from "@antigravity/utils/crypto";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

export interface CreateConnectUrlParams {
  tenantId: string;
  userId: string;
}

export interface CreateConnectUrlResult {
  url: string;
  state: string;
}

export interface HandleOAuthCallbackParams {
  code: string;
  state: string;
}

export interface CalendarConnectionResult {
  tenantId: string;
  userId: string;
  connectedAt: Date;
  provider: string;
}

export interface CalendarStatusResult {
  isConnected: boolean;
  connectedAt?: Date;
  provider?: string;
}

export class CalendarService {
  private getOAuth2Client() {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_OAUTH_REDIRECT_URL,
    );
  }

  /**
   * Generates a secure opaque 256-bit OAuth state, persists it with a 10-minute TTL,
   * and builds Google's Calendar OAuth authorization consent URL.
   */
  async createConnectAuthorizationUrl(
    params: CreateConnectUrlParams,
  ): Promise<CreateConnectUrlResult> {
    const { tenantId, userId } = params;

    if (!tenantId || typeof tenantId !== "string") {
      throw new Error("tenantId is required");
    }
    if (!userId || typeof userId !== "string") {
      throw new Error("userId is required");
    }

    // Generate 32 cryptographically secure random bytes (256-bit entropy, 64 hex characters)
    const state = crypto.randomBytes(32).toString("hex");

    // 10-minute state lifetime for CSRF/replay window
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Persist server-side state bound to trusted tenant and user
    await db.calendarOAuthState.create({
      data: {
        state,
        tenantId,
        userId,
        expiresAt,
      },
    });

    const oauth2Client = this.getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [...GOOGLE_CALENDAR_SCOPES],
      state,
      prompt: "consent",
    });

    return { url, state };
  }

  /**
   * Atomically consumes (deletes) an OAuth state record.
   * Enforces single-use replay protection and TTL expiration.
   */
  async consumeOAuthState(state: string): Promise<{ tenantId: string; userId: string }> {
    if (!state || typeof state !== "string") {
      throw new Error("OAuth state is required");
    }

    const now = new Date();

    // Atomic delete enforces single-use: concurrent callbacks cannot both consume the state
    let record: { tenantId: string; userId: string; expiresAt: Date };
    try {
      record = await db.calendarOAuthState.delete({
        where: { state },
        select: {
          tenantId: true,
          userId: true,
          expiresAt: true,
        },
      });
    } catch (err: any) {
      if (err?.code === "P2025" || err?.message?.includes("Record to delete does not exist")) {
        throw new Error("Invalid or replayed OAuth state");
      }
      throw err;
    }

    if (record.expiresAt <= now) {
      throw new Error("Expired OAuth state");
    }

    return {
      tenantId: record.tenantId,
      userId: record.userId,
    };
  }

  /**
   * Handles Google OAuth callback:
   * 1. Atomically consumes OAuth state to resolve trusted tenantId & userId.
   * 2. Exchanges code for Google tokens.
   * 3. Encrypts tokens via AES-256-GCM.
   * 4. Preserves existing refresh token if Google omits it on re-consent.
   * 5. Upserts CalendarConnection for the tenant.
   */
  async handleOAuthCallback(params: HandleOAuthCallbackParams): Promise<CalendarConnectionResult> {
    const { code, state } = params;

    if (!code || typeof code !== "string") {
      throw new Error("Authorization code is required");
    }
    if (!state || typeof state !== "string") {
      throw new Error("OAuth state is required");
    }

    if (!env.CALENDAR_TOKEN_ENCRYPTION_KEY) {
      throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is not configured");
    }

    // Step 1: Atomically consume state (single-use + expiry verification)
    const { tenantId, userId } = await this.consumeOAuthState(state);

    // Step 2: Exchange authorization code with Google OAuth2
    const oauth2Client = this.getOAuth2Client();
    let tokens: {
      access_token?: string | null;
      refresh_token?: string | null;
      expiry_date?: number | null;
    };

    try {
      const response = await oauth2Client.getToken(code);
      tokens = response.tokens;
    } catch (err: unknown) {
      throw new Error("Failed to exchange authorization code with Google");
    }

    if (!tokens || !tokens.access_token) {
      throw new Error("Google did not return an access token");
    }

    // Step 3: Encrypt access token
    const accessTokenEncrypted = encryptToken(
      tokens.access_token,
      env.CALENDAR_TOKEN_ENCRYPTION_KEY,
    );

    // Step 4: Handle refresh token with reconnect preservation invariant
    let refreshTokenEncrypted: string | undefined;

    if (tokens.refresh_token) {
      refreshTokenEncrypted = encryptToken(tokens.refresh_token, env.CALENDAR_TOKEN_ENCRYPTION_KEY);
    } else {
      // Re-connect scenario: check for existing connection to preserve refresh token
      const existing = await db.calendarConnection.findUnique({
        where: { tenantId },
        select: { refreshTokenEncrypted: true },
      });

      if (existing?.refreshTokenEncrypted) {
        refreshTokenEncrypted = existing.refreshTokenEncrypted;
      }
    }

    if (!refreshTokenEncrypted) {
      throw new Error("No refresh token returned by Google and no existing connection found");
    }

    // Step 5: Derive token expiration timestamp
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Step 6: Upsert CalendarConnection for the tenant
    const connection = await db.calendarConnection.upsert({
      where: { tenantId },
      create: {
        tenantId,
        provider: "google",
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt,
        connectedById: userId,
        connectedAt: new Date(),
      },
      update: {
        provider: "google",
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt,
        connectedById: userId,
        connectedAt: new Date(),
      },
    });

    // Step 7: Return safe non-sensitive connection info
    return {
      tenantId: connection.tenantId,
      userId: connection.connectedById || userId,
      connectedAt: connection.connectedAt,
      provider: connection.provider,
    };
  }

  /**
   * Retrieves connection status for a tenant without exposing credentials.
   */
  async getStatus(tenantId: string): Promise<CalendarStatusResult> {
    if (!tenantId) {
      throw new Error("tenantId is required");
    }

    const connection = await db.calendarConnection.findUnique({
      where: { tenantId },
      select: {
        connectedAt: true,
        provider: true,
      },
    });

    if (!connection) {
      return { isConnected: false };
    }

    return {
      isConnected: true,
      connectedAt: connection.connectedAt,
      provider: connection.provider,
    };
  }

  /**
   * Disconnects a tenant's calendar by deleting CalendarConnection.
   * Historical Bookings remain completely untouched.
   */
  async disconnect(tenantId: string): Promise<{ success: boolean }> {
    if (!tenantId) {
      throw new Error("tenantId is required");
    }

    await db.calendarConnection.deleteMany({
      where: { tenantId },
    });

    return { success: true };
  }
}

export const calendarService = new CalendarService();
