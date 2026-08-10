import { createServerFn } from "@tanstack/react-start";

export type RedFolderEvent = {
  id: string;
  title: string;
  /** Event time in ms epoch */
  time: number;
  forecast: string;
  previous: string;
  actual: string;
};

type FfItem = {
  title?: string;
  country?: string;
  date?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
  actual?: string;
};

/**
 * High-impact ("Red Folder") US economic events for the current week,
 * from the public ForexFactory weekly calendar JSON feed.
 */
export const getRedFolderEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ events: RedFolderEvent[]; updatedAt: number }> => {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Calendar feed error ${res.status}`);
    const json = (await res.json()) as FfItem[];
    const events: RedFolderEvent[] = [];
    for (const it of Array.isArray(json) ? json : []) {
      if (it.country !== "USD") continue;
      if ((it.impact ?? "").toLowerCase() !== "high") continue;
      const time = it.date ? Date.parse(it.date) : NaN;
      if (!Number.isFinite(time)) continue;
      events.push({
        id: `${it.title ?? "event"}-${time}`,
        title: it.title ?? "US event",
        time,
        forecast: it.forecast ?? "",
        previous: it.previous ?? "",
        actual: it.actual ?? "",
      });
    }
    events.sort((a, b) => a.time - b.time);
    return { events, updatedAt: Date.now() };
  },
);
