import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LOCAL_ZONE } from "@/lib/sessions";
import { money, WIN_GREEN, LOSS_RED, type Trade } from "@/lib/journal";

type Bucket = "day" | "week" | "month";

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

function bucketData(trades: Trade[], bucket: Bucket) {
  const map = new Map<string, { label: string; pnl: number; sort: number }>();
  for (const t of trades) {
    const dt = DateTime.fromISO(t.date).setZone(LOCAL_ZONE);
    const start =
      bucket === "day"
        ? dt.startOf("day")
        : bucket === "week"
          ? dt.startOf("week")
          : dt.startOf("month");
    const key = start.toISODate() ?? String(start.toMillis());
    const label =
      bucket === "day"
        ? start.toFormat("dd LLL")
        : bucket === "week"
          ? `W${start.weekNumber}`
          : start.toFormat("LLL yy");
    const prev = map.get(key);
    if (prev) prev.pnl += Number(t.pnl);
    else map.set(key, { label, pnl: Number(t.pnl), sort: start.toMillis() });
  }
  return [...map.values()].sort((a, b) => a.sort - b.sort);
}

/** Net P&L bar chart bucketed by day, week or month. */
export function NetPnlChart({ trades }: { trades: Trade[] }) {
  const [bucket, setBucket] = useState<Bucket>("day");
  const data = useMemo(() => bucketData(trades, bucket), [trades, bucket]);

  return (
    <section className="card-surface flex flex-col gap-3 p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[14px] text-white" style={{ fontWeight: 560 }}>
            Net P&amp;L
          </h3>
          <span className="text-[11px] text-[#6a7076]">Per {bucket}</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/5 p-0.5">
          {BUCKETS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBucket(b.id)}
              className="rounded-full px-2.5 py-1 text-[11px] transition-colors"
              style={
                bucket === b.id
                  ? { background: "rgba(255,255,255,0.10)", color: "#ffffff" }
                  : { color: "#6a7076" }
              }
            >
              {b.label}
            </button>
          ))}
        </div>
      </header>

      {data.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-[#6a7076]">No data in this range.</p>
      ) : (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#6a7076", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={18}
              />
              <YAxis
                tick={{ fill: "#6a7076", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(v: number) => money(Number(v))}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "#0f1216",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#8b9298" }}
                formatter={(v: number) => [money(Number(v)), "Net P&L"]}
              />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={22}>
                {data.map((d) => (
                  <Cell key={d.sort} fill={d.pnl >= 0 ? WIN_GREEN : LOSS_RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
