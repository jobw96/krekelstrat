import type { SessionTone } from "@/lib/sessions";

export const toneColor: Record<SessionTone, string> = {
  high: "#3ECF8E",
  macro: "#F0736F",
  dead: "#7A828D",
  neutral: "#6E86F7",
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
      className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-[12px] font-normal"
      style={
        filled
          ? { background: color, color: "#ffffff" }
          : {
              background: "rgba(255,255,255,0.06)",
              color: color ?? "#9AA1AC",
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
