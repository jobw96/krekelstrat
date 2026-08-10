import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { ChevronDown, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money, WIN_GREEN, LOSS_RED, type Strategy, type Trade } from "@/lib/journal";
import { LOCAL_ZONE } from "@/lib/sessions";

const PAGE = 8;
const STEP = 5;

function resultColor(t: Trade) {
  return t.result === "WIN" ? WIN_GREEN : t.result === "LOSS" ? LOSS_RED : "#8b9298";
}

/** Chronological trade list, showing 8 rows and expanding 5 at a time. */
export function TradesList({
  trades,
  strategies,
  onChanged,
}: {
  trades: Trade[];
  strategies: Strategy[];
  onChanged: () => void;
}) {
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    setVisible(PAGE);
  }, [trades.length]);

  const shown = trades.slice(0, visible);
  const remaining = trades.length - shown.length;

  async function remove(id: string) {
    await supabase.from("trades").delete().eq("id", id);
    onChanged();
  }

  return (
    <section className="card-surface flex flex-col gap-2 p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-[14px] text-white" style={{ fontWeight: 560 }}>
          Trades
        </h2>
        <span className="font-mono text-[11px] text-[#6a7076]">
          {shown.length}/{trades.length}
        </span>
      </header>

      {trades.length === 0 && (
        <p className="py-6 text-center text-[12px] text-[#6a7076]">
          No trades in this timeframe yet.
        </p>
      )}

      {shown.map((t) => (
        <article
          key={t.id}
          className="glass-inset flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
        >
          <span className="flex flex-wrap items-center gap-2 text-[12px] text-[#d7dbe0]">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]"
              style={{ background: `${resultColor(t)}22`, color: resultColor(t) }}
            >
              {t.result}
            </span>
            <span className="font-mono tabular text-[#8b9298]">
              {DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toFormat("dd LLL yyyy · HH:mm")}
            </span>
            <span>{t.session ?? "—"}</span>
            <span className="text-[#6a7076]">
              {strategies.find((s) => s.id === t.strategy_id)?.name ?? "No strategy"}
            </span>
          </span>
          <span className="flex items-center gap-3">
            <span
              className="font-mono text-[14px] tabular"
              style={{ color: resultColor(t), fontWeight: 560 }}
            >
              {money(Number(t.pnl))}
            </span>
            <span className="font-mono text-[11px] text-[#8b9298]">
              {t.rr != null ? `${Number(t.rr).toFixed(1)}R` : "—"}
            </span>
            <button
              onClick={() => remove(t.id)}
              className="text-[#6a7076] transition-colors hover:text-[#f08a93]"
              aria-label="Delete trade"
            >
              <Trash2 className="size-3.5" />
            </button>
          </span>
        </article>
      ))}

      {remaining > 0 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={() => setVisible((v) => v + STEP)}
            className="hover-lift inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 text-[12px] text-[#d7dbe0] hover:bg-white/12"
          >
            <ChevronDown className="size-3.5" /> Show {Math.min(STEP, remaining)} more
          </button>
          {visible > PAGE && (
            <button
              onClick={() => setVisible(PAGE)}
              className="hover-lift rounded-full px-3 py-1.5 text-[12px] text-[#6a7076] hover:text-white"
            >
              Collapse
            </button>
          )}
        </div>
      )}
    </section>
  );
}
