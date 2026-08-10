import { useEffect, useState } from "react";
import { DateTime } from "luxon";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<DateTime | null>(null);

  useEffect(() => {
    setNow(DateTime.now());
    const id = setInterval(() => setNow(DateTime.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
