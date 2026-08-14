export function AppLoader({
  overlay = false,
  contained = false,
  visible = true,
  label = "Loading",
}: {
  overlay?: boolean;
  contained?: boolean;
  visible?: boolean;
  label?: string;
}) {
  return (
    <div
      aria-hidden={!visible}
      className={
        overlay
          ? `pointer-events-none ${contained ? "absolute" : "fixed"} inset-0 z-[90] flex items-center justify-center transition-opacity duration-200 ease-out`
          : "flex min-h-[60vh] w-full items-center justify-center"
      }
      style={
        overlay
          ? {
              opacity: visible ? 1 : 0,
              background: "rgba(5,6,8,0.86)",
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
              borderTopColor: "#6E86F7",
              borderRightColor: "rgba(229,82,95,0.35)",
              animationDuration: "0.9s",
            }}
          />
          <span
            className="pulse-dot absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "#6E86F7" }}
          />
        </div>
        <span className="text-[11px] tracking-[0.18em] text-[#6a7076] uppercase">{label}</span>
      </div>
    </div>
  );
}
