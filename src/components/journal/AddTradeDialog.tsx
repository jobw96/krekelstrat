import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { ChevronDown, ClipboardPaste, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCOUNT_SIZES,
  DEFAULT_ACCOUNT_SIZE,
  accountLabel,
  SESSION_OPTIONS,
  sessionLabel,
  uploadScreenshot,
  WIN_GREEN,
  LOSS_RED,
  PRACTICE_BLUE,
  type Strategy,
  type TradeResult,
  type Trade,
} from "@/lib/journal";
import type { PropAccount } from "@/lib/prop";
import { DateTimePicker } from "@/components/journal/DateTimePicker";
import { TagPicker, RIGHT_TAGS, WRONG_TAGS } from "@/components/journal/TagPicker";
import { sessionShortAt } from "@/lib/sessions";



const inputCls =
  "h-10 w-full rounded-control bg-white/6 px-3 text-[13px] text-white outline-none placeholder:text-[#7A828D] focus:ring-1 focus:ring-[#6E86F7]";

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
        className={`${inputCls} flex items-center justify-between text-left ${open ? "ring-1 ring-[#6E86F7]" : ""}`}
      >
        <span>{current?.label ?? "None"}</span>
        <ChevronDown
          className={`size-3.5 text-[#7A828D] transition-transform ${open ? "rotate-180" : ""}`}
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
                className={`px-3 py-2.5 text-left text-[12.5px] ${
                  o.value === value ? "menu-item-on" : "menu-item"
                }`}
                style={o.value === value ? { fontWeight: 560 } : undefined}
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
  // New trades always start on the 25K book, whichever one is being viewed;
  // editing keeps whatever the trade was logged under.
  const [accountSize, setAccountSize] = useState<number>(
    trade?.account_size ?? DEFAULT_ACCOUNT_SIZE,
  );
  const [propAccountId, setPropAccountId] = useState<string>(trade?.prop_account_id ?? "");

  // Shares a cache key with the prop firms view, so opening this dialog does
  // not refetch what that page already holds.
  const accountsQ = useQuery({
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
  const propAccounts = accountsQ.data ?? [];
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
  const [session, setSession] = useState<string>(
    trade?.session ?? sessionShortAt(DateTime.fromISO(date)),
  );
  // Keep following the picked date/time until the user chooses a session manually.
  const sessionTouched = useRef(!!trade);
  useEffect(() => {
    if (sessionTouched.current) return;
    const dt = DateTime.fromISO(date);
    if (dt.isValid) setSession(sessionShortAt(dt));
  }, [date]);
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
        is_practice: practice,
        account_size: accountSize,
        prop_account_id: propAccountId || null,
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
        className="card-surface dialog-enter flex max-h-[90vh] w-full max-w-[520px] flex-col gap-3 overflow-y-auto p-5 outline-none transition-shadow"
        style={
          practice
            ? {
                boxShadow: `inset 0 0 0 1px ${PRACTICE_BLUE}40, inset 0 -40px 70px -40px ${PRACTICE_BLUE}80, 0 24px 60px -30px rgba(0,0,0,0.9)`,
              }
            : undefined
        }
      >
        <header className="flex items-center justify-between">
          <h2 className="text-[17px] text-white" style={{ fontWeight: 560 }}>
            {editing ? "Edit trade" : "Add trade"}
          </h2>
          <button type="button" onClick={onClose} className="text-[#9AA1AC] hover:text-white">
            <X className="size-4" />
          </button>
        </header>

        <div
          className="flex items-center justify-between gap-3 rounded-control px-3 py-2.5"
          style={{
            background: practice ? `${PRACTICE_BLUE}14` : "rgba(255,255,255,0.05)",
            boxShadow: practice ? `inset 0 0 0 1px ${PRACTICE_BLUE}4d` : "none",
          }}
        >
          <span className="flex flex-col">
            <span
              className="text-[12.5px]"
              style={{ color: practice ? PRACTICE_BLUE : "#F0F2F5", fontWeight: 560 }}
            >
              {practice ? "Practice trade" : "Live trade"}
            </span>
            <span className="text-[11px] text-[#7A828D]">
              Practice trades are tracked separately from live results.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={practice}
            aria-label="Mark as practice trade"
            onClick={() => setPractice((p) => !p)}
            className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
            style={{ background: practice ? PRACTICE_BLUE : "rgba(255,255,255,0.14)" }}
          >
            <span
              className="absolute top-0.5 size-5 rounded-full bg-white transition-all"
              style={{ left: practice ? "22px" : "2px" }}
            />
          </button>
        </div>


        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 text-[11px] text-[#9AA1AC]">
            Account
            <SelectField
              value={String(accountSize)}
              onChange={(v) => setAccountSize(Number(v))}
              options={ACCOUNT_SIZES.map((s) => ({ value: String(s), label: accountLabel(s) }))}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-[#9AA1AC]">
            Prop account
            <SelectField
              value={propAccountId}
              onChange={(v) => {
                setPropAccountId(v);
                // Keep the journal split in step with the linked account, so a
                // trade cannot sit in the 25K book while tied to a 50K account.
                const picked = propAccounts.find((a) => a.id === v);
                if (picked?.account_size) setAccountSize(picked.account_size);
              }}
              options={[
                { value: "", label: "Not linked" },
                ...propAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.label?.trim() || a.firm}${
                    a.account_size ? ` · ${accountLabel(a.account_size)}` : ""
                  }`,
                })),
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 text-[11px] text-[#9AA1AC]">
            Date &amp; time
            <DateTimePicker value={date} onChange={setDate} />
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-[#9AA1AC]">
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
          <div className="flex flex-col gap-1 text-[11px] text-[#9AA1AC]">
            Session
            <SelectField
              value={session}
              onChange={(v) => {
                sessionTouched.current = true;
                setSession(v);
              }}
              options={SESSION_OPTIONS.map((s) => ({ value: s, label: sessionLabel(s) }))}
            />
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-[#9AA1AC]">
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
          <label className="flex flex-col gap-1 text-[11px] text-[#9AA1AC]">
            P&L ($)
            <span className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px]"
                style={{ color: sign > 0 ? "#3ECF8E" : sign < 0 ? "#F0736F" : "#7A828D" }}
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
                style={{ color: sign > 0 ? "#3ECF8E" : sign < 0 ? "#F0736F" : "#ffffff" }}
                required
              />
            </span>
          </label>

          <label className="flex flex-col gap-1 text-[11px] text-[#9AA1AC]">
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

        <label className="flex flex-col gap-1 text-[11px] text-[#9AA1AC]">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Setup, execution, mistakes…"
            className="w-full rounded-control bg-white/6 p-3 text-[13px] text-white outline-none placeholder:text-[#7A828D] focus:ring-1 focus:ring-[#6E86F7]"
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


        <label className="flex flex-col gap-1 text-[11px] text-[#9AA1AC]">
          Improvement for next time
          <textarea
            value={improvement}
            onChange={(e) => setImprovement(e.target.value)}
            rows={2}
            placeholder="One concrete adjustment…"
            className="w-full rounded-control bg-white/6 p-3 text-[13px] text-white outline-none placeholder:text-[#7A828D] focus:ring-1 focus:ring-[#6E86F7]"
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
          className="flex flex-col gap-2 rounded-control p-2 transition-colors"
          style={{
            background: dragging ? "rgba(229,82,95,0.10)" : "rgba(255,255,255,0.06)",
            boxShadow: dragging ? "inset 0 0 0 1px rgba(229,82,95,0.6)" : "none",
          }}
        >
          {preview && (
            <div className="relative overflow-hidden rounded-control">
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
            <label className="hover-lift flex flex-1 cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-[12px] text-[#F0F2F5] hover:bg-white/8">
              <Upload className="size-4" />
              {file ? file.name : "Upload or drop a screenshot here"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[#7A828D]">
              <ClipboardPaste className="size-3.5" />
              or paste with Ctrl/Cmd + V
            </span>
          </div>
        </div>

        {error && <p className="text-[12px] text-[#F5928F]">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="hover-lift inline-flex h-11 items-center justify-center gap-2 rounded-control text-[14px] disabled:opacity-60"
          style={{ background: "#1C1F27", color: "#ffffff", fontWeight: 560, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} {editing ? "Save changes" : "Save trade"}
        </button>
      </form>
    </div>
  );
}
