import { motion } from "framer-motion";
import type { DateTime } from "luxon";
import { ArrowDownRight, ArrowUpRight, Undo2 } from "lucide-react";
import {
  formatCountdown,
  formatRange,
  LOCAL_ZONE,
  NY_ZONE,
  type ClockState,
} from "@/lib/sessions";
import {
  detectPhase,
  formatPoints,
  formatPrice,
  formatTicks,
  sessionOpenPrice,
} from "@/lib/mnq";
import type { MnqCandle } from "@/lib/mnq.functions";
import { toneColor } from "./primitives";

/** Sticky status strip: everything about the session that is running right now. */
export function ActiveSessionBar({
  state,
  now,
  price,
  candles,
}: {
  state: ClockState;
  now: DateTime;
  price: number | null;
  candles: MnqCandle[];
}) {
  const def = state.active?.def ?? null;
  const color = def ? toneColor[def.tone] : "#62666d";

  const open = def ? sessionOpenPrice(def, now, candles) : null;
  const diff = open != null && price != null ? price - open : null;
  const diffColor = diff == null ? "#8a8f98" : diff >= 0 ? "#27a644" : "#eb5757";
  const read = detectPhase(open, price, candles);

  const secondsToEnd = state.active
    ? Math.max(0, Math.floor((state.active.end.toMillis() - now.toMillis()) / 1000))
    : 0;

  return (
    <div className="sticky top-0 z-30 -mx-6 border-b border-[#23252a] bg-[#08090a]/85 px-6 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-w-[180px] items-center gap-2">
          <span
            className={`inline-block size-2 rounded-full ${def ? "pulse-dot" : ""}`}
            style={{ background: color }}
          />
          <div className="flex flex-col">
            <span
              className="text-[15px] leading-tight"
              style={{ color: "#ffffff", fontWeight: 510 }}
            >
              {def ? def.name : "No session active"}
            </span>
            <span className="font-mono text-[11px] text-[#62666d]">
              {def
                ? `${def.short} · ${formatRange(def, LOCAL_ZONE, now)} AMS · ${formatRange(def, NY_ZONE, now)} NY`
                : `Next: ${state.next.def.name}`}
            </span>
          </div>
        </div>

        {def && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]"
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
          </span>
        )}

        <BarCell label="Session open" value={open != null ? formatPrice(open) : "—"} />
        <BarCell
          label="From open"
          value={diff != null ? formatPoints(diff) : "—"}
          sub={diff != null ? formatTicks(diff) : "awaiting feed"}
          color={diffColor}
        />
        <BarCell label="Last" value={price != null ? formatPrice(price) : "—"} />
        <BarCell
          label={def ? "Ends in" : `Starts in`}
          value={formatCountdown(def ? secondsToEnd : state.secondsToNext)}
        />

        {def && (
          <div className="ml-auto hidden min-w-[140px] flex-col gap-1 sm:flex">
            <div className="flex justify-between font-mono text-[10px] text-[#62666d]">
              <span>Elapsed</span>
              <span className="tabular">{Math.round(state.progress * 100)}%</span>
            </div>
            <div className="h-px w-full bg-[#23252a]">
              <motion.div
                className="h-px"
                style={{ background: color }}
                animate={{ width: `${state.progress * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BarCell({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.08em] text-[#62666d]">
        {label}
      </span>
      <span
        className="font-mono text-[14px] tabular"
        style={{ color: color ?? "#d0d6e0", fontWeight: 510 }}
      >
        {value}
      </span>
      {sub && <span className="font-mono text-[10px] text-[#62666d]">{sub}</span>}
    </div>
  );
}
