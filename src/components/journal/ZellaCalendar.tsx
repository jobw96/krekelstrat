import { DateTime } from "luxon";
import { money, WIN_GREEN, LOSS_RED, type Trade } from "@/lib/journal";
import { groupByDay, weekSummaries } from "@/lib/journal-stats";
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
}: {
  month: DateTime;
  trades: Trade[];
  mode: CalendarMode;
  onMode: (m: CalendarMode) => void;
  onSelectDay: (day: string) => void;
  onMonthChange: (m: DateTime) => void;
}) {
  const byDay = groupByDay(trades);
  const start = month.startOf("month");
  const firstCell = start.minus({ days: start.weekday % 7 }); // grid starts Sunday
  const cells = Array.from({ length: 42 }, (_, i) => firstCell.plus({ days: i }));
  const weeks = weekSummaries(cells, byDay);

  const monthPnl = [...byDay.values()]
    .filter((d) => DateTime.fromISO(d.key).month === month.month && DateTime.fromISO(d.key).year === month.year)
    .reduce((a, d) => a + d.pnl, 0);

  if (mode === "yearly") {
    const months = Array.from({ length: 12 }, (_, i) => month.startOf("year").plus({ months: i }));
    return (
      <section className="card-surface flex flex-col gap-4 p-5">
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
            const color = pnl > 0 ? WIN_GREEN : pnl < 0 ? LOSS_RED : "#6a7076";
            return (
              <button
                key={m.toISO()}
                onClick={() => onMonthChange(m)}
                className="hover-lift flex flex-col gap-1 rounded-xl p-3 text-left"
                style={{
                  background: count ? `${color}1c` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${count ? `${color}4d` : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#8b9298]">
                  {m.setLocale("en").toFormat("LLLL")}
                </span>
                <span className="font-mono text-[16px] tabular" style={{ color, fontWeight: 560 }}>
                  {count ? money(pnl) : "—"}
                </span>
                <span className="text-[10px] text-[#6a7076]">{count} active days</span>
              </button>
            );
          })}
        </div>
        <Tabs mode={mode} onMode={onMode} />
      </section>
    );
  }

  return (
    <section className="card-surface flex flex-col gap-4 p-5">
      <Header month={month} monthPnl={monthPnl} onMonthChange={onMonthChange} />

      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_92px] gap-1.5">
        {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d) => (
          <span
            key={d}
            className="pb-1 text-center text-[10px] uppercase tracking-[0.1em] text-[#6a7076]"
          >
            {d}
          </span>
        ))}
        <span className="pb-1 text-center text-[10px] uppercase tracking-[0.1em] text-[#6a7076]">
          week
        </span>

        {weeks.map((w, wi) => (
          <WeekRow
            key={w.index}
            cells={cells.slice(wi * 7, wi * 7 + 7)}
            byDay={byDay}
            month={month}
            mode={mode}
            week={w}
            onSelectDay={onSelectDay}
          />
        ))}
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
  const color = monthPnl > 0 ? WIN_GREEN : monthPnl < 0 ? LOSS_RED : "#8b9298";
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => onMonthChange(month.minus(yearly ? { years: 1 } : { months: 1 }))}
          className="hover-lift rounded-full bg-white/6 px-2.5 py-1 text-[12px] text-[#d7dbe0] hover:bg-white/12"
          aria-label="Previous"
        >
          ←
        </button>
        <h2 className="truncate text-[16px] text-white" style={{ fontWeight: 560 }}>
          {month.setLocale("en").toFormat(yearly ? "yyyy" : "LLLL yyyy")}
        </h2>
        <button
          onClick={() => onMonthChange(month.plus(yearly ? { years: 1 } : { months: 1 }))}
          className="hover-lift rounded-full bg-white/6 px-2.5 py-1 text-[12px] text-[#d7dbe0] hover:bg-white/12"
          aria-label="Next"
        >
          →
        </button>
        <button
          onClick={() => onMonthChange(DateTime.now().setZone(LOCAL_ZONE).startOf("month"))}
          className="hover-lift rounded-full bg-white/6 px-3 py-1 text-[12px] text-[#d7dbe0] hover:bg-white/12"
        >
          This Month
        </button>
      </div>
      <span
        className="shrink-0 rounded-full px-3 py-1 font-mono text-[12px] tabular"
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
  week,
  onSelectDay,
}: {
  cells: DateTime[];
  byDay: ReturnType<typeof groupByDay>;
  month: DateTime;
  mode: CalendarMode;
  week: { index: number; pnl: number; days: number };
  onSelectDay: (day: string) => void;
}) {
  const wColor = week.pnl > 0 ? WIN_GREEN : week.pnl < 0 ? LOSS_RED : "#6a7076";
  return (
    <>
      {cells.map((c) => {
        const key = c.toFormat("yyyy-LL-dd");
        const stat = byDay.get(key);
        const inMonth = c.month === month.month;
        const color = !stat ? "#6a7076" : stat.pnl > 0 ? WIN_GREEN : stat.pnl < 0 ? LOSS_RED : "#8b9298";
        return (
          <button
            key={key}
            onClick={() => stat && onSelectDay(key)}
            className="hover-lift flex min-h-[86px] flex-col justify-between rounded-xl p-2 text-left transition-colors"
            style={{
              background: stat ? `${color}26` : "rgba(255,255,255,0.03)",
              border: `1px solid ${stat ? `${color}66` : "rgba(255,255,255,0.06)"}`,
              opacity: inMonth ? 1 : 0.32,
              cursor: stat ? "pointer" : "default",
            }}
          >
            <span className="font-mono text-[11px] text-[#8b9298]">{c.day}</span>
            {stat && (
              <span className="flex flex-col gap-0.5">
                {mode === "pnl" && (
                  <span className="font-mono text-[13px] tabular" style={{ color, fontWeight: 560 }}>
                    {money(stat.pnl)}
                  </span>
                )}
                {mode === "winrate" && (
                  <span className="font-mono text-[13px] tabular" style={{ color, fontWeight: 560 }}>
                    {stat.winRate.toFixed(1)}%
                  </span>
                )}
                {mode === "trades" && (
                  <span className="font-mono text-[13px] tabular" style={{ color, fontWeight: 560 }}>
                    {stat.count}
                  </span>
                )}
                <span className="text-[10px] text-[#8b9298]">
                  {stat.count} trade{stat.count > 1 ? "s" : ""}
                </span>
                <span className="text-[10px] text-[#6a7076]">{stat.winRate.toFixed(1)}%</span>
              </span>
            )}
          </button>
        );
      })}
      <div
        className="flex min-h-[86px] flex-col justify-between rounded-xl p-2"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span className="text-[10px] uppercase tracking-[0.08em] text-[#6a7076]">
          Week {week.index}
        </span>
        <span className="flex flex-col">
          <span className="font-mono text-[12px] tabular" style={{ color: wColor, fontWeight: 560 }}>
            {week.days ? money(week.pnl) : "—"}
          </span>
          <span className="text-[10px] text-[#6a7076]">{week.days} days</span>
        </span>
      </div>
    </>
  );
}

function Tabs({ mode, onMode }: { mode: CalendarMode; onMode: (m: CalendarMode) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 border-t border-white/6 pt-3">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onMode(m.id)}
          className="hover-lift rounded-full px-3 py-1.5 text-[12px]"
          style={
            mode === m.id
              ? {
                  background: "#20242a",
                  color: "#ffffff",
                  fontWeight: 560,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                }
              : { background: "rgba(255,255,255,0.05)", color: "#8b9298" }
          }
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
