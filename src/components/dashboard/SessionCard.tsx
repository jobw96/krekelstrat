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
import { Badge, Dot, toneColor } from "./primitives";

export function SessionCard({
  def,
  state,
  now,
  price,
  candles,
}: {
  def: SessionDef;
  state: ClockState;
  now: DateTime;
  price: number | null;
  candles: MnqCandle[];
}) {
  const status = statusOf(def, state);
  const color = toneColor[def.tone];
  const active = status === "active";

  const open = sessionOpenPrice(def, now, candles);
  const diff = open != null && price != null ? price - open : null;
  const diffColor = diff == null ? "#8a8f98" : diff >= 0 ? "#27a644" : "#eb5757";
  const read = detectPhase(open, price, candles);

  return (
    <motion.article
      layout
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      className={`card-surface flex flex-col gap-3 p-6 ${active ? "glow-ring" : ""}`}
      style={
        active
          ? { backgroundColor: "#161718", ["--glow" as never]: color }
          : {}
      }
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3
            className="text-[17px] leading-tight"
            style={{ color: active ? "#ffffff" : "#d0d6e0", fontWeight: 510 }}
          >
            {def.name}
          </h3>
          <span className="font-mono text-[12px] tracking-[-0.013em] text-[#62666d]">
            {def.short}
          </span>
        </div>
        {active ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 text-[12px] uppercase tracking-[0.08em]"
            style={{ background: color, color: "#08090a", fontWeight: 510 }}
          >
            <span
              className="pulse-dot inline-block size-1.5 rounded-full"
              style={{ background: "#08090a" }}
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
          className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] uppercase tracking-[0.08em]"
          style={{
            background:
              read.phase === "continuation"
                ? `${read.direction >= 0 ? "#27a644" : "#eb5757"}1f`
                : "rgba(2,184,204,0.12)",
            color:
              read.phase === "continuation"
                ? read.direction >= 0
                  ? "#27a644"
                  : "#eb5757"
                : read.phase === "reversion"
                  ? "#02b8cc"
                  : "#8a8f98",
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

      <dl className="flex flex-col gap-1 font-mono text-[12px] tracking-[-0.013em]">
        <div className="flex justify-between">
          <dt className="text-[#62666d]">AMS</dt>
          <dd className="text-[#d0d6e0] tabular">{formatRange(def, LOCAL_ZONE, now)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#62666d]">NY</dt>
          <dd className="text-[#8a8f98] tabular">{formatRange(def, NY_ZONE, now)}</dd>
        </div>
      </dl>

      <div className="flex items-end justify-between border-t border-[#23252a] pt-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.08em] text-[#62666d]">
            MNQ session open
          </span>
          <span className="font-mono text-[15px] text-[#d0d6e0] tabular">
            {open != null ? formatPrice(open) : "—"}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span
            className="font-mono text-[15px] tabular"
            style={{ color: diffColor, fontWeight: 510 }}
          >
            {diff != null ? formatPoints(diff) : "—"}
          </span>
          <span className="font-mono text-[10px] text-[#62666d] tabular">
            {diff != null ? formatTicks(diff) : "awaiting feed"}
          </span>
        </div>
      </div>

      <p className="text-[13px] leading-[1.5] text-[#8a8f98]">{def.focus}</p>

      <footer className="mt-1 flex items-center justify-between border-t border-[#23252a] pt-3">
        <span
          className="text-[12px] uppercase tracking-[0.08em]"
          style={{
            color: active ? color : status === "next" ? "#d0d6e0" : "#62666d",
          }}
        >
          {active ? "Active now" : status === "next" ? "Upcoming next" : "Closed"}
        </span>
        {active && (
          <span className="font-mono text-[12px] text-[#8a8f98] tabular">
            {Math.round(state.progress * 100)}%
          </span>
        )}
      </footer>

      {active && (
        <div className="h-px w-full overflow-hidden bg-[#23252a]">
          <motion.div
            className="h-px"
            style={{ background: color }}
            animate={{ width: `${state.progress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </motion.article>
  );
}
