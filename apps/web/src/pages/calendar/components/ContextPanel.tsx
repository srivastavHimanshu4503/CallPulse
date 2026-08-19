import * as React from "react";
import {
  Calendar as CalendarIcon,
  User as UserIcon,
  Bot,
  Clock,
  Phone,
  Mail,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  X,
} from "lucide-react";
import type { Booking, TeamMember, BookingUpdatePayload } from "../types.js";
import { fmtTime, fmtLongDate, isSameDay } from "../utils.js";
import { StatusChip } from "./StatusChip.js";

// ─────────────────────────────────────────────
// Day agenda — shown when no booking is selected
// ─────────────────────────────────────────────

export function DayAgenda({
  day,
  today,
  bookings,
  onPickBooking,
}: {
  day: Date;
  today: Date;
  bookings: Booking[];
  onPickBooking: (b: Booking) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col flex-1 min-h-0 animate-in fade-in duration-150">
      <div className="px-4 py-3.5 border-b border-line-subtle shrink-0">
        <div className="text-[13px] font-bold text-fg-primary">
          {isSameDay(day, today) ? "Today" : fmtLongDate(day)}
        </div>
        <div className="text-[11px] text-fg-muted mt-0.5">
          {bookings.length === 0
            ? "No appointments"
            : `${bookings.length} appointment${bookings.length > 1 ? "s" : ""}`}
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
          <span className="h-12 w-12 rounded-full bg-bg-subtle flex items-center justify-center mb-3">
            <CalendarIcon className="h-5 w-5 text-fg-muted/50" />
          </span>
          <div className="text-[12.5px] font-semibold text-fg-primary">
            No appointments for this day
          </div>
          <p className="text-[11.5px] text-fg-muted mt-1 leading-relaxed max-w-[220px]">
            When your AI agent books a lead, it will appear here automatically.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle overflow-y-auto min-h-0">
          {bookings.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onPickBooking(b)}
                className="w-full text-left px-4 py-3 hover:bg-bg-subtle/60 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-fg-primary truncate">
                    {b.title}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-fg-muted/40 group-hover:text-fg-muted shrink-0 transition-colors" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-fg-muted mt-1">
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">
                    {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                  </span>
                  {b.agent && (
                    <span className="inline-flex items-center gap-1 ml-1 text-brand-600 font-semibold">
                      <Bot className="h-3 w-3" /> AI booked
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Booking details — fully editable event form
// (mount with key={booking.id} so state resets per booking)
// ─────────────────────────────────────────────

const toDateInput = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const toTimeInput = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const combine = (dateStr: string, timeStr: string): Date => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_CLS =
  "w-full h-9 px-2.5 text-[12.5px] text-fg-primary bg-bg-raised border border-line-default rounded-lg focus:outline-none focus:border-brand-500 transition-colors disabled:opacity-60";
const LABEL_CLS = "block text-[10px] font-bold text-fg-muted uppercase tracking-wider mb-1.5";

export function BookingDetails({
  booking,
  team,
  onBack,
  onSave,
  saving,
}: {
  booking: Booking;
  team: TeamMember[];
  onBack: () => void;
  onSave: (payload: BookingUpdatePayload) => void;
  saving: boolean;
}): React.JSX.Element {
  const [title, setTitle] = React.useState(booking.title);
  const [date, setDate] = React.useState(() => toDateInput(booking.startTime));
  const [startTime, setStartTime] = React.useState(() => toTimeInput(booking.startTime));
  const [endTime, setEndTime] = React.useState(() => toTimeInput(booking.endTime));
  const [contactEmail, setContactEmail] = React.useState(booking.contact?.emails?.[0] ?? "");
  const [assigneeId, setAssigneeId] = React.useState(booking.assignee?.id ?? "");
  const [ccEmails, setCcEmails] = React.useState<string[]>(booking.ccEmails ?? []);
  const [ccInput, setCcInput] = React.useState("");
  const [notes, setNotes] = React.useState(booking.notes ?? "");

  const contactName = booking.contact
    ? `${booking.contact.firstName} ${booking.contact.lastName}`.trim()
    : "Unknown";
  const phone = booking.contact?.phones?.[0];
  const statusLower = booking.status?.toLowerCase();

  const start = combine(date, startTime);
  const end = combine(date, endTime);
  const timesValid = end.getTime() > start.getTime();
  const emailValid = !contactEmail.trim() || EMAIL_RE.test(contactEmail.trim());

  const dirty =
    title !== booking.title ||
    date !== toDateInput(booking.startTime) ||
    startTime !== toTimeInput(booking.startTime) ||
    endTime !== toTimeInput(booking.endTime) ||
    contactEmail !== (booking.contact?.emails?.[0] ?? "") ||
    assigneeId !== (booking.assignee?.id ?? "") ||
    JSON.stringify(ccEmails) !== JSON.stringify(booking.ccEmails ?? []) ||
    notes !== (booking.notes ?? "");

  const addCc = (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) return;
    if (ccEmails.includes(email) || ccEmails.length >= 10) return;
    setCcEmails([...ccEmails, email]);
    setCcInput("");
  };

  const handleSave = () => {
    if (!title.trim() || !timesValid || !emailValid) return;
    onSave({
      title: title.trim(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      assigneeId: assigneeId || null,
      ccEmails,
      notes: notes.trim() || null,
      contactEmail: contactEmail.trim() || null,
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-in slide-in-from-right-2 fade-in duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-line-subtle flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="h-7 w-7 flex items-center justify-center rounded-md text-fg-muted hover:text-fg-primary hover:bg-bg-subtle transition-colors shrink-0"
          aria-label="Back to day agenda"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[12.5px] font-bold text-fg-primary flex-1">Booking details</span>
        <StatusChip status={booking.status} />
      </div>

      <div className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1">
        {/* Title */}
        <div>
          <label className={LABEL_CLS}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
            className={`${FIELD_CLS} font-semibold ${!title.trim() ? "border-red-400" : ""}`}
          />
        </div>

        {/* Date & time */}
        <div>
          <label className={LABEL_CLS}>
            <Clock className="inline h-3 w-3 mr-1 -mt-px" />
            Date &amp; time
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={saving}
            className={FIELD_CLS}
          />
          <div className="flex items-center gap-2 mt-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={saving}
              className={`${FIELD_CLS} tabular-nums`}
            />
            <span className="text-fg-muted text-[12px] shrink-0">to</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={saving}
              className={`${FIELD_CLS} tabular-nums ${!timesValid ? "border-red-400" : ""}`}
            />
          </div>
          {!timesValid && (
            <p className="text-[10.5px] text-red-600 font-medium mt-1">
              End time must be after start time.
            </p>
          )}
        </div>

        {/* Contact */}
        <div className="rounded-lg border border-line-subtle bg-bg-subtle/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">
              Contact
            </span>
            <span className="text-[12px] font-semibold text-fg-primary">{contactName}</span>
          </div>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 text-[12px] text-fg-secondary hover:text-brand-600 transition-colors"
            >
              <Phone className="h-3 w-3" /> {phone}
            </a>
          )}
          <div>
            <label className="flex items-center gap-1 text-[10.5px] font-semibold text-fg-muted mb-1">
              <Mail className="h-3 w-3" /> Email — calendar invite goes here
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="caller@example.com"
              disabled={saving}
              className={`${FIELD_CLS} ${!emailValid ? "border-red-400" : ""}`}
            />
            {!emailValid && (
              <p className="text-[10.5px] text-red-600 font-medium mt-1">
                Enter a valid email address.
              </p>
            )}
          </div>
        </div>

        {/* Owner + booked by */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Owner</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={saving}
              className={FIELD_CLS}
            >
              <option value="">Unassigned</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Booked by</label>
            {booking.agent ? (
              <span className="inline-flex items-center gap-1.5 h-9 text-[12px] font-semibold text-brand-700 bg-brand-50 border border-brand-500/15 rounded-lg px-2.5 max-w-full">
                <Bot className="h-3.5 w-3.5 shrink-0" />{" "}
                <span className="truncate">{booking.agent.name}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 h-9 text-[12px] font-semibold text-fg-secondary bg-bg-subtle border border-line-subtle rounded-lg px-2.5">
                <UserIcon className="h-3.5 w-3.5" /> Manual
              </span>
            )}
          </div>
        </div>

        {/* Cc */}
        <div>
          <label className={LABEL_CLS}>Cc — also invite</label>
          {ccEmails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ccEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-fg-secondary bg-bg-subtle border border-line-subtle rounded-full pl-2 pr-1 py-0.5 max-w-full"
                >
                  <span className="truncate">{email}</span>
                  <button
                    type="button"
                    onClick={() => setCcEmails(ccEmails.filter((e) => e !== email))}
                    disabled={saving}
                    className="h-4 w-4 flex items-center justify-center rounded-full text-fg-muted hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            type="email"
            value={ccInput}
            onChange={(e) => setCcInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCc(ccInput);
              }
            }}
            onBlur={() => addCc(ccInput)}
            placeholder="Type an email and press Enter"
            disabled={saving || ccEmails.length >= 10}
            className={FIELD_CLS}
          />
          {team.filter((m) => m.email && !ccEmails.includes(m.email.toLowerCase())).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {team
                .filter((m) => m.email && !ccEmails.includes(m.email.toLowerCase()))
                .slice(0, 4)
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => addCc(m.email)}
                    disabled={saving}
                    className="text-[10.5px] font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-500/15 rounded-full px-2 py-0.5 transition-colors"
                  >
                    + {m.name}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className={LABEL_CLS}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
            rows={3}
            placeholder="Anything your team should know before this appointment…"
            disabled={saving}
            className="w-full px-2.5 py-2 text-[12.5px] text-fg-primary bg-bg-raised border border-line-default rounded-lg focus:outline-none focus:border-brand-500 transition-colors resize-none leading-relaxed disabled:opacity-60"
          />
        </div>
      </div>

      {/* Sticky footer actions */}
      <div className="px-4 py-3 border-t border-line-subtle shrink-0 space-y-2 bg-bg-raised">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty || !title.trim() || !timesValid || !emailValid}
          className="w-full h-9 rounded-lg text-[12px] font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
        {statusLower !== "completed" && statusLower !== "cancelled" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSave({ status: "completed" })}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11.5px] font-bold text-fg-secondary bg-bg-raised border border-line-default hover:bg-bg-subtle hover:text-emerald-700 transition-colors disabled:opacity-60"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark completed
            </button>
            <button
              type="button"
              onClick={() => onSave({ status: "cancelled" })}
              disabled={saving}
              className="flex-1 h-8 rounded-lg text-[11.5px] font-bold text-fg-secondary bg-bg-raised border border-line-default hover:bg-bg-subtle hover:text-negative-600 transition-colors disabled:opacity-60"
            >
              Cancel booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
