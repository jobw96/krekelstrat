import { createServerFn } from "@tanstack/react-start";
import { loadMnqSeries } from "./mnq.server";
import type { MnqCandle, MnqSeries } from "./mnq.server";

export type { MnqCandle, MnqSeries };

/** 1-minute MNQ futures series (last 5 days) from the public Yahoo Finance chart API. */
export const getMnqSeries = createServerFn({ method: "GET" }).handler(
  async (): Promise<MnqSeries> => loadMnqSeries(),
);
