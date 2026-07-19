import * as React from "react";
import type { Booking } from "../types.js";
import { monthGrid, isSameDay, WEEKDAY_LABELS } from "../utils.js";
import { EventPill } from "./EventPill.js";

interface MonthViewProps {
  anchor: Date;
  today: Date;
  selectedDate: Date;
  bookingsFor: (d: Date) => Booking[];
  onPickDay: (d: Date) => void;
  onPickBooking: (b: Booking) => void;
}

/** Full-height month grid — 6 equal rows that stretch to fill the pane. */
export function MonthView({
  anchor,
  today,
  selectedDate,
  bookingsFor,
  onPickDay,
  onPickBooking,
}: MonthViewProps): React.JSX.Element {
  const cells = monthGrid(anchor);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="grid grid-cols-7 border-b border-line-subtle bg-bg-subtle/50 shrink-0">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-[10.5px] font-bold text-fg-muted uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = isSameDay(d, today);
          const isSelected = isSameDay(d, selectedDate);
          const isPast = d < today;
          const events = bookingsFor(d);

          return (
            <div
              key={i}
              onClick={() => onPickDay(d)}
              className={`min-h-0 p-1.5 border-b border-r border-line-subtle [&:nth-child(7n)]:border-r-0 cursor-pointer transition-colors group overflow-hidden flex flex-col ${
                isSelected ? "bg-brand-50/40" : inMonth ? "bg-white hover:bg-bg-subtle/60" : "bg-bg-subtle/30 hover:bg-bg-subtle/60"
              }`}
            >
              <div className="flex items-center justify-between mb-1 shrink-0">
                <span
                  className={`h-6 w-6 flex items-center justify-center rounded-full text-[11.5px] tabular-nums transition-colors ${
                    isToday
                      ? "bg-brand-600 text-white font-bold shadow-sm"
                      : isSelected
                        ? "ring-1 ring-brand-500/40 text-brand-700 font-bold"
                        : inMonth
                          ? isPast
                            ? "text-fg-muted font-medium"
                            : "text-fg-primary font-semibold"
                          : "text-fg-muted/50 font-medium"
                  }`}
                >
                  {d.getDate()}
                </span>
                {events.length > 0 && (
                  <span className="text-[9px] font-bold text-fg-muted opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                    {events.length}
                  </span>
                )}
              </div>

              <div className="space-y-1 min-h-0 overflow-hidden">
                {events.slice(0, 3).map((b) => (
                  <EventPill
                    key={b.id}
                    booking={b}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickBooking(b);
                    }}
                  />
                ))}
                {events.length > 3 && (
                  <div className="text-[10px] font-bold text-fg-muted pl-2 hover:text-brand-600 transition-colors">
                    +{events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
