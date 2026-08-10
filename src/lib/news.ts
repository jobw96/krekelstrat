import { DateTime } from "luxon";
import { NY_ZONE } from "./sessions";
import type { MnqCandle } from "./mnq.functions";
import type { RedFolderEvent } from "./news.functions";

export type CatalystBias = "bullish" | "bearish" | "neutral" | "pending";

export type CatalystRead = {
  event: RedFolderEvent;
  bias: CatalystBias;
  /** Points moved from the minute before the release */
  move: number | null;
  /** Percentage surprise of actual vs forecast, when both are numeric */
  surprisePct: number | null;
  released: boolean;
};

/** Events scheduled on the same New York calendar day as `now`. */
export function eventsToday(events: RedFolderEvent[], now: DateTime): RedFolderEvent[] {
  const day = now.setZone(NY_ZONE).toFormat("yyyy-LL-dd");
  return events.filter(
    (e) => DateTime.fromMillis(e.time).setZone(NY_ZONE).toFormat("yyyy-LL-dd") === day,
  );
}

/** Parse "3.2%", "-1.5K", "250B" into a number. */
export function parseValue(raw: string): number | null {
  if (!raw) return null;
  const m = raw.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** Points moved from the candle before the release to the latest print after it. */
export function releaseMove(eventMs: number, candles: MnqCandle[]): number | null {
  if (!candles.length) return null;
  const before = [...candles].reverse().find((c) => c.t < eventMs);
  const after = candles.filter((c) => c.t >= eventMs);
  if (!before || !after.length) return null;
  return after.at(-1)!.c - before.c;
}

const MOVE_THRESHOLD = 20;

export function readCatalyst(
  event: RedFolderEvent,
  now: DateTime,
  candles: MnqCandle[],
): CatalystRead {
  const released = now.toMillis() >= event.time;
  const move = released ? releaseMove(event.time, candles) : null;
  const actual = parseValue(event.actual);
  const forecast = parseValue(event.forecast);
  const surprisePct =
    actual != null && forecast != null && forecast !== 0
      ? ((actual - forecast) / Math.abs(forecast)) * 100
      : null;

  let bias: CatalystBias = released ? "neutral" : "pending";
  if (released) {
    const priceSignal = move == null ? 0 : move > MOVE_THRESHOLD ? 1 : move < -MOVE_THRESHOLD ? -1 : 0;
    const dataSignal =
      surprisePct == null ? 0 : surprisePct > 0.5 ? 1 : surprisePct < -0.5 ? -1 : 0;
    const score = priceSignal || dataSignal;
    bias = score > 0 ? "bullish" : score < 0 ? "bearish" : "neutral";
  }

  return { event, bias, move, surprisePct, released };
}

/** The event that matters right now: live from 15m before to 60m after the release. */
export function currentCatalyst(
  events: RedFolderEvent[],
  now: DateTime,
  candles: MnqCandle[],
): CatalystRead | null {
  const ms = now.toMillis();
  const inWindow = eventsToday(events, now).filter(
    (e) => ms >= e.time - 15 * 60_000 && ms <= e.time + 60 * 60_000,
  );
  const target = inWindow.at(-1);
  return target ? readCatalyst(target, now, candles) : null;
}

export const biasColor: Record<CatalystBias, string> = {
  bullish: "#35d39a",
  bearish: "#ff6b7a",
  neutral: "#cfdde6",
  pending: "#93a9b6",
};

export function biasLabel(read: CatalystRead): string {
  if (!read.released) return "Awaiting release";
  const pct =
    read.surprisePct != null ? ` ${read.surprisePct > 0 ? "+" : ""}${read.surprisePct.toFixed(1)}%` : "";
  const pts = read.move != null ? ` / ${read.move > 0 ? "+" : ""}${read.move.toFixed(1)} pts` : "";
  if (read.bias === "bullish") return `Bullish catalyst${pct}${pts}`;
  if (read.bias === "bearish") return `Bearish catalyst${pct}${pts}`;
  return `Neutral / mixed data${pts}`;
}

export const PLAYBOOK =
  "Wait for the initial 5m spike, then trade the Continuation Retest.";
