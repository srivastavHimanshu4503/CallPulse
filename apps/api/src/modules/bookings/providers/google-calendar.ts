import { google } from "googleapis";
import type { CalendarConnection } from "@antigravity/db";
import type { AgentBookingConfig } from "@antigravity/types";
import { decryptToken } from "@antigravity/utils/crypto";
import { env } from "../../../config/env.js";
import type { ICalendarProvider } from "./calendar.interface.js";

const DAY_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    isNaN(year) ||
    isNaN(month) ||
    isNaN(day)
  ) {
    throw new Error(`Invalid date format "${dateStr}", expected YYYY-MM-DD`);
  }
  return { year, month, day };
}

function parseTimeParts(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(":").map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  if (hours === undefined || minutes === undefined || isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format "${timeStr}", expected HH:mm`);
  }
  return { hours, minutes };
}

function getUtcDateFromZonedTime(dateStr: string, timeStr: string, timeZone: string): Date {
  const { year, month, day } = parseDateParts(dateStr);
  const { hours, minutes } = parseTimeParts(timeStr);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(utcGuess);
  const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  let formattedHour = getPart("hour");
  if (formattedHour === 24) formattedHour = 0;
  const formattedUtc = Date.UTC(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
    formattedHour,
    getPart("minute"),
    getPart("second"),
  );
  const offset = formattedUtc - utcGuess.getTime();

  return new Date(utcGuess.getTime() - offset);
}

function formatZonedTime(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  let hour = parts.find((p) => p.type === "hour")?.value || "00";
  if (hour === "24") hour = "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export class GoogleCalendarProvider implements ICalendarProvider {
  private getOAuthClient(connection: CalendarConnection) {
    if (!env.CALENDAR_TOKEN_ENCRYPTION_KEY) {
      throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is not configured");
    }

    const accessToken = decryptToken(
      connection.accessTokenEncrypted,
      env.CALENDAR_TOKEN_ENCRYPTION_KEY,
    );
    const refreshToken = decryptToken(
      connection.refreshTokenEncrypted,
      env.CALENDAR_TOKEN_ENCRYPTION_KEY,
    );

    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_OAUTH_REDIRECT_URL,
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: connection.expiresAt ? new Date(connection.expiresAt).getTime() : undefined,
    });

    return oauth2Client;
  }

  async checkAvailability(params: {
    connection: CalendarConnection;
    date: string;
    timezone: string;
    workingHours: AgentBookingConfig["workingHours"];
    durationMin: number;
  }): Promise<{ slots: string[] } | { error: string }> {
    try {
      const { connection, date, timezone, workingHours, durationMin } = params;

      if (!workingHours || !workingHours.days || !workingHours.start || !workingHours.end) {
        return { slots: [] };
      }

      // Check day of week
      const { year, month, day } = parseDateParts(date);
      const dayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      const weekday = DAY_MAP[dayIndex];
      if (!weekday || !workingHours.days.includes(weekday)) {
        return { slots: [] };
      }

      const windowStart = getUtcDateFromZonedTime(date, workingHours.start, timezone);
      const windowEnd = getUtcDateFromZonedTime(date, workingHours.end, timezone);

      if (windowStart >= windowEnd || durationMin <= 0) {
        return { slots: [] };
      }

      const auth = this.getOAuthClient(connection);
      const calendar = google.calendar({ version: "v3", auth });

      const freeBusyRes = await calendar.freebusy.query({
        requestBody: {
          timeMin: windowStart.toISOString(),
          timeMax: windowEnd.toISOString(),
          timeZone: timezone,
          items: [{ id: "primary" }],
        },
      });

      const busyIntervals = (freeBusyRes.data.calendars?.["primary"]?.busy || [])
        .filter((b) => b.start && b.end)
        .map((b) => ({
          start: new Date(b.start!).getTime(),
          end: new Date(b.end!).getTime(),
        }));

      const slotDurationMs = durationMin * 60 * 1000;
      const slots: string[] = [];

      let currentSlotStart = windowStart.getTime();
      const endTimeLimit = windowEnd.getTime();

      while (currentSlotStart + slotDurationMs <= endTimeLimit) {
        const currentSlotEnd = currentSlotStart + slotDurationMs;

        const isBusy = busyIntervals.some(
          (busy) => currentSlotStart < busy.end && currentSlotEnd > busy.start,
        );

        if (!isBusy) {
          slots.push(formatZonedTime(new Date(currentSlotStart), timezone));
        }

        currentSlotStart += slotDurationMs;
      }

      return { slots };
    } catch (err: unknown) {
      return { error: sanitizeError(err) };
    }
  }

  async createEvent(params: {
    connection: CalendarConnection;
    startTime: Date;
    endTime: Date;
    timezone: string;
    purpose: string;
    customerName: string;
    customerEmail?: string;
  }): Promise<{ externalEventId: string } | { error: string }> {
    try {
      const { connection, startTime, endTime, timezone, purpose, customerName, customerEmail } =
        params;

      const auth = this.getOAuthClient(connection);
      const calendar = google.calendar({ version: "v3", auth });

      const summary = purpose ? `${purpose} - ${customerName}` : `Appointment with ${customerName}`;
      const description = `Booking for ${customerName}${purpose ? `\nPurpose: ${purpose}` : ""}`;

      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary,
          description,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: timezone,
          },
          attendees: customerEmail
            ? [{ email: customerEmail, displayName: customerName }]
            : undefined,
        },
      });

      if (!res.data.id) {
        return { error: "Google Calendar did not return an event ID" };
      }

      return { externalEventId: res.data.id };
    } catch (err: unknown) {
      return { error: sanitizeError(err) };
    }
  }

  async refreshAccessToken(
    connection: CalendarConnection,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    if (!env.CALENDAR_TOKEN_ENCRYPTION_KEY) {
      throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is not configured");
    }

    const refreshToken = decryptToken(
      connection.refreshTokenEncrypted,
      env.CALENDAR_TOKEN_ENCRYPTION_KEY,
    );

    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_OAUTH_REDIRECT_URL,
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (!credentials.access_token) {
        throw new Error("No access token returned from Google refresh");
      }

      const expiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      return {
        accessToken: credentials.access_token,
        expiresAt,
      };
    } catch (err: unknown) {
      throw new Error(`Google token refresh failed: ${sanitizeError(err)}`);
    }
  }
}

export const googleCalendarProvider = new GoogleCalendarProvider();
