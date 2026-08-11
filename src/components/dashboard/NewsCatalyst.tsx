import { motion } from "framer-motion";
import { DateTime } from "luxon";
import { AlertTriangle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { LOCAL_ZONE } from "@/lib/sessions";
import type { RedFolderEvent } from "@/lib/news.functions";
import { biasColor, biasLabel, PLAYBOOK, type CatalystRead } from "@/lib/news";

function ams(ms: number) {
  return DateTime.fromMillis(ms).setZone(LOCAL_ZONE).toFormat("HH:mm");
}

/** Scheduled red folder events for the day, listed on the macro card. */
export function RedFolderList({ events }: { events: RedFolderEvent[] }) {
  if (!events.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {events.slice(0, 3).map((e) => (
        <span
          key={e.id}
          className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
          style={{ background: "rgba(229,82,95,0.14)", color: "#f08a93" }}
        >
          <span
            className="pulse-dot inline-block size-1.5 rounded-full"
            style={{ background: "#e5525f" }}
          />
          {e.title} · {ams(e.time)} AMS
        </span>
      ))}
    </div>
  );
}

export function CatalystBadge({ read }: { read: CatalystRead }) {
  const color = biasColor[read.bias];
  const Icon =
    read.bias === "bullish" ? TrendingUp : read.bias === "bearish" ? TrendingDown : Minus;
  return (
    <motion.span
      layout
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]"
      style={{ background: `${color}22`, color }}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {biasLabel(read)}
    </motion.span>
  );
}

/** High-visibility banner shown across the hero while a red folder event is live. */
export function CatalystBanner({ read }: { read: CatalystRead }) {
  const color = biasColor[read.bias];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface flex flex-wrap items-center gap-x-6 gap-y-2 p-4"
      style={{
        borderColor: `${color}3d`,
        backgroundImage: `linear-gradient(180deg, ${color}14 0%, rgba(255,255,255,0.02) 24%, rgba(255,255,255,0) 60%)`,
        boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 0 1px ${color}1f, 0 24px 56px -34px rgba(0,0,0,0.95)`,
      }}
    >
      <span className="inline-flex items-center gap-2 text-[14px] text-white" style={{ fontWeight: 560 }}>
        <AlertTriangle className="size-4" style={{ color: "#e5525f" }} strokeWidth={2} />
        {read.event.title}
        <span className="font-mono text-[12px] text-[#8b9298]">{ams(read.event.time)} AMS</span>
      </span>
      <span className="font-mono text-[12px] text-[#d7dbe0] tabular">
        Actual {read.event.actual || "—"} vs Forecast {read.event.forecast || "—"}
      </span>
      <CatalystBadge read={read} />
      <span className="text-[12px] text-[#8b9298]">Playbook: {PLAYBOOK}</span>
    </motion.div>
  );
}
