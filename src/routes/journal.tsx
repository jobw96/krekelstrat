import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { ChevronDown, Eye, LogOut, Menu, Plus, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  computeMetrics,
  money,
  setMoneyMask,
  WIN_GREEN,
  setPracticeAccent,
  LOSS_RED,
  PRACTICE_BLUE,
  type Strategy,
  type Trade,
} from "@/lib/journal";
import { advancedStats, groupByDay } from "@/lib/journal-stats";
import { LOCAL_ZONE } from "@/lib/sessions";
import { AddTradeDialog } from "@/components/journal/AddTradeDialog";
import { StrategyDialog } from "@/components/journal/StrategyDialog";
import { DayTradesDialog } from "@/components/journal/DayTradesDialog";
import { TradesList } from "@/components/journal/TradesList";
import { JournalNav, type JournalView } from "@/components/journal/JournalNav";
import { AppLoader } from "@/components/AppLoader";
import { StatsBar } from "@/components/journal/StatsBar";
import { ZellaCalendar, type CalendarMode } from "@/components/journal/ZellaCalendar";
import { AnalyticsPanel } from "@/components/journal/AnalyticsPanel";
import { NetPnlChart } from "@/components/journal/NetPnlChart";
import { ReportsView } from "@/components/journal/ReportsView";
import { ControlBar, type Filters, type RangeKey } from "@/components/journal/ControlBar";
import { ShareJournalDialog } from "@/components/journal/ShareJournalDialog";
import { buddyLabel, claimShares, fetchShares, type JournalShare } from "@/lib/shares";
import { fetchCommentCounts } from "@/lib/comments";

export const Route = createFileRoute("/journal")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: typeof search['view'] === "string" ? (search['view'] as JournalView) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Trading Journal — Krekelstrat Terminal" },
      {
        name: "description",
        content:
          "Trading journal workspace with P&L calendar, win-rate gauges, weekly totals, performance curves and strategy analytics for your MNQ sessions.",
      },
      { property: "og:title", content: "Trading Journal — Krekelstrat Terminal" },
      {
        property: "og:description",
        content: "P&L calendar, KPI cards, weekly totals and performance analytics for your trades.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const { user, isGuest, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const search = Route.useSearch();
  const [view, setView] = useState<JournalView>(search.view ?? "dashboard");
  useEffect(() => {
    if (search.view) setView(search.view);
  }, [search.view]);
  const [addingStrategy, setAddingStrategy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [month, setMonth] = useState(() => DateTime.now().setZone(LOCAL_ZONE).startOf("month"));
  const [calMode, setCalMode] = useState<CalendarMode>("pnl");
  const [mode, setMode] = useState<"live" | "practice">("live");
  // Swap green win accents for the practice blue so both tracks are easy to tell apart.
  setPracticeAccent(mode === "practice");
  useEffect(() => () => setPracticeAccent(false), []);
  const [range, setRange] = useState<RangeKey>("month");
  const [filters, setFilters] = useState<Filters>({
    strategy: "all",
    session: "all",
    result: "all",
  });
  const [from, setFrom] = useState(() =>
    DateTime.now().setZone(LOCAL_ZONE).minus({ days: 30 }).toFormat("yyyy-LL-dd"),
  );
  const [to, setTo] = useState(() => DateTime.now().setZone(LOCAL_ZONE).toFormat("yyyy-LL-dd"));
  const [currency, setCurrency] = useState<"USD" | "R">("USD");
  const [adding, setAdding] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);

  const [sharing, setSharing] = useState(false);
  const [activeOwner, setActiveOwner] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    if (user && !isGuest) void claimShares().then(() => qc.invalidateQueries({ queryKey: ["journal-shares", user.id] }));
  }, [user, isGuest, qc]);

  const sharesQ = useQuery({
    queryKey: ["journal-shares", user?.id],
    enabled: !!user,
    queryFn: fetchShares,
  });
  const buddyJournals: JournalShare[] = (sharesQ.data ?? []).filter(
    (s) => s.owner_id !== user?.id && s.status === "accepted",
  );
  const activeShare = buddyJournals.find((s) => s.owner_id === activeOwner) ?? null;
  const ownerId = activeShare ? activeShare.owner_id : user?.id;
  const readOnly = !!activeShare;
  setMoneyMask(!!activeShare?.hide_dollar_amounts);

  const strategiesQ = useQuery({
    queryKey: ["strategies", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<Strategy[]> => {
      const { data, error } = await supabase
        .from("strategies")
        .select("*")
        .eq("user_id", ownerId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Strategy[];
    },
  });

  const tradesQ = useQuery({
    queryKey: ["trades", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", ownerId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Trade[];
    },
  });

  const commentCountsQ = useQuery({
    queryKey: ["comment-counts", ownerId, (tradesQ.data ?? []).length],
    enabled: (tradesQ.data ?? []).length > 0,
    queryFn: () => fetchCommentCounts((tradesQ.data ?? []).map((t) => t.id)),
  });

  const commentsByDay = useMemo(() => {
    const counts = commentCountsQ.data ?? {};
    const byDay: Record<string, number> = {};
    for (const t of tradesQ.data ?? []) {
      const n = counts[t.id] ?? 0;
      if (!n) continue;
      const key = DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toFormat("yyyy-LL-dd");
      byDay[key] = (byDay[key] ?? 0) + n;
    }
    return byDay;
  }, [commentCountsQ.data, tradesQ.data]);

  const strategies = strategiesQ.data ?? [];
  const allTradesRaw = tradesQ.data ?? [];
  const allTrades = useMemo(
    () => allTradesRaw.filter((t) => !!t.is_practice === (mode === "practice")),
    [allTradesRaw, mode],
  );
  const syncedAt = tradesQ.dataUpdatedAt ? new Date(tradesQ.dataUpdatedAt) : null;

  const filtered = useMemo(
    () =>
      allTrades.filter(
        (t) =>
          (filters.strategy === "all" || t.strategy_id === filters.strategy) &&
          (filters.session === "all" || t.session === filters.session) &&
          (filters.result === "all" || t.result === filters.result),
      ),
    [allTrades, filters],
  );

  const trades = useMemo(() => {
    if (range === "all") return filtered;
    const now = DateTime.now().setZone(LOCAL_ZONE);
    let start: DateTime;
    let end: DateTime;
    if (range === "month") {
      start = month;
      end = month.endOf("month");
    } else if (range === "30d") {
      start = now.minus({ days: 30 }).startOf("day");
      end = now.endOf("day");
    } else if (range === "ytd") {
      start = now.startOf("year");
      end = now.endOf("day");
    } else {
      start = DateTime.fromISO(from, { zone: LOCAL_ZONE }).startOf("day");
      end = DateTime.fromISO(to, { zone: LOCAL_ZONE }).endOf("day");
    }
    if (!start.isValid || !end.isValid) return filtered;
    return filtered.filter((t) => {
      const d = DateTime.fromISO(t.date).setZone(LOCAL_ZONE);
      return d >= start && d <= end;
    });
  }, [filtered, range, month, from, to]);

  const metrics = computeMetrics(trades);
  const stats = advancedStats(trades);

  const dayTrades = day
    ? filtered.filter(
        (t) => DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toFormat("yyyy-LL-dd") === day,
      )
    : [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["trades", ownerId] });
    qc.invalidateQueries({ queryKey: ["strategies", ownerId] });
  };

  function addStrategy() {
    setAddingStrategy(true);
  }

  if (loading || !user) {
    return <AppLoader />;
  }

  return (
    <>
      <JournalNav
          readOnly={readOnly}
          view={view}
          onView={setView}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onAddTrade={() => {
            setAddDate(null);
            setAdding(true);
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">

              <button
                onClick={() => setCollapsed((c) => !c)}
                className="hover-lift rounded-full bg-white/6 p-2 text-[#d7dbe0] md:hidden"
                aria-label="Toggle navigation"
              >
                <Menu className="size-4" />
              </button>
              <div className="relative min-w-0">
                <button
                  onClick={() => setSwitcherOpen((o) => !o)}
                  className="hover-tint flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left"
                >
                  <h1 className="truncate text-[18px] text-white" style={{ fontWeight: 560 }}>
                    {activeShare ? buddyLabel(activeShare) : "Trading Journal"}
                  </h1>
                  <ChevronDown className="size-4 shrink-0 text-[#6a7076]" />
                </button>
                {switcherOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onMouseDown={() => setSwitcherOpen(false)} />
                    <div className="card-surface absolute left-0 top-[110%] z-50 flex w-[260px] flex-col gap-0.5 p-1.5">
                      <button
                        onClick={() => {
                          setActiveOwner(null);
                          setSwitcherOpen(false);
                        }}
                        className="hover-tint rounded-lg px-2.5 py-2 text-left text-[12.5px]"
                        style={{ color: activeShare ? "#8b9298" : "#ffffff" }}
                      >
                        My Journal
                      </button>
                      {buddyJournals.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setActiveOwner(s.owner_id);
                            setSwitcherOpen(false);
                          }}
                          className="hover-tint truncate rounded-lg px-2.5 py-2 text-left text-[12.5px]"
                          style={{ color: activeShare?.id === s.id ? "#ffffff" : "#8b9298" }}
                        >
                          {buddyLabel(s)} (Read-Only)
                        </button>
                      ))}
                      {buddyJournals.length === 0 && (
                        <span className="px-2.5 py-2 text-[11.5px] text-[#6a7076]">
                          No shared journals yet.
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div
                className="relative flex shrink-0 items-center rounded-full p-0.5"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  boxShadow: mode === "practice" ? `inset 0 0 0 1px ${PRACTICE_BLUE}55` : "none",
                }}
              >
                <span
                  aria-hidden
                  className="absolute top-0.5 bottom-0.5 w-[76px] rounded-full transition-all duration-200"
                  style={{
                    left: mode === "live" ? "2px" : "78px",
                    background: mode === "live" ? "rgba(255,255,255,0.14)" : `${PRACTICE_BLUE}2e`,
                  }}
                />
                {(["live", "practice"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="relative z-10 w-[76px] rounded-full py-1.5 text-[11.5px] uppercase tracking-[0.06em] transition-colors"
                    style={{
                      color:
                        mode === m ? (m === "practice" ? PRACTICE_BLUE : "#ffffff") : "#6a7076",
                      fontWeight: mode === m ? 560 : 400,
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">

              <span className="hidden rounded-full bg-white/6 px-3 py-1.5 text-[12px] text-[#8b9298] sm:inline">
                {isGuest ? "Guest mode · no login" : user.email}
              </span>
              <button
                onClick={() => setSharing(true)}
                className="hover-lift inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-2 text-[13px] text-[#d7dbe0] hover:bg-white/12"
              >
                <Share2 className="size-3.5" /> Share
              </button>
              {!readOnly && (
              <button
                onClick={() => setAdding(true)}
                className="hover-lift inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] md:hidden"
                style={{ background: "#e5525f", color: "#ffffff", fontWeight: 560 }}
              >
                <Plus className="size-4" /> Trade
              </button>
              )}
              {isGuest ? (
                <Link
                  to="/auth"
                  className="hover-lift inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-2 text-[13px] text-[#d7dbe0] hover:bg-white/12"
                >
                  <LogOut className="size-3.5" /> Sign in
                </Link>
              ) : (
                <button
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/auth" });
                  }}
                  className="hover-lift inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-2 text-[13px] text-[#d7dbe0] hover:bg-white/12"
                >
                  <LogOut className="size-3.5" /> Log out
                </button>
              )}
            </div>
          </header>

          {activeShare && (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px]"
              style={{ background: "rgba(229,82,95,0.10)", border: "1px solid rgba(229,82,95,0.35)", color: "#f0b7bc" }}
            >
              <Eye className="size-3.5 shrink-0" />
              Viewing {buddyLabel(activeShare)} (Read-Only)
              {activeShare.hide_dollar_amounts && <span className="text-[#8b9298]">· dollar amounts hidden</span>}
            </div>
          )}

          <ControlBar
            range={range}
            onRange={setRange}
            from={from}
            to={to}
            onFrom={setFrom}
            onTo={setTo}
            filters={filters}
            onFilters={setFilters}
            strategies={strategies}
            syncedAt={syncedAt}
            onRefresh={refresh}
          />

          <StatsBar
            metrics={metrics}
            stats={stats}
            currency={currency}
            onToggleCurrency={() => setCurrency((c) => (c === "USD" ? "R" : "USD"))}
          />

          <div key={view} className="view-enter flex flex-col gap-3">
            {view === "dashboard" && (
              <>
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <ZellaCalendar
                    month={month}
                    trades={filtered}
                    mode={calMode}
                    onMode={setCalMode}
                    onMonthChange={setMonth}
                    onSelectDay={setDay}
                    commentsByDay={commentsByDay}
                    onAddDay={(d) => {
                      setAddDate(d);
                      setAdding(true);
                    }}
                  />
                  <div className="flex flex-col gap-3">
                    <NetPnlChart trades={filtered} />
                    <AnalyticsPanel trades={trades} />
                  </div>
                </div>
                <TradesList trades={trades} strategies={strategies} onChanged={refresh} readOnly={readOnly} />
              </>
            )}

            {view === "day" && <DayView trades={filtered} onSelectDay={setDay} />}

            {view === "trades" && (
              <TradesList trades={trades} strategies={strategies} onChanged={refresh} readOnly={readOnly} />
            )}

            {view === "reports" && <ReportsView trades={trades} strategies={strategies} />}

            {view === "strategies" && (
              <StrategiesView
                readOnly={readOnly}
                strategies={strategies}
                trades={allTrades}
                onAdd={addStrategy}
                onChanged={refresh}
              />
            )}

          </div>
        </div>


      {sharing && (
        <ShareJournalDialog userId={user.id} userEmail={user.email ?? null} onClose={() => setSharing(false)} />
      )}
      {adding && !readOnly && (
        <AddTradeDialog
          userId={user.id}
          strategies={strategies}
          defaultDate={addDate}
          defaultPractice={mode === "practice"}
          onClose={() => {
            setAdding(false);
            setAddDate(null);
          }}
          onSaved={refresh}
        />
      )}
      {addingStrategy && (
        <StrategyDialog
          userId={user.id}
          onClose={() => setAddingStrategy(false)}
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
    </>
  );
}

function DayView({ trades, onSelectDay }: { trades: Trade[]; onSelectDay: (d: string) => void }) {
  const days = [...groupByDay(trades).values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  return (
    <section className="card-surface flex flex-col gap-2 p-4">
      <h2 className="text-[14px] text-white" style={{ fontWeight: 560 }}>
        Day View
      </h2>
      {days.length === 0 && (
        <p className="py-6 text-center text-[12px] text-[#6a7076]">No trading days yet.</p>
      )}
      {days.map((d) => {
        const color = d.pnl > 0 ? WIN_GREEN : d.pnl < 0 ? LOSS_RED : "#8b9298";
        return (
          <button
            key={d.key}
            onClick={() => onSelectDay(d.key)}
            className="hover-tint flex items-center justify-between rounded-xl bg-white/4 px-3 py-2.5 text-left"
          >
            <span className="font-mono text-[12px] text-[#d7dbe0]">
              {DateTime.fromISO(d.key).toFormat("cccc dd LLL yyyy")}
            </span>
            <span className="flex items-center gap-4">
              <span className="font-mono text-[11px] text-[#6a7076]">{d.count} trades</span>
              <span className="font-mono text-[11px] text-[#8b9298]">
                {d.winRate.toFixed(1)}%
              </span>
              <span className="font-mono text-[14px] tabular" style={{ color, fontWeight: 560 }}>
                {money(d.pnl)}
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

function StrategiesView({
  strategies,
  trades,
  onAdd,
  onChanged,
  readOnly = false,
}: {
  strategies: Strategy[];
  trades: Trade[];
  onAdd: () => void;
  onChanged: () => void;
  readOnly?: boolean;
}) {
  return (
    <section className="card-surface flex flex-col gap-2 p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-[14px] text-white" style={{ fontWeight: 560 }}>
          Strategies
        </h2>
        {!readOnly && (
          <button
            onClick={onAdd}
            className="hover-lift rounded-full border border-dashed border-white/20 px-3 py-1.5 text-[12px] text-[#8b9298] hover:text-white"
          >
            + New strategy
          </button>
        )}
      </header>
      {strategies.map((s) => {
        const list = trades.filter((t) => t.strategy_id === s.id);
        const pnl = list.reduce((a, t) => a + Number(t.pnl), 0);
        const color = pnl > 0 ? WIN_GREEN : pnl < 0 ? LOSS_RED : "#8b9298";
        return (
          <div key={s.id} className="flex items-center justify-between rounded-lg bg-white/4 px-3 py-2.5">
            <span className="flex min-w-0 flex-col">
              <span className="text-[12.5px] text-white">{s.name}</span>
              {s.description && (
                <span className="truncate text-[11.5px] text-[#8b9298]">{s.description}</span>
              )}
              <span className="text-[11px] text-[#6a7076]">{list.length} trades</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-mono text-[13px] tabular" style={{ color, fontWeight: 560 }}>
                {money(pnl)}
              </span>
              {!readOnly && (
                <button
                  onClick={async () => {
                    await supabase.from("strategies").delete().eq("id", s.id);
                    onChanged();
                  }}
                  className="text-[11px] text-[#6a7076] hover:text-[#f08a93]"
                >
                  Delete
                </button>
              )}
            </span>
          </div>
        );
      })}
      {strategies.length === 0 && (
        <p className="py-6 text-center text-[12px] text-[#6a7076]">No strategies yet.</p>
      )}
    </section>
  );
}
