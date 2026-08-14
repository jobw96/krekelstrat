import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListOrdered,
  PieChart,
  Plus,
  Target,
} from "lucide-react";

export type JournalView =
  | "dashboard"
  | "day"
  | "trades"
  | "reports"
  | "strategies";

const ITEMS: { id: JournalView; label: string; icon: typeof LayoutGrid }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "day", label: "Day View", icon: CalendarDays },
  { id: "trades", label: "Trade Log", icon: ListOrdered },
  { id: "reports", label: "Reports", icon: PieChart },
  { id: "strategies", label: "Strategies", icon: Target },
];

/** Collapsible left navigation rail for the journal workspace. */
export function JournalNav({
  view,
  onView,
  collapsed,
  onToggle,
  onAddTrade,
  readOnly = false,
}: {
  view: JournalView;
  onView: (v: JournalView) => void;
  collapsed: boolean;
  onToggle: () => void;
  onAddTrade: () => void;
  readOnly?: boolean;
}) {
  return (
    <aside
      className="card-surface sticky top-0 -my-4 -ml-4 hidden h-screen shrink-0 flex-col gap-2 rounded-none border-y-0 border-l-0 px-2.5 py-6 transition-all duration-200 md:flex"
      style={{ width: collapsed ? 62 : 208 }}
    >
      {!readOnly && (
      <button
        onClick={onAddTrade}
        className="hover-lift inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px]"
        style={{
          background: "#6E86F7",
          color: "#ffffff",
          fontWeight: 560,
        }}
      >
        <Plus className="size-4 shrink-0" />
        {!collapsed && <span>Add Trade</span>}
      </button>
      )}

      <nav className="mt-1 flex flex-col gap-1.5">
        {ITEMS.map((it) => {
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onView(it.id)}
              title={it.label}
              className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-[13.5px] transition-colors"

              style={{
                background: active ? "rgba(255,255,255,0.07)" : "transparent",
                color: active ? "#ffffff" : "#9AA1AC",
                fontWeight: active ? 560 : 400,
              }}
            >
              <it.icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{it.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        <button
          onClick={onToggle}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-[#7A828D] transition-colors hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="size-4 shrink-0" />
          ) : (
            <ChevronLeft className="size-4 shrink-0" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
