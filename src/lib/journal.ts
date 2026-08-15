import { supabase } from "@/integrations/supabase/client";

export type Strategy = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type TradeResult = "WIN" | "LOSS" | "BE";

export type Trade = {
  id: string;
  user_id: string;
  strategy_id: string | null;
  date: string;
  pnl: number;
  result: TradeResult;
  rr: number | null;
  session: string | null;
  screenshot_url: string | null;
  notes: string | null;
  went_right: string | null;
  went_wrong: string | null;
  improvement: string | null;
  is_practice?: boolean | null;
  /** Which prop account size this trade belongs to; see ACCOUNT_SIZES. */
  account_size: number;
  created_at: string;
};

/**
 * The journal is kept per prop account size. Trades logged before the split
 * were all on the 25K account, which the migration's default backfills.
 */
export const ACCOUNT_SIZES = [25000, 50000, 150000, 250000] as const;

export type AccountSize = (typeof ACCOUNT_SIZES)[number];

export const DEFAULT_ACCOUNT_SIZE: AccountSize = 25000;

export function accountLabel(size: number) {
  return `$${Math.round(size / 1000)}K`;
}

export const SESSION_OPTIONS = ["ASIA", "LO", "PRE", "MACRO", "NYMO", "LUNCH", "2PM"];

/** Full session names, matching the Sessions & Volume Windows tab. */
export const SESSION_LABELS: Record<string, string> = {
  ASIA: "Asia Open",
  LO: "London Open",
  PRE: "US Pre-Market Open",
  MACRO: "US Macro News Window",
  NYMO: "NY Equity Open",
  LUNCH: "NY Lunch Hour",
  "2PM": "NY PM Session",
};

export function sessionLabel(s: string) {
  return SESSION_LABELS[s] ?? s;
}

/** Positive/win accent. Turns light-blue while the journal is in practice mode. */
export let WIN_GREEN = "#3ECF8E";
export const LOSS_RED = "#F0736F";
/** Light-blue accent used everywhere practice (demo) trades appear. */
export const PRACTICE_BLUE = "#6E86F7";

/** Swap the win accent to the practice blue (live binding, read at render time). */
export function setPracticeAccent(on: boolean) {
  WIN_GREEN = on ? PRACTICE_BLUE : "#3ECF8E";
}


let maskMoney = false;

/** Hide dollar amounts globally (used when viewing a buddy's masked journal). */
export function setMoneyMask(on: boolean) {
  maskMoney = on;
}

export function money(n: number) {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  if (maskMoney) return `${sign}$***`;
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export type Metrics = {
  winRate: number;
  profitFactor: number | null;
  avgRr: number | null;
  totalPnl: number;
  count: number;
};

export function computeMetrics(trades: Trade[]): Metrics {
  const count = trades.length;
  const wins = trades.filter((t) => t.result === "WIN").length;
  // BE is neutral: it should not drag the win rate down like a loss.
  const decided = trades.filter((t) => t.result !== "BE").length;
  const gross = trades.reduce((a, t) => a + Number(t.pnl), 0);
  const profits = trades.filter((t) => Number(t.pnl) > 0).reduce((a, t) => a + Number(t.pnl), 0);
  const losses = Math.abs(
    trades.filter((t) => Number(t.pnl) < 0).reduce((a, t) => a + Number(t.pnl), 0),
  );
  const rrs = trades.map((t) => t.rr).filter((r): r is number => r != null);
  return {
    winRate: decided ? (wins / decided) * 100 : 0,
    profitFactor: losses > 0 ? profits / losses : profits > 0 ? Infinity : null,
    avgRr: rrs.length ? rrs.reduce((a, b) => a + Number(b), 0) / rrs.length : null,
    totalPnl: gross,
    count,
  };
}

/** Convert any image file to an optimized WebP blob using canvas. */
export async function toWebp(file: File, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxW = 1920;
  const scale = Math.min(1, maxW / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/webp", quality),
  );
  if (!blob) throw new Error("WebP conversion failed");
  return blob;
}

/** Upload a screenshot as .webp into the user's private folder, return a signed URL path. */
export async function uploadScreenshot(userId: string, file: File): Promise<string> {
  const blob = await toWebp(file);
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from("trade-screenshots")
    .upload(path, blob, { contentType: "image/webp", upsert: false });
  if (error) throw error;
  return path;
}

export async function signedScreenshotUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("trade-screenshots")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
