import { useEffect, useState } from "react";

export type TzPref = "NY" | "AMS";

const KEY = "krekelstrat.tz";

function read(): TzPref {
  if (typeof window === "undefined") return "NY";
  return window.localStorage.getItem(KEY) === "AMS" ? "AMS" : "NY";
}

/** Timezone preference shared across the app, persisted in the browser. */
export function useTzPref() {
  const [tz, setTzState] = useState<TzPref>("NY");

  useEffect(() => {
    setTzState(read());
    const onChange = () => setTzState(read());
    window.addEventListener("krekelstrat-tz", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("krekelstrat-tz", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function setTz(next: TzPref) {
    setTzState(next);
    window.localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event("krekelstrat-tz"));
  }

  return { tz, setTz };
}
