import { useState } from "react";
import { DateTime } from "luxon";
import { ChevronDown, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  SESSION_OPTIONS,
  uploadScreenshot,
  type Strategy,
  type TradeResult,
} from "@/lib/journal";

const inputCls =
  "h-10 w-full rounded-xl bg-white/6 px-3 text-[13px] text-white outline-none placeholder:text-[#6a7076] focus:ring-1 focus:ring-[#e5525f]";

function SelectField({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between text-left ${open ? "ring-1 ring-[#e5525f]" : ""}`}
      >
        <span>{current?.label ?? "None"}</span>
        <ChevronDown
          className={`size-3.5 text-[#6a7076] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="card-surface absolute left-0 right-0 top-[calc(100%+8px)] z-40 flex max-h-[220px] flex-col gap-0.5 overflow-y-auto p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.85)]">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-white/8"
                style={{
                  color: o.value === value ? "#ffffff" : "#8b9298",
                  fontWeight: o.value === value ? 560 : 400,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AddTradeDialog({
  userId,
  strategies,
  onClose,
  onSaved,
}: {
  userId: string;
  strategies: Strategy[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(DateTime.now().toFormat("yyyy-LL-dd'T'HH:mm"));
  const [strategyId, setStrategyId] = useState<string>("");
  const [session, setSession] = useState<string>(SESSION_OPTIONS[0]!);
  const [pnl, setPnl] = useState("");
  const [rr, setRr] = useState("");
  const [result, setResult] = useState<TradeResult>("WIN");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let screenshot: string | null = null;
      if (file) screenshot = await uploadScreenshot(userId, file);
      const { error: err } = await supabase.from("trades").insert({
        user_id: userId,
        strategy_id: strategyId || null,
        date: DateTime.fromISO(date).toISO() ?? new Date().toISOString(),
        pnl: Number(pnl || 0),
        rr: rr ? Number(rr) : null,
        result,
        session,
        notes: notes || null,
        screenshot_url: screenshot,
      });
      if (err) throw err;
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <form
        onSubmit={save}
        className="card-surface flex max-h-[90vh] w-full max-w-[520px] flex-col gap-3 overflow-y-auto p-5"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-[17px] text-white" style={{ fontWeight: 560 }}>
            Add trade
          </h2>
          <button type="button" onClick={onClose} className="text-[#8b9298] hover:text-white">
            <X className="size-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            Date & time
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            Strategy
            <select
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              className={inputCls}
            >
              <option value="">None</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            Session
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className={inputCls}
            >
              {SESSION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            Result
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as TradeResult)}
              className={inputCls}
            >
              <option value="WIN">WIN</option>
              <option value="LOSS">LOSS</option>
              <option value="BE">BE</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            P&L ($)
            <input
              type="number"
              step="0.01"
              value={pnl}
              onChange={(e) => setPnl(e.target.value)}
              placeholder="450.00"
              className={inputCls}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            R:R
            <input
              type="number"
              step="0.1"
              value={rr}
              onChange={(e) => setRr(e.target.value)}
              placeholder="2.5"
              className={inputCls}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Setup, execution, mistakes…"
            className="w-full rounded-xl bg-white/6 p-3 text-[13px] text-white outline-none placeholder:text-[#6a7076] focus:ring-1 focus:ring-[#e5525f]"
          />
        </label>

        <label className="hover-lift flex cursor-pointer items-center gap-2 rounded-xl bg-white/6 px-3 py-2.5 text-[12px] text-[#d7dbe0] hover:bg-white/10">
          <Upload className="size-4" />
          {file ? file.name : "Upload screenshot (converted to WebP)"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {error && <p className="text-[12px] text-[#f08a93]">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="hover-lift inline-flex h-11 items-center justify-center gap-2 rounded-2xl text-[14px] disabled:opacity-60"
          style={{ background: "#20242a", color: "#ffffff", fontWeight: 560, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Save trade
        </button>
      </form>
    </div>
  );
}
