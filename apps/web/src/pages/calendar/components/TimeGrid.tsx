import * as React from "react";
import type { Booking } from "../types.js";
import { isSameDay, fmtHourLabel, layoutDayEvents, WEEKDAY_LABELS } from "../utils.js";
import { EventBlock } from "./EventPill.js";

const HOUR_HEIGHT = 56; // px per hour
const GUTTER_WIDTH = 64; // px for the hour-label column

interface TimeGridProps {
  /** 7 dates for week view, 1 date for day view. */
  days: Date[];
  today: Date;
  selectedDate: Date;
  selectedBookingId: string | null;
  bookingsFor: (d: Date) => Booking[];
  onPickDay: (d: Date) => void;
  onPickBooking: (b: Booking) => void;
}

/**
 * Google Calendar-style time grid: sticky day headers, a scrollable 24-hour
 * canvas with hour rules, absolutely-positioned event blocks (overlaps are
 * packed side-by-side), and a live "now" indicator.
 */
export function TimeGrid({
  days,
  today,
  selectedDate,
  selectedBookingId,
  bookingsFor,
  onPickDay,
  onPickBooking,
}: TimeGridProps): React.JSX.Element {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [now, setNow] = React.useState<Date>(new Date());

  // Live "now" line — refresh every minute.
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Open the grid around the workday, or two hours before "now" if today is visible.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const showsToday = days.some((d) => isSameDay(d, today));
    const focusHour = showsToday ? Math.max(0, now.getHours() - 2) : 8;
    el.scrollTop = focusHour * HOUR_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]?.getTime(), days.length]);

  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;
  const isWeek = days.length > 1;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sticky day headers */}
      <div
        className="flex border-b border-line-subtle bg-bg-raised shrink-0"
        style={{ paddingLeft: GUTTER_WIDTH }}
      >
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          const isSelected = isSameDay(d, selectedDate);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPickDay(d)}
              className={`flex-1 min-w-0 py-2 text-center border-l border-line-subtle first:border-l-0 transition-colors ${
                isSelected && isWeek ? "bg-brand-50/50" : "hover:bg-bg-subtle/60"
              }`}
            >
              <div className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">
                {isWeek ? WEEKDAY_LABELS[i] : d.toLocaleDateString("en-IN", { weekday: "long" })}
              </div>
              <div
                className={`mt-0.5 mx-auto h-7 w-7 flex items-center justify-center rounded-full text-[13px] tabular-nums transition-colors ${
                  isToday ? "bg-brand-600 text-white font-bold" : "text-fg-primary font-semibold"
                }`}
              >
                {d.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Scrollable 24h canvas */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="relative flex" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Hour gutter */}
          <div className="shrink-0 relative select-none" style={{ width: GUTTER_WIDTH }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-semibold text-fg-muted tabular-nums"
                style={{ top: h * HOUR_HEIGHT }}
              >
                {h === 0 ? "" : fmtHourLabel(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            const positioned = layoutDayEvents(bookingsFor(d), HOUR_HEIGHT);

            return (
              <div
                key={i}
                onClick={() => onPickDay(d)}
                className="flex-1 min-w-0 relative border-l border-line-subtle cursor-pointer"
              >
                {/* Hour rules */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-line-subtle"
                    style={{ top: h * HOUR_HEIGHT }}
                  />
                ))}

                {/* Events */}
                {positioned.map((p) => (
                  <EventBlock
                    key={p.booking.id}
                    booking={p.booking}
                    selected={p.booking.id === selectedBookingId}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickBooking(p.booking);
                    }}
                    style={{
                      top: p.top,
                      height: p.height,
                      left: `${p.leftPct}%`,
                      width: `${p.widthPct}%`,
                    }}
                  />
                ))}

                {/* Now indicator */}
                {isToday && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none"
                    style={{ top: nowTop }}
                  >
                    <div className="relative h-[2px] bg-red-500">
                      <span className="absolute -left-[5px] -top-[3px] h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
