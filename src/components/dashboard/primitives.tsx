import type { SessionTone } from "@/lib/sessions";

export const toneColor: Record<SessionTone, string> = {
  high: "#35d39a",
  macro: "#e5525f",
  dead: "#6a7076",
  neutral: "#5a6272",
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
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-normal"
      style={
        filled
          ? { background: color, color: "#ffffff" }
          : {
              background: "rgba(255,255,255,0.06)",
              color: color ?? "#8b9298",
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
