import { useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
import {
  ACCOUNT_SIZES,
  accountLabel,
  SESSION_OPTIONS,
  type Strategy,
  type TradeResult,
} from "@/lib/journal";

/** Either a single account journal, or all of them combined. */
export type AccountFilter = "all" | number;

/** A specific prop account id, or "all" for no narrowing. */
export type PropAccountFilter = "all" | string;
import type { PropAccount } from "@/lib/prop";
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
    // static below sm, so the panel positions against the bar instead of this
    // button: anchored to the trigger it ran off whichever edge the trigger
    // happened to sit near, and no anchor side is right for every position.
    <div className="static shrink-0 sm:relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="hover-lift inline-flex items-center gap-1.5 rounded-control bg-white/6 px-3 py-1.5 text-[12px] text-[#F0F2F5] hover:bg-white/12"
      >
        {label} <ChevronDown className="size-3.5 text-[#7A828D]" />
      </button>
      {open && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="card-surface dialog-enter absolute inset-x-0 top-[calc(100%+10px)] z-20 flex flex-col gap-0.5 p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.85)] sm:inset-x-auto sm:left-0 sm:min-w-[210px]">
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
      className={`px-3 py-2.5 text-left text-[12px] ${active ? "menu-item-on" : "menu-item"}`}
      style={active ? { fontWeight: 560 } : undefined}
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
  account,
  onAccount,
  propAccounts,
  propAccount,
  onPropAccount,
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
  /** Selected account journal, or "all" to combine them. */
  account: AccountFilter;
  onAccount: (a: AccountFilter) => void;
  propAccounts: PropAccount[];
  /** A specific evaluation, or "all" for no narrowing. */
  propAccount: PropAccountFilter;
  onPropAccount: (id: PropAccountFilter) => void;
}) {
  const activeFilters =
    (filters.strategy !== "all" ? 1 : 0) +
    (filters.session !== "all" ? 1 : 0) +
    (filters.result !== "all" ? 1 : 0);

  // Wraps rather than scrolling sideways: an overflow container clips the
  // absolutely-positioned dropdown panels, which on a phone turned every
  // filter menu into an unusable sliver.
  return (
    <div className="flex flex-col gap-2">
      {/* The account journals sit above the rest: picking one switches which
          book you are looking at, where the controls below only narrow it. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", ...ACCOUNT_SIZES] as AccountFilter[]).map((a) => (
          <button
            key={a}
            onClick={() => onAccount(a)}
            aria-pressed={account === a}
            className={`rounded-control px-3 py-1.5 text-[12px] ${
              account === a ? "option-on" : "option-off"
            }`}
            style={account === a ? { fontWeight: 560 } : undefined}
          >
            {a === "all" ? "All accounts" : accountLabel(a)}
          </button>
        ))}
      </div>

    <div className="card-surface relative flex flex-wrap items-center gap-2 p-2.5">
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

      {/* Off by default: most days you are reading the book as a whole, and
          only narrow to one evaluation when you want to check that account. */}
      <Dropdown
        label={
          propAccount === "all"
            ? "All prop accounts"
            : (() => {
                const a = propAccounts.find((p) => p.id === propAccount);
                return a ? a.label?.trim() || a.firm : "All prop accounts";
              })()
        }
      >
        {(close) => (
          <>
            <Item
              active={propAccount === "all"}
              onClick={() => {
                onPropAccount("all");
                close();
              }}
            >
              All prop accounts
            </Item>
            {propAccounts.map((a) => (
              <Item
                key={a.id}
                active={a.id === propAccount}
                onClick={() => {
                  onPropAccount(a.id);
                  close();
                }}
              >
                {a.label?.trim() || a.firm}
                {a.account_size ? ` · ${accountLabel(a.account_size)}` : ""}
              </Item>
            ))}
            {propAccounts.length === 0 && (
              <span className="px-3 py-2.5 text-[11.5px] text-[#7A828D]">
                No prop accounts yet.
              </span>
            )}
          </>
        )}
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
          <span className="text-[12px] text-[#7A828D]">→</span>
          <DatePicker value={to} onChange={onTo} label="To date" placeholder="To" />
        </span>
      )}


      <Dropdown label={activeFilters ? `Filters · ${activeFilters}` : "Filters"}>
        {() => (
          <div className="flex w-[240px] flex-col gap-2 p-1">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#7A828D]">
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
            <span className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#7A828D]">
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
            <span className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#7A828D]">
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
              className="mt-1 rounded-control px-2 py-1 text-left text-[11px] text-[#7A828D] hover:text-white"
            >
              Reset filters
            </button>
          </div>
        )}
      </Dropdown>
    </div>
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
      className="rounded-control px-2.5 py-1 text-[11px]"
      style={
        active
          ? { background: "#1C1F27", color: "#ffffff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }
          : { background: "rgba(255,255,255,0.05)", color: "#9AA1AC" }
      }
    >
      {children}
    </button>
  );
}
