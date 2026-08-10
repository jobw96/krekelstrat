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
        <h2 className="text-[15px] tracking-[-0.011em] text-[#cfdde6]">24-Hour Session Map</h2>
        <span className="rounded-full bg-white/6 px-3 py-1 font-mono text-[11px] text-[#93a9b6]">
          Europe/Amsterdam
        </span>
      </div>

      <div className="relative h-12 w-full overflow-hidden rounded-2xl bg-white/4">
        {blocks.map((b) => (
          <div
            key={b.key}
            className="absolute top-0 h-full rounded-xl"
            style={{
              left: `${b.left}%`,
              width: `${b.width}%`,
              background: `linear-gradient(180deg, ${toneColor[b.def.tone]}3d, ${toneColor[b.def.tone]}17)`,
              boxShadow: `${toneColor[b.def.tone]}59 0 0 0 1px inset`,
            }}
            title={b.def.name}
          >
            <span className="absolute inset-0 flex items-center justify-center overflow-hidden font-mono text-[10px] tracking-[0.06em] text-[#cfdde6]">
              {b.width > 4 ? b.def.short : ""}
            </span>
          </div>
        ))}
        <div
          className="absolute top-0 z-10 h-full w-0.5 rounded-full bg-[#5ec8f5]"
          style={{ left: `${nowPct}%`, boxShadow: "0 0 12px 2px rgba(94,200,245,0.55)" }}
        />
      </div>

      <div className="mt-2 flex justify-between font-mono text-[10px] text-[#6b8592]">
        {["00", "04", "08", "12", "16", "20", "24"].map((h) => (
          <span key={h}>{h}:00</span>
        ))}
      </div>
    </section>
  );
}
