import type { CalendarConnection } from "@antigravity/db";
import type { AgentBookingConfig } from "@antigravity/types";

export interface ICalendarProvider {
  checkAvailability(params: {
    connection: CalendarConnection;
    date: string;
    timezone: string;
    workingHours: AgentBookingConfig["workingHours"];
    durationMin: number;
  }): Promise<{ slots: string[] } | { error: string }>;

  createEvent(params: {
    connection: CalendarConnection;
    startTime: Date;
    endTime: Date;
    timezone: string;
    purpose: string;
    customerName: string;
    customerEmail?: string;
  }): Promise<{ externalEventId: string } | { error: string }>;

  refreshAccessToken(
    connection: CalendarConnection,
  ): Promise<{ accessToken: string; expiresAt: Date }>;
}
