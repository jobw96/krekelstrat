import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Krekelstrat Trading Journal" },
      {
        name: "description",
        content:
          "Sign in or create an account to view your private MNQ trading journal, P&L calendar and strategy statistics.",
      },
      { property: "og:title", content: "Sign in — Krekelstrat Trading Journal" },
      {
        property: "og:description",
        content: "Access your private trading journal with P&L calendar and strategy analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, isGuest, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // A guest (anonymous) session must not count as signed in, otherwise this
    // page bounces back and a real account can never be used.
    if (!loading && session && !isGuest) navigate({ to: "/journal", search: { view: "trades" } });
  }, [loading, session, isGuest, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/journal` },
        });
        if (error) throw error;
        setMsg("Account created. Check your inbox if confirmation is required.");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMsg("Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/journal", search: { view: "trades" } });
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[#8b9298] transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> Back to terminal
        </Link>
        <div className="card-surface flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
              {mode === "login" ? "Sign in" : "Create account"}
            </h1>
            <p className="text-[13px] text-[#8b9298]">
              Your trading journal is private — only you can see your trades.
            </p>
          </div>

          <button
            onClick={google}
            disabled={busy}
            className="hover-lift flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/8 text-[14px] text-white hover:bg-white/12 disabled:opacity-60"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-[11px] text-[#6a7076]">
            <span className="h-px flex-1 bg-white/10" /> or email{" "}
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="h-11 rounded-2xl bg-white/6 px-4 text-[14px] text-white outline-none placeholder:text-[#6a7076] focus:ring-1 focus:ring-[#e5525f]"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-11 rounded-2xl bg-white/6 px-4 text-[14px] text-white outline-none placeholder:text-[#6a7076] focus:ring-1 focus:ring-[#e5525f]"
            />
            <button
              type="submit"
              disabled={busy}
              className="hover-lift inline-flex h-11 items-center justify-center gap-2 rounded-2xl text-[14px] disabled:opacity-60"
              style={{ background: "#20242a", color: "#ffffff", fontWeight: 560, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Sign up"}
            </button>
          </form>

          {msg && <p className="text-[12px] text-[#f08a93]">{msg}</p>}

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-[12px] text-[#8b9298] hover:text-white"
          >
            {mode === "login"
              ? "No account yet? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
