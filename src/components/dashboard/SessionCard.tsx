import { motion } from "framer-motion";
import type { DateTime } from "luxon";
import {
  formatRange,
  statusOf,
  type ClockState,
  type SessionDef,
  LOCAL_ZONE,
  NY_ZONE,
} from "@/lib/sessions";
import { Badge, Dot, toneColor } from "./primitives";

export function SessionCard({
  def,
  state,
  now,
}: {
  def: SessionDef;
  state: ClockState;
  now: DateTime;
}) {
  const status = statusOf(def, state);
  const color = toneColor[def.tone];
  const active = status === "active";

  return (
    <motion.article
      layout
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      className="card-surface flex flex-col gap-3 p-6"
      style={
        active
          ? { boxShadow: `${color}55 0 0 0 1px inset, rgba(0,0,0,0.4) 0 2px 4px` }
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
        <Badge color={color}>
          <Dot color={color} pulse={active} />
          {def.tag}
        </Badge>
      </header>

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
