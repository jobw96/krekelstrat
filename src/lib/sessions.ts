import { DateTime } from "luxon";

export const NY_ZONE = "America/New_York";
export const LOCAL_ZONE = "Europe/Amsterdam";

export type SessionTone = "high" | "macro" | "dead" | "neutral";

export type SessionDef = {
  id: string;
  name: string;
  short: string;
  tag: string;
  tone: SessionTone;
  /** Start in New York time, [hour, minute] */
  nyStart: [number, number];
  /** Duration in minutes */
  minutes: number;
  focus: string;
};

export const SESSIONS: SessionDef[] = [
  {
    id: "asia",
    name: "Asia Open",
    short: "ASIA",
    tag: "Accumulation",
    tone: "neutral",
    nyStart: [20, 0],
    minutes: 360,
    focus: "Range accumulation — mark the Asian high/low for later liquidity sweeps.",
  },
  {
    id: "london",
    name: "London Open",
    short: "LO",
    tag: "High Volatility",
    tone: "high",
    nyStart: [3, 0],
    minutes: 150,
    focus: "Judas Swing & S/R Flips.",
  },
  {
    id: "premarket",
    name: "US Pre-Market Open",
    short: "PRE",
    tag: "Positioning",
    tone: "neutral",
    nyStart: [7, 0],
    minutes: 90,
    focus: "Early NY positioning — watch pre-market highs/lows forming as draw on liquidity.",
  },
  {
    id: "macro",
    name: "US Macro News Window",
    short: "MACRO",
    tag: "Macro Catalyst",
    tone: "macro",
    nyStart: [8, 30],
    minutes: 60,
    focus: "News Spikes & Continuation Retests.",
  },
  {
    id: "nymo",
    name: "NY Equity Open",
    short: "NYMO",
    tag: "High Volatility",
    tone: "high",
    nyStart: [9, 30],
    minutes: 120,
    focus: "Sweep & Reversion to Session Open.",
  },
  {
    id: "lunch",
    name: "NY Lunch Hour",
    short: "LUNCH",
    tag: "Dead Zone",
    tone: "dead",
    nyStart: [11, 30],
    minutes: 150,
    focus: "Dead zone — low participation, avoid chasing. Let the range build.",
  },
  {
    id: "pm",
    name: "NY PM Session",
    short: "2PM",
    tag: "High Volatility",
    tone: "high",
    nyStart: [14, 0],
    minutes: 120,
    focus: "2PM reversal / continuation into the close — respect the daily bias.",
  },
];

export type SessionWindow = {
  def: SessionDef;
  start: DateTime;
  end: DateTime;
};

function windowsAround(now: DateTime): SessionWindow[] {
  const nyNow = now.setZone(NY_ZONE);
  const out: SessionWindow[] = [];
  for (const offset of [-1, 0, 1]) {
    const day = nyNow.plus({ days: offset }).startOf("day");
    for (const def of SESSIONS) {
      const start = day.set({ hour: def.nyStart[0], minute: def.nyStart[1] });
      out.push({ def, start, end: start.plus({ minutes: def.minutes }) });
    }
  }
  return out.sort((a, b) => a.start.toMillis() - b.start.toMillis());
}

export type ClockState = {
  now: DateTime;
  active: SessionWindow | null;
  next: SessionWindow;
  /** 0..1 elapsed fraction of the active session */
  progress: number;
  /** seconds until next session start */
  secondsToNext: number;
};

export function computeState(now: DateTime): ClockState {
  const windows = windowsAround(now);
  const ms = now.toMillis();
  const active =
    windows.find((w) => w.start.toMillis() <= ms && ms < w.end.toMillis()) ?? null;
  const next = windows.find((w) => w.start.toMillis() > ms)!;
  const progress = active
    ? (ms - active.start.toMillis()) / (active.end.toMillis() - active.start.toMillis())
    : 0;
  return {
    now,
    active,
    next,
    progress,
    secondsToNext: Math.max(0, Math.floor((next.start.toMillis() - ms) / 1000)),
  };
}

export function formatRange(def: SessionDef, zone: string, now: DateTime) {
  const day = now.setZone(NY_ZONE).startOf("day");
  const start = day.set({ hour: def.nyStart[0], minute: def.nyStart[1] });
  const end = start.plus({ minutes: def.minutes });
  const fmt = zone === NY_ZONE ? "h:mm a" : "HH:mm";
  return `${start.setZone(zone).toFormat(fmt)} – ${end.setZone(zone).toFormat(fmt)}`;
}

export function formatCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Status of a session relative to the current state */
export function statusOf(def: SessionDef, state: ClockState) {
  if (state.active?.def.id === def.id) return "active" as const;
  if (state.next.def.id === def.id) return "next" as const;
  return "closed" as const;
}
