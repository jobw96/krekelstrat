import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { ChevronDown, ClipboardPaste, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  SESSION_OPTIONS,
  sessionLabel,
  uploadScreenshot,
  WIN_GREEN,
  LOSS_RED,
  type Strategy,
  type TradeResult,
  type Trade,
} from "@/lib/journal";
import { DateTimePicker } from "@/components/journal/DateTimePicker";
import { TagPicker, RIGHT_TAGS, WRONG_TAGS } from "@/components/journal/TagPicker";



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
          <div className="card-surface dialog-enter absolute left-0 right-0 top-[calc(100%+8px)] z-40 flex max-h-[220px] flex-col gap-0.5 overflow-y-auto p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.85)]">
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
  defaultDate,
  defaultPractice,
  trade,
}: {
  userId: string;
  strategies: Strategy[];
  onClose: () => void;
  onSaved: () => void;
  defaultDate?: string | null;
  /** Pre-select practice mode (e.g. when the journal is in practice mode). */
  defaultPractice?: boolean;
  /** When provided, the dialog edits this trade instead of creating a new one. */
  trade?: Trade | null;
}) {
  const editing = !!trade;
  const [practice, setPractice] = useState<boolean>(
    trade ? !!trade.is_practice : !!defaultPractice,
  );
  const [date, setDate] = useState(
    trade
      ? DateTime.fromISO(trade.date).toFormat("yyyy-LL-dd'T'HH:mm")
      : defaultDate
        ? DateTime.fromISO(defaultDate).set({
            hour: DateTime.now().hour,
            minute: DateTime.now().minute,
          }).toFormat("yyyy-LL-dd'T'HH:mm")
        : DateTime.now().toFormat("yyyy-LL-dd'T'HH:mm"),
  );
  const [strategyId, setStrategyId] = useState<string>(trade?.strategy_id ?? "");
  const [session, setSession] = useState<string>(trade?.session ?? SESSION_OPTIONS[0]!);
  const [pnl, setPnl] = useState(trade ? String(Math.abs(Number(trade.pnl))) : "");
  const [rr, setRr] = useState(trade?.rr != null ? String(trade.rr) : "");
  const [result, setResult] = useState<TradeResult>(trade?.result ?? "WIN");
  const [notes, setNotes] = useState(trade?.notes ?? "");
  const [rightTags, setRightTags] = useState<string[]>(
    trade?.went_right ? trade.went_right.split(" • ").filter(Boolean) : [],
  );
  const [wrongTags, setWrongTags] = useState<string[]>(
    trade?.went_wrong ? trade.went_wrong.split(" • ").filter(Boolean) : [],
  );
  const [improvement, setImprovement] = useState(trade?.improvement ?? "");


  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = file ? URL.createObjectURL(file) : null;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Paste a screenshot straight from the clipboard (Cmd/Ctrl+V) anywhere in the dialog.
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Make sure the dialog owns focus, otherwise the browser routes paste elsewhere.
    formRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const img = item?.getAsFile();
      if (!img) return;
      e.preventDefault();
      const ext = img.type.split("/")[1] ?? "png";
      setFile(new File([img], `pasted-${Date.now()}.${ext}`, { type: img.type }));
    }
    window.addEventListener("paste", onPaste, true);
    document.addEventListener("paste", onPaste, true);
    return () => {
      window.removeEventListener("paste", onPaste, true);
      document.removeEventListener("paste", onPaste, true);
    };
  }, []);


  const sign = result === "WIN" ? 1 : result === "LOSS" ? -1 : 0;
  const signedPnl = Math.abs(Number(pnl || 0)) * (sign === 0 ? 0 : sign);


  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let screenshot: string | null = trade?.screenshot_url ?? null;
      if (file) screenshot = await uploadScreenshot(userId, file);
      const payload = {
        strategy_id: strategyId || null,
        date: DateTime.fromISO(date).toISO() ?? new Date().toISOString(),
        pnl: signedPnl,
        rr: rr ? Number(rr) : null,
        result,
        session,
        notes: notes || null,
        went_right: rightTags.filter(Boolean).join(" • ") || null,
        went_wrong: wrongTags.filter(Boolean).join(" • ") || null,

        improvement: improvement || null,
        screenshot_url: screenshot,
      };
      const { error: err } = editing
        ? await supabase.from("trades").update(payload).eq("id", trade!.id)
        : await supabase.from("trades").insert({ ...payload, user_id: userId });
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
    <div className="overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <form
        ref={formRef}
        tabIndex={-1}
        onSubmit={save}
        className="card-surface dialog-enter flex max-h-[90vh] w-full max-w-[520px] flex-col gap-3 overflow-y-auto p-5 outline-none"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-[17px] text-white" style={{ fontWeight: 560 }}>
            {editing ? "Edit trade" : "Add trade"}
          </h2>
          <button type="button" onClick={onClose} className="text-[#8b9298] hover:text-white">
            <X className="size-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            Date &amp; time
            <DateTimePicker value={date} onChange={setDate} />
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            Strategy
            <SelectField
              value={strategyId}
              onChange={setStrategyId}
              options={[
                { value: "", label: "None" },
                ...strategies.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            Session
            <SelectField
              value={session}
              onChange={setSession}
              options={SESSION_OPTIONS.map((s) => ({ value: s, label: sessionLabel(s) }))}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            Result
            <SelectField
              value={result}
              onChange={(v) => setResult(v as TradeResult)}
              options={[
                { value: "WIN", label: "WIN" },
                { value: "LOSS", label: "LOSS" },
                { value: "BE", label: "BE" },
              ]}
            />
          </div>
          <label className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
            P&L ($)
            <span className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px]"
                style={{ color: sign > 0 ? "#3ecf8e" : sign < 0 ? "#e5525f" : "#6a7076" }}
              >
                {sign > 0 ? "+" : sign < 0 ? "−" : "±"}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pnl}
                onChange={(e) => setPnl(e.target.value.replace("-", ""))}
                placeholder="450.00"
                className={`${inputCls} pl-7`}
                style={{ color: sign > 0 ? "#3ecf8e" : sign < 0 ? "#e5525f" : "#ffffff" }}
                required
              />
            </span>
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <TagPicker
              label="What went right"
              color={WIN_GREEN}
              presets={RIGHT_TAGS}
              value={rightTags}
              onChange={setRightTags}
            />
          </div>
          <div className="flex flex-col gap-2">
            <TagPicker
              label="What went wrong"
              color={LOSS_RED}
              presets={WRONG_TAGS}
              value={wrongTags}
              onChange={setWrongTags}
            />
          </div>
        </div>


        <label className="flex flex-col gap-1 text-[11px] text-[#8b9298]">
          Improvement for next time
          <textarea
            value={improvement}
            onChange={(e) => setImprovement(e.target.value)}
            rows={2}
            placeholder="One concrete adjustment…"
            className="w-full rounded-xl bg-white/6 p-3 text-[13px] text-white outline-none placeholder:text-[#6a7076] focus:ring-1 focus:ring-[#e5525f]"
          />
        </label>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped?.type.startsWith("image/")) setFile(dropped);
          }}
          className="flex flex-col gap-2 rounded-xl p-2 transition-colors"
          style={{
            background: dragging ? "rgba(229,82,95,0.10)" : "rgba(255,255,255,0.06)",
            boxShadow: dragging ? "inset 0 0 0 1px rgba(229,82,95,0.6)" : "none",
          }}
        >
          {preview && (
            <div className="relative overflow-hidden rounded-lg">
              <img src={preview} alt="Screenshot preview" className="max-h-[180px] w-full object-cover" />
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="Remove screenshot"
                className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="hover-lift flex flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-[#d7dbe0] hover:bg-white/8">
              <Upload className="size-4" />
              {file ? file.name : "Upload or drop a screenshot here"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[#6a7076]">
              <ClipboardPaste className="size-3.5" />
              or paste with Ctrl/Cmd + V
            </span>
          </div>
        </div>

        {error && <p className="text-[12px] text-[#f08a93]">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="hover-lift inline-flex h-11 items-center justify-center gap-2 rounded-2xl text-[14px] disabled:opacity-60"
          style={{ background: "#20242a", color: "#ffffff", fontWeight: 560, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} {editing ? "Save changes" : "Save trade"}
        </button>
      </form>
    </div>
  );
}
