import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Current auth session, kept in sync with Lovable Cloud auth state. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (cancelled) return;
      if (!s) {
        // Temporary: guest access while the site is not live yet.
        const { data: anon } = await supabase.auth.signInAnonymously();
        if (cancelled) return;
        setSession(anon.session ?? null);
      } else {
        setSession(s);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const user: User | null = session?.user ?? null;
  const isGuest = !!user && (user.is_anonymous ?? false);
  return { session, user, isGuest, loading, signOut: () => supabase.auth.signOut() };

}
