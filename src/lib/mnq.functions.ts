import { createServerFn } from "@tanstack/react-start";

export type MnqCandle = { t: number; c: number };
export type MnqSeries = {
  price: number | null;
  candles: MnqCandle[];
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
          meta?: { regularMarketPrice?: number };
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const r = json.chart?.result?.[0];
    const ts = r?.timestamp ?? [];
    const closes = r?.indicators?.quote?.[0]?.close ?? [];
    const candles: MnqCandle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        candles.push({ t: ts[i]! * 1000, c });
      }
    }
    return {
      price: r?.meta?.regularMarketPrice ?? candles.at(-1)?.c ?? null,
      candles,
      updatedAt: Date.now(),
    };
  },
);
