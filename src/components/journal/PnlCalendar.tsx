import { DateTime } from "luxon";
import { money, WIN_GREEN, LOSS_RED, type Trade } from "@/lib/journal";
import { LOCAL_ZONE } from "@/lib/sessions";

/** Monthly P&L calendar; each cell colours by net daily P&L. */
export function PnlCalendar({
  month,
  trades,
  onSelectDay,
  onMonthChange,
}: {
  month: DateTime;
  trades: Trade[];
  onSelectDay: (day: string) => void;
  onMonthChange: (m: DateTime) => void;
}) {
  const start = month.startOf("month");
  const firstCell = start.minus({ days: (start.weekday + 6) % 7 });
  const cells = Array.from({ length: 42 }, (_, i) => firstCell.plus({ days: i }));

  const byDay = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toFormat("yyyy-LL-dd");
    byDay.set(key, [...(byDay.get(key) ?? []), t]);
  }

  return (
    <section className="card-surface flex flex-col gap-3 p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-[16px] text-white" style={{ fontWeight: 560 }}>
          {month.setLocale("nl").toFormat("LLLL yyyy")}
        </h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => onMonthChange(month.minus({ months: 1 }))}
            className="rounded-full bg-white/6 px-3 py-1 text-[12px] text-[#cfdde6] hover:bg-white/12"
          >
            ←
          </button>
          <button
            onClick={() => onMonthChange(DateTime.now().setZone(LOCAL_ZONE).startOf("month"))}
            className="rounded-full bg-white/6 px-3 py-1 text-[12px] text-[#cfdde6] hover:bg-white/12"
          >
            Vandaag
          </button>
          <button
            onClick={() => onMonthChange(month.plus({ months: 1 }))}
            className="rounded-full bg-white/6 px-3 py-1 text-[12px] text-[#cfdde6] hover:bg-white/12"
          >
            →
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1.5">
        {["ma", "di", "wo", "do", "vr", "za", "zo"].map((d) => (
          <span
            key={d}
            className="pb-1 text-center text-[10px] uppercase tracking-[0.08em] text-[#6b8592]"
          >
            {d}
          </span>
        ))}
        {cells.map((c) => {
          const key = c.toFormat("yyyy-LL-dd");
          const dayTrades = byDay.get(key) ?? [];
          const pnl = dayTrades.reduce((a, t) => a + Number(t.pnl), 0);
          const inMonth = c.month === month.month;
          const positive = dayTrades.length > 0 && pnl > 0;
          const negative = dayTrades.length > 0 && pnl < 0;
          const color = positive ? WIN_GREEN : negative ? LOSS_RED : "#6b8592";
          return (
            <button
              key={key}
              onClick={() => dayTrades.length && onSelectDay(key)}
              className="flex min-h-[74px] flex-col justify-between rounded-xl p-2 text-left transition-colors"
              style={{
                background: dayTrades.length
                  ? `${color}1f`
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${dayTrades.length ? `${color}59` : "rgba(255,255,255,0.06)"}`,
                opacity: inMonth ? 1 : 0.35,
                cursor: dayTrades.length ? "pointer" : "default",
              }}
            >
              <span className="font-mono text-[11px] text-[#93a9b6]">{c.day}</span>
              {dayTrades.length > 0 && (
                <span className="flex flex-col">
                  <span className="font-mono text-[12px] tabular" style={{ color, fontWeight: 560 }}>
                    {money(pnl)}
                  </span>
                  <span className="text-[10px] text-[#6b8592]">
                    {dayTrades.length} trade{dayTrades.length > 1 ? "s" : ""}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
