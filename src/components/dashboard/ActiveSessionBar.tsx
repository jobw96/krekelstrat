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
  const color = def ? toneColor[def.tone] : "#7A828D";

  const open = def ? sessionOpenPrice(def, now, candles) : null;
  const diff = open != null && price != null ? price - open : null;
  const diffColor = diff == null ? "#9AA1AC" : diff >= 0 ? "#3ECF8E" : "#F0736F";
  const read = detectPhase(open, price, candles);
  const midnight = nyMidnightOpen(now, candles);
  const midnightTime = midnight
    ? DateTime.fromMillis(midnight.at).setZone(NY_ZONE).toFormat("ccc dd LLL, h:mm a")
    : null;

  const secondsToEnd = state.active
    ? Math.max(0, Math.floor((state.active.end.toMillis() - now.toMillis()) / 1000))
    : 0;

  return (
    <div className="sticky top-0 z-30 sm:top-4">
      {/* Mobile: single compact strip */}
      <div className="card-surface flex items-center gap-2.5 px-3 py-2 sm:hidden">
        <span
          className={`inline-block size-2 shrink-0 rounded-full ${def ? "pulse-dot" : ""}`}
          style={{ background: color, boxShadow: `0 0 10px 2px ${color}80` }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[12px] leading-tight text-white" style={{ fontWeight: 560 }}>
            {def ? def.name : `Next: ${state.next.def.name}`}
          </span>
          <span className="truncate font-mono text-[10px] leading-tight text-[#7A828D]">
            {open != null ? formatPrice(open) : "—"} open
            {" · "}
            <span style={{ color: diffColor }}>{diff != null ? formatPoints(diff) : "—"}</span>
            {" · "}
            {price != null ? formatPrice(price) : "—"} last
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-[8px] uppercase tracking-[0.08em] text-[#7A828D]">
            {def ? "Ends" : "Starts"}
          </span>
          <span className="font-mono text-[12px] leading-tight tabular text-[#F0F2F5]">
            {formatCountdown(def ? secondsToEnd : state.secondsToNext)}
          </span>
        </div>
      </div>

      <div className="card-surface hidden grid-cols-2 items-center gap-x-4 gap-y-3 px-4 py-3 sm:flex sm:flex-wrap sm:gap-x-5 sm:px-5">
        <div className="col-span-2 flex min-w-0 items-center gap-2.5 sm:min-w-[190px]">
          <span
            className={`inline-block size-2.5 shrink-0 rounded-full ${def ? "pulse-dot" : ""}`}
            style={{ background: color, boxShadow: `0 0 12px 2px ${color}80` }}
          />
          <div className="flex min-w-0 flex-col">
            <span
              className="text-[15px] leading-tight"
              style={{ color: "#ffffff", fontWeight: 560 }}
            >
              {def ? def.name : "No session active"}
            </span>
            <span className="truncate font-mono text-[11px] text-[#7A828D]">
              {def
                ? `${def.short} · ${formatRange(def, LOCAL_ZONE, now)} AMS · ${formatRange(def, NY_ZONE, now)} NY`
                : `Next: ${state.next.def.name}`}
            </span>
          </div>
        </div>

        {def && (
          <span
            className="col-span-2 inline-flex w-fit items-center gap-1.5 rounded-control px-3 py-1.5 text-[11px] uppercase tracking-[0.08em]"
            style={{
              background:
                read.phase === "continuation"
                  ? `${read.direction >= 0 ? "#3ECF8E" : "#F0736F"}22`
                  : "rgba(69,211,224,0.14)",
              color:
                read.phase === "continuation"
                  ? read.direction >= 0
                    ? "#3ECF8E"
                    : "#F0736F"
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
          </span>
        )}

        <BarCell
          label="Session open"
          value={open != null ? formatPrice(open) : "—"}
        />
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
            <div className="flex justify-between font-mono text-[10px] text-[#7A828D]">
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
    <div className="flex min-w-0 flex-col justify-start gap-0.5 self-start">
      <span className="h-[13px] text-[10px] uppercase leading-[13px] tracking-[0.08em] text-[#7A828D]">
        {label}
      </span>
      <span
        className="font-mono text-[14px] leading-[18px] tabular"
        style={{ color: color ?? "#F0F2F5", fontWeight: 560 }}
      >
        {value}
      </span>
      <span className="truncate font-mono text-[10px] leading-[13px] text-[#7A828D]">
        {sub ?? "\u00a0"}
      </span>
    </div>
  );
}
