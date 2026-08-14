import { useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Minus, Plus } from "lucide-react";

const ACCENT = "#6E86F7";
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function buildGrid(month: DateTime) {
  const start = month.startOf("month").startOf("week");
  return Array.from({ length: 42 }, (_, i) => start.plus({ days: i }));
}

function Popover({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Close date picker"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="card-surface dialog-enter absolute left-0 top-[calc(100%+8px)] z-50 w-[292px] p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
      >
        {children}
      </div>
    </>
  );
}

function Calendar({
  selected,
  onPick,
}: {
  selected: DateTime;
  onPick: (d: DateTime) => void;
}) {
  const [month, setMonth] = useState(selected.startOf("month"));
  const days = useMemo(() => buildGrid(month), [month]);
  const today = DateTime.now().startOf("day");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => m.minus({ months: 1 }))}
          className="rounded-lg p-1.5 text-[#9AA1AC] transition-colors hover:bg-white/8 hover:text-white"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-[13px] text-white" style={{ fontWeight: 560 }}>
          {month.toFormat("LLLL yyyy")}
        </span>
        <button
          type="button"
          onClick={() => setMonth((m) => m.plus({ months: 1 }))}
          className="rounded-lg p-1.5 text-[#9AA1AC] transition-colors hover:bg-white/8 hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="py-1 text-center text-[10px] uppercase tracking-[0.08em] text-[#7A828D]"
          >
            {d}
          </span>
        ))}
        {days.map((d) => {
          const outside = d.month !== month.month;
          const isSel = d.hasSame(selected, "day");
          const isToday = d.hasSame(today, "day");
          return (
            <button
              key={d.toISODate()}
              type="button"
              onClick={() => onPick(d)}
              className="h-8 rounded-lg text-[12.5px] transition-colors hover:bg-white/10"
              style={{
                background: isSel ? ACCENT : "transparent",
                color: isSel ? "#ffffff" : outside ? "#454B55" : "#F0F2F5",
                fontWeight: isSel ? 600 : 400,
                boxShadow: !isSel && isToday ? `inset 0 0 0 1px ${ACCENT}55` : undefined,
              }}
            >
              {d.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  step?: number;
}) {
  const wrap = (v: number) => ((v % (max + 1)) + (max + 1)) % (max + 1);
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-white/5 py-1.5">
      <span className="text-[9px] uppercase tracking-[0.12em] text-[#7A828D]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(wrap(value - step))}
          className="rounded-md p-1 text-[#9AA1AC] hover:bg-white/10 hover:text-white"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="size-3" />
        </button>
        <span className="w-7 text-center font-mono text-[15px] text-white">
          {String(value).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => onChange(wrap(value + step))}
          className="rounded-md p-1 text-[#9AA1AC] hover:bg-white/10 hover:text-white"
          aria-label={`Increase ${label}`}
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

const TRIGGER =
  "flex h-10 w-full items-center justify-between gap-2 rounded-xl bg-white/6 px-3 text-left text-[13px] text-white outline-none transition-colors hover:bg-white/10";

/** Date + time picker. Value/onChange use the "yyyy-LL-dd'T'HH:mm" format. */
export function DateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dt = DateTime.fromFormat(value, "yyyy-LL-dd'T'HH:mm").isValid
    ? DateTime.fromFormat(value, "yyyy-LL-dd'T'HH:mm")
    : DateTime.now();
  const commit = (d: DateTime) => onChange(d.toFormat("yyyy-LL-dd'T'HH:mm"));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${TRIGGER} ${open ? "ring-1 ring-[#6E86F7]" : ""}`}
      >
        <span>{dt.toFormat("d LLL yyyy · HH:mm")}</span>
        <CalendarDays className="size-3.5 text-[#7A828D]" />
      </button>

      <Popover open={open} onClose={() => setOpen(false)}>
        <div className="mb-2 flex gap-1.5">
          {[
            { label: "Now", d: DateTime.now() },
            { label: "Today", d: DateTime.now().set({ hour: dt.hour, minute: dt.minute }) },
            {
              label: "Yesterday",
              d: DateTime.now().minus({ days: 1 }).set({ hour: dt.hour, minute: dt.minute }),
            },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => commit(p.d)}
              className="flex-1 rounded-lg bg-white/6 py-1.5 text-[11px] text-[#F0F2F5] transition-colors hover:bg-white/12 hover:text-white"
            >
              {p.label}
            </button>
          ))}
        </div>

        <Calendar
          selected={dt}
          onPick={(d) => commit(d.set({ hour: dt.hour, minute: dt.minute }))}
        />

        <div className="mt-2 flex items-center gap-2 border-t border-white/8 pt-2">
          <Clock className="size-3.5 text-[#7A828D]" />
          <Stepper
            label="Hour"
            value={dt.hour}
            max={23}
            onChange={(h) => commit(dt.set({ hour: h }))}
          />
          <Stepper
            label="Min"
            value={dt.minute}
            max={59}
            step={5}
            onChange={(m) => commit(dt.set({ minute: m }))}
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-2 w-full rounded-xl py-2 text-[12.5px] text-white transition-opacity hover:opacity-90"
          style={{ background: ACCENT, fontWeight: 560 }}
        >
          Done
        </button>
      </Popover>
    </div>
  );
}

/** Date-only picker. Value/onChange use ISO dates ("yyyy-LL-dd"). */
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Pick a date",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const dt = value && DateTime.fromISO(value).isValid ? DateTime.fromISO(value) : null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 text-[12px] transition-colors hover:bg-white/12 ${
          open ? "ring-1 ring-[#6E86F7]" : ""
        }`}
        style={{ color: dt ? "#F0F2F5" : "#7A828D" }}
      >
        <CalendarDays className="size-3" />
        {dt ? dt.toFormat("d LLL yyyy") : placeholder}
      </button>

      <Popover open={open} onClose={() => setOpen(false)}>
        <Calendar
          selected={dt ?? DateTime.now()}
          onPick={(d) => {
            onChange(d.toISODate() ?? "");
            setOpen(false);
          }}
        />
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              onChange(DateTime.now().toISODate() ?? "");
              setOpen(false);
            }}
            className="flex-1 rounded-lg bg-white/6 py-1.5 text-[11px] text-[#F0F2F5] hover:bg-white/12 hover:text-white"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex-1 rounded-lg bg-white/6 py-1.5 text-[11px] text-[#9AA1AC] hover:bg-white/12 hover:text-white"
          >
            Clear
          </button>
        </div>
      </Popover>
    </div>
  );
}
