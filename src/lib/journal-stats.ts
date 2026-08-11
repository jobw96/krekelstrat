import { DateTime } from "luxon";
import { LOCAL_ZONE } from "@/lib/sessions";
import type { Trade } from "@/lib/journal";

export type DayStat = {
  key: string;
  pnl: number;
  count: number;
  winRate: number;
};

/** Group trades per local calendar day with P&L, count and win rate. */
export function groupByDay(trades: Trade[]): Map<string, DayStat> {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toFormat("yyyy-LL-dd");
    map.set(key, [...(map.get(key) ?? []), t]);
  }
  const out = new Map<string, DayStat>();
  for (const [key, list] of map) {
    const wins = list.filter((t) => t.result === "WIN").length;
    out.set(key, {
      key,
      pnl: list.reduce((a, t) => a + Number(t.pnl), 0),
      count: list.length,
      winRate: list.length ? (wins / list.length) * 100 : 0,
    });
  }
  return out;
}

export type AvgStats = {
  avgWin: number;
  avgLoss: number;
  dayWinRate: number;
  greenDays: number;
  redDays: number;
};

export function advancedStats(trades: Trade[]): AvgStats {
  const wins = trades.filter((t) => Number(t.pnl) > 0);
  const losses = trades.filter((t) => Number(t.pnl) < 0);
  const days = [...groupByDay(trades).values()];
  const greenDays = days.filter((d) => d.pnl > 0).length;
  const redDays = days.filter((d) => d.pnl < 0).length;
  return {
    avgWin: wins.length ? wins.reduce((a, t) => a + Number(t.pnl), 0) / wins.length : 0,
    avgLoss: losses.length
      ? Math.abs(losses.reduce((a, t) => a + Number(t.pnl), 0) / losses.length)
      : 0,
    dayWinRate: days.length ? (greenDays / days.length) * 100 : 0,
    greenDays,
    redDays,
  };
}

export type CurvePoint = {
  label: string;
  winRate: number;
  avgWin: number;
  avgLoss: number;
};

/** Cumulative performance curve, one point per trading day (chronological). */
export function performanceCurve(trades: Trade[]): CurvePoint[] {
  const sorted = [...trades].sort(
    (a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis(),
  );
  const seen: Trade[] = [];
  const out: CurvePoint[] = [];
  let lastKey = "";
  for (const t of sorted) {
    seen.push(t);
    const key = DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toFormat("yyyy-LL-dd");
    const stats = advancedStats(seen);
    const wins = seen.filter((s) => s.result === "WIN").length;
    const point: CurvePoint = {
      label: DateTime.fromISO(key).toFormat("dd LLL"),
      winRate: seen.length ? (wins / seen.length) * 100 : 0,
      avgWin: Math.round(stats.avgWin),
      avgLoss: Math.round(stats.avgLoss),
    };
    if (key === lastKey) out[out.length - 1] = point;
    else out.push(point);
    lastKey = key;
  }
  return out;
}

export type WeekSummary = { index: number; pnl: number; days: number };

/** Weekly totals for the 6 rows of a month grid, keyed by row index. */
export function weekSummaries(cells: DateTime[], byDay: Map<string, DayStat>): WeekSummary[] {
  const weeks: WeekSummary[] = [];
  for (let w = 0; w < cells.length / 7; w++) {
    const slice = cells.slice(w * 7, w * 7 + 7);
    let pnl = 0;
    let days = 0;
    for (const c of slice) {
      const d = byDay.get(c.toFormat("yyyy-LL-dd"));
      if (d) {
        pnl += d.pnl;
        days += 1;
      }
    }
    weeks.push({ index: w + 1, pnl, days });
  }
  return weeks;
}
