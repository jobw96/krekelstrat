import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { LineChart } from "lucide-react";

import type { MnqCandle } from "@/lib/mnq.functions";
import { formatPoints, formatPrice, lastSessionStart, sessionOpenPrice } from "@/lib/mnq";
import { LOCAL_ZONE, type ClockState } from "@/lib/sessions";

const H = 260;
const PAD_T = 18;
const PAD_B = 26;
const PAD_R = 72;
const PAD_L = 12;

type Point = { x: number; y: number; t: number; p: number };

export function SessionChart({
  state,
  now,
  price,
  candles,
}: {
  state: ClockState;
  now: DateTime;
  price: number | null;
  candles: MnqCandle[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1000);
  const [hover, setHover] = useState<Point | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width ?? 0;
      if (w > 0) setW(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const def = state.active?.def ?? state.next.def;
  const open = sessionOpenPrice(def, now, candles);

  const model = useMemo(() => {
    const startMs = lastSessionStart(def, now).toMillis();
    let series = candles.filter((c) => c.t >= startMs);
    if (series.length < 3) series = candles.slice(-180);
    if (series.length < 2) return null;

    const prices = series.map((c) => c.c);
    const lo = Math.min(...prices, open ?? Infinity);
    const hi = Math.max(...prices, open ?? -Infinity);
    const padY = Math.max((hi - lo) * 0.14, 1);
    const min = lo - padY;
    const max = hi + padY;

    const t0 = series[0]!.t;
    const t1 = series.at(-1)!.t;
    const span = Math.max(t1 - t0, 1);
    const x = (t: number) => PAD_L + ((t - t0) / span) * (W - PAD_L - PAD_R);
    const y = (p: number) => PAD_T + ((max - p) / (max - min)) * (H - PAD_T - PAD_B);

    const pts: Point[] = series.map((c) => ({
      x: x(c.t),
      y: y(c.c),
      t: c.t,
      p: c.c,
    }));

    const path = pts.map((pt, i) => `${i ? "L" : "M"}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" ");
    const area = `${path} L${pts.at(-1)!.x.toFixed(2)} ${H - PAD_B} L${pts[0]!.x.toFixed(2)} ${H - PAD_B} Z`;

    const guides = [0.25, 0.5, 0.75].map((f) => ({
      y: PAD_T + f * (H - PAD_T - PAD_B),
      p: max - f * (max - min),
    }));

    return { pts, path, area, y, x, min, max, guides, t0, t1 };
  }, [candles, def, now, open, W]);

  if (!model) return null;

  const last = price ?? model.pts.at(-1)!.p;
  const lastY = Math.min(Math.max(model.y(last), PAD_T), H - PAD_B);
  const diff = open != null ? last - open : null;
  const bull = diff == null ? true : diff >= 0;
  const accent = bull ? "#4fd18b" : "#e5525f";
  const openY = open != null ? model.y(open) : null;
  const openX = open != null ? model.x(model.t0) : null;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = model.pts[0]!;
    for (const pt of model.pts) {
      if (Math.abs(pt.x - px) < Math.abs(best.x - px)) best = pt;
    }
    setHover(best);
  };

  return (
    <section className="card-surface relative overflow-hidden p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LineChart className="size-3.5 text-[#6a7076]" strokeWidth={1.6} />
          <h2 className="text-[15px] tracking-[-0.011em] text-[#d7dbe0]">
            MNQ · {def.name}
          </h2>
          <span className="font-mono text-[11px] text-[#6a7076]">
            {DateTime.fromMillis(model.t0).setZone(LOCAL_ZONE).toFormat("HH:mm")} –{" "}
            {DateTime.fromMillis(model.t1).setZone(LOCAL_ZONE).toFormat("HH:mm")} AMS
          </span>
        </div>
        <div className="flex items-center gap-5 font-mono text-[11px]">
          <span className="text-[#6a7076]">
            Open <span className="text-[#d7dbe0]">{open != null ? formatPrice(open) : "—"}</span>
          </span>
          <span className="text-[#6a7076]">
            Last <span className="text-[#d7dbe0]">{formatPrice(last)}</span>
          </span>
          {diff != null && (
            <span style={{ color: accent }}>{formatPoints(diff)}</span>
          )}
        </div>
      </div>

      <div ref={wrapRef} className="relative w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block w-full"

        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="mnq-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          <filter id="mnq-glow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {model.guides.map((g) => (
          <g key={g.y}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={g.y}
              y2={g.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
            <text
              x={W - PAD_R + 8}
              y={g.y + 3.5}
              fill="#5c6268"
              fontSize={11}
              fontFamily="ui-monospace, monospace"
            >
              {g.p.toFixed(0)}
            </text>
          </g>
        ))}

        <path d={model.area} fill="url(#mnq-fill)" />
        <path
          d={model.path}
          fill="none"
          stroke={accent}
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {openY != null && (
          <>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={openY}
              y2={openY}
              stroke="rgba(255,255,255,0.34)"
              strokeWidth={1}
              strokeDasharray="5 6"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={W - PAD_R + 8}
              y={Math.abs(openY - lastY) < 13 ? openY - 8 : openY + 3.5}
              fill="#a9b0b6"
              fontSize={11}
              fontFamily="ui-monospace, monospace"
            >
              {formatPrice(open!)}
            </text>
          </>
        )}

        {openX != null && openY != null && (
          <line
            x1={openX}
            x2={W - PAD_R}
            y1={openY}
            y2={lastY}
            stroke={accent}
            strokeOpacity={0.55}
            strokeWidth={1.2}
            filter="url(#mnq-glow)"
            vectorEffect="non-scaling-stroke"
          />
        )}

        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={lastY}
          y2={lastY}
          stroke={accent}
          strokeWidth={1}
          strokeOpacity={0.35}
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={W - PAD_R} cy={lastY} r={3.2} fill={accent} filter="url(#mnq-glow)" />
        <text
          x={W - PAD_R + 8}
          y={lastY + 3.5}
          fill={accent}
          fontSize={11}
          fontFamily="ui-monospace, monospace"
        >
          {formatPrice(last)}
        </text>

        {hover && (
          <>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={hover.x} cy={hover.y} r={3} fill="#ffffff" />
          </>
        )}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute top-14 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap"
          style={{
            left: Math.min(Math.max(hover.x - 52, 0), Math.max(W - 116, 0)),
            borderColor: "rgba(255,255,255,0.09)",
            background: "rgba(12,14,17,0.92)",
            boxShadow: "0 18px 40px -28px rgba(0,0,0,0.95)",
            color: "#d7dbe0",
          }}
        >
          <span>{formatPrice(hover.p)}</span>
          <span className="ml-2 text-[#6a7076]">
            {DateTime.fromMillis(hover.t).setZone(LOCAL_ZONE).toFormat("HH:mm")}
          </span>
        </div>
      )}
      </div>
    </section>

  );
}
