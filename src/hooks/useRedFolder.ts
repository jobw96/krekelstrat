import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRedFolderEvents } from "@/lib/news.functions";

/** High-impact US economic events for the week, refreshed every minute. */
export function useRedFolder() {
  const fetchEvents = useServerFn(getRedFolderEvents);
  return useQuery({
    queryKey: ["red-folder-events"],
    queryFn: () => fetchEvents(),
    refetchInterval: 60_000,
    staleTime: 45_000,
  });
}
