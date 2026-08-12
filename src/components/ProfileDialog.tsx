import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { z } from "zod";

import { saveProfile, uploadAvatar, useInvalidateProfile } from "@/lib/profile";

const schema = z.object({
  display_name: z
    .string()
    .trim()
    .max(40, { message: "Naam mag maximaal 40 tekens zijn" }),
});

const MAX_BYTES = 4 * 1024 * 1024;

export function ProfileDialog({
  userId,
  initialName,
  initialAvatarUrl,
  onClose,
}: {
  userId: string;
  initialName: string;
  initialAvatarUrl: string | null;
  onClose: () => void;
}) {
  const invalidate = useInvalidateProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Kies een afbeelding");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Afbeelding mag maximaal 4 MB zijn");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ display_name: name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ongeldige invoer");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const avatarPath = file ? await uploadAvatar(userId, file) : undefined;
      await saveProfile(userId, {
        display_name: parsed.data.display_name || null,
        ...(avatarPath ? { avatar_url: avatarPath } : {}),
      });
      await invalidate(userId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <form
        onSubmit={save}
        className="card-surface dialog-enter flex w-full max-w-[420px] flex-col gap-4 p-5"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-[17px] text-white" style={{ fontWeight: 560 }}>
            Profiel bewerken
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="hover-lift rounded-full bg-white/6 p-1.5 text-[#8b9298]"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative size-16 shrink-0 overflow-hidden rounded-full border border-white/12 bg-white/6"
            aria-label="Profielfoto kiezen"
          >
            {preview ? (
              <img src={preview} alt="Profielfoto voorbeeld" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-[18px] text-[#8b9298]">
                {(name.trim()[0] ?? "?").toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-5 text-white" />
            </span>
          </button>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="hover-lift self-start rounded-full bg-white/6 px-3 py-1.5 text-[12.5px] text-[#d7dbe0]"
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
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
            placeholder="Jouw naam"
            className="rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder:text-[#565c62] focus:border-[#e5525f]/60 focus:bg-white/6"
          />
        </label>

        {error && <p className="text-[12px] text-[#f08a93]">{error}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="hover-lift rounded-full bg-white/6 px-4 py-2 text-[13px] text-[#d7dbe0]"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={busy}
            className="hover-lift inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] disabled:opacity-60"
            style={{ background: "#e5525f", color: "#ffffff", fontWeight: 560 }}
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Opslaan
          </button>
        </div>
      </form>
    </div>
  );
}
