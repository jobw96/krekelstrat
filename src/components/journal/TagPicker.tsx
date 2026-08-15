import { useState } from "react";
import { Plus, X } from "lucide-react";

export const RIGHT_TAGS = ["According to plan", "Risk management"];
export const WRONG_TAGS = ["Fomo", "Deviate from plan", "Emotions", "Bad risk"];

type Props = {
  label: string;
  color: string;
  presets: string[];
  value: string[];
  onChange: (tags: string[]) => void;
};

export function TagPicker({ label, color, presets, value, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const custom = value.filter((t) => !presets.includes(t));

  function toggle(tag: string) {
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
  }

  function commitDraft() {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-2 text-[11px]" style={{ color }}>
      <span>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((tag) => {
          const on = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`rounded-control px-2.5 py-1 text-[11px] ${on ? "option-on" : "option-off"}`}
              // Selected tags glow in their own hue rather than the interface
              // accent, so "what went right" stays green and "wrong" stays red.
              style={on ? ({ "--glow-opt": color, color } as React.CSSProperties) : undefined}
              aria-pressed={on}
            >
              {tag}
            </button>
          );
        })}

        {custom.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-control px-2.5 py-1 text-[11px]"
            style={{
              background: `${color}26`,
              color,
              boxShadow: `inset 0 0 0 1px ${color}66`,
            }}
          >
            {tag}
            <button type="button" onClick={() => toggle(tag)} aria-label={`Remove ${tag}`}>
              <X className="size-3 opacity-70 hover:opacity-100" />
            </button>
          </span>
        ))}

        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              }
              if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            placeholder="Custom tag"
            className="w-28 rounded-control bg-white/6 px-2.5 py-1 text-[11px] text-white outline-none placeholder:text-[#7A828D]"
            style={{ boxShadow: `inset 0 0 0 1px ${color}44` }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-control px-2.5 py-1 text-[11px] text-[#9AA1AC] transition-colors duration-150 hover:text-white"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)" }}
          >
            <Plus className="size-3" />
            Custom
          </button>
        )}
      </div>
    </div>
  );
}
