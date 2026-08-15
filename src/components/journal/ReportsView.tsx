import { Section } from "@/components/Section";
import { useMemo } from "react";
import { DateTime } from "luxon";
import { LOSS_RED, WIN_GREEN, money, type Strategy, type Trade } from "@/lib/journal";
import { NY_ZONE, LOCAL_ZONE, SESSIONS } from "@/lib/sessions";
import { useTzPref } from "@/hooks/useTzPref";
import { advancedStats } from "@/lib/journal-stats";
import {
  byHour,
  byRr,
  byWeekday,
  bucketBy,
  extremes,
  insights,
  streaks,
  tagStats,
  type Bucket,
  type TagStat,
} from "@/lib/journal-reports";

function pnlColor(n: number) {
  return n > 0 ? WIN_GREEN : n < 0 ? LOSS_RED : "#9AA1AC";
}

function sessionLabel(code: string) {
  return SESSIONS.find((s) => s.short === code)?.name ?? code;
}

function Kpi({ label, value, hint, color }: { label: string; value: string; hint?: string | undefined; color?: string | undefined }) {
  return (
    // card-surface, not glass-inset: these tiles sit on the page now, and a
    // translucent-black well is invisible without a card behind it.
    <div className="card-surface flex flex-col gap-1 p-4">
      <span className="text-[10.5px] uppercase tracking-[0.08em] text-[#7A828D]">{label}</span>
      <span
        className="font-mono text-[17px] tabular"
        style={{ color: color ?? "#ffffff", fontWeight: 560 }}
      >
        {value}
      </span>
      {hint && <span className="text-[10.5px] text-[#7A828D]">{hint}</span>}
    </div>
  );
}

function BucketTable({
  title,
  subtitle,
  rows,
  empty = "No data yet.",
  sortByPnl = true,
}: {
  title: string;
  subtitle?: string;
  rows: Bucket[];
  empty?: string;
  sortByPnl?: boolean;
}) {
  const list = sortByPnl ? [...rows].sort((a, b) => b.pnl - a.pnl) : rows;
  const max = Math.max(1, ...list.map((r) => Math.abs(r.pnl)));

  return (
    <Section title={title} {...(subtitle ? { subtitle } : {})}>
      <div className="card-surface p-5">
      {list.length === 0 ? (
        <p className="py-5 text-center text-[12px] text-[#7A828D]">{empty}</p>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-[minmax(0,1fr)_54px_58px_66px_74px] gap-2 px-2 text-[10px] uppercase tracking-[0.07em] text-[#454B55]">
            <span>Name</span>
            <span className="text-right">Trades</span>
            <span className="text-right">Win %</span>
            <span className="text-right">Exp.</span>
            <span className="text-right">Net P&L</span>
          </div>
          {list.map((r) => (
            <div key={r.key} className="relative overflow-hidden rounded-control bg-white/4">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${(Math.abs(r.pnl) / max) * 100}%`,
                  background: `${pnlColor(r.pnl)}1f`,
                }}
              />
              <div className="relative grid grid-cols-[minmax(0,1fr)_54px_58px_66px_74px] items-center gap-2 px-2 py-2">
                <span className="truncate text-[12.5px] text-[#F0F2F5]">{r.key}</span>
                <span className="text-right font-mono text-[11px] text-[#9AA1AC]">{r.count}</span>
                <span className="text-right font-mono text-[11px] text-[#9AA1AC]">
                  {r.winRate.toFixed(0)}%
                </span>
                <span
                  className="text-right font-mono text-[11px] tabular"
                  style={{ color: pnlColor(r.expectancy) }}
                >
                  {money(r.expectancy)}
                </span>
                <span
                  className="text-right font-mono text-[12.5px] tabular"
                  style={{ color: pnlColor(r.pnl), fontWeight: 560 }}
                >
                  {money(r.pnl)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </Section>
  );
}

function TagTable({ title, subtitle, rows, accent }: { title: string; subtitle: string; rows: TagStat[]; accent: string }) {
  return (
    <Section title={title} subtitle={subtitle}>
      <div className="card-surface flex flex-col gap-2 p-5">
      {rows.length === 0 ? (
        <p className="py-5 text-center text-[12px] text-[#7A828D]">
          No review tags yet. Tag your trades to build this report.
        </p>
      ) : (
        rows.map((r) => (
          <div key={r.tag} className="flex items-center justify-between rounded-control bg-white/4 px-3 py-2">
            <span
              className="rounded-control px-2.5 py-1 text-[11px]"
              style={{ background: `${accent}1f`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}40` }}
            >
              {r.tag}
            </span>
            <span className="flex items-center gap-4 font-mono text-[11px] text-[#7A828D]">
              <span>{r.count}×</span>
              <span>{r.winRate.toFixed(0)}%</span>
              <span className="tabular" style={{ color: pnlColor(r.avgPnl) }}>
                {money(r.avgPnl)} avg
              </span>
              <span className="text-[12.5px] tabular" style={{ color: pnlColor(r.pnl), fontWeight: 560 }}>
                {money(r.pnl)}
              </span>
            </span>
          </div>
        ))
      )}
      </div>
    </Section>
  );
}

/** Deep-dive analytics: what works, what leaks, and when. */
export function ReportsView({ trades, strategies }: { trades: Trade[]; strategies: Strategy[] }) {
  const { tz } = useTzPref();
  const zone = tz === "AMS" ? LOCAL_ZONE : NY_ZONE;

  const data = useMemo(() => {
    const sessions = bucketBy(trades, (t) => (t.session ? sessionLabel(t.session) : "No session"));
    return {
      sessions,
      strategyRows: bucketBy(
        trades,
        (t) => strategies.find((s) => s.id === t.strategy_id)?.name ?? "No strategy",
      ),
      weekdays: byWeekday(trades),
      hours: byHour(trades, zone),
      rr: byRr(trades),
      wrongs: tagStats(trades, "went_wrong"),
      rights: [...tagStats(trades, "went_right")].sort((a, b) => b.pnl - a.pnl),
      streak: streaks(trades),
      ext: extremes(trades),
      adv: advancedStats(trades),
      tips: insights(trades, sessions),
    };
  }, [trades, strategies, zone]);

  const total = trades.reduce((a, t) => a + Number(t.pnl), 0);
  const wins = trades.filter((t) => Number(t.pnl) > 0).length;
  const grossWin = trades.filter((t) => Number(t.pnl) > 0).reduce((a, t) => a + Number(t.pnl), 0);
  const grossLoss = Math.abs(
    trades.filter((t) => Number(t.pnl) < 0).reduce((a, t) => a + Number(t.pnl), 0),
  );
  const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null;
  const expectancy = trades.length ? total / trades.length : 0;

  if (trades.length === 0) {
    return (
      <section className="card-surface p-8 text-center">
        <p className="text-[13px] text-[#9AA1AC]">No trades in this range — log trades to build reports.</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Performance report"
        subtitle={`${trades.length} trades · times in ${tz === "AMS" ? "Amsterdam" : "New York"}`}
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          <Kpi label="Net P&L" value={money(total)} color={pnlColor(total)} />
          <Kpi label="Win rate" value={`${((wins / trades.length) * 100).toFixed(1)}%`} hint={`${wins}W / ${trades.length - wins}L·BE`} />
          <Kpi
            label="Profit factor"
            value={pf == null ? "—" : pf === Infinity ? "∞" : pf.toFixed(2)}
            hint="Gross win / gross loss"
          />
          <Kpi label="Expectancy" value={money(expectancy)} hint="Per trade" color={pnlColor(expectancy)} />
          <Kpi label="Avg win" value={money(data.adv.avgWin)} color={WIN_GREEN} />
          <Kpi label="Avg loss" value={money(-data.adv.avgLoss)} color={LOSS_RED} />
          <Kpi label="Best trade" value={money(data.ext.maxWin)} color={WIN_GREEN} />
          <Kpi label="Worst trade" value={money(data.ext.maxLoss)} color={LOSS_RED} />
          <Kpi label="Max drawdown" value={money(-data.ext.maxDrawdown)} hint="Peak to valley" color={LOSS_RED} />
          <Kpi
            label="Day win rate"
            value={`${data.adv.dayWinRate.toFixed(0)}%`}
            hint={`${data.adv.greenDays} green / ${data.adv.redDays} red`}
          />
          <Kpi
            label="Best streak"
            value={`${data.streak.bestWin}W`}
            hint={`Worst ${data.streak.worstLoss}L`}
          />
          <Kpi
            label="Best day"
            value={data.ext.bestDay ? money(data.ext.bestDay.pnl) : "—"}
            hint={data.ext.bestDay ? DateTime.fromISO(data.ext.bestDay.key).toFormat("dd LLL yyyy") : undefined}
            color={WIN_GREEN}
          />
        </div>
      </Section>

      <Section title="Key takeaways">
        <div className="card-surface flex flex-col gap-2 p-5">
        {data.tips.map((t, i) => {
          const c = t.tone === "good" ? WIN_GREEN : t.tone === "bad" ? LOSS_RED : "#6E86F7";
          return (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-control bg-white/4 px-3 py-2.5"
            >
              <span className="mt-[6px] size-1.5 shrink-0 rounded-full" style={{ background: c }} />
              <p className="text-[12.5px] leading-[1.6] text-[#F0F2F5]">{t.text}</p>
            </div>
          );
        })}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BucketTable
          title="By session"
          subtitle="Which sessions actually pay you"
          rows={data.sessions}
        />
        <BucketTable title="By strategy" subtitle="Edge per playbook" rows={data.strategyRows} />
        <TagTable
          title="Pitfalls"
          subtitle="What goes wrong, ranked by damage"
          rows={data.wrongs}
          accent={LOSS_RED}
        />
        <TagTable
          title="What works"
          subtitle="Behaviour behind your green trades"
          rows={data.rights}
          accent={WIN_GREEN}
        />
        <BucketTable
          title="By weekday"
          subtitle="Consistency across the week"
          rows={data.weekdays}
          sortByPnl={false}
        />
        <BucketTable
          title="By entry hour"
          subtitle={`Clock: ${tz === "AMS" ? "Amsterdam" : "New York"}`}
          rows={data.hours}
          sortByPnl={false}
        />
        <BucketTable
          title="By R multiple"
          subtitle="Risk-to-reward distribution"
          rows={data.rr}
          sortByPnl={false}
        />
      </div>
    </div>
  );
}
