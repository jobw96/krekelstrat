import { Link, useRouterState } from "@tanstack/react-router";
import { CandlestickChart, Landmark, Newspaper, NotebookPen } from "lucide-react";
import sjakAsset from "@/assets/sjak.png.asset.json";

const RAIL_ITEMS = [
  { icon: CandlestickChart, label: "Sessions", to: "/" as const, search: undefined },
  { icon: NotebookPen, label: "Journal", to: "/journal" as const, search: undefined },
  { icon: Newspaper, label: "News", to: "/news" as const, search: undefined },
  { icon: Landmark, label: "Prop Firms", to: "/prop-firms" as const, search: undefined },
];

export function AppRail() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="card-surface sticky top-5 hidden h-[calc(100vh-40px)] w-[76px] shrink-0 flex-col items-center gap-2 self-start py-6 lg:flex">
      <div className="group relative mb-4 flex flex-col items-center gap-1.5">
        <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-full p-[2px]">
          <div
            className="absolute -inset-[100%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0%,var(--color-primary)_15%,transparent_30%,transparent_50%,var(--color-primary)_65%,transparent_80%,transparent_100%)] opacity-60 transition-opacity duration-500 group-hover:opacity-100"
            aria-hidden="true"
          />
          <div className="absolute inset-[2px] z-10 rounded-full bg-[#0f1216]" />
          <img
            src={sjakAsset.url}
            alt="Krekelstrat Terminal profile photo"
            className="relative z-20 size-10 rounded-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 z-30 rounded-full border border-[var(--color-primary)]/20" />
        </div>
        <span className="text-[10px] tracking-[0.06em] text-[#6a7076]">NQ/MNQ</span>
      </div>
      {RAIL_ITEMS.map(({ icon: Icon, label, to, search }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={label}
            to={to}
            search={search ?? {}}
            title={label}
            aria-label={label}
            className="group relative flex size-11 items-center justify-center rounded-2xl transition-all duration-200 hover:bg-white/[0.07]"
            style={active ? { background: "rgba(255,255,255,0.08)" } : { background: "transparent" }}
          >
            <Icon
              className={`size-[18px] transition-colors duration-200 ${active ? "text-white" : "text-[#6a7076] group-hover:text-[#d7dbe0]"}`}
              strokeWidth={1.6}
            />
            {active && (
              <span className="absolute -left-[13px] h-6 w-[3px] rounded-full bg-[#e5525f]" />
            )}
          </Link>
        );
      })}
    </aside>
  );
}

