import { motion } from "framer-motion";
import type { DateTime } from "luxon";
import { ArrowDownRight, ArrowUpRight, Undo2 } from "lucide-react";
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
import { Badge, Dot, toneColor } from "./primitives";

export function SessionCard({
  def,
  state,
  now,
  price,
  candles,
  events = [],
}: {
  def: SessionDef;
  state: ClockState;
  now: DateTime;
  price: number | null;
  candles: MnqCandle[];
  events?: RedFolderEvent[];
}) {
  const status = statusOf(def, state);
  const color = toneColor[def.tone];
  const active = status === "active";

  const open = sessionOpenPrice(def, now, candles);
  const diff = open != null && price != null ? price - open : null;
  const diffColor = diff == null ? "#93a9b6" : diff >= 0 ? "#35d39a" : "#ff6b7a";
  const read = detectPhase(open, price, candles);
  const isMacro = def.id === "macro";
  const todaysEvents = isMacro ? eventsToday(events, now) : [];
  const catalyst = isMacro ? currentCatalyst(events, now, candles) : null;


  return (
    <motion.article
      layout
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      className={`card-surface relative flex flex-col gap-3 overflow-hidden p-5 ${
        active ? "glow-ring" : ""
      }`}
      style={
        active
          ? {
              ["--glow" as never]: color,
              backgroundImage: `linear-gradient(160deg, ${color}2e 0%, rgba(255,255,255,0.03) 55%, rgba(255,255,255,0.012) 100%)`,
            }
          : {}
      }
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3
            className="text-[17px] leading-tight"
            style={{ color: active ? "#ffffff" : "#cfdde6", fontWeight: 560 }}
          >
            {def.name}
          </h3>
          <span className="font-mono text-[11px] tracking-[0.04em] text-[#6b8592]">
            {def.short}
          </span>
        </div>
        {active ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]"
            style={{ background: color, color: "#061017", fontWeight: 560 }}
          >
            <span
              className="pulse-dot inline-block size-1.5 rounded-full"
              style={{ background: "#061017" }}
            />
            Live now
          </span>
        ) : (
          <Badge color={color}>
            <Dot color={color} />
            {def.tag}
          </Badge>
        )}
      </header>

      {active && (
        <motion.div
          layout
          className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]"
          style={{
            background:
              read.phase === "continuation"
                ? `${read.direction >= 0 ? "#35d39a" : "#ff6b7a"}22`
                : "rgba(69,211,224,0.14)",
            color:
              read.phase === "continuation"
                ? read.direction >= 0
                  ? "#35d39a"
                  : "#ff6b7a"
                : read.phase === "reversion"
                  ? "#45d3e0"
                  : "#93a9b6",
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

      <dl className="glass-inset flex flex-col gap-1 p-3 font-mono text-[12px]">
        <div className="flex justify-between">
          <dt className="text-[#6b8592]">AMS</dt>
          <dd className="text-[#cfdde6] tabular">{formatRange(def, LOCAL_ZONE, now)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#6b8592]">NY</dt>
          <dd className="text-[#93a9b6] tabular">{formatRange(def, NY_ZONE, now)}</dd>
        </div>
      </dl>

      <div className="glass-inset flex items-end justify-between p-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.08em] text-[#6b8592]">
            MNQ session open
          </span>
          <span className="font-mono text-[15px] text-[#cfdde6] tabular">
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
          <span className="font-mono text-[10px] text-[#6b8592] tabular">
            {diff != null ? formatTicks(diff) : "awaiting feed"}
          </span>
        </div>
      </div>

      <p className="text-[13px] leading-[1.5] text-[#93a9b6]">{def.focus}</p>

      <footer className="mt-auto flex items-center justify-between pt-2">
        <span
          className="text-[11px] uppercase tracking-[0.08em]"
          style={{
            color: active ? color : status === "next" ? "#cfdde6" : "#6b8592",
          }}
        >
          {active ? "Active now" : status === "next" ? "Upcoming next" : "Closed"}
        </span>
        {active && (
          <span className="font-mono text-[12px] text-[#93a9b6] tabular">
            {Math.round(state.progress * 100)}%
          </span>
        )}
      </footer>

      {active && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-1 rounded-full"
            style={{ background: color }}
            animate={{ width: `${state.progress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </motion.article>
  );
}
