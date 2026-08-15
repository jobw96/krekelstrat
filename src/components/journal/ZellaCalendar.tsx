import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, MessageSquare, Plus } from "lucide-react";
import { money, WIN_GREEN, LOSS_RED, type Trade } from "@/lib/journal";
import { groupByDay } from "@/lib/journal-stats";
import { LOCAL_ZONE } from "@/lib/sessions";

export type CalendarMode = "pnl" | "winrate" | "trades" | "yearly";

const MODES: { id: CalendarMode; label: string }[] = [
  { id: "yearly", label: "Yearly Calendar" },
  { id: "winrate", label: "Win Rate" },
  { id: "pnl", label: "P&L" },
  { id: "trades", label: "Trades" },
];

/** Monthly P&L grid with weekly totals column and overlay mode tabs. */
export function ZellaCalendar({
  month,
  trades,
  mode,
  onMode,
  onSelectDay,
  onMonthChange,
  onAddDay,
  commentsByDay = {},
}: {
  month: DateTime;
  trades: Trade[];
  mode: CalendarMode;
  onMode: (m: CalendarMode) => void;
  onSelectDay: (day: string) => void;
  onAddDay: (day: string) => void;
  onMonthChange: (m: DateTime) => void;
  commentsByDay?: Record<string, number>;
}) {
  const byDay = groupByDay(trades);
  const start = month.startOf("month");
  const firstCell = start.startOf("week"); // Monday
  // Weekday-only grid: Monday through Friday, 6 rows.
  const rows = Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 5 }, (_, d) => firstCell.plus({ weeks: w, days: d })),
  );
  const weeks = rows.map((row, i) => {
    let pnl = 0;
    let days = 0;
    for (const c of row) {
      const stat = byDay.get(c.toFormat("yyyy-LL-dd"));
      if (stat) {
        pnl += stat.pnl;
        days += 1;
      }
    }
    return { index: i + 1, pnl, days };
  });

  const monthPnl = [...byDay.values()]
    .filter((d) => DateTime.fromISO(d.key).month === month.month && DateTime.fromISO(d.key).year === month.year)
    .reduce((a, d) => a + d.pnl, 0);

  if (mode === "yearly") {
    const months = Array.from({ length: 12 }, (_, i) => month.startOf("year").plus({ months: i }));
    return (
      <section className="card-sunken flex flex-col gap-4 p-5">
        <Header
          month={month}
          monthPnl={monthPnl}
          onMonthChange={onMonthChange}
          yearly
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {months.map((m) => {
            const pnl = [...byDay.values()]
              .filter((d) => {
                const dt = DateTime.fromISO(d.key);
                return dt.month === m.month && dt.year === m.year;
              })
              .reduce((a, d) => a + d.pnl, 0);
            const count = [...byDay.values()].filter((d) => {
              const dt = DateTime.fromISO(d.key);
              return dt.month === m.month && dt.year === m.year;
            }).length;
            const color = pnl > 0 ? WIN_GREEN : pnl < 0 ? LOSS_RED : "#7A828D";
            return (
              <button
                key={m.toISO()}
                onClick={() => onMonthChange(m)}
                className="hover-tint flex flex-col gap-1 rounded-control p-3 text-left"
                style={{
                  background: count ? `${color}1c` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${count ? `${color}4d` : "rgba(255,255,255,0.07)"}`,
                }}
              >
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#9AA1AC]">
                  {m.setLocale("en").toFormat("LLLL")}
                </span>
                <span className="font-mono text-[16px] tabular" style={{ color, fontWeight: 560 }}>
                  {count ? money(pnl) : "—"}
                </span>
                <span className="text-[10px] text-[#7A828D]">{count} active days</span>
              </button>
            );
          })}
        </div>
        <Tabs mode={mode} onMode={onMode} />
      </section>
    );
  }

  return (
    <section className="card-sunken flex flex-col gap-4 p-3 sm:p-5">
      <Header month={month} monthPnl={monthPnl} onMonthChange={onMonthChange} />

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-5 gap-1.5">
          {["mon", "tue", "wed", "thu", "fri"].map((d) => (
            <span
              key={d}
              className="pb-1 text-center text-[10px] uppercase tracking-[0.1em] text-[#7A828D]"
            >
              {d}
            </span>
          ))}
        </div>

        {weeks.map((w, wi) => (
          <div key={w.index} className="grid grid-cols-5 gap-1.5">
            <WeekRow
              cells={rows[wi] ?? []}
              byDay={byDay}
              month={month}
              mode={mode}
              onSelectDay={onSelectDay}
              onAddDay={onAddDay}
              commentsByDay={commentsByDay}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-white/6 pt-3">
        <span className="text-[10px] uppercase tracking-[0.1em] text-[#7A828D]">
          Weekly totals
        </span>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
          {weeks.map((w) => {
            const wColor = w.pnl > 0 ? WIN_GREEN : w.pnl < 0 ? LOSS_RED : "#7A828D";
            return (
              <div
                key={w.index}
                className="flex items-center justify-between gap-2 rounded-control px-2.5 py-2"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span className="text-[10px] uppercase tracking-[0.08em] text-[#7A828D]">
                  Week {w.index}
                </span>
                <span className="flex flex-col items-end">
                  <span
                    className="font-mono text-[12px] tabular"
                    style={{ color: wColor, fontWeight: 560 }}
                  >
                    {w.days ? money(w.pnl) : "—"}
                  </span>
                  <span className="text-[9.5px] text-[#7A828D]">{w.days} days</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>


      <Tabs mode={mode} onMode={onMode} />
    </section>
  );
}

function Header({
  month,
  monthPnl,
  onMonthChange,
  yearly,
}: {
  month: DateTime;
  monthPnl: number;
  onMonthChange: (m: DateTime) => void;
  yearly?: boolean;
}) {
  const color = monthPnl > 0 ? WIN_GREEN : monthPnl < 0 ? LOSS_RED : "#9AA1AC";
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => onMonthChange(month.minus(yearly ? { years: 1 } : { months: 1 }))}
          className="hover-lift grid size-7 shrink-0 place-items-center rounded-control bg-white/6 text-[#F0F2F5] hover:bg-white/12"
          aria-label="Previous"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="truncate text-[16px] text-white" style={{ fontWeight: 560 }}>
          {month.setLocale("en").toFormat(yearly ? "yyyy" : "LLLL yyyy")}
        </h2>
        <button
          onClick={() => onMonthChange(month.plus(yearly ? { years: 1 } : { months: 1 }))}
          className="hover-lift grid size-7 shrink-0 place-items-center rounded-control bg-white/6 text-[#F0F2F5] hover:bg-white/12"
          aria-label="Next"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          onClick={() => onMonthChange(DateTime.now().setZone(LOCAL_ZONE).startOf("month"))}
          className="hover-lift rounded-control bg-white/6 px-3 py-1 text-[12px] text-[#F0F2F5] hover:bg-white/12"
        >
          This Month
        </button>
      </div>
      <span
        className="shrink-0 rounded-control px-3 py-1 font-mono text-[12px] tabular"
        style={{ background: `${color}1f`, color, border: `1px solid ${color}44` }}
      >
        {money(monthPnl)}
      </span>
    </header>
  );
}

function WeekRow({
  cells,
  byDay,
  month,
  mode,
  onSelectDay,
  onAddDay,
  commentsByDay,
}: {
  cells: DateTime[];
  byDay: ReturnType<typeof groupByDay>;
  month: DateTime;
  mode: CalendarMode;
  onSelectDay: (day: string) => void;
  onAddDay: (day: string) => void;
  commentsByDay: Record<string, number>;
}) {
  return (
    <>
      {cells.map((c) => {
        const key = c.toFormat("yyyy-LL-dd");
        const stat = byDay.get(key);
        const inMonth = c.month === month.month;
        const color = !stat ? "#7A828D" : stat.pnl > 0 ? WIN_GREEN : stat.pnl < 0 ? LOSS_RED : "#9AA1AC";
        return (
          <div
            key={key}
            className="group relative"
            style={{ opacity: inMonth ? 1 : 0.32 }}
          >
            <button
              onClick={() => stat && onSelectDay(key)}
              className="hover-tint flex min-h-[62px] w-full flex-col justify-between gap-0.5 overflow-hidden rounded-control p-1 text-left transition-colors sm:min-h-[82px] sm:rounded-control sm:p-1.5"
              style={{
                // Tiles read as raised against the sunken calendar field.
                background: stat ? `${color}26` : "rgba(255,255,255,0.05)",
                border: `1px solid ${stat ? `${color}66` : "rgba(255,255,255,0.07)"}`,
                cursor: stat ? "pointer" : "default",
              }}
            >
              <span className="font-mono text-[10px] leading-none text-[#9AA1AC] sm:text-[11px]">{c.day}</span>
              {stat && (
                <span className="flex min-w-0 flex-col gap-0.5">
                  {mode === "pnl" && (
                    <span className="truncate font-mono text-[10.5px] leading-tight tabular sm:text-[13px]" style={{ color, fontWeight: 560 }}>
                      {money(stat.pnl)}
                    </span>
                  )}
                  {mode === "winrate" && (
                    <span className="truncate font-mono text-[10.5px] leading-tight tabular sm:text-[13px]" style={{ color, fontWeight: 560 }}>
                      {stat.winRate.toFixed(1)}%
                    </span>
                  )}
                  {mode === "trades" && (
                    <span className="truncate font-mono text-[10.5px] leading-tight tabular sm:text-[13px]" style={{ color, fontWeight: 560 }}>
                      {stat.count}
                    </span>
                  )}
                  <span className="truncate text-[8.5px] leading-tight text-[#9AA1AC] sm:text-[10px]">
                    {stat.count}t<span className="hidden sm:inline"> · {stat.winRate.toFixed(0)}%</span>
                  </span>

                                  </span>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddDay(key);
              }}
              aria-label={`Add trade on ${key}`}
              className="absolute right-1 top-1 grid size-5 place-items-center rounded-control opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "#F0F2F5",
              }}
            >
              <Plus className="size-3" strokeWidth={2} />
            </button>
            {stat && (commentsByDay[key] ?? 0) > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDay(key);
                }}
                aria-label={`${commentsByDay[key]} comments on ${key}`}
                className="hover-lift absolute bottom-1 right-1 hidden items-center gap-1 rounded-control px-1.5 py-0.5 text-[9.5px] sm:inline-flex"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#F0F2F5",
                }}
              >
                <MessageSquare className="size-2.5" strokeWidth={2} />
                {commentsByDay[key]}
              </button>
            )}
          </div>
        );
      })}
    </>

  );
}

function Tabs({ mode, onMode }: { mode: CalendarMode; onMode: (m: CalendarMode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 border-t border-white/6 pt-3 sm:grid-cols-4">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onMode(m.id)}
          className="hover-lift rounded-control px-3 py-1.5 text-[12px]"
          style={
            mode === m.id
              ? {
                  background: "#1C1F27",
                  color: "#ffffff",
                  fontWeight: 560,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                }
              : { background: "rgba(255,255,255,0.05)", color: "#9AA1AC" }
          }
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
