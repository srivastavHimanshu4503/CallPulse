import * as React from "react";
import { Calendar as CalendarIcon, User as UserIcon, Bot } from "lucide-react";
import type { Booking } from "../types.js";
import { fmtTime } from "../utils.js";

const CANCELLED = "cancelled";

/** Compact rounded pill used in the Month grid cells. */
export function EventPill({
  booking,
  onClick,
}: {
  booking: Booking;
  onClick: (e: React.MouseEvent) => void;
}): React.JSX.Element {
  const Icon = booking.assignee ? UserIcon : booking.agent ? Bot : CalendarIcon;
  const cancelled = booking.status?.toLowerCase() === CANCELLED;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${fmtTime(booking.startTime)} · ${booking.title}`}
      className={`w-full flex items-center gap-1 rounded-full px-2 py-[3px] transition-colors text-left ${
        cancelled
          ? "bg-bg-subtle text-fg-muted line-through hover:bg-bg-muted"
          : "bg-brand-50 hover:bg-brand-100 text-brand-700"
      }`}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      <span className="text-[10.5px] font-bold truncate leading-none tabular-nums">{fmtTime(booking.startTime)}</span>
      <span className="text-[10.5px] font-medium truncate leading-none">{booking.title}</span>
    </button>
  );
}

/** Block rendered inside the Week/Day time grid, absolutely positioned by the caller. */
export function EventBlock({
  booking,
  selected,
  onClick,
  style,
}: {
  booking: Booking;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  style: React.CSSProperties;
}): React.JSX.Element {
  const Icon = booking.assignee ? UserIcon : booking.agent ? Bot : CalendarIcon;
  const cancelled = booking.status?.toLowerCase() === CANCELLED;

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      title={`${fmtTime(booking.startTime)} – ${fmtTime(booking.endTime)} · ${booking.title}`}
      className={`absolute rounded-md border-l-[3px] px-1.5 py-1 text-left overflow-hidden transition-all ${
        cancelled
          ? "bg-bg-subtle border-fg-muted/40 text-fg-muted line-through"
          : selected
            ? "bg-brand-600 border-brand-700 text-white shadow-md z-20"
            : "bg-brand-50 border-brand-600 text-brand-700 hover:bg-brand-100 hover:shadow-sm z-10"
      }`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <Icon className="h-2.5 w-2.5 shrink-0" />
        <span className="text-[10.5px] font-bold truncate leading-tight">{booking.title}</span>
      </div>
      <div className={`text-[9.5px] font-medium tabular-nums leading-tight truncate ${cancelled ? "" : selected ? "text-white/85" : "text-brand-600/80"}`}>
        {fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}
      </div>
    </button>
  );
}
