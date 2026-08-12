import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, Loader2, LogOut, UserRound } from "lucide-react";
import { z } from "zod";

import { useAuth } from "@/hooks/useAuth";
import { useTzPref, type TzPref } from "@/hooks/useTzPref";
import { saveProfile, uploadAvatar, useInvalidateProfile, useProfile } from "@/lib/profile";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — Krekelstrat Terminal" },
      {
        name: "description",
        content:
          "Manage your trader profile: display name, profile photo and preferred session timezone for the Krekelstrat trading terminal.",
      },
      { property: "og:title", content: "Profile & Settings — Krekelstrat Terminal" },
      {
        property: "og:description",
        content: "Set your display name, profile photo and preferred session timezone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  display_name: z.string().trim().max(40, { message: "Naam mag maximaal 40 tekens zijn" }),
});

const MAX_BYTES = 4 * 1024 * 1024;

const TZ_OPTIONS: { value: TzPref; label: string; hint: string }[] = [
  { value: "NY", label: "New York", hint: "12-uurs klok (AM/PM) · marktstandaard" },
  { value: "AMS", label: "Amsterdam", hint: "24-uurs klok · lokale tijd" },
];

function ProfilePage() {
  const { user, isGuest, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { tz, setTz } = useTzPref();
  const canEdit = !!user && !isGuest;
  const { data } = useProfile(canEdit ? user.id : undefined);
  const invalidate = useInvalidateProfile();

  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.profile?.display_name != null) setName(data.profile.display_name);
  }, [data?.profile?.display_name]);

  const shownAvatar = preview ?? data?.avatarUrl ?? null;

  function pick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Kies een afbeelding");
    if (f.size > MAX_BYTES) return setError("Afbeelding mag maximaal 4 MB zijn");
    setError(null);
    setSaved(false);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const parsed = schema.safeParse({ display_name: name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ongeldige invoer");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const avatarPath = file ? await uploadAvatar(user.id, file) : undefined;
      await saveProfile(user.id, {
        display_name: parsed.data.display_name || null,
        ...(avatarPath ? { avatar_url: avatarPath } : {}),
      });
      await invalidate(user.id);
      setFile(null);
      setPreview(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 pb-10">
      <header className="flex items-center gap-2">
        <UserRound className="size-4 text-[#5ec8f5]" strokeWidth={1.6} />
        <h1 className="text-[18px] text-white" style={{ fontWeight: 560 }}>
          Profile &amp; Settings
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <form onSubmit={save} className="card-surface flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] text-white" style={{ fontWeight: 560 }}>
              Trader profiel
            </h2>
            <p className="text-[12.5px] text-[#8b9298]">
              Naam en foto worden getoond in de sidebar en bij gedeelde journals.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!canEdit}
              aria-label="Profielfoto kiezen"
              className="group relative size-[72px] shrink-0 overflow-hidden rounded-full border border-white/12 bg-white/6 disabled:cursor-default"
            >
              {shownAvatar ? (
                <img src={shownAvatar} alt="Profielfoto" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-[20px] text-[#8b9298]">
                  {(name.trim()[0] ?? "?").toUpperCase()}
                </span>
              )}
              {canEdit && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="size-5 text-white" />
                </span>
              )}
            </button>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!canEdit}
                className="hover-lift self-start rounded-full bg-white/6 px-3 py-1.5 text-[12.5px] text-[#d7dbe0] disabled:opacity-50"
              >
                Foto uploaden
              </button>
              <span className="text-[11px] text-[#6a7076]">PNG of JPG, max 4 MB</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] uppercase tracking-[0.08em] text-[#6a7076]">Naam</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              maxLength={40}
              disabled={!canEdit}
              placeholder="Jouw naam"
              className="rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder:text-[#565c62] focus:border-[#e5525f]/60 focus:bg-white/6 disabled:opacity-60"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11.5px] uppercase tracking-[0.08em] text-[#6a7076]">Account</span>
            <span className="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 text-[13px] text-[#8b9298]">
              {loading ? "…" : canEdit ? user.email : "Guest mode · niet ingelogd"}
            </span>
          </div>

          {error && <p className="text-[12px] text-[#f08a93]">{error}</p>}
          {saved && !error && <p className="text-[12px] text-[#78d6a3]">Profiel opgeslagen.</p>}

          <div className="mt-1 flex items-center justify-between gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/auth" });
                }}
                className="hover-lift inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3.5 py-2 text-[13px] text-[#d7dbe0]"
              >
                <LogOut className="size-3.5" /> Uitloggen
              </button>
            ) : (
              <Link
                to="/auth"
                className="hover-lift inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3.5 py-2 text-[13px] text-[#d7dbe0]"
              >
                Inloggen
              </Link>
            )}
            <button
              type="submit"
              disabled={busy || !canEdit}
              className="hover-lift inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] disabled:opacity-60"
              style={{ background: "#e5525f", color: "#ffffff", fontWeight: 560 }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Opslaan
            </button>
          </div>
        </form>

        <section className="card-surface flex h-fit flex-col gap-3 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] text-white" style={{ fontWeight: 560 }}>
              Tijdzone
            </h2>
            <p className="text-[12.5px] text-[#8b9298]">
              Bepaalt hoe sessietijden op het dashboard worden getoond.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {TZ_OPTIONS.map((opt) => {
              const active = tz === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTz(opt.value)}
                  aria-pressed={active}
                  className="flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
                  style={{
                    borderColor: active ? "rgba(229,82,95,0.55)" : "rgba(255,255,255,0.08)",
                    background: active ? "rgba(229,82,95,0.10)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[13.5px] text-white">{opt.label}</span>
                    <span className="text-[11.5px] text-[#8b9298]">{opt.hint}</span>
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.08em] text-[#8b9298]">
                    {opt.value}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
