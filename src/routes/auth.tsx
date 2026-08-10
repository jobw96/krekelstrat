import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Inloggen — Krekelstrat Trading Journal" },
      {
        name: "description",
        content:
          "Log in of maak een account om je persoonlijke MNQ trading journal, P&L kalender en strategie-statistieken te bekijken.",
      },
      { property: "og:title", content: "Inloggen — Krekelstrat Trading Journal" },
      {
        property: "og:description",
        content: "Toegang tot je private trading journal met P&L kalender en strategie-analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/journal" });
  }, [loading, session, navigate]);

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
        setMsg("Account aangemaakt. Check je mail als bevestiging vereist is.");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Er ging iets mis");
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
      setMsg("Google login mislukt");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/journal" });
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[#93a9b6] hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> Terug naar terminal
        </Link>
        <div className="card-surface flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
              {mode === "login" ? "Inloggen" : "Account aanmaken"}
            </h1>
            <p className="text-[13px] text-[#93a9b6]">
              Je trading journal is privé — alleen jij ziet je trades.
            </p>
          </div>

          <button
            onClick={google}
            disabled={busy}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/8 text-[14px] text-white transition-colors hover:bg-white/12 disabled:opacity-60"
          >
            Doorgaan met Google
          </button>

          <div className="flex items-center gap-3 text-[11px] text-[#6b8592]">
            <span className="h-px flex-1 bg-white/10" /> of e-mail{" "}
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jij@email.com"
              className="h-11 rounded-2xl bg-white/6 px-4 text-[14px] text-white outline-none placeholder:text-[#6b8592] focus:ring-1 focus:ring-[#5ec8f5]"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wachtwoord"
              className="h-11 rounded-2xl bg-white/6 px-4 text-[14px] text-white outline-none placeholder:text-[#6b8592] focus:ring-1 focus:ring-[#5ec8f5]"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl text-[14px] disabled:opacity-60"
              style={{ background: "#5ec8f5", color: "#061017", fontWeight: 560 }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Inloggen" : "Registreren"}
            </button>
          </form>

          {msg && <p className="text-[12px] text-[#ff8f9b]">{msg}</p>}

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-[12px] text-[#93a9b6] hover:text-white"
          >
            {mode === "login"
              ? "Nog geen account? Registreren"
              : "Heb je al een account? Inloggen"}
          </button>
        </div>
      </div>
    </main>
  );
}
