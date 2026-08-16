import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Loader2, Mail, Trash2, X } from "lucide-react";
import {
  buddyLabel,
  fetchShares,
  inviteBuddy,
  revokeShare,
  setShareMasking,
  setShareStatus,
  type JournalShare,
} from "@/lib/shares";
import { useLockScroll } from "@/hooks/useLockScroll";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[10px] uppercase tracking-[0.12em] text-[#7A828D]">{title}</h3>
      {children}
    </section>
  );
}

/** Manage trading-buddy access to your journal: invites, privacy and revoking. */
export function ShareJournalDialog({
  userId,
  userEmail,
  onClose,
}: {
  userId: string;
  userEmail: string | null;
  onClose: () => void;
}) {
  useLockScroll();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [hide, setHide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sharesQ = useQuery({ queryKey: ["journal-shares", userId], queryFn: fetchShares });
  const shares = sharesQ.data ?? [];
  const outgoing = shares.filter((s) => s.owner_id === userId);
  const incoming = shares.filter((s) => s.owner_id !== userId);

  const done = () => qc.invalidateQueries({ queryKey: ["journal-shares", userId] });

  const invite = useMutation({
    mutationFn: () =>
      inviteBuddy({ ownerId: userId, ownerEmail: userEmail, email, hideDollarAmounts: hide }),
    onSuccess: () => {
      setEmail("");
      setError(null);
      done();
    },
    onError: (e: { message?: string }) =>
      setError(e?.message?.includes("duplicate") ? "This buddy has already been invited." : "Invite failed."),
  });

  const revoke = useMutation({ mutationFn: revokeShare, onSuccess: done });
  const respond = useMutation({
    mutationFn: (v: { id: string; status: "accepted" | "declined" }) =>
      setShareStatus(v.id, v.status),
    onSuccess: done,
  });
  const mask = useMutation({
    mutationFn: (v: { id: string; hide: boolean }) => setShareMasking(v.id, v.hide),
    onSuccess: done,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card-surface mt-10 flex w-full max-w-[520px] flex-col gap-5 p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-[15px] text-white" style={{ fontWeight: 560 }}>
            Share journal
          </h2>
          <button onClick={onClose} className="hover-lift rounded-control bg-white/6 p-1.5 text-[#9AA1AC]">
            <X className="size-4" />
          </button>
        </header>

        <Section title="Invite a trading buddy">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="glass-inset flex min-w-0 flex-1 items-center gap-2 px-3">
                <Mail className="size-3.5 shrink-0 text-[#7A828D]" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="buddy@email.com"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-[12.5px] text-white outline-none placeholder:text-[#7A828D]"
                />
              </div>
              <button
                disabled={!isEmail(email) || invite.isPending}
                onClick={() => invite.mutate()}
                className="hover-lift inline-flex shrink-0 items-center gap-1.5 rounded-control px-3.5 py-2 text-[12.5px] disabled:opacity-40"
                style={{ background: "#6E86F7", color: "#fff", fontWeight: 560 }}
              >
                {invite.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null} Send invite
              </button>
            </div>
            <button
              onClick={() => setHide((h) => !h)}
              className="hover-tint flex items-center justify-between rounded-control bg-white/4 px-3 py-2.5 text-left"
            >
              <span className="flex flex-col">
                <span className="text-[12.5px] text-[#F0F2F5]">Hide dollar amounts ($)</span>
                <span className="text-[11px] text-[#7A828D]">Show only R-multiple & win rate %</span>
              </span>
              <span
                className="relative h-[20px] w-[36px] shrink-0 rounded-full transition-colors"
                style={{ background: hide ? "#F0736F" : "rgba(255,255,255,0.14)" }}
              >
                <span
                  className="absolute top-[2px] size-[16px] rounded-full bg-white transition-all"
                  style={{ left: hide ? 18 : 2 }}
                />
              </span>
            </button>
            {error && <p className="text-[11.5px] text-[#F0736F]">{error}</p>}
          </div>
        </Section>

        <Section title="Shared with">
          {outgoing.length === 0 && (
            <p className="rounded-control bg-white/4 px-3 py-3 text-[12px] text-[#7A828D]">
              No buddies invited yet.
            </p>
          )}
          {outgoing.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-control bg-white/4 px-3 py-2.5">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[12.5px] text-white">{s.shared_with_email}</span>
                <span className="text-[11px] text-[#7A828D]">
                  {s.status === "accepted" ? "Accepted" : s.status === "declined" ? "Declined" : "Pending"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => mask.mutate({ id: s.id, hide: !s.hide_dollar_amounts })}
                  title={s.hide_dollar_amounts ? "Dollar amounts hidden" : "Dollar amounts visible"}
                  className="hover-lift rounded-control bg-white/6 p-1.5 text-[#9AA1AC]"
                >
                  {s.hide_dollar_amounts ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
                <button
                  onClick={() => revoke.mutate(s.id)}
                  title="Revoke access"
                  className="hover-lift rounded-control bg-white/6 p-1.5 text-[#F0736F]"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </div>
          ))}
        </Section>

        <Section title="Invitations for you">
          {incoming.length === 0 && (
            <p className="rounded-control bg-white/4 px-3 py-3 text-[12px] text-[#7A828D]">
              No invitations.
            </p>
          )}
          {incoming.map((s: JournalShare) => (
            <div key={s.id} className="flex items-center justify-between rounded-control bg-white/4 px-3 py-2.5">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[12.5px] text-white">{buddyLabel(s)}</span>
                <span className="text-[11px] text-[#7A828D]">
                  {s.status === "accepted" ? "Read-only access active" : s.status === "declined" ? "Declined" : "Pending invite"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {s.status !== "accepted" && (
                  <button
                    onClick={() => respond.mutate({ id: s.id, status: "accepted" })}
                    className="hover-lift inline-flex items-center gap-1 rounded-control bg-white/6 px-2.5 py-1.5 text-[11.5px] text-[#3ECF8E]"
                  >
                    <Check className="size-3.5" /> Accept
                  </button>
                )}
                {s.status !== "declined" && (
                  <button
                    onClick={() => respond.mutate({ id: s.id, status: "declined" })}
                    className="hover-lift inline-flex items-center gap-1 rounded-control bg-white/6 px-2.5 py-1.5 text-[11.5px] text-[#F0736F]"
                  >
                    <X className="size-3.5" /> Decline
                  </button>
                )}
              </span>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}
