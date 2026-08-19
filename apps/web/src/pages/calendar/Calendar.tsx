import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { api } from "../../lib/axios.js";
import type { Booking, TeamMember, ViewMode, BookingUpdatePayload } from "./types.js";
import {
  startOfDay,
  startOfWeek,
  addDays,
  addMonths,
  groupByDay,
  dayKey,
  fmtLongDate,
} from "./utils.js";
import { Toolbar } from "./components/Toolbar.js";
import { MonthView } from "./components/MonthView.js";
import { TimeGrid } from "./components/TimeGrid.js";
import { weekDays } from "./utils.js";
import { DayAgenda, BookingDetails } from "./components/ContextPanel.js";

export function Calendar(): React.JSX.Element {
  const queryClient = useQueryClient();
  const today = startOfDay(new Date());

  const [view, setView] = React.useState<ViewMode>("Month");
  const [anchor, setAnchor] = React.useState<Date>(today);
  const [selectedDate, setSelectedDate] = React.useState<Date>(today);
  const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["bookings"],
    queryFn: async () => (await api.get("/bookings")).data.data ?? [],
  });

  const { data: team = [] } = useQuery<TeamMember[]>({
    queryKey: ["booking-team-members"],
    queryFn: async () => (await api.get("/bookings/team-members")).data.data ?? [],
  });

  const updateBooking = useMutation({
    mutationFn: async (input: { id: string } & BookingUpdatePayload) => {
      const { id, ...body } = input;
      return (await api.patch(`/bookings/${id}`, body)).data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to update booking"),
  });

  const byDay = React.useMemo(() => groupByDay(bookings), [bookings]);
  const bookingsFor = React.useCallback(
    (d: Date): Booking[] => byDay.get(dayKey(d)) ?? [],
    [byDay],
  );
  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) ?? null;

  const navigate = (dir: -1 | 1) => {
    if (view === "Month") setAnchor(addMonths(anchor, dir));
    else if (view === "Week") setAnchor(addDays(anchor, dir * 7));
    else {
      const next = addDays(anchor, dir);
      setAnchor(next);
      setSelectedDate(next);
    }
  };

  const goToday = () => {
    setAnchor(today);
    setSelectedDate(today);
  };

  const pickDay = (d: Date) => {
    setSelectedDate(d);
    setSelectedBookingId(null);
    if (view === "Day") setAnchor(d);
  };

  const pickBooking = (b: Booking) => {
    setSelectedDate(startOfDay(new Date(b.startTime)));
    setSelectedBookingId(b.id);
  };

  const changeView = (v: ViewMode) => {
    setView(v);
    if (v === "Day") setAnchor(selectedDate);
  };

  const headerLabel =
    view === "Month"
      ? anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      : view === "Week"
        ? `${startOfWeek(anchor).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${addDays(startOfWeek(anchor), 6).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
        : fmtLongDate(anchor);

  return (
    <PageWrapper noScroll={true}>
      <div className="flex flex-col h-full min-h-0">
        <Toolbar
          label={headerLabel}
          view={view}
          onViewChange={changeView}
          onNavigate={navigate}
          onToday={goToday}
        />

        <div className="flex-1 min-h-0 flex gap-4">
          {/* ── Calendar pane — full remaining width. Hidden on mobile when a booking is selected. ── */}
          <div
            className={`${selectedBooking ? "hidden lg:flex" : "flex"} flex-1 min-w-0 rounded-xl border border-line-default bg-bg-raised shadow-card overflow-hidden flex-col`}
          >
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-fg-muted text-[13px]">
                Loading calendar…
              </div>
            ) : view === "Month" ? (
              <MonthView
                anchor={anchor}
                today={today}
                selectedDate={selectedDate}
                bookingsFor={bookingsFor}
                onPickDay={pickDay}
                onPickBooking={pickBooking}
              />
            ) : (
              <TimeGrid
                days={view === "Week" ? weekDays(anchor) : [startOfDay(anchor)]}
                today={today}
                selectedDate={selectedDate}
                selectedBookingId={selectedBookingId}
                bookingsFor={bookingsFor}
                onPickDay={pickDay}
                onPickBooking={pickBooking}
              />
            )}
          </div>

          {/* ── Context panel — full width on mobile ONLY when a booking is selected; sidebar on lg+ ── */}
          <aside
            className={`${selectedBooking ? "flex w-full" : "hidden"} lg:flex lg:w-[320px] xl:w-[340px] shrink-0 rounded-xl border border-line-default bg-bg-raised shadow-card flex-col overflow-hidden`}
          >
            {selectedBooking ? (
              <BookingDetails
                key={selectedBooking.id}
                booking={selectedBooking}
                team={team}
                onBack={() => setSelectedBookingId(null)}
                onSave={(payload) => updateBooking.mutate({ id: selectedBooking.id, ...payload })}
                saving={updateBooking.isPending}
              />
            ) : (
              <DayAgenda
                day={selectedDate}
                today={today}
                bookings={bookingsFor(selectedDate)}
                onPickBooking={pickBooking}
              />
            )}
          </aside>
        </div>
      </div>
    </PageWrapper>
  );
}

export default Calendar;
