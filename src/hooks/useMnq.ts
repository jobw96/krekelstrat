import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMnqSeries } from "@/lib/mnq.functions";

/** Live MNQ 1-minute series, refreshed every 30s. */
export function useMnq() {
  const fetchSeries = useServerFn(getMnqSeries);
  return useQuery({
    queryKey: ["mnq-series"],
    queryFn: () => fetchSeries(),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}
