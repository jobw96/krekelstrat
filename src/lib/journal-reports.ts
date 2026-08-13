import { DateTime } from "luxon";
import type { Trade } from "@/lib/journal";
import { LOCAL_ZONE } from "@/lib/sessions";
import { groupByDay } from "@/lib/journal-stats";

export type Bucket = {
  key: string;
  count: number;
  pnl: number;
  winRate: number;
  expectancy: number;
  avgRr: number | null;
  profitFactor: number | null;
};

export function bucketBy(trades: Trade[], key: (t: Trade) => string): Bucket[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = key(t);
    map.set(k, [...(map.get(k) ?? []), t]);
  }
  return [...map.entries()].map(([k, list]) => summarize(k, list));
}

export function summarize(key: string, list: Trade[]): Bucket {
  const pnl = list.reduce((a, t) => a + Number(t.pnl), 0);
  const wins = list.filter((t) => t.result === "WIN").length;
  // BE trades are neutral, so they don't count as losses in the win rate.
  const decided = list.filter((t) => t.result !== "BE").length;
  const profits = list.filter((t) => Number(t.pnl) > 0).reduce((a, t) => a + Number(t.pnl), 0);
  const losses = Math.abs(
    list.filter((t) => Number(t.pnl) < 0).reduce((a, t) => a + Number(t.pnl), 0),
  );
  const rrs = list.map((t) => t.rr).filter((r): r is number => r != null).map(Number);
  return {
    key,
    count: list.length,
    pnl,
    winRate: decided ? (wins / decided) * 100 : 0,
    expectancy: list.length ? pnl / list.length : 0,
    avgRr: rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : null,
    profitFactor: losses > 0 ? profits / losses : profits > 0 ? Infinity : null,
  };
}

/** Split " • " joined tag strings into individual tags. */
export function splitTags(value: string | null): string[] {
  return (value ?? "").split(" • ").map((s) => s.trim()).filter(Boolean);
}

export type TagStat = {
  tag: string;
  count: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
};

export function tagStats(trades: Trade[], field: "went_right" | "went_wrong"): TagStat[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    for (const tag of splitTags(t[field])) {
      map.set(tag, [...(map.get(tag) ?? []), t]);
    }
  }
  return [...map.entries()]
    .map(([tag, list]) => {
      const pnl = list.reduce((a, t) => a + Number(t.pnl), 0);
      const wins = list.filter((t) => t.result === "WIN").length;
      const decided = list.filter((t) => t.result !== "BE").length;
      return {
        tag,
        count: list.length,
        pnl,
        winRate: decided ? (wins / decided) * 100 : 0,
        avgPnl: pnl / list.length,
      };
    })
    .sort((a, b) => a.pnl - b.pnl);
}

export type Streaks = {
  bestWin: number;
  worstLoss: number;
  currentStreak: number;
  currentType: "WIN" | "LOSS" | null;
};

export function streaks(trades: Trade[]): Streaks {
  const sorted = [...trades].sort(
    (a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis(),
  );
  let bestWin = 0;
  let worstLoss = 0;
  let run = 0;
  let type: "WIN" | "LOSS" | null = null;
  for (const t of sorted) {
    const kind = t.result === "WIN" ? "WIN" : t.result === "LOSS" ? "LOSS" : null;
    if (!kind) {
      run = 0;
      type = null;
      continue;
    }
    if (kind === type) run += 1;
    else {
      type = kind;
      run = 1;
    }
    if (type === "WIN") bestWin = Math.max(bestWin, run);
    else worstLoss = Math.max(worstLoss, run);
  }
  return { bestWin, worstLoss, currentStreak: run, currentType: type };
}

export type Extremes = {
  maxWin: number;
  maxLoss: number;
  maxDrawdown: number;
  bestDay: { key: string; pnl: number } | null;
  worstDay: { key: string; pnl: number } | null;
};

export function extremes(trades: Trade[]): Extremes {
  const sorted = [...trades].sort(
    (a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis(),
  );
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const t of sorted) {
    equity += Number(t.pnl);
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }
  const days = [...groupByDay(trades).values()].sort((a, b) => b.pnl - a.pnl);
  const pnls = trades.map((t) => Number(t.pnl));
  return {
    maxWin: pnls.length ? Math.max(0, ...pnls) : 0,
    maxLoss: pnls.length ? Math.min(0, ...pnls) : 0,
    maxDrawdown,
    bestDay: days[0] ? { key: days[0].key, pnl: days[0].pnl } : null,
    worstDay: days.length ? { key: days[days.length - 1]!.key, pnl: days[days.length - 1]!.pnl } : null,
  };
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function byWeekday(trades: Trade[]): Bucket[] {
  const rows = bucketBy(trades, (t) =>
    WEEKDAYS[DateTime.fromISO(t.date).setZone(LOCAL_ZONE).weekday - 1]!,
  );
  return rows.sort((a, b) => WEEKDAYS.indexOf(a.key) - WEEKDAYS.indexOf(b.key));
}

export function byHour(trades: Trade[], zone: string): Bucket[] {
  const rows = bucketBy(trades, (t) => {
    const h = DateTime.fromISO(t.date).setZone(zone).hour;
    return `${String(h).padStart(2, "0")}:00`;
  });
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

export function byRr(trades: Trade[]): Bucket[] {
  const label = (t: Trade) => {
    const r = t.rr == null ? null : Number(t.rr);
    if (r == null) return "No R";
    if (r < 1) return "< 1R";
    if (r < 2) return "1–2R";
    if (r < 3) return "2–3R";
    return "3R+";
  };
  const order = ["No R", "< 1R", "1–2R", "2–3R", "3R+"];
  return bucketBy(trades, label).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

export type Insight = { tone: "good" | "bad" | "info"; text: string };

/** Plain-language takeaways: best sessions, pitfalls, discipline leaks. */
export function insights(trades: Trade[], sessions: Bucket[]): Insight[] {
  const out: Insight[] = [];
  if (trades.length < 5) {
    out.push({ tone: "info", text: "Log at least 5 trades to unlock reliable insights." });
    return out;
  }

  const ranked = [...sessions].filter((s) => s.count >= 3).sort((a, b) => b.expectancy - a.expectancy);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  if (best && best.expectancy > 0) {
    out.push({
      tone: "good",
      text: `${best.key} is your strongest session — ${best.winRate.toFixed(0)}% win rate over ${best.count} trades, $${best.expectancy.toFixed(0)} expectancy per trade.`,
    });
  }
  if (worst && worst !== best && worst.expectancy < 0) {
    out.push({
      tone: "bad",
      text: `${worst.key} is bleeding — ${worst.count} trades at $${worst.expectancy.toFixed(0)} per trade. Consider sitting it out or cutting size.`,
    });
  }

  const wrongs = tagStats(trades, "went_wrong");
  const worstTag = wrongs[0];
  if (worstTag && worstTag.pnl < 0) {
    out.push({
      tone: "bad",
      text: `Biggest pitfall: "${worstTag.tag}" appears in ${worstTag.count} trades and costs you $${Math.abs(worstTag.pnl).toFixed(0)} in total.`,
    });
  }
  const rights = tagStats(trades, "went_right").sort((a, b) => b.pnl - a.pnl);
  const bestTag = rights[0];
  if (bestTag && bestTag.pnl > 0) {
    out.push({
      tone: "good",
      text: `"${bestTag.tag}" trades produce $${bestTag.pnl.toFixed(0)} across ${bestTag.count} entries — keep repeating this behaviour.`,
    });
  }

  const days = byWeekday(trades).filter((d) => d.count >= 3);
  const badDay = [...days].sort((a, b) => a.expectancy - b.expectancy)[0];
  if (badDay && badDay.expectancy < 0) {
    out.push({
      tone: "bad",
      text: `${badDay.key} is your weakest weekday (${badDay.count} trades, ${badDay.winRate.toFixed(0)}% wins).`,
    });
  }

  const s = streaks(trades);
  if (s.worstLoss >= 3) {
    out.push({
      tone: "bad",
      text: `Longest losing streak is ${s.worstLoss} trades — a hard daily stop after 2 losses would have capped the damage.`,
    });
  }

  const untagged = trades.filter((t) => !t.went_right && !t.went_wrong).length;
  if (untagged / trades.length > 0.3) {
    out.push({
      tone: "info",
      text: `${untagged} of ${trades.length} trades have no review tags — tagging them sharpens these insights.`,
    });
  }

  return out;
}
