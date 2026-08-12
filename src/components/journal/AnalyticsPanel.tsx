import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WIN_GREEN, LOSS_RED, type Trade } from "@/lib/journal";
import { performanceCurve } from "@/lib/journal-stats";
import { NewsPanel } from "./NewsPanel";


/** Right-hand analytics stack: performance curves + quick external tools. */
export function AnalyticsPanel({ trades }: { trades: Trade[] }) {
  const data = performanceCurve(trades);

  return (
    <div className="flex flex-col gap-3">
      <section className="card-surface flex flex-col gap-3 p-4">
        <header className="flex flex-col gap-0.5">
          <h3 className="text-[14px] text-white" style={{ fontWeight: 560 }}>
            Win % · Avg Win · Avg Loss
          </h3>
          <span className="text-[11px] text-[#6a7076]">Cumulative curves over time</span>
        </header>

        {data.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-[#6a7076]">No data in this range.</p>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6a7076", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  yAxisId="pct"
                  tick={{ fill: "#6a7076", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <YAxis yAxisId="usd" orientation="right" hide />
                <Tooltip
                  contentStyle={{
                    background: "#0f1216",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#8b9298" }}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="winRate"
                  name="Win %"
                  stroke="#5ec8f5"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="usd"
                  type="monotone"
                  dataKey="avgWin"
                  name="Avg win $"
                  stroke={WIN_GREEN}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="usd"
                  type="monotone"
                  dataKey="avgLoss"
                  name="Avg loss $"
                  stroke={LOSS_RED}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <NewsPanel />

    </div>
  );
}
