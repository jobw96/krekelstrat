import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CandlestickChart, Landmark, Newspaper, NotebookPen, UserRound } from "lucide-react";
import sjakAsset from "@/assets/sjak.png.asset.json";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/lib/profile";
import { useRedFolder } from "@/hooks/useRedFolder";

const RAIL_ITEMS = [
  { icon: CandlestickChart, label: "Sessions", to: "/" as const, search: undefined },
  { icon: NotebookPen, label: "Journal", to: "/journal" as const, search: undefined },
  { icon: Newspaper, label: "News", to: "/news" as const, search: undefined },
  { icon: Landmark, label: "Prop Firms", to: "/prop-firms" as const, search: undefined },
];

export function AppRail() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isGuest } = useAuth();
  const { data } = useProfile(isGuest ? undefined : user?.id);
  const [imgFailed, setImgFailed] = useState(false);
  const { data: redFolder } = useRedFolder();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Glow from 30 minutes before a red-folder release until 10 minutes after it.
  const upcoming = (redFolder?.events ?? []).find(
    (e) => e.time - now <= 30 * 60_000 && e.time + 10 * 60_000 >= now,
  );
  const minutesToNews = upcoming ? Math.max(0, Math.round((upcoming.time - now) / 60_000)) : null;

  const displayName = data?.profile?.display_name?.trim() || "NQ/MNQ";
  const avatarSrc = !imgFailed ? (data?.avatarUrl ?? sjakAsset.url) : sjakAsset.url;
  const profileActive = pathname.startsWith("/profile");

  return (
    <>
    <aside className="chrome-surface fixed inset-y-0 left-0 z-40 hidden h-screen w-[76px] shrink-0 flex-col items-center gap-2 rounded-none border-y-0 border-l-0 pb-6 pt-[calc(env(safe-area-inset-top)+24px)] lg:flex">
      <div className="group relative mb-4 flex flex-col items-center gap-1.5">
        <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-full p-[2px]">
          <div
            className="absolute -inset-[100%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0%,var(--color-primary)_15%,transparent_30%,transparent_50%,var(--color-primary)_65%,transparent_80%,transparent_100%)] opacity-60 transition-opacity duration-500 group-hover:opacity-100"
            aria-hidden="true"
          />
          <div className="absolute inset-[2px] z-10 rounded-full bg-[#121317]" />
          <img
            src={avatarSrc}
            onError={() => setImgFailed(true)}
            alt="Profielfoto"
            className="relative z-20 size-10 rounded-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 z-30 rounded-full border border-[var(--color-primary)]/20" />
        </div>
        <span className="max-w-[68px] truncate text-center text-[10px] tracking-[0.06em] text-[#7A828D]">
          {displayName}
        </span>
      </div>
      {RAIL_ITEMS.map(({ icon: Icon, label, to, search }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        const alerting = label === "News" && !!upcoming;
        return (
          <Link
            key={label}
            to={to}
            search={search ?? {}}
            title={
              alerting && upcoming
                ? `${upcoming.title} — ${minutesToNews === 0 ? "nu" : `over ${minutesToNews}m`}`
                : label
            }
            aria-label={label}
            className={`group relative flex size-11 items-center justify-center rounded-2xl transition-all duration-200 hover:bg-white/[0.07] ${alerting ? "news-alert" : ""}`}
            style={active ? { background: "rgba(255,255,255,0.08)" } : { background: "transparent" }}
          >
            <Icon
              className={`size-[18px] transition-colors duration-200 ${alerting ? "text-[#F5928F]" : active ? "text-white" : "text-[#7A828D] group-hover:text-[#F0F2F5]"}`}
              strokeWidth={1.6}
            />
            {alerting && (
              <span className="absolute -right-0.5 -top-0.5 rounded-control bg-[#6E86F7] px-1 py-px font-mono text-[8px] leading-none text-white">
                {minutesToNews}
              </span>
            )}
            {active && (
              <span className="absolute -left-[13px] h-6 w-[3px] rounded-full bg-[#6E86F7]" />
            )}
          </Link>
        );
      })}

      <Link
        to="/profile"
        title="Profile"
        aria-label="Profile"
        className="group relative mt-auto flex size-11 items-center justify-center rounded-2xl transition-all duration-200 hover:bg-white/[0.07]"
        style={profileActive ? { background: "rgba(255,255,255,0.08)" } : { background: "transparent" }}
      >
        <UserRound
          className={`size-[18px] transition-colors duration-200 ${profileActive ? "text-white" : "text-[#7A828D] group-hover:text-[#F0F2F5]"}`}
          strokeWidth={1.6}
        />
        {profileActive && (
          <span className="absolute -left-[13px] h-6 w-[3px] rounded-full bg-[#6E86F7]" />
        )}
      </Link>
    </aside>

    {/* Mobile bottom navigation */}
    <nav className="chrome-surface fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-1 rounded-none border-x-0 border-b-0 px-2 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-2 lg:hidden">
      {[...RAIL_ITEMS, { icon: UserRound, label: "Profile", to: "/profile" as const, search: undefined }].map(
        ({ icon: Icon, label, to, search }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const alerting = label === "News" && !!upcoming;
          return (
            <Link
              key={label}
              to={to}
              search={search ?? {}}
              aria-label={label}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-control px-1 py-1.5"
              style={active ? { background: "rgba(255,255,255,0.07)" } : undefined}
            >
              <Icon
                className={`size-[18px] shrink-0 ${alerting ? "text-[#F5928F]" : active ? "text-white" : "text-[#7A828D]"}`}
                strokeWidth={1.6}
              />
              <span
                className={`max-w-full truncate text-[9px] tracking-[0.05em] ${active ? "text-[#F0F2F5]" : "text-[#7A828D]"}`}
              >
                {label}
              </span>
            </Link>
          );
        },
      )}
    </nav>
    </>
  );
}
