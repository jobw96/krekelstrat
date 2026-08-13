import { motion } from "framer-motion";
import { DateTime } from "luxon";
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
  nyMidnightOpen,
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
  const color = def ? toneColor[def.tone] : "#6a7076";

  const open = def ? sessionOpenPrice(def, now, candles) : null;
  const diff = open != null && price != null ? price - open : null;
  const diffColor = diff == null ? "#8b9298" : diff >= 0 ? "#35d39a" : "#e5525f";
  const read = detectPhase(open, price, candles);
  const midnight = nyMidnightOpen(now, candles);
  const midnightTime = midnight
    ? DateTime.fromMillis(midnight.at).setZone(NY_ZONE).toFormat("ccc dd LLL, h:mm a")
    : null;

  const secondsToEnd = state.active
    ? Math.max(0, Math.floor((state.active.end.toMillis() - now.toMillis()) / 1000))
    : 0;

  return (
    <div className="sticky top-4 z-30">
      <div className="card-surface flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
        <div className="flex min-w-[190px] items-center gap-2.5">
          <span
            className={`inline-block size-2.5 rounded-full ${def ? "pulse-dot" : ""}`}
            style={{ background: color, boxShadow: `0 0 12px 2px ${color}80` }}
          />
          <div className="flex flex-col">
            <span
              className="text-[15px] leading-tight"
              style={{ color: "#ffffff", fontWeight: 560 }}
            >
              {def ? def.name : "No session active"}
            </span>
            <span className="font-mono text-[11px] text-[#6a7076]">
              {def
                ? `${def.short} · ${formatRange(def, LOCAL_ZONE, now)} AMS · ${formatRange(def, NY_ZONE, now)} NY`
                : `Next: ${state.next.def.name}`}
            </span>
          </div>
        </div>

        {def && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.08em]"
            style={{
              background:
                read.phase === "continuation"
                  ? `${read.direction >= 0 ? "#35d39a" : "#e5525f"}22`
                  : "rgba(69,211,224,0.14)",
              color:
                read.phase === "continuation"
                  ? read.direction >= 0
                    ? "#35d39a"
                    : "#e5525f"
                  : read.phase === "reversion"
                    ? "#8b9298"
                    : "#8b9298",
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
          label="NY midnight open"
          value={midnight ? formatPrice(midnight.price) : "—"}
          sub={midnightTime ? `${midnightTime} NY` : "awaiting feed"}
        />
        <BarCell
          label={def ? "Ends in" : `Starts in`}
          value={formatCountdown(def ? secondsToEnd : state.secondsToNext)}
        />

        {def && (
          <div className="ml-auto hidden min-w-[150px] flex-col gap-1.5 sm:flex">
            <div className="flex justify-between font-mono text-[10px] text-[#6a7076]">
              <span>Elapsed</span>
              <span className="tabular">{Math.round(state.progress * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-1.5 rounded-full"
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
      <span className="text-[10px] uppercase tracking-[0.08em] text-[#6a7076]">
        {label}
      </span>
      <span
        className="font-mono text-[14px] tabular"
        style={{ color: color ?? "#d7dbe0", fontWeight: 560 }}
      >
        {value}
      </span>
      {sub && <span className="font-mono text-[10px] text-[#6a7076]">{sub}</span>}
    </div>
  );
}
