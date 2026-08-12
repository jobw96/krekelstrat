import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  money,
  
  signedScreenshotUrl,
  WIN_GREEN,
  LOSS_RED,
  type Strategy,
  type Trade,
} from "@/lib/journal";
import { LOCAL_ZONE } from "@/lib/sessions";

const PAGE = 8;
const STEP = 5;

function resultColor(t: Trade) {
  return t.result === "WIN" ? WIN_GREEN : t.result === "LOSS" ? LOSS_RED : "#8b9298";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.1em] text-[#6a7076]">{label}</span>
      <span className="font-mono text-[12px] tabular text-[#d7dbe0]">{value}</span>
    </div>
  );
}

function Reflection({
  label,
  value,
  color,
  placeholder,
  onSave,
}: {
  label: string;
  value: string | null;
  color: string;
  placeholder: string;
  onSave: (v: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const dirty = draft !== (value ?? "");

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color }}>
        {label}
      </span>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        onBlur={async () => {
          if (!dirty) return;
          await onSave(draft);
          setSaved(true);
        }}
        rows={3}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg bg-white/4 p-2.5 text-[12px] leading-[1.55] text-[#d7dbe0] outline-none placeholder:text-[#5c6268] focus:bg-white/6"
        style={{ boxShadow: `inset 0 0 0 1px ${color}2e` }}
      />
      <span className="h-3 text-[10px] text-[#6a7076]">
        {dirty ? "Unsaved — click outside to save" : saved ? "Saved" : ""}
      </span>
    </div>
  );
}

/** Expanded panel: lazily resolves the signed screenshot URL for one trade. */
function TradeDetails({
  trade,
  strategyName,
  onChanged,
  readOnly = false,
}: {
  trade: Trade;
  strategyName: string;
  onChanged: () => void;
  readOnly?: boolean;
}) {
  const [shot, setShot] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!trade.screenshot_url) return;
    void signedScreenshotUrl(trade.screenshot_url).then((url) => {
      if (!cancelled) setShot(url);
    });
    return () => {
      cancelled = true;
    };
  }, [trade.screenshot_url]);

  async function patch(field: "went_right" | "went_wrong" | "improvement", v: string) {
    const patchData =
      field === "went_right"
        ? { went_right: v || null }
        : field === "went_wrong"
          ? { went_wrong: v || null }
          : { improvement: v || null };
    await supabase.from("trades").update(patchData).eq("id", trade.id);
    onChanged();
  }

  return (
    <div className="grid gap-4 border-t border-white/6 p-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        {trade.screenshot_url ? (
          shot ? (
            <a href={shot} target="_blank" rel="noreferrer" className="block">
              <img
                src={shot}
                alt="Trade screenshot"
                loading="lazy"
                className="w-full rounded-xl border border-white/8"
              />
            </a>
          ) : (
            <div className="h-48 w-full animate-pulse rounded-xl bg-white/5" />
          )
        ) : (
          <div className="grid h-40 place-items-center rounded-xl border border-dashed border-white/8 text-[11px] text-[#6a7076]">
            No screenshot attached
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          <Detail label="P&L" value={money(Number(trade.pnl))} />
          <Detail label="R:R" value={trade.rr != null ? `${Number(trade.rr).toFixed(2)}R` : "—"} />
          <Detail label="Session" value={trade.session ?? "—"} />
          <Detail label="Strategy" value={strategyName} />
        </div>

        {trade.notes && (
          <p className="rounded-lg bg-white/4 p-3 text-[12px] leading-[1.55] text-[#8b9298]">
            {trade.notes}
          </p>
        )}

        {readOnly ? (
          [
            { label: "Rights — what went well", value: trade.went_right, color: WIN_GREEN },
            { label: "Wrongs — what went wrong", value: trade.went_wrong, color: LOSS_RED },
            { label: "Improvement next time", value: trade.improvement, color: "#8b9298" },
          ].map((r) => (
            <div key={r.label} className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: r.color }}>
                {r.label}
              </span>
              <p className="rounded-lg bg-white/4 p-2.5 text-[12px] leading-[1.55] text-[#8b9298]">
                {r.value || "—"}
              </p>
            </div>
          ))
        ) : (
          <>
            <Reflection
              label="Rights — what went well"
              value={trade.went_right}
              color={WIN_GREEN}
              placeholder="Which rules did you follow correctly?"
              onSave={(v) => patch("went_right", v)}
            />
            <Reflection
              label="Wrongs — what went wrong"
              value={trade.went_wrong}
              color={LOSS_RED}
              placeholder="Mistakes, rule breaks, emotions…"
              onSave={(v) => patch("went_wrong", v)}
            />
            <Reflection
              label="Improvement next time"
              value={trade.improvement}
              color="#8b9298"
              placeholder="One concrete adjustment…"
              onSave={(v) => patch("improvement", v)}
            />
          </>
        )}
      </div>
    </div>
  );
}



/** Chronological trade list, showing 8 rows and expanding 5 at a time. */
export function TradesList({
  trades,
  strategies,
  onChanged,
  readOnly = false,
}: {
  trades: Trade[];
  strategies: Strategy[];
  onChanged: () => void;
  readOnly?: boolean;
}) {
  const [visible, setVisible] = useState(PAGE);
  const [open, setOpen] = useState<Record<string, boolean>>({});


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

      {shown.map((t) => {
        const strategyName =
          strategies.find((s) => s.id === t.strategy_id)?.name ?? "No strategy";
        const isOpen = !!open[t.id];
        return (
          <article key={t.id} className="glass-inset overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
              <button
                onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))}
                aria-expanded={isOpen}
                className="flex flex-1 flex-wrap items-center gap-2 text-left text-[12px] text-[#d7dbe0]"
              >
                <ChevronRight
                  className={`size-3.5 shrink-0 text-[#6a7076] transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
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
                <span className="text-[#6a7076]">{strategyName}</span>
              </button>
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
                {!readOnly && (
                  <button
                    onClick={() => remove(t.id)}
                    className="text-[#6a7076] transition-colors hover:text-[#f08a93]"
                    aria-label="Delete trade"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </span>
            </div>
            <div
              className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", opacity: isOpen ? 1 : 0 }}
            >
              <div className="overflow-hidden">
                {isOpen && (
                  <TradeDetails
                    trade={t}
                    strategyName={strategyName}
                    onChanged={onChanged}
                    readOnly={readOnly}
                  />
                )}
              </div>
            </div>
          </article>
        );
      })}


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
