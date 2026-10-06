import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  accountLabel,
  money,
  setMoneyMask,
  signedScreenshotUrl,
  WIN_GREEN,
  LOSS_RED,
  type Trade,
} from "@/lib/journal";
import { LOCAL_ZONE } from "@/lib/sessions";
import { AppLoader } from "@/components/AppLoader";

export const Route = createFileRoute("/journal_/review")({
  head: () => ({
    meta: [
      { title: "Trade Review — Krekelstrat Terminal" },
      { name: "description", content: "Scroll through every trade you logged, with screenshots inline, and export them as a ZIP." },
      { property: "og:title", content: "Trade Review — Krekelstrat Terminal" },
      { property: "og:description", content: "Scroll through every trade you logged, with screenshots inline, and export them as a ZIP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

type Outcome = "all" | "win" | "loss";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.1em] text-[#7A828D]">{label}</span>
      <span className="whitespace-pre-wrap break-words font-mono text-[12px] text-[#F0F2F5]">{value || "—"}</span>
    </div>
  );
}

function Shot({ path }: { path: string }) {
  const q = useQuery({ queryKey: ["shot", path], queryFn: () => signedScreenshotUrl(path), staleTime: 50 * 60_000 });
  if (!q.data) return <div className="h-64 w-full animate-pulse rounded-control bg-white/5" />;
  return <img src={q.data} alt="Trade screenshot" loading="lazy" className="w-full rounded-control border border-white/8" />;
}

function ReviewPage() {
  const { user, loading } = useAuth();
  const today = DateTime.now().setZone(LOCAL_ZONE);
  const [from, setFrom] = useState(today.minus({ days: 13 }).toISODate()!);
  const [to, setTo] = useState(today.toISODate()!);
  const [all, setAll] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [exporting, setExporting] = useState(false);
  setMoneyMask(false);

  const tradesQ = useQuery({
    queryKey: ["review-trades", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Trade[];
    },
  });
  const accountsQ = useQuery({
    queryKey: ["review-accounts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("prop_accounts").select("id,firm,label").eq("user_id", user!.id);
      return data ?? [];
    },
  });
  const stratQ = useQuery({
    queryKey: ["review-strats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("strategies").select("id,name").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const own = (tradesQ.data ?? []).filter((t) => t.user_id === user?.id);
    const filtered = own.filter((t) => {
      const d = DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toISODate()!;
      if (!all && (d < from || d > to)) return false;
      if (outcome === "win" && t.result !== "WIN") return false;
      if (outcome === "loss" && t.result !== "LOSS") return false;
      return true;
    });
    // Sequence number within each day, counted chronologically over all own trades.
    const seq = new Map<string, number>();
    const perDay = new Map<string, number>();
    [...own].sort((a, b) => a.date.localeCompare(b.date)).forEach((t) => {
      const d = DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toISODate()!;
      const n = (perDay.get(d) ?? 0) + 1;
      perDay.set(d, n);
      seq.set(t.id, n);
    });
    return filtered.map((t) => ({ t, n: seq.get(t.id) ?? 1 }));
  }, [tradesQ.data, user?.id, all, from, to, outcome]);

  async function exportZip() {
    if (!user) return;
    setExporting(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const own = rows.map((r) => r.t).filter((t) => t.user_id === user.id);
      zip.file("trades.json", JSON.stringify(own, null, 2));
      for (const t of own) {
        if (!t.screenshot_url || !t.screenshot_url.startsWith(`${user.id}/`)) continue;
        const { data } = await supabase.storage.from("trade-screenshots").download(t.screenshot_url);
        if (data) zip.file(`${t.id}.${t.screenshot_url.split(".").pop() ?? "webp"}`, data);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "trades.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }

  if (loading || (user && tradesQ.isLoading)) return <AppLoader />;

  const input = "rounded-control bg-white/6 px-2.5 py-1.5 text-[12px] text-[#F0F2F5] outline-none";
  const chip = (on: boolean) =>
    `rounded-control px-3 py-1.5 text-[12px] ${on ? "bg-white/14 text-white" : "bg-white/6 text-[#9AA1AC] hover:bg-white/10"}`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <header className="card-surface sticky top-0 z-10 flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link to="/journal" search={{ view: undefined }} className="text-[#9AA1AC] hover:text-white" aria-label="Back to journal">
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-[16px] text-white" style={{ fontWeight: 560 }}>Trade Review</h1>
            <span className="font-mono text-[12px] text-[#7A828D]">{rows.length} trades</span>
          </div>
          <button
            onClick={exportZip}
            disabled={exporting || rows.length === 0}
            className="hover-lift inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-[13px] disabled:opacity-50"
            style={{ background: "#6E86F7", color: "#ffffff", fontWeight: 560 }}
          >
            <Download className="size-3.5" /> {exporting ? "Exporting…" : "Export ZIP"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} disabled={all} onChange={(e) => setFrom(e.target.value)} className={input} />
          <span className="text-[#7A828D]">–</span>
          <input type="date" value={to} disabled={all} onChange={(e) => setTo(e.target.value)} className={input} />
          <button onClick={() => setAll((v) => !v)} className={chip(all)}>Show all</button>
          <span className="mx-1 h-4 w-px bg-white/10" />
          <button onClick={() => setOutcome("all")} className={chip(outcome === "all")}>All</button>
          <button onClick={() => setOutcome("win")} className={chip(outcome === "win")}>Winners</button>
          <button onClick={() => setOutcome("loss")} className={chip(outcome === "loss")}>Losers</button>
        </div>
      </header>

      {rows.length === 0 && <p className="py-10 text-center text-[13px] text-[#7A828D]">No trades in this range.</p>}

      {rows.map(({ t, n }) => {
        const dt = DateTime.fromISO(t.date).setZone(LOCAL_ZONE);
        const acct = accountsQ.data?.find((a) => a.id === t.prop_account_id);
        const color = t.result === "WIN" ? WIN_GREEN : t.result === "LOSS" ? LOSS_RED : "#9AA1AC";
        return (
          <article key={t.id} className="card-surface flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-white" style={{ fontWeight: 560 }}>
                #{n} · {dt.toFormat("ccc dd LLL yyyy")}
              </span>
              <span className="font-mono text-[14px]" style={{ color, fontWeight: 560 }}>
                {t.result} {money(Number(t.pnl))}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Date" value={dt.toFormat("yyyy-LL-dd")} />
              <Field label="Time" value={dt.toFormat("HH:mm")} />
              <Field label="Session" value={t.session ?? ""} />
              <Field label="Account" value={acct ? `${acct.label || acct.firm}` : accountLabel(t.account_size)} />
              <Field label="Account size" value={accountLabel(t.account_size)} />
              <Field label="Result" value={t.result} />
              <Field label="P&L ($)" value={money(Number(t.pnl))} />
              <Field label="R:R" value={t.rr != null ? `${Number(t.rr).toFixed(2)}R` : ""} />
              <Field label="Strategy" value={stratQ.data?.find((s) => s.id === t.strategy_id)?.name ?? ""} />
              <Field label="Mode" value={t.is_practice ? "Practice" : "Live"} />
              <Field label="Logged" value={DateTime.fromISO(t.created_at).setZone(LOCAL_ZONE).toFormat("yyyy-LL-dd HH:mm")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Went right (tags)" value={t.went_right ?? ""} />
              <Field label="Went wrong (tags)" value={t.went_wrong ?? ""} />
              <Field label="Improvement" value={t.improvement ?? ""} />
            </div>
            {t.notes && <Field label="Notes" value={t.notes} />}
            {t.screenshot_url && <Shot path={t.screenshot_url} />}
          </article>
        );
      })}
    </div>
  );
}
