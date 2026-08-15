import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { ChevronRight, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { WIN_GREEN, LOSS_RED } from "@/lib/journal";
import { PROP_FIRMS, STATUS_LABEL, propStats, type PropAccount, type PropStatus } from "@/lib/prop";
import { Section } from "@/components/Section";
import { PropFirmDialog } from "./PropFirmDialog";

const usd = (n: number) => `$${Math.abs(n).toFixed(0)}`;

/**
 * Shared by the account rows and their column header so the two can never drift
 * apart. Every column takes a proportional share rather than letting the name
 * absorb the slack: with a 1fr name the values stayed pinned to the far edge on
 * a wide screen, which is the dead gap this grid exists to close.
 */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_54px]";

const STATUS_COLOR: Record<PropStatus, string> = {
  in_progress: "#6E86F7",
  passed: "#8098FF",
  payout: "#3ECF8E",
  breached: "#7A828D",
};

type GroupKey = "evaluation" | "funded" | "breached";

const GROUPS: { key: GroupKey; label: string; color: string }[] = [
  { key: "evaluation", label: "Evaluation", color: "#8098FF" },
  { key: "funded", label: "Funded", color: "#F0F2F5" },
  { key: "breached", label: "Breached", color: "#7A828D" },
];

const groupOf = (r: PropAccount): GroupKey =>
  r.status === "breached"
    ? "breached"
    : r.phase === "funded" || r.status === "passed" || r.status === "payout"
      ? "funded"
      : "evaluation";

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass-inset flex flex-col gap-1 p-3">
      <span className="text-[10.5px] uppercase tracking-[0.08em] text-[#7A828D]">{label}</span>
      <span className="font-mono text-[19px] tabular" style={{ color: color ?? "#ffffff", fontWeight: 560 }}>
        {value}
      </span>
      {sub && <span className="text-[10.5px] text-[#7A828D]">{sub}</span>}
    </div>
  );
}

function HeroStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="card-surface flex flex-col gap-1.5 p-4">
      <span className="text-[10.5px] uppercase tracking-[0.1em] text-[#7A828D]">{label}</span>
      <span className="font-mono text-[26px] leading-none tabular" style={{ color, fontWeight: 560 }}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-[#7A828D]">{sub}</span>}
    </div>
  );
}

/** Prop firm tracker: evaluations, costs, pass/breach rates and funded stats. */
export function PropFirmsView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; account?: PropAccount | null }>({
    open: false,
  });
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>({
    evaluation: true,
    funded: true,
    breached: false,
  });

  const q = useQuery({
    queryKey: ["prop_accounts", userId],
    queryFn: async (): Promise<PropAccount[]> => {
      const { data, error } = await supabase
        .from("prop_accounts")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PropAccount[];
    },
  });

  const rows = q.data ?? [];
  const s = propStats(rows);
  const refresh = () => qc.invalidateQueries({ queryKey: ["prop_accounts", userId] });

  const byFirm = PROP_FIRMS.map((f) => {
    const list = rows.filter((r) => r.firm === f.name);
    const settled = list.filter((r) => r.status !== "in_progress");
    const passed = list.filter((r) => r.status === "passed" || r.status === "payout").length;
    return {
      ...f,
      count: list.length,
      spend: list.reduce((a, r) => a + Number(r.cost) + Number(r.activation_fee), 0),
      payout: list.reduce((a, r) => a + Number(r.payout_total), 0),
      passRate: settled.length ? (passed / settled.length) * 100 : 0,
    };
  });

  const roi = s.totalCost ? (s.net / s.totalCost) * 100 : 0;
  const netColor = s.net > 0 ? WIN_GREEN : s.net < 0 ? LOSS_RED : "#9AA1AC";

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <HeroStat label="Total costs" value={`-${usd(s.totalCost)}`} sub={`${s.total} accounts · avg ${s.total ? usd(s.avgCost) : "—"}`} color={LOSS_RED} />
        <HeroStat label="Payouts" value={`+${usd(s.totalPayout)}`} sub={`${s.funded} funded accounts`} color={WIN_GREEN} />
        <HeroStat label="Net P&L" value={`${s.net < 0 ? "-" : "+"}${usd(s.net)}`} sub="payouts minus all fees" color={netColor} />
        <HeroStat label="ROI" value={s.totalCost ? `${roi > 0 ? "+" : ""}${roi.toFixed(1)}%` : "—"} sub="return on spend" color={netColor} />
      </section>

      <Section
        title="Prop firms"
        subtitle="Evaluations, costs and funded account performance"
        action={
          <button
            onClick={() => setDialog({ open: true, account: null })}
            className="hover-lift inline-flex items-center gap-1.5 rounded-control px-3.5 py-2 text-[13px]"
            style={{ background: "#6E86F7", color: "#ffffff", fontWeight: 560 }}
          >
            <Plus className="size-4" /> Add account
          </button>
        }
      >
        <div className="card-surface flex flex-col gap-2 p-5">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          <Stat label="Total spend" value={usd(s.totalCost)} sub={`${s.total} accounts`} color={LOSS_RED} />
          <Stat label="Payouts" value={usd(s.totalPayout)} color={WIN_GREEN} />
          <Stat
            label="Net"
            value={`${s.net < 0 ? "-" : "+"}${usd(s.net)}`}
            color={s.net > 0 ? WIN_GREEN : s.net < 0 ? LOSS_RED : "#9AA1AC"}
          />
          <Stat label="Pass rate" value={`${s.passRate.toFixed(0)}%`} sub="settled evals" />
          <Stat label="Breach rate" value={`${s.breachRate.toFixed(0)}%`} sub="settled evals" />
          <Stat label="Cost per pass" value={s.costPerPass ? usd(s.costPerPass) : "—"} />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Active" value={String(s.active)} sub="in progress" color="#6E86F7" />
          <Stat label="Funded accounts" value={String(s.funded)} />
          <Stat
            label="Funded survival"
            value={s.funded ? `${s.fundedSurvival.toFixed(0)}%` : "—"}
            sub={`${s.fundedBreached} breached`}
          />
          <Stat label="Avg cost / account" value={s.total ? usd(s.avgCost) : "—"} />
        </div>
        </div>
      </Section>

      <Section title="Accounts">
        <div className="card-surface flex flex-col gap-2 p-5">
        {q.isLoading && <p className="py-6 text-center text-[12px] text-[#7A828D]">Loading…</p>}
        {/* One empty state for the whole section: rendering the group rows too
            would repeat "nothing here" four times over. */}
        {!q.isLoading && rows.length === 0 && (
          <p className="py-6 text-center text-[12px] text-[#7A828D]">
            No prop accounts yet. Add an evaluation to track cost, payouts and pass rate.
          </p>
        )}
        {!q.isLoading &&
          rows.length > 0 &&
          GROUPS.map((g) => {
            const list = rows.filter((r) => groupOf(r) === g.key);
            const open = openGroups[g.key];
            const spendSum = list.reduce((a, r) => a + Number(r.cost) + Number(r.activation_fee), 0);
            const netSum = list.reduce(
              (a, r) => a + Number(r.payout_total) - Number(r.cost) - Number(r.activation_fee),
              0,
            );
            return (
              <div key={g.key} className="flex flex-col gap-2">
                <button
                  onClick={() => setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))}
                  className="hover-tint flex items-center justify-between gap-3 rounded-control bg-white/4 px-3 py-2 text-left"
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight
                      className="size-3.5 text-[#7A828D] transition-transform"
                      style={{ transform: open ? "rotate(90deg)" : "none" }}
                    />
                    <span className="text-[12.5px]" style={{ color: g.color, fontWeight: 560 }}>
                      {g.label}
                    </span>
                    <span className="rounded-control bg-white/6 px-2 py-0.5 font-mono text-[10.5px] text-[#9AA1AC]">
                      {list.length}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 font-mono text-[11px] text-[#7A828D]">
                    <span>-{usd(spendSum)} cost</span>
                    <span style={{ color: netSum > 0 ? WIN_GREEN : netSum < 0 ? LOSS_RED : "#9AA1AC" }}>
                      {netSum < 0 ? "-" : "+"}
                      {usd(netSum)}
                    </span>
                  </span>
                </button>

                {/* An empty group says so with its own 0 badge; a second line
                    below it would just be the same fact twice. */}
                {open && list.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {/* Labelled once per group instead of repeating "cost" on
                        every row, and it keeps the columns aligned. */}
                    <div className={`${ROW_GRID} hidden px-3 text-[10px] uppercase tracking-[0.07em] text-[#454B55] sm:grid`}>
                      <span>Account</span>
                      <span>Size · started</span>
                      <span className="text-right">Cost</span>
                      <span className="text-right">Net</span>
                      <span />
                    </div>

                    {list.map((r) => {
                      const spend = Number(r.cost) + Number(r.activation_fee);
                      const net = Number(r.payout_total) - spend;
                      return (
                        <div
                          key={r.id}
                          className={`${ROW_GRID} items-center rounded-control bg-white/4 px-3 py-2`}
                        >
                          <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2">
                            <span className="truncate text-[12.5px] text-white">
                              {r.label?.trim() || r.firm}
                            </span>
                            {r.label?.trim() && (
                              <span className="shrink-0 text-[11px] text-[#7A828D]">{r.firm}</span>
                            )}
                            <span
                              className="shrink-0 rounded-control px-2 py-0.5 text-[10px] uppercase tracking-[0.06em]"
                              style={{ background: `${STATUS_COLOR[r.status]}1f`, color: STATUS_COLOR[r.status] }}
                            >
                              {STATUS_LABEL[r.status]}
                            </span>
                          </span>

                          <span className="col-start-1 row-start-2 truncate font-mono text-[11px] text-[#7A828D] sm:col-start-2 sm:row-start-1">
                            {r.account_size ? `$${(r.account_size / 1000).toFixed(0)}K` : "—"} ·{" "}
                            {DateTime.fromISO(r.started_at).toFormat("dd LLL yyyy")}
                          </span>

                          <span className="col-start-3 row-start-1 hidden text-right font-mono text-[11px] text-[#7A828D] sm:block">
                            -{usd(spend)}
                          </span>

                          <span
                            className="col-start-2 row-start-1 text-right font-mono text-[13px] tabular sm:col-start-4"
                            style={{ color: net > 0 ? WIN_GREEN : net < 0 ? LOSS_RED : "#9AA1AC", fontWeight: 560 }}
                          >
                            {net < 0 ? "-" : "+"}
                            {usd(net)}
                          </span>

                          <span className="col-start-2 row-start-2 flex items-center justify-end gap-2 sm:col-start-5 sm:row-start-1">
                            <button
                              onClick={() => setDialog({ open: true, account: r })}
                              aria-label="Edit account"
                              className="text-[#7A828D] transition-colors hover:text-white"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                await supabase.from("prop_accounts").delete().eq("id", r.id);
                                refresh();
                              }}
                              aria-label="Delete account"
                              className="text-[#7A828D] transition-colors hover:text-[#F5928F]"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </span>

                          {r.notes && (
                            <span className="col-span-2 row-start-3 truncate text-[11.5px] text-[#9AA1AC] sm:col-span-5 sm:row-start-2">
                              {r.notes}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Firms" subtitle="Links and per-firm breakdown">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {byFirm.map((f) => (
            <a
              key={f.name}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="card-surface hover-tint flex flex-col gap-1 p-4"
            >
              <span className="flex items-center gap-1.5 text-[12.5px] text-white">
                {f.name} <ExternalLink className="size-3 text-[#7A828D]" />
              </span>
              <span className="font-mono text-[11px] text-[#7A828D]">
                {f.count} accounts · -{usd(f.spend)} · +{usd(f.payout)} · {f.passRate.toFixed(0)}% pass
              </span>
            </a>
          ))}
        </div>
      </Section>

      {dialog.open && (
        <PropFirmDialog
          userId={userId}
          account={dialog.account ?? null}
          onClose={() => setDialog({ open: false })}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
