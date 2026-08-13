import type { DateTime } from "luxon";
import { SESSIONS, LOCAL_ZONE } from "@/lib/sessions";
import { toneColor } from "./primitives";

/** 24h bar in local (Amsterdam) time. */
export function TimelineBar({ now }: { now: DateTime }) {
  const local = now.setZone(LOCAL_ZONE);
  const dayStart = local.startOf("day");
  const nowPct = (local.diff(dayStart, "minutes").minutes / 1440) * 100;

  const blocks = SESSIONS.flatMap((def) => {
    const nyDay = now.setZone("America/New_York").startOf("day");
    const start = nyDay
      .set({ hour: def.nyStart[0], minute: def.nyStart[1] })
      .setZone(LOCAL_ZONE);
    const startMin = start.diff(start.startOf("day"), "minutes").minutes;
    const segments: Array<{ left: number; width: number }> = [];
    let cursor = startMin;
    let remaining = def.minutes;
    while (remaining > 0) {
      const span = Math.min(remaining, 1440 - cursor);
      segments.push({ left: (cursor / 1440) * 100, width: (span / 1440) * 100 });
      remaining -= span;
      cursor = 0;
    }
    return segments.map((s, i) => ({ ...s, def, key: `${def.id}-${i}` }));
  });

  return (
    <section className="card-surface p-4 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[15px] tracking-[-0.011em] text-[#d7dbe0]">24-Hour Session Map</h2>
        <span className="rounded-full bg-white/6 px-3 py-1 font-mono text-[11px] text-[#8b9298]">
          Europe/Amsterdam
        </span>
      </div>

      <div
        className="relative h-10 w-full overflow-hidden rounded-xl sm:h-12"
        style={{
          background: "rgba(255,255,255,0.025)",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.045)",
        }}
      >
        {blocks.map((b) => (
          <div
            key={b.key}
            className="absolute top-0 h-full rounded-lg"
            style={{
              left: `${b.left}%`,
              width: `${b.width}%`,
              background: `linear-gradient(180deg, ${toneColor[b.def.tone]}24, ${toneColor[b.def.tone]}0d)`,
              boxShadow: `inset 0 0 0 1px ${toneColor[b.def.tone]}33, inset 0 1px 0 0 rgba(255,255,255,0.05)`,
            }}
            title={b.def.name}
          >
            <span className="absolute inset-0 flex items-center justify-center overflow-hidden font-mono text-[10px] tracking-[0.06em] text-[#d7dbe0]">
              {b.width > 4 ? b.def.short : ""}
            </span>
          </div>
        ))}
        <div
          className="pointer-events-none absolute top-0 z-20 h-full w-px -translate-x-1/2 transition-[left] duration-1000 ease-linear"
          style={{
            left: `${nowPct}%`,
            background:
              "linear-gradient(180deg, rgba(229,82,95,0) 0%, #f08a93 45%, rgba(229,82,95,0.15) 100%)",
            boxShadow: "0 0 8px 0 rgba(229,82,95,0.55)",
          }}
        />

      </div>

      <div className="mt-2 flex justify-between font-mono text-[9px] text-[#6a7076] sm:text-[10px]">
        {["00", "04", "08", "12", "16", "20", "24"].map((h) => (
          <span key={h}>{h}:00</span>
        ))}
      </div>
    </section>
  );
}
