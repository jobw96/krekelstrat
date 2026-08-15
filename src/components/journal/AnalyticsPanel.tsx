import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WIN_GREEN, LOSS_RED, type Trade } from "@/lib/journal";
import { performanceCurve } from "@/lib/journal-stats";
import { Section } from "@/components/Section";

/** Right-hand analytics stack: performance curves. */
export function AnalyticsPanel({ trades }: { trades: Trade[] }) {
  const data = performanceCurve(trades);

  return (
    <Section title="Win % · Avg Win · Avg Loss" subtitle="Cumulative curves over time">
      <div className="card-surface p-5">
        {data.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-[#7A828D]">No data in this range.</p>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#7A828D", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  yAxisId="pct"
                  tick={{ fill: "#7A828D", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <YAxis yAxisId="usd" orientation="right" hide />
                <Tooltip
                  contentStyle={{
                    background: "#121317",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#9AA1AC" }}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="winRate"
                  name="Win %"
                  stroke="#6E86F7"
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
      </div>
    </Section>
  );
}
