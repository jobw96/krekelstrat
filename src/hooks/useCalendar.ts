import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCalendarEvents } from "@/lib/news.functions";

/** Red (high) + orange (medium) impact USD events for the week. */
export function useCalendar() {
  const fetchEvents = useServerFn(getCalendarEvents);
  return useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => fetchEvents(),
    refetchInterval: 15 * 60_000,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
