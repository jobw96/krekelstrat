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
  created_at: string;
};

export const SESSION_OPTIONS = ["ASIA", "LO", "PRE", "MACRO", "NYMO", "LUNCH", "2PM"];

export const WIN_GREEN = "#10B981";
export const LOSS_RED = "#e5525f";

export function money(n: number) {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
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
  const gross = trades.reduce((a, t) => a + Number(t.pnl), 0);
  const profits = trades.filter((t) => Number(t.pnl) > 0).reduce((a, t) => a + Number(t.pnl), 0);
  const losses = Math.abs(
    trades.filter((t) => Number(t.pnl) < 0).reduce((a, t) => a + Number(t.pnl), 0),
  );
  const rrs = trades.map((t) => t.rr).filter((r): r is number => r != null);
  return {
    winRate: count ? (wins / count) * 100 : 0,
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
  if (!ctx) throw new Error("Canvas niet beschikbaar");
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
