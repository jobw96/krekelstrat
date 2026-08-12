import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Full-screen zoom/pan viewer for a trade screenshot. */
export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomAt = useCallback((next: number, px: number, py: number) => {
    const { zoom: z, offset: o } = stateRef.current;
    const nz = clamp(next, MIN_ZOOM, MAX_ZOOM);
    const k = nz / z;
    setZoom(nz);
    if (nz === 1) setOffset({ x: 0, y: 0 });
    else setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      zoomAt(
        stateRef.current.zoom * Math.exp(-dy * 0.0018),
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const centerZoom = (factor: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    zoomAt(stateRef.current.zoom * factor, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-end gap-2 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={() => centerZoom(1 / 1.4)} aria-label="Zoom out" className="lb-btn">
          <Minus className="size-4" />
        </button>
        <span className="font-mono text-[12px] tabular text-[#8b9298]">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => centerZoom(1.4)} aria-label="Zoom in" className="lb-btn">
          <Plus className="size-4" />
        </button>
        <button onClick={reset} aria-label="Reset zoom" className="lb-btn">
          <RotateCcw className="size-4" />
        </button>
        <button onClick={onClose} aria-label="Close" className="lb-btn">
          <X className="size-4" />
        </button>
      </div>

      <div
        ref={boxRef}
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: "none", cursor: zoom > 1 ? "grab" : "zoom-in" }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          const rect = boxRef.current!.getBoundingClientRect();
          if (zoom > 1) reset();
          else zoomAt(2.5, e.clientX - rect.left, e.clientY - rect.top);
        }}
        onPointerDown={(e) => {
          if (zoom <= 1) return;
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <img
          src={src}
          alt="Trade screenshot"
          draggable={false}
          className="absolute left-0 top-0 h-full w-full select-none object-contain"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        />
      </div>
      <p className="pb-3 text-center text-[11px] text-[#6a7076]">
        Scroll to zoom · drag to pan · double-click to toggle · Esc to close
      </p>
    </div>
  );
}
