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
    <section className="card-surface p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[15px] tracking-[-0.011em] text-[#d0d6e0]">24-Hour Session Map</h2>
        <span className="font-mono text-[12px] text-[#62666d]">Europe/Amsterdam</span>
      </div>

      <div className="relative h-10 w-full overflow-hidden rounded-[6px] bg-[#161718]">
        {blocks.map((b) => (
          <div
            key={b.key}
            className="absolute top-0 h-full"
            style={{
              left: `${b.left}%`,
              width: `${b.width}%`,
              background: `${toneColor[b.def.tone]}26`,
              boxShadow: `${toneColor[b.def.tone]}59 0 0 0 1px inset`,
            }}
            title={b.def.name}
          >
            <span className="absolute inset-0 flex items-center justify-center overflow-hidden font-mono text-[10px] text-[#8a8f98]">
              {b.width > 4 ? b.def.short : ""}
            </span>
          </div>
        ))}
        <div
          className="absolute top-0 z-10 h-full w-px bg-[#e4f222]"
          style={{ left: `${nowPct}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between font-mono text-[10px] text-[#62666d]">
        {["00", "04", "08", "12", "16", "20", "24"].map((h) => (
          <span key={h}>{h}:00</span>
        ))}
      </div>
    </section>
  );
}
