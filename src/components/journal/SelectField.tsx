import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

/** Dark, fully styled dropdown replacing native <select>. */
export function SelectField({
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-control border border-white/10 bg-white/4 px-3 py-2.5 text-left text-[13.5px] text-white transition-colors hover:bg-white/6 focus:border-[#6E86F7]/60 focus:outline-none"
      >
        <span className="truncate">{current?.label ?? "Select…"}</span>
        <ChevronDown
          className="size-4 shrink-0 text-[#7A828D] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-control border border-white/10 p-1 shadow-2xl"
          style={{ background: "#121317", backdropFilter: "blur(18px)" }}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-control px-2.5 py-2 text-left text-[13px] ${
                  active ? "option-on" : "option-off border-transparent bg-transparent"
                }`}
              >
                <span className="truncate">{o.label}</span>
                {active && <Check className="size-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
