import { useState } from "react";
import { DateTime } from "luxon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  addTradeComment,
  deleteTradeComment,
  fetchTradeComments,
} from "@/lib/comments";

/** Comment thread under a single trade — visible to the owner and shared buddies. */
export function TradeComments({
  tradeId,
  onChanged,
}: {
  tradeId: string;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const q = useQuery({
    queryKey: ["trade-comments", tradeId],
    queryFn: () => fetchTradeComments(tradeId),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trade-comments", tradeId] });
    qc.invalidateQueries({ queryKey: ["comment-counts"] });
    onChanged?.();
  };

  const add = useMutation({
    mutationFn: (body: string) => addTradeComment(tradeId, user!.id, body),
    onSuccess: () => {
      setDraft("");
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTradeComment(id),
    onSuccess: invalidate,
  });

  const comments = q.data ?? [];

  return (
    <div className="flex flex-col gap-2 border-t border-white/6 pt-3">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#6a7076]">
        <MessageSquare className="size-3" /> Comments {comments.length > 0 && `(${comments.length})`}
      </span>

      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2 rounded-lg bg-white/4 p-2.5">
          {c.author_avatar ? (
            <img
              src={c.author_avatar}
              alt=""
              className="size-6 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/8 text-[10px] text-[#8b9298]">
              {c.author_name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2 text-[10.5px] text-[#6a7076]">
              <span className="text-[#d7dbe0]">{c.author_name}</span>
              {DateTime.fromISO(c.created_at).toFormat("dd LLL · HH:mm")}
            </span>
            <p className="whitespace-pre-wrap break-words text-[12px] leading-[1.5] text-[#8b9298]">
              {c.body}
            </p>
          </div>
          {user?.id === c.user_id && (
            <button
              onClick={() => remove.mutate(c.id)}
              aria-label="Delete comment"
              className="shrink-0 text-[#6a7076] transition-colors hover:text-[#f08a93]"
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      ))}

      {comments.length === 0 && !q.isLoading && (
        <p className="text-[11.5px] text-[#6a7076]">No comments yet.</p>
      )}

      {user && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const body = draft.trim();
            if (!body || add.isPending) return;
            add.mutate(body);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={2}
            placeholder="Write a comment…"
            className="min-w-0 flex-1 resize-y rounded-lg bg-white/4 p-2.5 text-[12px] leading-[1.5] text-[#d7dbe0] outline-none placeholder:text-[#5c6268] focus:bg-white/6"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || add.isPending}
            className="hover-lift inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] disabled:opacity-40"
            style={{ background: "#6E86F7", color: "#ffffff", fontWeight: 560 }}
          >
            <Send className="size-3.5" /> Post
          </button>
        </form>
      )}
    </div>
  );
}
