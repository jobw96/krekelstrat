import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Trash2, X } from "lucide-react";
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

function resultColor(t: Trade) {
  return t.result === "WIN" ? WIN_GREEN : t.result === "LOSS" ? LOSS_RED : "#93a9b6";
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
  const total = trades.reduce((a, t) => a + Number(t.pnl), 0);

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
      <div className="card-surface flex max-h-[88vh] w-full max-w-[620px] flex-col gap-3 overflow-y-auto p-5">
        <header className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-[17px] text-white" style={{ fontWeight: 560 }}>
              {DateTime.fromISO(day).setLocale("nl").toFormat("cccc d LLLL yyyy")}
            </h2>
            <span
              className="font-mono text-[13px] tabular"
              style={{ color: total > 0 ? WIN_GREEN : total < 0 ? LOSS_RED : "#93a9b6" }}
            >
              {money(total)} · {trades.length} trades
            </span>
          </div>
          <button onClick={onClose} className="text-[#93a9b6] hover:text-white">
            <X className="size-4" />
          </button>
        </header>

        {trades.map((t) => (
          <article key={t.id} className="glass-inset flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[12px] text-[#cfdde6]">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]"
                  style={{ background: `${resultColor(t)}22`, color: resultColor(t) }}
                >
                  {t.result}
                </span>
                {t.session ?? "—"} ·{" "}
                {DateTime.fromISO(t.date).setZone(LOCAL_ZONE).toFormat("HH:mm")} AMS
                <span className="text-[#6b8592]">
                  {strategies.find((s) => s.id === t.strategy_id)?.name ?? "Geen strategie"}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span
                  className="font-mono text-[14px] tabular"
                  style={{ color: resultColor(t), fontWeight: 560 }}
                >
                  {money(Number(t.pnl))}
                </span>
                <span className="font-mono text-[11px] text-[#93a9b6]">
                  {t.rr != null ? `${Number(t.rr).toFixed(1)}R` : "—"}
                </span>
                <button
                  onClick={() => remove(t.id)}
                  className="text-[#6b8592] hover:text-[#ff8f9b]"
                  aria-label="Trade verwijderen"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </div>
            {t.notes && <p className="text-[12px] leading-[1.5] text-[#93a9b6]">{t.notes}</p>}
            {shots[t.id] && (
              <img
                src={shots[t.id]}
                alt="Trade screenshot"
                loading="lazy"
                className="w-full rounded-xl border border-white/8"
              />
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
