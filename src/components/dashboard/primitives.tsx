import type { SessionTone } from "@/lib/sessions";

export const toneColor: Record<SessionTone, string> = {
  high: "#27a644",
  macro: "#eb5757",
  dead: "#62666d",
  neutral: "#6366f1",
};

export function Badge({
  children,
  color,
  filled = false,
}: {
  children: React.ReactNode;
  color?: string;
  filled?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 text-[12px] font-normal"
      style={
        filled
          ? { background: color, color: "#08090a" }
          : {
              background: "rgba(255,255,255,0.05)",
              color: color ?? "#8a8f98",
            }
      }
    >
      {children}
    </span>
  );
}

export function Dot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={`inline-block size-1.5 rounded-full ${pulse ? "pulse-dot" : ""}`}
      style={{ background: color }}
    />
  );
}
