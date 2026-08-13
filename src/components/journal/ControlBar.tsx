import { useState } from "react";
import { ChevronDown, Filter, RefreshCw } from "lucide-react";
import { SESSION_OPTIONS, type Strategy, type TradeResult } from "@/lib/journal";
import { DatePicker } from "@/components/journal/DateTimePicker";


export type RangeKey = "month" | "30d" | "ytd" | "all" | "custom";

export const RANGE_LABELS: Record<RangeKey, string> = {
  month: "This Month",
  "30d": "Last 30 Days",
  ytd: "Year to Date",
  all: "All Time",
  custom: "Custom Range",
};

export type Filters = {
  strategy: string;
  session: string;
  result: TradeResult | "all";
};

function Dropdown({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="hover-lift inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 text-[12px] text-[#d7dbe0] hover:bg-white/12"
      >
        {label} <ChevronDown className="size-3.5 text-[#6a7076]" />
      </button>
      {open && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="card-surface dialog-enter absolute left-0 top-[calc(100%+10px)] z-20 flex min-w-[210px] flex-col gap-0.5 p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.85)]">
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
}

function Item({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors hover:bg-white/8"
      style={{ color: active ? "#ffffff" : "#8b9298", fontWeight: active ? 560 : 400 }}
    >
      {children}
    </button>
  );
}

/** Top control bar: strategy, date range, filters and sync timestamp. */
export function ControlBar({
  range,
  onRange,
  from,
  to,
  onFrom,
  onTo,
  filters,
  onFilters,
  strategies,
  syncedAt,
  onRefresh,
}: {
  range: RangeKey;
  onRange: (r: RangeKey) => void;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  filters: Filters;
  onFilters: (f: Filters) => void;
  strategies: Strategy[];
  syncedAt: Date | null;
  onRefresh: () => void;
}) {
  const activeFilters =
    (filters.strategy !== "all" ? 1 : 0) +
    (filters.session !== "all" ? 1 : 0) +
    (filters.result !== "all" ? 1 : 0);

  return (
    <div className="card-surface flex flex-nowrap items-center gap-2 overflow-x-auto p-2.5 md:flex-wrap md:overflow-visible">
      <Dropdown
        label={
          filters.strategy === "all"
            ? "All Strategies"
            : (strategies.find((s) => s.id === filters.strategy)?.name ?? "All Strategies")
        }
      >
        {(close) =>
          [{ id: "all", name: "All Strategies" }, ...strategies].map((s) => (
            <Item
              key={s.id}
              active={s.id === filters.strategy}
              onClick={() => {
                onFilters({ ...filters, strategy: s.id });
                close();
              }}
            >
              {s.name}
            </Item>
          ))
        }
      </Dropdown>


      <Dropdown label={RANGE_LABELS[range]}>
        {(close) =>
          (Object.keys(RANGE_LABELS) as RangeKey[]).map((r) => (
            <Item
              key={r}
              active={r === range}
              onClick={() => {
                onRange(r);
                close();
              }}
            >
              {RANGE_LABELS[r]}
            </Item>
          ))
        }
      </Dropdown>

      {range === "custom" && (
        <span className="flex items-center gap-1.5">
          <DatePicker value={from} onChange={onFrom} label="From date" placeholder="From" />
          <span className="text-[12px] text-[#6a7076]">→</span>
          <DatePicker value={to} onChange={onTo} label="To date" placeholder="To" />
        </span>
      )}


      <Dropdown label={activeFilters ? `Filters · ${activeFilters}` : "Filters"}>
        {() => (
          <div className="flex w-[240px] flex-col gap-2 p-1">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#6a7076]">
              <Filter className="size-3" /> Strategy
            </span>
            <div className="flex flex-wrap gap-1">
              {[{ id: "all", name: "All" }, ...strategies].map((s) => (
                <Chip
                  key={s.id}
                  active={filters.strategy === s.id}
                  onClick={() => onFilters({ ...filters, strategy: s.id })}
                >
                  {s.name}
                </Chip>
              ))}
            </div>
            <span className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#6a7076]">
              Session
            </span>
            <div className="flex flex-wrap gap-1">
              {["all", ...SESSION_OPTIONS].map((s) => (
                <Chip
                  key={s}
                  active={filters.session === s}
                  onClick={() => onFilters({ ...filters, session: s })}
                >
                  {s === "all" ? "All" : s}
                </Chip>
              ))}
            </div>
            <span className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#6a7076]">
              Result
            </span>
            <div className="flex flex-wrap gap-1">
              {(["all", "WIN", "LOSS", "BE"] as const).map((r) => (
                <Chip
                  key={r}
                  active={filters.result === r}
                  onClick={() => onFilters({ ...filters, result: r })}
                >
                  {r === "all" ? "All" : r}
                </Chip>
              ))}
            </div>
            <button
              onClick={() => onFilters({ strategy: "all", session: "all", result: "all" })}
              className="mt-1 rounded-lg px-2 py-1 text-left text-[11px] text-[#6a7076] hover:text-white"
            >
              Reset filters
            </button>
          </div>
        )}
      </Dropdown>

      <button
        onClick={onRefresh}
        title={
          syncedAt
            ? `Synced ${syncedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
            : "Refresh"
        }
        aria-label="Refresh"
        className="hover-lift ml-auto inline-flex shrink-0 items-center justify-center rounded-full bg-white/6 p-2 text-[#8b9298] hover:bg-white/12"
      >
        <RefreshCw className="size-3.5" />
      </button>

    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-2.5 py-1 text-[11px]"
      style={
        active
          ? { background: "#20242a", color: "#ffffff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }
          : { background: "rgba(255,255,255,0.05)", color: "#8b9298" }
      }
    >
      {children}
    </button>
  );
}
