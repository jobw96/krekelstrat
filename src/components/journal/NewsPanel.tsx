import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useCalendar } from "@/hooks/useCalendar";
import { useNow } from "@/hooks/useNow";
import type { RedFolderEvent } from "@/lib/news.functions";
import { LOCAL_ZONE, NY_ZONE } from "@/lib/sessions";

const RED = "#F0736F";
const ORANGE = "#E0A458";
const GREEN = "#3ECF8E";

function dayKey(ms: number) {
  return DateTime.fromMillis(ms).setZone(NY_ZONE).toFormat("yyyy-LL-dd");
}

function toNumber(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  const mult = /k/i.test(raw) ? 1e3 : /m/i.test(raw) ? 1e6 : /b/i.test(raw) ? 1e9 : 1;
  return n * mult;
}

/** Events where a higher-than-forecast print is risk-negative for indices. */
const INVERTED = /cpi|ppi|inflation|price index|claims|unemployment rate|jolts|wage|earnings|rate decision|federal funds/i;

type Bias = { label: "BULLISH" | "BEARISH" | "NEUTRAL"; color: string };

/** Compares actual vs forecast (fallback previous) to derive an index bias. */
function biasOf(e: RedFolderEvent): Bias | null {
  const actual = toNumber(e.actual);
  if (actual === null) return null;
  const ref = toNumber(e.forecast) ?? toNumber(e.previous);
  if (ref === null) return null;
  const diff = actual - ref;
  const scale = Math.max(Math.abs(ref), 0.0001);
  if (Math.abs(diff) / scale < 0.005) return { label: "NEUTRAL", color: "#7A828D" };
  const higherIsBullish = !INVERTED.test(e.title);
  const bullish = diff > 0 ? higherIsBullish : !higherIsBullish;
  return bullish
    ? { label: "BULLISH", color: GREEN }
    : { label: "BEARISH", color: RED };
}

/** Compact "2h 14m" / "18m" style gap to an upcoming release. */
function countdown(target: number, now: number) {
  const mins = Math.max(0, Math.round((target - now) / 60_000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Headline number for the summary row, sharing the dashboard bento language. */
function Tile({
  label,
  value,
  sub,
  glow,
}: {
  label: string;
  value: string;
  sub: string;
  /** Explicitly nullable: callers pass a computed hue that may be absent. */
  glow?: string | undefined;
}) {
  return (
    <div
      className="card-glow flex min-w-0 flex-col gap-1 p-3"
      style={glow ? ({ "--glow": glow } as React.CSSProperties) : undefined}
    >
      <span className="truncate text-[10px] uppercase tracking-[0.09em] text-[#7A828D]">
        {label}
      </span>
      <span
        className="truncate font-mono text-[20px] leading-none tabular text-white"
        style={{ fontWeight: 560 }}
      >
        {value}
      </span>
      <span className="truncate text-[10.5px] text-[#7A828D]">{sub}</span>
    </div>
  );
}

/** Weekly red/orange folder USD news list with per-day navigation. */
export function NewsPanel() {
  const { data, isLoading, isFetching } = useCalendar();
  const events = useMemo(() => data?.events ?? [], [data]);
  const now = useNow(30_000);
  const nowMs = now?.toMillis() ?? Date.now();

  const days = useMemo(() => {
    const set = new Set(events.map((e) => dayKey(e.time)));
    return [...set].sort();
  }, [events]);

  const todayKey = DateTime.now().setZone(NY_ZONE).toFormat("yyyy-LL-dd");
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (days.length === 0) return;
    setActive((cur) => {
      if (cur && days.includes(cur)) return cur;
      return days.includes(todayKey) ? todayKey : (days[0] ?? null);
    });
  }, [days, todayKey]);

  const index = active ? days.indexOf(active) : -1;
  const list = active ? events.filter((e) => dayKey(e.time) === active) : [];
  const day = active ? DateTime.fromISO(active, { zone: NY_ZONE }) : null;

  const step = (delta: number) => {
    const next = days[index + delta];
    if (next) setActive(next);
  };

  // Summary row always reflects today, regardless of which day is being browsed.
  const todayEvents = useMemo(
    () => events.filter((e) => dayKey(e.time) === todayKey),
    [events, todayKey],
  );
  const highToday = todayEvents.filter((e) => e.impact === "high");
  const upcoming = todayEvents.find((e) => e.time > nowMs) ?? null;

  const biasTally = useMemo(() => {
    let bullish = 0;
    let bearish = 0;
    for (const e of todayEvents) {
      const b = biasOf(e);
      if (b?.label === "BULLISH") bullish += 1;
      if (b?.label === "BEARISH") bearish += 1;
    }
    if (!bullish && !bearish) return { label: "—", bullish, bearish, color: undefined };
    if (bullish === bearish) return { label: "MIXED", bullish, bearish, color: undefined };
    return bullish > bearish
      ? { label: "BULLISH", bullish, bearish, color: GREEN }
      : { label: "BEARISH", bullish, bearish, color: RED };
  }, [todayEvents]);

  return (
    <div className="flex flex-col gap-3">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Events today" value={String(todayEvents.length)} sub="USD red & orange" />
        <Tile
          label="High impact"
          value={String(highToday.length)}
          sub={highToday.length ? "red folder today" : "none scheduled"}
          glow={highToday.length ? RED : undefined}
        />
        <Tile
          label={upcoming ? "Next release" : "Remaining today"}
          value={upcoming ? countdown(upcoming.time, nowMs) : "—"}
          sub={upcoming ? upcoming.title : "all events printed"}
          glow={upcoming?.impact === "high" ? RED : undefined}
        />
        <Tile
          label="Bias so far"
          value={biasTally.label}
          sub={`${biasTally.bullish} bullish · ${biasTally.bearish} bearish`}
          glow={biasTally.color}
        />
      </section>

      <section className="card-surface flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2 rounded-control bg-white/[0.04] px-2 py-1.5">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={index <= 0}
          aria-label="Previous day"
          className="hover-lift grid size-7 place-items-center rounded-control bg-white/[0.04] text-[#9AA1AC] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex min-w-0 flex-col items-center">
          <span
            className="text-[12px] text-white"
            style={{ fontWeight: 560, color: active === todayKey ? "#6E86F7" : undefined }}
          >
            {day ? day.toFormat("cccc d LLL") : "—"}
            {active === todayKey ? " · today" : ""}
          </span>
          <span className="text-[10px] uppercase tracking-[0.1em] text-[#7A828D]">
            {list.length} event{list.length === 1 ? "" : "s"}
            {days.length > 0 ? ` · day ${index + 1}/${days.length}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={index < 0 || index >= days.length - 1}
          aria-label="Next day"
          className="hover-lift grid size-7 place-items-center rounded-control bg-white/[0.04] text-[#9AA1AC] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 text-[10.5px] text-[#7A828D]">
        <span className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: RED }} /> High impact
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: ORANGE }} /> Medium impact
        </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <RefreshCw className={`size-3 ${isFetching ? "animate-spin" : ""}`} />
          {data?.updatedAt
            ? DateTime.fromMillis(data.updatedAt).setZone(LOCAL_ZONE).toFormat("HH:mm")
            : "--:--"}
        </span>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-[12px] text-[#7A828D]">Loading calendar…</p>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-[#7A828D]">
          No high or medium impact USD events on this day.
        </p>
      ) : (
        <div className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto pr-1">
          {list.map((e) => {
            const color = e.impact === "high" ? RED : ORANGE;
            const past = e.time < Date.now();
            const bias = biasOf(e);
            return (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-control bg-white/5 px-3 py-2"
                style={{ opacity: past && !bias ? 0.6 : 1 }}
              >
                {/* Same dot the legend above uses, so impact reads without a
                    second visual language for the same fact. */}
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: color }}
                  title={e.impact === "high" ? "High impact" : "Medium impact"}
                />
                <span className="font-mono text-[11.5px] text-[#F0F2F5] tabular">
                  {DateTime.fromMillis(e.time).setZone(LOCAL_ZONE).toFormat("HH:mm")}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-white">
                  {e.title}
                </span>
                {bias ? (
                  <span
                    className="shrink-0 rounded-control px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em]"
                    style={{
                      color: bias.color,
                      background: `${bias.color}1f`,
                      border: `1px solid ${bias.color}33`,
                    }}
                  >
                    {bias.label}
                  </span>
                ) : null}
                <span className="hidden shrink-0 font-mono text-[10.5px] text-[#7A828D] sm:inline">
                  {e.actual
                    ? `A ${e.actual}${e.forecast ? ` / F ${e.forecast}` : ""}`
                    : e.forecast
                      ? `F ${e.forecast}`
                      : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
      </section>
    </div>
  );
}
