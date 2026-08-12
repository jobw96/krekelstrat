/** Server-only MNQ quote fetching with in-memory fallback cache. */
export type MnqCandle = { t: number; o: number; c: number };
export type MnqSeries = {
  price: number | null;
  candles: MnqCandle[];
  /** Exchange timestamp of the last quote (ms) — the feed is delayed ~10 min */
  quoteTime: number | null;
  updatedAt: number;
};

const EMPTY: MnqSeries = { price: null, candles: [], quoteTime: null, updatedAt: 0 };

let lastGood: MnqSeries | null = null;

type YahooChart = {
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

async function fetchSeries(): Promise<MnqSeries> {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/MNQ=F?interval=1m&range=5d";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Quote feed error ${res.status}`);
  const json = (await res.json()) as YahooChart;
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
}

/** Never throws: falls back to the last successful payload (or an empty one). */
export async function loadMnqSeries(): Promise<MnqSeries> {
  try {
    const series = await fetchSeries();
    lastGood = series;
    return series;
  } catch (err) {
    console.error("MNQ quote feed failed", err);
    return lastGood ?? EMPTY;
  }
}
