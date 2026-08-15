import { money, WIN_GREEN, LOSS_RED, type Metrics } from "@/lib/journal";
import type { AvgStats } from "@/lib/journal-stats";

function Gauge({ value, color }: { value: number; color: string }) {
  const r = 34;
  const circ = Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <svg viewBox="0 0 84 48" className="h-[36px] w-[62px] sm:h-[48px] sm:w-[84px]">
      <path
        d="M 8 42 A 34 34 0 0 1 76 42"
        fill="none"
        stroke="rgba(255,255,255,0.09)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M 8 42 A 34 34 0 0 1 76 42"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * circ} ${circ}`}
        style={{ transition: "stroke-dasharray 400ms ease" }}
      />
    </svg>
  );
}

function Card({
  label,
  glow,
  children,
}: {
  label: string;
  /** Bloom hue for this tile — defaults to the interface accent. */
  glow?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="card-glow flex min-w-0 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4"
      style={glow ? ({ "--glow": glow } as React.CSSProperties) : undefined}
    >
      <span className="truncate text-[9.5px] uppercase tracking-[0.09em] text-[#7A828D] sm:text-[10px]">{label}</span>
      {children}
    </div>
  );
}

/** TradeZella-style KPI row: net P&L, win rate gauges and win/loss ratio bar. */
export function StatsBar({
  metrics,
  stats,
}: {
  metrics: Metrics;
  stats: AvgStats;
}) {
  const pnlColor = metrics.totalPnl > 0 ? WIN_GREEN : metrics.totalPnl < 0 ? LOSS_RED : "#9AA1AC";
  const ratioTotal = stats.avgWin + stats.avgLoss;
  const winShare = ratioTotal ? (stats.avgWin / ratioTotal) * 100 : 50;
  const ratio = stats.avgLoss ? stats.avgWin / stats.avgLoss : stats.avgWin ? Infinity : 0;

  return (
    <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
      <Card label="Net P&L" glow={pnlColor}>
        <span
          className="truncate font-mono text-[20px] leading-none tabular sm:text-[30px]"
          style={{ color: pnlColor, fontWeight: 560 }}
        >
          {money(metrics.totalPnl)}
        </span>
        <span className="truncate font-mono text-[10px] text-[#7A828D] sm:text-[11px]">{metrics.count} trades</span>
      </Card>

      <Card label="Trade Win %" glow={WIN_GREEN}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[19px] leading-none tabular text-white sm:text-[26px]" style={{ fontWeight: 560 }}>
            {metrics.winRate.toFixed(1)}%
          </span>
          <Gauge value={metrics.winRate} color={WIN_GREEN} />
        </div>
        <span className="truncate font-mono text-[10px] text-[#7A828D] sm:text-[11px]">
          {Math.round((metrics.winRate / 100) * metrics.count)}W ·{" "}
          {metrics.count - Math.round((metrics.winRate / 100) * metrics.count)}L
        </span>
      </Card>

      <Card label="Day Win %" glow="#6E86F7">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[19px] leading-none tabular text-white sm:text-[26px]" style={{ fontWeight: 560 }}>
            {stats.dayWinRate.toFixed(1)}%
          </span>
          <Gauge value={stats.dayWinRate} color="#6E86F7" />
        </div>
        <span className="truncate font-mono text-[10px] text-[#7A828D] sm:text-[11px]">
          {stats.greenDays} green · {stats.redDays} red days
        </span>
      </Card>

      <Card label="Avg Win / Loss">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[12.5px] tabular sm:text-[15px]" style={{ color: WIN_GREEN }}>
            ${stats.avgWin.toFixed(0)}
          </span>
          <span className="font-mono text-[15px] tabular text-white sm:text-[18px]" style={{ fontWeight: 560 }}>
            {ratio === Infinity ? "∞" : ratio.toFixed(2)}
          </span>
          <span className="font-mono text-[12.5px] tabular sm:text-[15px]" style={{ color: LOSS_RED }}>
            ${stats.avgLoss.toFixed(0)}
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-white/6">
          <span style={{ width: `${winShare}%`, background: WIN_GREEN }} />
          <span style={{ width: `${100 - winShare}%`, background: LOSS_RED }} />
        </div>
        <span className="truncate font-mono text-[10px] text-[#7A828D] sm:text-[11px]">Avg win vs avg loss</span>
      </Card>
    </section>
  );
}
