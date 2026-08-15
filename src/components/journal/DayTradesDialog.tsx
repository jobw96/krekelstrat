import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Pencil, Trash2, X, ZoomIn } from "lucide-react";
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
import { TradeComments } from "@/components/journal/TradeComments";
import { AddTradeDialog } from "@/components/journal/AddTradeDialog";
import { ImageLightbox } from "@/components/journal/ImageLightbox";

function resultColor(t: Trade) {
  return t.result === "WIN" ? WIN_GREEN : t.result === "LOSS" ? LOSS_RED : "#9AA1AC";
}

function TagRow({ label, value, color }: { label: string; value: string | null; color: string }) {
  if (!value) return null;
  const tags = value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.08em] text-[#7A828D]">{label}</span>
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="rounded-control px-2 py-0.5 text-[10.5px]"
          style={{ background: `${color}1f`, color, border: `1px solid ${color}3d` }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function DayTradesDialog({
  day,
  trades,
  strategies,
  onClose,
  onChanged,
}: {
  day: string;
  trades: Trade[];
  strategies: Strategy[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [shots, setShots] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Trade | null>(null);
  const [zoomed, setZoomed] = useState<string | null>(null);
  const total = trades.reduce((a, t) => a + Number(t.pnl), 0);
  const wins = trades.filter((t) => t.result === "WIN").length;
  const losses = trades.filter((t) => t.result === "LOSS").length;
  // A day reads forwards; the list arrives newest-first from the query.
  const ordered = [...trades].sort((a, b) => a.date.localeCompare(b.date));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries: Record<string, string> = {};
      for (const t of trades) {
        if (!t.screenshot_url) continue;
        const url = await signedScreenshotUrl(t.screenshot_url);
        if (url) entries[t.id] = url;
      }
      if (!cancelled) setShots(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [trades]);

  async function remove(id: string) {
    await supabase.from("trades").delete().eq("id", id);
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="card-surface flex max-h-[90vh] w-full max-w-[820px] flex-col gap-3 overflow-y-auto p-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-[17px] text-white" style={{ fontWeight: 560 }}>
              {DateTime.fromISO(day).setLocale("en").toFormat("cccc d LLLL yyyy")}
            </h2>
            <span className="flex flex-wrap items-center gap-x-2 font-mono text-[13px] tabular">
              <span style={{ color: total > 0 ? WIN_GREEN : total < 0 ? LOSS_RED : "#9AA1AC" }}>
                {money(total)}
              </span>
              <span className="text-[#7A828D]">
                · {trades.length} {trades.length === 1 ? "trade" : "trades"} · {wins}W / {losses}L
              </span>
            </span>
          </div>
          <button onClick={onClose} className="shrink-0 text-[#9AA1AC] hover:text-white">
            <X className="size-4" />
          </button>
        </header>

        {/* One trade per row, in time order. Three across with an uncapped
            screenshot meant each card ran taller than the viewport, so a
            seven-trade day could never be read at a glance. */}
        <div className="flex flex-col gap-2">
        {ordered.map((t) => (
          <article key={t.id} className="glass-inset flex min-w-0 flex-col gap-2.5 p-3">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[auto_minmax(0,1fr)_84px_52px_auto]">
              <span
                className="rounded-control px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]"
                style={{ background: `${resultColor(t)}22`, color: resultColor(t) }}
              >
                {t.result}
              </span>

              <span className="flex min-w-0 items-baseline gap-2 text-[12px] text-[#F0F2F5]">
                <span className="font-mono tabular">
                  {DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toFormat("HH:mm")}
                </span>
                <span className="truncate text-[#7A828D]">
                  {t.session ?? "—"} ·{" "}
                  {strategies.find((s) => s.id === t.strategy_id)?.name ?? "No strategy"}
                </span>
              </span>

              <span
                className="col-start-3 row-start-1 text-right font-mono text-[14px] tabular sm:col-start-3"
                style={{ color: resultColor(t), fontWeight: 560 }}
              >
                {money(Number(t.pnl))}
              </span>

              <span className="col-start-2 row-start-2 font-mono text-[11px] text-[#9AA1AC] sm:col-start-4 sm:row-start-1 sm:text-right">
                {t.rr != null ? `${Number(t.rr).toFixed(1)}R` : "—"}
              </span>

              <span className="col-start-3 row-start-2 flex items-center justify-end gap-2 sm:col-start-5 sm:row-start-1">
                <button
                  onClick={() => setEditing(t)}
                  className="text-[#7A828D] transition-colors hover:text-white"
                  aria-label="Edit trade"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="text-[#7A828D] transition-colors hover:text-[#F5928F]"
                  aria-label="Delete trade"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </div>

            {(shots[t.id] || t.notes || t.went_right || t.went_wrong || t.improvement) && (
              <div className="flex items-start gap-3">
                {shots[t.id] && (
                  <button
                    type="button"
                    onClick={() => setZoomed(shots[t.id] ?? null)}
                    className="group/img relative block shrink-0 overflow-hidden rounded-control border border-white/8"
                    aria-label="Zoom screenshot"
                  >
                    {/* Capped by height so a portrait phone capture stays a
                        thumbnail; the lightbox is where it gets read. */}
                    <img
                      src={shots[t.id]}
                      alt="Trade screenshot"
                      loading="lazy"
                      className="max-h-[120px] w-auto"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-black/50 text-[#F0F2F5] opacity-0 transition-opacity group-hover/img:opacity-100">
                      <ZoomIn className="size-4" />
                    </span>
                  </button>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {t.notes && (
                    <p className="text-[12px] leading-[1.5] text-[#9AA1AC]">{t.notes}</p>
                  )}
                  <TagRow label="Rights" value={t.went_right} color={WIN_GREEN} />
                  <TagRow label="Wrongs" value={t.went_wrong} color={LOSS_RED} />
                  <TagRow label="Improvement" value={t.improvement} color="#9AA1AC" />
                </div>
              </div>
            )}

            <TradeComments tradeId={t.id} onChanged={onChanged} />
          </article>
        ))}
        </div>
      </div>


      {editing && (
        <AddTradeDialog
          userId={editing.user_id}
          strategies={strategies}
          trade={editing}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}

      {zoomed && <ImageLightbox src={zoomed} onClose={() => setZoomed(null)} />}
    </div>
  );
}
