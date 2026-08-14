import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name: z
    .string()
    .trim()
    .nonempty({ message: "Name cannot be empty" })
    .max(80, { message: "Name must be less than 80 characters" }),
  description: z
    .string()
    .trim()
    .max(600, { message: "Description must be less than 600 characters" }),
});

export function StrategyDialog({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name, description });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: dbError } = await supabase.from("strategies").insert({
      user_id: userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
    });
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
        className="card-surface dialog-enter flex w-full max-w-[480px] flex-col gap-3.5 p-5"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-[17px] text-white" style={{ fontWeight: 560 }}>
            New strategy
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

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] uppercase tracking-[0.08em] text-[#7A828D]">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoFocus
            placeholder="e.g. LO Reversion"
            className="rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder:text-[#454B55] focus:border-[#6E86F7]/60 focus:bg-white/6"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] uppercase tracking-[0.08em] text-[#7A828D]">
            Description / rules
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={600}
            rows={5}
            placeholder="Entry criteria, session, invalidation, target…"
            className="resize-y rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-[13.5px] leading-relaxed text-white outline-none transition-colors placeholder:text-[#454B55] focus:border-[#6E86F7]/60 focus:bg-white/6"
          />
          <span className="self-end text-[11px] text-[#454B55]">{description.length}/600</span>
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
            {busy && <Loader2 className="size-4 animate-spin" />} Save strategy
          </button>
        </div>
      </form>
    </div>
  );
}
