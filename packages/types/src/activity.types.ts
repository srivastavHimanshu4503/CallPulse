/**
 * Canonical activity-type registry. Mirrors the Prisma `ActivityType` enum —
 * every service (api, post-call-server, web) references these constants
 * instead of raw string literals, so adding a new activity type is:
 *   1. add it to the Prisma enum + migrate
 *   2. add one entry here (+ icon/color in the web TYPE_META)
 */

export const ACTIVITY_TYPES = {
  CALL_INBOUND: "CALL_INBOUND",
  CALL_OUTBOUND: "CALL_OUTBOUND",
  SMS_SENT: "SMS_SENT",
  SMS_RECEIVED: "SMS_RECEIVED",
  WHATSAPP_SENT: "WHATSAPP_SENT",
  WHATSAPP_RECEIVED: "WHATSAPP_RECEIVED",
  DEAL_CREATED: "DEAL_CREATED",
  DEAL_STAGE_CHANGED: "DEAL_STAGE_CHANGED",
  BOOKING_CREATED: "BOOKING_CREATED",
  FIELD_UPDATED: "FIELD_UPDATED",
  WORKFLOW_TRIGGERED: "WORKFLOW_TRIGGERED",
  NOTE_ADDED: "NOTE_ADDED",
} as const;

export type ActivityTypeValue = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

/** Timeline filter channels. "system" activities show only under "all". */
export const ACTIVITY_CHANNELS = ["calls", "sms", "whatsapp", "notes", "system"] as const;
export type ActivityChannel = (typeof ACTIVITY_CHANNELS)[number];

export const ACTIVITY_CHANNEL_BY_TYPE: Record<ActivityTypeValue, ActivityChannel> = {
  [ACTIVITY_TYPES.CALL_INBOUND]: "calls",
  [ACTIVITY_TYPES.CALL_OUTBOUND]: "calls",
  [ACTIVITY_TYPES.SMS_SENT]: "sms",
  [ACTIVITY_TYPES.SMS_RECEIVED]: "sms",
  [ACTIVITY_TYPES.WHATSAPP_SENT]: "whatsapp",
  [ACTIVITY_TYPES.WHATSAPP_RECEIVED]: "whatsapp",
  [ACTIVITY_TYPES.NOTE_ADDED]: "notes",
  [ACTIVITY_TYPES.DEAL_CREATED]: "system",
  [ACTIVITY_TYPES.DEAL_STAGE_CHANGED]: "system",
  [ACTIVITY_TYPES.BOOKING_CREATED]: "system",
  [ACTIVITY_TYPES.FIELD_UPDATED]: "system",
  [ACTIVITY_TYPES.WORKFLOW_TRIGGERED]: "system",
};

/** Human labels shared by UI + notifications. */
export const ACTIVITY_LABELS: Record<ActivityTypeValue, string> = {
  [ACTIVITY_TYPES.CALL_INBOUND]: "Inbound call",
  [ACTIVITY_TYPES.CALL_OUTBOUND]: "Outbound call",
  [ACTIVITY_TYPES.SMS_SENT]: "SMS sent",
  [ACTIVITY_TYPES.SMS_RECEIVED]: "SMS received",
  [ACTIVITY_TYPES.WHATSAPP_SENT]: "WhatsApp sent",
  [ACTIVITY_TYPES.WHATSAPP_RECEIVED]: "WhatsApp received",
  [ACTIVITY_TYPES.DEAL_CREATED]: "Deal created",
  [ACTIVITY_TYPES.DEAL_STAGE_CHANGED]: "Deal stage changed",
  [ACTIVITY_TYPES.BOOKING_CREATED]: "Booking created",
  [ACTIVITY_TYPES.FIELD_UPDATED]: "Fields updated",
  [ACTIVITY_TYPES.WORKFLOW_TRIGGERED]: "Workflow triggered",
  [ACTIVITY_TYPES.NOTE_ADDED]: "Note added",
};
