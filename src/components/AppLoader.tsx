export function AppLoader({
  overlay = false,
  visible = true,
  label = "Loading",
}: {
  overlay?: boolean;
  visible?: boolean;
  label?: string;
}) {
  return (
    <div
      aria-hidden={!visible}
      className={
        overlay
          ? "pointer-events-none fixed inset-0 z-[90] flex items-center justify-center transition-opacity duration-500"
          : "flex min-h-[60vh] w-full items-center justify-center"
      }
      style={
        overlay
          ? {
              opacity: visible ? 1 : 0,
              background: "rgba(5,6,8,0.72)",
              backdropFilter: "blur(6px)",
            }
          : undefined
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative size-12">
          <span
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(255,255,255,0.06)" }}
          />
          <span
            className="absolute inset-0 animate-spin rounded-full"
            style={{
              border: "2px solid transparent",
              borderTopColor: "#e5525f",
              borderRightColor: "rgba(229,82,95,0.35)",
              animationDuration: "0.9s",
            }}
          />
          <span
            className="pulse-dot absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "#e5525f" }}
          />
        </div>
        <span className="text-[11px] tracking-[0.18em] text-[#6a7076] uppercase">{label}</span>
      </div>
    </div>
  );
}
