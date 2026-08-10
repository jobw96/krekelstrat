import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DateTime } from "luxon";

import { Activity, Bell, BellOff, Clock, Timer } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { useMnq } from "@/hooks/useMnq";
import {
  computeState,
  formatCountdown,
  LOCAL_ZONE,
  NY_ZONE,
  SESSIONS,
} from "@/lib/sessions";
import { SessionCard } from "@/components/dashboard/SessionCard";
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

function Dashboard() {
  const now = useNow();
  const mnq = useMnq();
  const [sound, setSound] = useState(false);
  const state = now ? computeState(now) : null;
  useBeep(sound, state?.secondsToNext ?? 9999);

  return (
    <main className="min-h-screen bg-[#08090a]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <nav className="flex items-center justify-between border-b border-[#23252a] pb-4">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[#e4f222]" strokeWidth={1.5} />
            <span className="text-[16px] text-[#ffffff]" style={{ fontWeight: 510 }}>
              Session Terminal
            </span>
            <span className="ml-2 font-mono text-[12px] text-[#62666d]">NQ / MNQ</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[11px] text-[#62666d] sm:inline">
              MNQ=F · Yahoo Finance · ~10 min delayed
              {mnq.data?.quoteTime
                ? ` · quote ${DateTime.fromMillis(mnq.data.quoteTime)
                    .setZone(LOCAL_ZONE)
                    .toFormat("HH:mm")} AMS`
                : ""}
            </span>

          <button
            onClick={() => setSound((s) => !s)}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] transition-colors"
            style={
              sound
                ? { background: "#e4f222", color: "#08090a", fontWeight: 510 }
                : { background: "rgba(255,255,255,0.05)", color: "#d0d6e0" }
            }
          >
            {sound ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
            {sound ? "Alerts on" : "Alerts off"}
          </button>
          </div>
        </nav>

        {now && state && (
          <ActiveSessionBar
            state={state}
            now={now}
            price={mnq.data?.price ?? null}
            candles={mnq.data?.candles ?? []}
          />
        )}



        {/* Hero */}
        <section className="grid gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={state?.active?.def.id ?? "none"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[13px]"
                style={{ background: "rgba(255,255,255,0.05)", color: "#d0d6e0" }}
              >
                <Dot
                  color={state?.active ? toneColor[state.active.def.tone] : "#62666d"}
                  pulse={Boolean(state?.active)}
                />
                {state?.active ? state.active.def.name : "No session active"}
              </motion.div>
            </AnimatePresence>

            <h1
              className="text-[48px] leading-none text-[#ffffff] lg:text-[64px]"
              style={{ letterSpacing: "-0.022em", fontWeight: 510 }}
            >
              {state?.active ? state.active.def.tag : "Between sessions"}
            </h1>
            <p className="max-w-[46ch] text-[16px] text-[#8a8f98]">
              {state?.active
                ? state.active.def.focus
                : `Next up is ${state?.next.def.name ?? "—"} — stay flat and let the model come to you.`}
            </p>

            {state?.active && (
              <div className="flex flex-col gap-2">
                <div className="h-px w-full bg-[#23252a]">
                  <motion.div
                    className="h-px"
                    style={{ background: toneColor[state.active.def.tone] }}
                    animate={{ width: `${state.progress * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[12px] text-[#62666d]">
                  <span>Elapsed {Math.round(state.progress * 100)}%</span>
                  <span>
                    Ends {state.active.end.setZone(LOCAL_ZONE).toFormat("HH:mm")} AMS
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="card-surface flex flex-col gap-6 p-6">
            <div className="flex items-center gap-2 text-[13px] text-[#8a8f98]">
              <Timer className="size-3.5" strokeWidth={1.5} />
              Countdown to {state?.next.def.name ?? "—"}
            </div>
            <div
              className="font-mono text-[48px] leading-none text-[#ffffff] tabular"
              style={{ letterSpacing: "-0.03em" }}
            >
              {state ? formatCountdown(state.secondsToNext) : "--:--:--"}
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-[#23252a] pt-4">
              <ClockCell
                label="Amsterdam"
                value={now ? now.setZone(LOCAL_ZONE).toFormat("HH:mm:ss") : "--:--:--"}
                zone={now ? now.setZone(LOCAL_ZONE).toFormat("ZZZZ") : ""}
              />
              <ClockCell
                label="New York"
                value={now ? now.setZone(NY_ZONE).toFormat("HH:mm:ss") : "--:--:--"}
                zone={now ? now.setZone(NY_ZONE).toFormat("ZZZZ") : ""}
              />
            </div>
          </div>
        </section>

        {now && state && (
          <>
            <TimelineBar now={now} />

            <section className="pt-16 pb-24">
              <div className="mb-6 flex items-center gap-2">
                <Clock className="size-3.5 text-[#62666d]" strokeWidth={1.5} />
                <h2 className="text-[15px] tracking-[-0.011em] text-[#d0d6e0]">
                  Sessions & Volume Windows
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SESSIONS.map((def) => (
                  <SessionCard
                    key={def.id}
                    def={def}
                    state={state}
                    now={now}
                    price={mnq.data?.price ?? null}
                    candles={mnq.data?.candles ?? []}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
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
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-[#62666d]">{label}</span>
      <span className="font-mono text-[20px] text-[#d0d6e0] tabular">{value}</span>
      <span className="font-mono text-[10px] text-[#62666d]">{zone}</span>
    </div>
  );
}
