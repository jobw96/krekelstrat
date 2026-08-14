import { motion } from "framer-motion";
import type { DateTime } from "luxon";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Undo2 } from "lucide-react";
import {
  formatRange,
  statusOf,
  type ClockState,
  type SessionDef,
  LOCAL_ZONE,
  NY_ZONE,
} from "@/lib/sessions";
import {
  detectPhase,
  formatPoints,
  formatPrice,
  formatTicks,
  sessionOpenPrice,
} from "@/lib/mnq";
import type { MnqCandle } from "@/lib/mnq.functions";
import type { RedFolderEvent } from "@/lib/news.functions";
import { currentCatalyst, eventsToday } from "@/lib/news";
import { CatalystBadge, RedFolderList } from "./NewsCatalyst";
import { Badge, Dot } from "./primitives";

/** Conditional colors for the pts / ticks distance metric. */
export const LIVE_GREEN = "#3ECF8E";
export const LIVE_RED = "#F0736F";
export const LIVE_NEUTRAL = "#9AA1AC";

export function distanceColor(diff: number | null) {
  if (diff == null || diff === 0) return LIVE_NEUTRAL;
  return diff > 0 ? LIVE_GREEN : LIVE_RED;
}

/** A red folder release is imminent/live from 30m before to 60m after. */
export function redFolderImminent(events: RedFolderEvent[], now: DateTime) {
  const ms = now.toMillis();
  return eventsToday(events, now).some(
    (e) => ms >= e.time - 30 * 60_000 && ms <= e.time + 60 * 60_000,
  );
}

export function SessionCard({
  def,
  state,
  now,
  price,
  candles,
  events = [],
  compact = false,
  zone = NY_ZONE,
  zoneLabel = "NY",
  showOpen = true,
}: {
  def: SessionDef;
  state: ClockState;
  now: DateTime;
  price: number | null;
  candles: MnqCandle[];
  events?: RedFolderEvent[];
  compact?: boolean;
  zone?: string;
  zoneLabel?: string;
  /** Only recent sessions show an open price */
  showOpen?: boolean;
}) {
  const status = statusOf(def, state);
  const active = status === "active";

  const open = showOpen ? sessionOpenPrice(def, now, candles) : null;
  const diff = open != null && price != null ? price - open : null;
  const diffColor = distanceColor(diff);
  const read = detectPhase(open, price, candles);
  const upcoming = status === "next" || open == null;

  const isMacro = def.id === "macro";
  const todaysEvents = isMacro ? eventsToday(events, now) : [];
  const catalyst = isMacro ? currentCatalyst(events, now, candles) : null;
  const redAlert = isMacro && todaysEvents.length > 0;
  const redHot = redAlert && redFolderImminent(events, now);


  const ACCENT = "#6E86F7";

  const surfaceStyle: Record<string, string | number> = active
    ? {
        ["--glow" as never]: ACCENT,
        borderColor: "rgba(110,134,247,0.30)",
        background: "#1C1F27",
        boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(110,134,247,0.22), 0 0 26px -12px ${ACCENT}, 0 12px 28px -16px rgba(0,0,0,0.7)`,
      }
    : redHot
      ? {
          borderColor: "rgba(240,115,111,0.30)",
          boxShadow:
            "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(240,115,111,0.14), 0 0 22px -12px rgba(240,115,111,0.6)",
        }
      : status === "next"
        ? { opacity: 0.94 }
        : { opacity: 0.62 };

  const redFolderBadge = redAlert ? (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]"
      style={{
        background: "rgba(240,115,111,0.10)",
        color: "#F0736F",
        border: "1px solid rgba(240,115,111,0.28)",
        fontWeight: 500,
      }}
    >
      <span
        className="pulse-dot inline-block size-1.5 rounded-full"
        style={{ background: "#F0736F" }}
      />
      <AlertTriangle className="size-3" strokeWidth={2} />
      Red Folder News
    </span>
  ) : null;

  const statusChip = active ? (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]"
      style={{
        background: "rgba(110,134,247,0.12)",
        color: "#8098FF",
        border: "1px solid rgba(110,134,247,0.30)",
        fontWeight: 500,
      }}
    >
      <span className="pulse-dot inline-block size-1.5 rounded-full" style={{ background: ACCENT }} />
      Live now
    </span>
  ) : status === "next" ? (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]"
      style={{
        background: "rgba(110,134,247,0.12)",
        color: "#8098FF",
        border: "1px solid rgba(110,134,247,0.30)",
        fontWeight: 500,
      }}
    >
      <Dot color={ACCENT} />
      Next
    </span>
  ) : (
    <Badge color="#7A828D">
      <Dot color="#7A828D" />
      Closed
    </Badge>

  );

  if (compact) {
    return (
      <motion.article
        layout
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
        className={`card-surface relative flex flex-col gap-2 overflow-hidden p-3.5 ${
          active ? "glow-ring" : ""
        }`}
        style={surfaceStyle}
      >
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <h3
              className="truncate text-[14px] leading-tight"
              style={{ color: active ? "#ffffff" : "#F0F2F5", fontWeight: 560 }}
            >
              {def.name}
            </h3>
            <span className="font-mono text-[10px] tracking-[0.04em] text-[#7A828D]">
              {formatRange(def, zone, now)} {zoneLabel}
            </span>
          </div>
          {statusChip}
        </header>

        {redFolderBadge}

        {upcoming ? (
          <div className="glass-inset flex items-center justify-between gap-3 p-2.5">
            <span className="text-[9px] uppercase tracking-[0.08em] text-[#7A828D]">Open</span>
            <span className="font-mono text-[11px] text-[#7A828D]">Awaiting session open</span>
          </div>
        ) : (
        <div className="glass-inset flex items-center justify-between gap-3 p-2.5">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-[0.08em] text-[#7A828D]">
              Open
            </span>
            <span className="font-mono text-[13px] text-[#F0F2F5] tabular">
              {open != null ? formatPrice(open) : "—"}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span
              className="font-mono text-[14px] tabular"
              style={{ color: diffColor, fontWeight: 560 }}
            >
              {diff != null ? formatPoints(diff) : "—"}
            </span>
            <span className="font-mono text-[10px] tabular" style={{ color: diffColor }}>
              {diff != null ? formatTicks(diff) : "—"}
            </span>
          </div>
        </div>
        )}
      </motion.article>
    );
  }

  return (
    <motion.article
      layout
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      className={`card-surface relative flex flex-col gap-3 overflow-hidden p-5 ${
        active ? "glow-ring" : ""
      }`}
      style={surfaceStyle}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3
            className="text-[17px] leading-tight"
            style={{ color: active ? "#ffffff" : "#F0F2F5", fontWeight: 560 }}
          >
            {def.name}
          </h3>
          <span className="font-mono text-[11px] tracking-[0.04em] text-[#7A828D]">
            {def.short}
          </span>
        </div>
        {statusChip}
      </header>

      {active && (
        <motion.div
          layout
          className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]"
          style={{
            background:
              read.phase === "continuation"
                ? `${read.direction >= 0 ? LIVE_GREEN : LIVE_RED}22`
                : "rgba(69,211,224,0.14)",
            color:
              read.phase === "continuation"
                ? read.direction >= 0
                  ? LIVE_GREEN
                  : LIVE_RED
                : read.phase === "reversion"
                  ? "#9AA1AC"
                  : "#9AA1AC",
          }}
        >
          {read.phase === "continuation" ? (
            read.direction >= 0 ? (
              <ArrowUpRight className="size-3.5" strokeWidth={2} />
            ) : (
              <ArrowDownRight className="size-3.5" strokeWidth={2} />
            )
          ) : (
            <Undo2 className="size-3.5" strokeWidth={2} />
          )}
          {read.phase === "continuation"
            ? "Continuation"
            : read.phase === "reversion"
              ? "Reversion to fair price"
              : "Reading price action"}
        </motion.div>
      )}

      {redFolderBadge}
      {isMacro && <RedFolderList events={todaysEvents} />}
      {catalyst && <CatalystBadge read={catalyst} />}

      <dl className="glass-inset flex flex-col gap-1 p-3 font-mono text-[12px]">
        <div className="flex justify-between">
          <dt className="text-[#7A828D]">AMS</dt>
          <dd className="text-[#F0F2F5] tabular">{formatRange(def, LOCAL_ZONE, now)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#7A828D]">NY</dt>
          <dd className="text-[#9AA1AC] tabular">{formatRange(def, NY_ZONE, now)}</dd>
        </div>
      </dl>

      {!upcoming && (
      <div className="glass-inset flex items-end justify-between p-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.08em] text-[#7A828D]">
            MNQ session open
          </span>
          <span className="font-mono text-[15px] text-[#F0F2F5] tabular">
            {open != null ? formatPrice(open) : "—"}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span
            className="font-mono text-[15px] tabular"
            style={{ color: diffColor, fontWeight: 560 }}
          >
            {diff != null ? formatPoints(diff) : "—"}
          </span>
          <span
            className="font-mono text-[10px] tabular"
            style={{ color: diff != null ? diffColor : "#7A828D" }}
          >
            {diff != null ? formatTicks(diff) : "awaiting feed"}
          </span>
        </div>
      </div>
      )}

      <p className="text-[13px] leading-[1.5] text-[#9AA1AC]">{def.focus}</p>

      <footer className="mt-auto flex items-center justify-between pt-2">
        <span
          className="text-[11px] uppercase tracking-[0.08em]"
          style={{
            color: active ? LIVE_GREEN : status === "next" ? "#F0F2F5" : "#7A828D",
          }}
        >
          {active ? "Active now" : status === "next" ? "Upcoming next" : "Closed"}
        </span>
        {active && (
          <span className="font-mono text-[12px] text-[#9AA1AC] tabular">
            {Math.round(state.progress * 100)}%
          </span>
        )}
      </footer>

      {active && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-1 rounded-full"
            style={{ background: LIVE_GREEN }}
            animate={{ width: `${state.progress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </motion.article>
  );
}
