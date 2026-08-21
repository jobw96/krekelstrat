import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps the journal in sync while it is open.
 *
 * Your own edits already refresh through the save callback, but nothing told
 * the page about writes from elsewhere: a buddy adding to a shared journal, or
 * the same journal open on a phone. Postgres pushes those changes over the
 * realtime publication and we refetch on the back of them.
 *
 * The subscription is filtered to one journal, so viewing a buddy's book does
 * not wake you up for your own trades and the other way round. Realtime still
 * applies row-level security per subscriber, so this cannot surface trades the
 * viewer is not allowed to read.
 */
export function useLiveTrades(ownerId: string | undefined) {
  const qc = useQueryClient();
  const pending = useRef<number | null>(null);

  useEffect(() => {
    if (!ownerId) return;

    // Importing a session fires an insert per trade. Without a trailing wait
    // that is one refetch each; with it, one refetch for the batch.
    const refresh = () => {
      if (pending.current) window.clearTimeout(pending.current);
      pending.current = window.setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ["trades", ownerId] });
        // Derived views that read the same rows under a different key.
        void qc.invalidateQueries({ queryKey: ["trades-by-prop-account"] });
        void qc.invalidateQueries({ queryKey: ["comment-counts"] });
      }, 300);
    };

    const channel = supabase
      .channel(`trades:${ownerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${ownerId}` },
        refresh,
      )
      .subscribe();

    return () => {
      if (pending.current) window.clearTimeout(pending.current);
      void supabase.removeChannel(channel);
    };
  }, [ownerId, qc]);
}
