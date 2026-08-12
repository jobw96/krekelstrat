import { createServerFn } from "@tanstack/react-start";
import { DateTime } from "luxon";

export type RedFolderEvent = {
  id: string;
  title: string;
  /** Event time in ms epoch */
  time: number;
  forecast: string;
  previous: string;
  actual: string;
  /** "high" = red folder, "medium" = orange folder */
  impact: "high" | "medium";
};

type FfItem = {
  title?: string;
  country?: string;
  date?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
  actual?: string;
  /** Pre-parsed epoch ms (used by the XML fallback). */
  ms?: number;
};

export type CalendarPayload = { events: RedFolderEvent[]; updatedAt: number };

/** ForexFactory weekly calendar mirrors; the primary host rate-limits (429). */
const SOURCES = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  "https://faireconomy.media/ff_calendar_thisweek.json",
];
const XML_SOURCE = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml";
/** Text proxy used when the feed rate-limits our egress IP (HTTP 429). */
const PROXY_SOURCE = "https://r.jina.ai/https://nfs.faireconomy.media/ff_calendar_thisweek.json";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  Accept: "application/json,text/xml,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.forexfactory.com/calendar",
};

function normalize(items: FfItem[]): RedFolderEvent[] {
  const events: RedFolderEvent[] = [];
  for (const it of items) {
    if (it.country !== "USD") continue;
    const impact = (it.impact ?? "").toLowerCase();
    if (impact !== "high" && impact !== "medium") continue;
    const time = it.ms ?? (it.date ? Date.parse(it.date) : NaN);
    if (!Number.isFinite(time)) continue;
    events.push({
      id: `${it.title ?? "event"}-${time}`,
      title: it.title ?? "US event",
      time,
      forecast: it.forecast ?? "",
      previous: it.previous ?? "",
      actual: it.actual ?? "",
      impact: impact === "high" ? "high" : "medium",
    });
  }
  events.sort((a, b) => a.time - b.time);
  return events;
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`));
  return m ? m[1]!.trim() : "";
}

/** Fallback parser for the XML variant of the same weekly feed. */
function parseXml(xml: string): FfItem[] {
  const items: FfItem[] = [];
  for (const m of xml.matchAll(/<event>([\s\S]*?)<\/event>/g)) {
    const b = m[1]!;
    const date = tag(b, "date");
    const time = tag(b, "time");
    // Feed uses MM-dd-yyyy plus a US Eastern 12h clock ("8:30am").
    const dt = DateTime.fromFormat(`${date} ${time.toLowerCase()}`, "MM-dd-yyyy h:mma", {
      zone: "America/New_York",
    });
    if (!dt.isValid) continue;
    items.push({
      title: tag(b, "title"),
      country: tag(b, "country"),
      ms: dt.toMillis(),
      impact: tag(b, "impact"),
      forecast: tag(b, "forecast"),
      previous: tag(b, "previous"),
    });
  }
  return items;
}

let cache: CalendarPayload | null = null;
let lastAttempt = 0;

async function loadCalendar(): Promise<CalendarPayload> {
  const fresh = cache && Date.now() - cache.updatedAt < 60 * 60_000;
  if (fresh) return cache!;
  // Back off failed attempts so a rate-limited feed isn't hammered every render.
  if (Date.now() - lastAttempt < 5 * 60_000 && cache) return cache;
  lastAttempt = Date.now();

  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Calendar feed ${res.status}`);
      const json = (await res.json()) as FfItem[];
      const events = normalize(Array.isArray(json) ? json : []);
      if (events.length) {
        cache = { events, updatedAt: Date.now() };
        return cache;
      }
    } catch (err) {
      console.error(`[calendar] ${url} unavailable:`, err);
    }
  }

  try {
    const res = await fetch(PROXY_SOURCE, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (res.ok) {
      const text = await res.text();
      const start = text.indexOf("[{");
      const end = text.lastIndexOf("}]");
      if (start !== -1 && end > start) {
        const json = JSON.parse(text.slice(start, end + 2)) as FfItem[];
        const events = normalize(Array.isArray(json) ? json : []);
        if (events.length) {
          cache = { events, updatedAt: Date.now() };
          return cache;
        }
      }
    }
  } catch (err) {
    console.error("[calendar] proxy fallback unavailable:", err);
  }

  try {
    const res = await fetch(XML_SOURCE, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const events = normalize(parseXml(await res.text()));
      if (events.length) {
        cache = { events, updatedAt: Date.now() };
        return cache;
      }
    }
  } catch (err) {
    console.error("[calendar] xml fallback unavailable:", err);
  }

  return cache ?? { events: [], updatedAt: Date.now() };
}

/** Red (high) + orange (medium) impact USD events for the current week. */
export const getCalendarEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<CalendarPayload> => loadCalendar(),
);

/** High-impact ("Red Folder") USD events only. */
export const getRedFolderEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<CalendarPayload> => {
    const all = await loadCalendar();
    return { events: all.events.filter((e) => e.impact === "high"), updatedAt: all.updatedAt };
  },
);
