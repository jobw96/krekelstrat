import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DateTime } from "luxon";

import {
  AlertTriangle,
  CandlestickChart,
  Clock,
  NotebookPen,
  Timer,
} from "lucide-react";

import { useNow } from "@/hooks/useNow";
import { useMnq } from "@/hooks/useMnq";
import { useRedFolder } from "@/hooks/useRedFolder";
import { useTzPref } from "@/hooks/useTzPref";
import { ActiveSessionBar } from "@/components/dashboard/ActiveSessionBar";
import { CatalystBanner } from "@/components/dashboard/NewsCatalyst";
import { currentCatalyst, eventsToday } from "@/lib/news";
import { formatPoints, formatPrice, sessionOpenPrice } from "@/lib/mnq";


import {
  computeState,
  formatCountdown,
  LOCAL_ZONE,
  NY_ZONE,
  SESSIONS,
} from "@/lib/sessions";
import { SessionCard, redFolderImminent } from "@/components/dashboard/SessionCard";
import { TimelineBar } from "@/components/dashboard/TimelineBar";

import { Dot, toneColor } from "@/components/dashboard/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ICT Session Terminal — NQ/MNQ Futures Sessions" },
      {
        name: "description",
        content:
          "Live ICT trading session dashboard for NQ/MNQ index futures: Amsterdam and New York clocks, active session detection, countdowns and killzone focus tips.",
      },
      { property: "og:title", content: "ICT Session Terminal — NQ/MNQ Futures Sessions" },
      {
        property: "og:description",
        content:
          "Live session detection, countdown timers and a 24-hour killzone map for index futures traders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function useBeep(enabled: boolean, secondsToNext: number) {
  const fired = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (secondsToNext > 60 || secondsToNext < 55) return;
    if (fired.current === Math.floor(secondsToNext / 60)) return;
    fired.current = Math.floor(secondsToNext / 60);
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch {
      /* audio unavailable */
    }
  }, [enabled, secondsToNext]);
}

const RAIL_ITEMS = [
  { icon: CandlestickChart, label: "Sessions", to: "/" as const },
  { icon: NotebookPen, label: "Journal", to: "/journal" as const },
];

function Dashboard() {
  const now = useNow();
  const mnq = useMnq();
  const news = useRedFolder();
  const [sound, setSound] = useState(false);
  const { tz, setTz } = useTzPref();
  const compact = true;
  const state = now ? computeState(now) : null;
  useBeep(sound, state?.secondsToNext ?? 9999);
  const catalyst = now
    ? currentCatalyst(news.data?.events ?? [], now, mnq.data?.candles ?? [])
    : null;
  const nextRedFolder = now
    ? (eventsToday(news.data?.events ?? [], now).find(
        (e) => e.time >= now.toMillis() - 60 * 60_000,
      ) ?? null)
    : null;
  const redHot = now ? redFolderImminent(news.data?.events ?? [], now) : false;



  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">

          {now && state && (
            <ActiveSessionBar
              state={state}
              now={now}
              price={mnq.data?.price ?? null}
              candles={mnq.data?.candles ?? []}
            />
          )}

          {redHot && nextRedFolder && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2.5 text-[12px]"
              style={{
                borderColor: "rgba(255,77,94,0.28)",
                background: "rgba(255,77,94,0.07)",
                boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05)",
                color: "#f0b8bd",
              }}
            >
              <AlertTriangle className="size-3.5" style={{ color: "#ff4d5e" }} />
              <span style={{ fontWeight: 560 }}>Red Folder news window</span>
              <span className="font-mono text-[11px]">
                {nextRedFolder.title} ·{" "}
                {DateTime.fromMillis(nextRedFolder.time)
                  .setZone(LOCAL_ZONE)
                  .toFormat("HH:mm")}{" "}
                AMS
              </span>
            </motion.div>
          )}

          {catalyst && <CatalystBanner read={catalyst} />}




          {/* Hero bento */}
          <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <div
              className="card-surface relative flex flex-col justify-between gap-8 overflow-hidden p-7"
              style={{
                backgroundImage: state?.active
                  ? `linear-gradient(180deg, ${toneColor[state.active.def.tone]}12 0%, rgba(255,255,255,0.02) 20%, rgba(255,255,255,0) 55%)`
                  : undefined,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={state?.active?.def.id ?? "none"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-[13px] text-[#d7dbe0]"
                >
                  <Dot
                    color={state?.active ? toneColor[state.active.def.tone] : "#6a7076"}
                    pulse={Boolean(state?.active)}
                  />
                  {state?.active ? state.active.def.name : "No session active"}
                </motion.div>
              </AnimatePresence>

              <div className="flex flex-col gap-3">
                <h1
                  className="text-[44px] leading-[1.02] text-white lg:text-[56px]"
                  style={{ letterSpacing: "-0.03em", fontWeight: 560 }}
                >
                  {state?.active ? state.active.def.tag : "Between sessions"}
                </h1>
                <p className="max-w-[46ch] text-[15px] text-[#8b9298]">
                  {state?.active
                    ? state.active.def.focus
                    : `Next up is ${state?.next.def.name ?? "—"} — stay flat and let the model come to you.`}
                </p>
              </div>

              {state?.active &&
                (() => {
                  const open = now
                    ? sessionOpenPrice(state.active.def, now, mnq.data?.candles ?? [])
                    : null;
                  const last = mnq.data?.price ?? null;
                  const diff = open != null && last != null ? last - open : null;
                  return (
                    <div
                      className="relative flex flex-wrap items-end gap-x-8 gap-y-3 overflow-hidden rounded-xl border p-4 pl-5"
                      style={{
                        borderColor: "rgba(255,255,255,0.07)",
                        background: "rgba(255,255,255,0.022)",
                        boxShadow:
                          "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 18px 40px -30px rgba(0,0,0,0.9)",
                      }}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-px"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(229,82,95,0) 0%, rgba(229,82,95,0.75) 50%, rgba(229,82,95,0) 100%)",
                        }}
                      />
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex w-fit items-center gap-1.5 text-[11px] tracking-[0.09em] uppercase text-[#a4747a]">
                          <Dot color="#e5525f" pulse />
                          Fair Price · session open
                        </span>
                        <span
                          className="font-mono text-[38px] leading-none text-white tabular"
                          style={{
                            letterSpacing: "-0.02em",
                            fontWeight: 560,
                          }}
                        >
                          {open != null ? formatPrice(open) : "—"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] tracking-[0.04em] text-[#6a7076]">
                          Distance
                        </span>
                        <span
                          className="font-mono text-[19px] leading-none tabular"
                          style={{
                            color:
                              diff == null ? "#8b9298" : diff >= 0 ? "#4fd18b" : "#e5525f",
                          }}
                        >
                          {diff != null ? formatPoints(diff) : "—"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] tracking-[0.04em] text-[#6a7076]">
                          Last
                        </span>
                        <span className="font-mono text-[19px] leading-none text-[#d7dbe0] tabular">
                          {last != null ? formatPrice(last) : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

              {state?.active && (
                <div className="flex flex-col gap-2">
                  <div
                    className="h-[3px] w-full overflow-hidden rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      boxShadow: "inset 0 1px 1px rgba(0,0,0,0.6)",
                    }}
                  >
                    <motion.div
                      className="h-[3px] rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${toneColor[state.active.def.tone]}66 0%, ${toneColor[state.active.def.tone]} 100%)`,
                      }}
                      animate={{ width: `${state.progress * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[11px] text-[#6a7076]">
                    <span>Elapsed {Math.round(state.progress * 100)}%</span>
                    <span>
                      Ends {state.active.end.setZone(LOCAL_ZONE).toFormat("HH:mm")} AMS
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="card-surface flex flex-col gap-5 p-7">
              <div className="flex items-center gap-2 text-[13px] text-[#8b9298]">
                <Timer className="size-3.5" strokeWidth={1.6} />
                Countdown to {state?.next.def.name ?? "—"}
              </div>
              <div
                className="font-mono text-[58px] leading-none text-white tabular lg:text-[68px]"
                style={{
                  letterSpacing: "-0.035em",
                  fontWeight: 560,
                }}
              >
                {state ? formatCountdown(state.secondsToNext) : "--:--:--"}
              </div>
              <div className="mt-auto grid grid-cols-2 gap-3">
                <ClockCell
                  label="Amsterdam"
                  value={now ? now.setZone(LOCAL_ZONE).toFormat("HH:mm:ss") : "--:--:--"}
                  zone={now ? now.setZone(LOCAL_ZONE).toFormat("ZZZZ") : ""}
                />
                <ClockCell
                  label="New York"
                  value={now ? now.setZone(NY_ZONE).toFormat("h:mm:ss a") : "--:--:--"}
                  zone={now ? now.setZone(NY_ZONE).toFormat("ZZZZ") : ""}
                />
              </div>
            </div>
          </section>

          {now && state && (
            <>
              <TimelineBar now={now} />


              <section className="pb-10">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-[#6a7076]" strokeWidth={1.6} />
                    <h2 className="text-[15px] tracking-[-0.011em] text-[#d7dbe0]">
                      Sessions &amp; Volume Windows
                    </h2>
                  </div>
                  <div
                    className="flex items-center gap-0.5 rounded-full p-0.5"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
                    }}
                  >
                    {(["NY", "AMS"] as const).map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setTz(z)}
                        className="rounded-full px-3 py-1 font-mono text-[10px] tracking-[0.08em] transition-colors"
                        style={
                          tz === z
                            ? {
                                background: "rgba(255,255,255,0.09)",
                                color: "#e8ebee",
                                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                              }
                            : { color: "#6a7076" }
                        }
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {SESSIONS.map((def) => (
                    <SessionCard
                      key={def.id}
                      def={def}
                      state={state}
                      now={now}
                      price={mnq.data?.price ?? null}
                      candles={mnq.data?.candles ?? []}
                      events={news.data?.events ?? []}
                      compact={compact}
                      zone={tz === "NY" ? NY_ZONE : LOCAL_ZONE}
                      zoneLabel={tz}
                    />


                  ))}
                </div>
              </section>
            </>
          )}
    </div>
  );
}

function ClockCell({
  label,
  value,
  zone,
}: {
  label: string;
  value: string;
  zone: string;
}) {
  return (
    <div className="glass-inset flex flex-col gap-1 p-3">
      <span className="text-[11px] text-[#6a7076]">{label}</span>
      <span className="font-mono text-[19px] text-[#d7dbe0] tabular">{value}</span>
      <span className="font-mono text-[10px] text-[#6a7076]">{zone}</span>
    </div>
  );
}
