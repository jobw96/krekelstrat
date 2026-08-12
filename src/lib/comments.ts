import { supabase } from "@/integrations/supabase/client";

export type TradeComment = {
  id: string;
  trade_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
};

type Row = {
  id: string;
  trade_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

async function withAuthors(rows: Row[]): Promise<TradeComment[]> {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const map = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (ids.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    for (const p of data ?? []) {
      map.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
    }
  }
  return rows.map((r) => ({
    ...r,
    author_name: map.get(r.user_id)?.display_name || "Trader",
    author_avatar: map.get(r.user_id)?.avatar_url ?? null,
  }));
}

/** All comments on one trade, oldest first. */
export async function fetchTradeComments(tradeId: string): Promise<TradeComment[]> {
  const { data, error } = await supabase
    .from("trade_comments")
    .select("id, trade_id, user_id, body, created_at")
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return withAuthors((data ?? []) as Row[]);
}

/** Comment counts keyed by trade id, for a set of trades. */
export async function fetchCommentCounts(tradeIds: string[]): Promise<Record<string, number>> {
  if (tradeIds.length === 0) return {};
  const counts: Record<string, number> = {};
  for (let i = 0; i < tradeIds.length; i += 200) {
    const chunk = tradeIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from("trade_comments")
      .select("trade_id")
      .in("trade_id", chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      counts[row.trade_id] = (counts[row.trade_id] ?? 0) + 1;
    }
  }
  return counts;
}

export async function addTradeComment(tradeId: string, userId: string, body: string) {
  const { error } = await supabase
    .from("trade_comments")
    .insert({ trade_id: tradeId, user_id: userId, body });
  if (error) throw error;
}

export async function deleteTradeComment(id: string) {
  const { error } = await supabase.from("trade_comments").delete().eq("id", id);
  if (error) throw error;
}
