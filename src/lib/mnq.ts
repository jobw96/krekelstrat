import { DateTime } from "luxon";
import { NY_ZONE, type SessionDef } from "./sessions";
import type { MnqCandle } from "./mnq.functions";

export const TICK = 0.25;

/** Most recent start of a session that has already begun (NY schedule). */
export function lastSessionStart(def: SessionDef, now: DateTime): DateTime {
  const ny = now.setZone(NY_ZONE);
  for (const offset of [0, -1, -2]) {
    const start = ny
      .plus({ days: offset })
      .startOf("day")
      .set({ hour: def.nyStart[0], minute: def.nyStart[1] });
    if (start <= ny) return start;
  }
  return ny.startOf("day");
}

/** Close of the 1-minute candle at (or just after) the session's opening minute. */
export function sessionOpenPrice(
  def: SessionDef,
  now: DateTime,
  candles: MnqCandle[],
): number | null {
  if (!candles.length) return null;
  const startMs = lastSessionStart(def, now).toMillis();
  let best: MnqCandle | null = null;
  for (const c of candles) {
    if (c.t >= startMs && c.t <= startMs + 10 * 60_000) {
      best = c;
      break;
    }
  }
  return best?.c ?? null;
}

export type Phase = "continuation" | "reversion" | "pending";

export type PhaseRead = {
  phase: Phase;
  direction: 1 | -1 | 0;
  /** Points of expansion (or contraction) over the lookback window */
  delta: number;
};

/**
 * Continuation = distance from session open is expanding.
 * Reversion = expansion stalled or retraced over the last 5 minutes.
 */
export function detectPhase(
  open: number | null,
  price: number | null,
  candles: MnqCandle[],
  lookbackMinutes = 5,
  expansionThreshold = 4,
): PhaseRead {
  if (open == null || price == null || candles.length < lookbackMinutes + 1)
    return { phase: "pending", direction: 0, delta: 0 };

  const nowMs = candles.at(-1)!.t;
  const past =
    [...candles].reverse().find((c) => c.t <= nowMs - lookbackMinutes * 60_000) ??
    candles[0]!;

  const distNow = Math.abs(price - open);
  const distPast = Math.abs(past.c - open);
  const delta = distNow - distPast;
  const direction = price > open ? 1 : price < open ? -1 : 0;

  return {
    phase: delta >= expansionThreshold ? "continuation" : "reversion",
    direction,
    delta,
  };
}

export function formatPoints(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)} pts`;
}

export function formatTicks(value: number) {
  return `${Math.abs(Math.round(value / TICK))} ticks`;
}

export function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
