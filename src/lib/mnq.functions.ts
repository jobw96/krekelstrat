import { createServerFn } from "@tanstack/react-start";

/** t = candle start (ms), o = minute open, c = minute close */
export type MnqCandle = { t: number; o: number; c: number };
export type MnqSeries = {
  price: number | null;
  candles: MnqCandle[];
  /** Exchange timestamp of the last quote (ms) — the feed is delayed ~10 min */
  quoteTime: number | null;
  updatedAt: number;
};

/** 1-minute MNQ futures series (last 5 days) from the public Yahoo Finance chart API. */
export const getMnqSeries = createServerFn({ method: "GET" }).handler(
  async (): Promise<MnqSeries> => {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/MNQ=F?interval=1m&range=5d";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Quote feed error ${res.status}`);
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; regularMarketTime?: number };
          timestamp?: number[];
          indicators?: {
            quote?: Array<{ close?: Array<number | null>; open?: Array<number | null> }>;
          };
        }>;
      };
    };
    const r = json.chart?.result?.[0];
    const ts = r?.timestamp ?? [];
    const quote = r?.indicators?.quote?.[0];
    const closes = quote?.close ?? [];
    const opens = quote?.open ?? [];
    const candles: MnqCandle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      const o = opens[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        candles.push({
          t: ts[i]! * 1000,
          o: typeof o === "number" && Number.isFinite(o) ? o : c,
          c,
        });
      }
    }
    return {
      price: r?.meta?.regularMarketPrice ?? candles.at(-1)?.c ?? null,
      candles,
      quoteTime: r?.meta?.regularMarketTime ? r.meta.regularMarketTime * 1000 : null,
      updatedAt: Date.now(),
    };
  },
);

