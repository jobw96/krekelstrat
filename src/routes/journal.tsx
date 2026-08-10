import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { ArrowLeft, LogOut, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  computeMetrics,
  money,
  WIN_GREEN,
  LOSS_RED,
  type Strategy,
  type Trade,
} from "@/lib/journal";
import { LOCAL_ZONE } from "@/lib/sessions";
import { PnlCalendar } from "@/components/journal/PnlCalendar";
import { AddTradeDialog } from "@/components/journal/AddTradeDialog";
import { DayTradesDialog } from "@/components/journal/DayTradesDialog";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Trading Journal — Krekelstrat Terminal" },
      {
        name: "description",
        content:
          "Privé trading journal met P&L kalender, win rate, profit factor, gemiddelde R:R en strategie-analyse voor je MNQ sessies.",
      },
      { property: "og:title", content: "Trading Journal — Krekelstrat Terminal" },
      {
        property: "og:description",
        content: "P&L kalender, strategie-filters en live performance metrics voor je trades.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JournalPage,
});

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass-inset flex flex-col gap-1 p-3.5">
      <span className="text-[10px] uppercase tracking-[0.08em] text-[#6b8592]">{label}</span>
      <span
        className="font-mono text-[22px] tabular"
        style={{ color: color ?? "#ffffff", fontWeight: 560 }}
      >
        {value}
      </span>
    </div>
  );
}

function JournalPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => DateTime.now().setZone(LOCAL_ZONE).startOf("month"));
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const strategiesQ = useQuery({
    queryKey: ["strategies", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Strategy[]> => {
      const { data, error } = await supabase
        .from("strategies")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Strategy[];
    },
  });

  const tradesQ = useQuery({
    queryKey: ["trades", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Trade[];
    },
  });

  const strategies = strategiesQ.data ?? [];
  const allTrades = tradesQ.data ?? [];
  const trades = useMemo(
    () =>
      strategyFilter === "all"
        ? allTrades
        : allTrades.filter((t) => t.strategy_id === strategyFilter),
    [allTrades, strategyFilter],
  );
  const metrics = computeMetrics(trades);

  const dayTrades = day
    ? trades.filter(
        (t) => DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toFormat("yyyy-LL-dd") === day,
      )
    : [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["trades", user?.id] });
    qc.invalidateQueries({ queryKey: ["strategies", user?.id] });
  };

  async function addStrategy() {
    const name = window.prompt("Naam van de strategie (bijv. 'LO Reversion')");
    if (!name || !user) return;
    await supabase.from("strategies").insert({ user_id: user.id, name });
    refresh();
  }

  if (loading || !user) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center">
        <span className="text-[13px] text-[#93a9b6]">Laden…</span>
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 text-[12px] text-[#cfdde6] hover:bg-white/12"
            >
              <ArrowLeft className="size-3.5" /> Terminal
            </Link>
            <h1 className="text-[18px] text-white" style={{ fontWeight: 560 }}>
              Trading Journal
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-white/6 px-3 py-1.5 text-[12px] text-[#93a9b6] sm:inline">
              {user.email}
            </span>
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px]"
              style={{ background: "#5ec8f5", color: "#061017", fontWeight: 560 }}
            >
              <Plus className="size-4" /> Trade
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-2 text-[13px] text-[#cfdde6] hover:bg-white/12"
            >
              <LogOut className="size-3.5" /> Log out
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStrategyFilter("all")}
            className="rounded-full px-3 py-1.5 text-[12px]"
            style={
              strategyFilter === "all"
                ? { background: "#5ec8f5", color: "#061017", fontWeight: 560 }
                : { background: "rgba(255,255,255,0.06)", color: "#cfdde6" }
            }
          >
            Alle strategieën
          </button>
          {strategies.map((s) => (
            <button
              key={s.id}
              onClick={() => setStrategyFilter(s.id)}
              className="rounded-full px-3 py-1.5 text-[12px]"
              style={
                strategyFilter === s.id
                  ? { background: "#5ec8f5", color: "#061017", fontWeight: 560 }
                  : { background: "rgba(255,255,255,0.06)", color: "#cfdde6" }
              }
            >
              {s.name}
            </button>
          ))}
          <button
            onClick={addStrategy}
            className="rounded-full border border-dashed border-white/20 px-3 py-1.5 text-[12px] text-[#93a9b6] hover:text-white"
          >
            + Nieuwe strategie
          </button>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric label="Win rate" value={`${metrics.winRate.toFixed(1)}%`} />
          <Metric
            label="Profit factor"
            value={
              metrics.profitFactor == null
                ? "—"
                : metrics.profitFactor === Infinity
                  ? "∞"
                  : metrics.profitFactor.toFixed(2)
            }
          />
          <Metric
            label="Gem. R:R"
            value={metrics.avgRr == null ? "—" : `${metrics.avgRr.toFixed(2)}R`}
          />
          <Metric
            label="Totale P&L"
            value={money(metrics.totalPnl)}
            color={metrics.totalPnl > 0 ? WIN_GREEN : metrics.totalPnl < 0 ? LOSS_RED : undefined}
          />
          <Metric label="Trades" value={String(metrics.count)} />
        </section>

        <PnlCalendar
          month={month}
          trades={trades}
          onMonthChange={setMonth}
          onSelectDay={setDay}
        />
      </div>

      {adding && (
        <AddTradeDialog
          userId={user.id}
          strategies={strategies}
          onClose={() => setAdding(false)}
          onSaved={refresh}
        />
      )}
      {day && (
        <DayTradesDialog
          day={day}
          trades={dayTrades}
          strategies={strategies}
          onClose={() => setDay(null)}
          onChanged={refresh}
        />
      )}
    </main>
  );
}
