import { DateTime } from "luxon";
import { RefreshCw } from "lucide-react";
import { useCalendar } from "@/hooks/useCalendar";
import type { RedFolderEvent } from "@/lib/news.functions";
import { LOCAL_ZONE, NY_ZONE } from "@/lib/sessions";

const RED = "#e5525f";
const ORANGE = "#e79a3c";

function dayKey(ms: number) {
  return DateTime.fromMillis(ms).setZone(NY_ZONE).toFormat("yyyy-LL-dd");
}

function groupByDay(events: RedFolderEvent[]) {
  const map = new Map<string, RedFolderEvent[]>();
  for (const e of events) {
    const k = dayKey(e.time);
    const list = map.get(k);
    if (list) list.push(e);
    else map.set(k, [e]);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/** Weekly red/orange folder USD news list, refreshed automatically. */
export function NewsPanel() {
  const { data, isLoading, isFetching } = useCalendar();
  const events = data?.events ?? [];
  const groups = groupByDay(events);
  const todayKey = DateTime.now().setZone(NY_ZONE).toFormat("yyyy-LL-dd");

  return (
    <section className="card-surface flex flex-col gap-3 p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[14px] text-white" style={{ fontWeight: 560 }}>
            News
          </h3>
          <span className="text-[11px] text-[#6a7076]">
            USD red &amp; orange folder events · this week
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[10.5px] text-[#6a7076]">
          <RefreshCw
            className={`size-3 ${isFetching ? "animate-spin" : ""}`}
            strokeWidth={2}
          />
          {data?.updatedAt
            ? DateTime.fromMillis(data.updatedAt).setZone(LOCAL_ZONE).toFormat("HH:mm")
            : "--:--"}
        </span>
      </header>

      <div className="flex items-center gap-3 text-[10.5px] text-[#6a7076]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: RED }} /> High impact
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: ORANGE }} /> Medium impact
        </span>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-[12px] text-[#6a7076]">Loading calendar…</p>
      ) : groups.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-[#6a7076]">
          No high or medium impact USD events this week.
        </p>
      ) : (
        <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
          {groups.map(([key, list]) => {
            const day = DateTime.fromISO(key, { zone: NY_ZONE });
            const isToday = key === todayKey;
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <span
                  className="text-[10.5px] uppercase tracking-[0.1em]"
                  style={{ color: isToday ? "#5ec8f5" : "#6a7076" }}
                >
                  {day.toFormat("cccc d LLL")}
                  {isToday ? " · today" : ""}
                </span>
                {list.map((e) => {
                  const color = e.impact === "high" ? RED : ORANGE;
                  const past = e.time < Date.now();
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
                      style={{ opacity: past ? 0.6 : 1 }}
                    >
                      <span
                        className="h-6 w-[2px] shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="font-mono text-[11.5px] text-[#d7dbe0] tabular">
                        {DateTime.fromMillis(e.time).setZone(LOCAL_ZONE).toFormat("HH:mm")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-white">
                        {e.title}
                      </span>
                      <span className="hidden shrink-0 font-mono text-[10.5px] text-[#6a7076] sm:inline">
                        {e.actual ? `A ${e.actual}` : e.forecast ? `F ${e.forecast}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
