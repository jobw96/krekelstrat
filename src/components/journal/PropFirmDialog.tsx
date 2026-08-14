import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { SelectField } from "@/components/journal/SelectField";

import {
  ACCOUNT_SIZES,
  PROP_FIRMS,
  STATUS_LABEL,
  type PropAccount,
  type PropPhase,
  type PropStatus,
} from "@/lib/prop";

const schema = z.object({
  firm: z.string().trim().nonempty({ message: "Choose a prop firm" }).max(60),
  cost: z.number().min(0, { message: "Cost cannot be negative" }),
  activation_fee: z.number().min(0),
  payout_total: z.number().min(0),
});

const field =
  "rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder:text-[#454B55] focus:border-[#6E86F7]/60 focus:bg-white/6";
const label = "text-[11.5px] uppercase tracking-[0.08em] text-[#7A828D]";

/** Create / edit a prop firm evaluation or funded account. */
export function PropFirmDialog({
  userId,
  account,
  onClose,
  onSaved,
}: {
  userId: string;
  account?: PropAccount | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firm, setFirm] = useState(account?.firm ?? PROP_FIRMS[0]!.name);
  const [customFirm, setCustomFirm] = useState(
    account && !PROP_FIRMS.some((f) => f.name === account.firm) ? account.firm : "",
  );
  const [size, setSize] = useState(String(account?.account_size ?? 50000));
  const [phase, setPhase] = useState<PropPhase>(account?.phase ?? "evaluation");
  const [status, setStatus] = useState<PropStatus>(account?.status ?? "in_progress");
  const [cost, setCost] = useState(String(account?.cost ?? ""));
  const [activation, setActivation] = useState(String(account?.activation_fee ?? ""));
  const [payout, setPayout] = useState(String(account?.payout_total ?? ""));
  const [date, setDate] = useState(
    (account?.started_at ?? new Date().toISOString()).slice(0, 10),
  );
  const [customLabel, setCustomLabel] = useState(account?.label ?? "");
  const [notes, setNotes] = useState(account?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isCustom = firm === "__other";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      firm: isCustom ? customFirm : firm,
      cost: Number(cost || 0),
      activation_fee: Number(activation || 0),
      payout_total: Number(payout || 0),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    setError(null);

    const payload = {
      user_id: userId,
      firm: parsed.data.firm,
      label: customLabel.trim() || null,
      account_size: Number(size) || null,
      phase,
      status,
      cost: parsed.data.cost,
      activation_fee: parsed.data.activation_fee,
      payout_total: parsed.data.payout_total,
      started_at: new Date(`${date}T12:00:00`).toISOString(),
      passed_at:
        status === "passed" || status === "payout" ? (account?.passed_at ?? new Date().toISOString()) : null,
      breached_at: status === "breached" ? (account?.breached_at ?? new Date().toISOString()) : null,
      notes: notes.trim() || null,
    };

    const { error: dbError } = account
      ? await supabase.from("prop_accounts").update(payload).eq("id", account.id)
      : await supabase.from("prop_accounts").insert(payload);

    setBusy(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <form
        onSubmit={save}
        className="card-surface dialog-enter flex max-h-[92vh] w-full max-w-[540px] flex-col gap-3.5 overflow-y-auto p-5"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-[17px] text-white" style={{ fontWeight: 560 }}>
            {account ? "Edit account" : "New prop account"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hover-lift rounded-full bg-white/6 p-1.5 text-[#9AA1AC]"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className={label}>Prop firm</span>
            <SelectField
              label="Prop firm"
              value={firm}
              onChange={setFirm}
              options={[
                ...PROP_FIRMS.map((f) => ({ value: f.name, label: f.name })),
                { value: "__other", label: "Other…" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={label}>Account size</span>
            <SelectField
              label="Account size"
              value={size}
              onChange={setSize}
              options={ACCOUNT_SIZES.map((s) => ({
                value: String(s),
                label: `$${(s / 1000).toFixed(0)}K`,
              }))}
            />
          </div>
        </div>

        {isCustom && (
          <label className="flex flex-col gap-1.5">
            <span className={label}>Firm name</span>
            <input
              value={customFirm}
              onChange={(e) => setCustomFirm(e.target.value)}
              maxLength={60}
              placeholder="e.g. Take Profit Trader"
              className={field}
            />
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className={label}>Phase</span>
            <SelectField
              label="Phase"
              value={phase}
              onChange={(v) => setPhase(v as PropPhase)}
              options={[
                { value: "evaluation", label: "Evaluation" },
                { value: "funded", label: "Funded" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={label}>Status</span>
            <SelectField
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as PropStatus)}
              options={(Object.keys(STATUS_LABEL) as PropStatus[]).map((s) => ({
                value: s,
                label: STATUS_LABEL[s],
              }))}
            />
          </div>
        </div>


        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Eval cost $</span>
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              inputMode="decimal"
              placeholder="149"
              className={`${field} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Activation $</span>
            <input
              value={activation}
              onChange={(e) => setActivation(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className={`${field} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Payouts $</span>
            <input
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className={`${field} font-mono`}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Purchase date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${field} font-mono`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Account name (optional)</span>
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            maxLength={60}
            placeholder={isCustom ? customFirm || "Custom name" : `${firm} — leave empty for default`}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="Rules, drawdown type, discount code…"
            className={`${field} resize-y leading-relaxed`}
          />
        </label>

        {error && <p className="text-[12px] text-[#F5928F]">{error}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="hover-lift rounded-full bg-white/6 px-4 py-2 text-[13px] text-[#F0F2F5]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="hover-lift inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px]"
            style={{ background: "#6E86F7", color: "#ffffff", fontWeight: 560 }}
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Save account
          </button>
        </div>
      </form>
    </div>
  );
}
