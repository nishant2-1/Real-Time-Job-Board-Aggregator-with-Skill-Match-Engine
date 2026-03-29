import { useQuery } from "@tanstack/react-query";

import { getJobs } from "../services/api";
import type { JobFilters, JobItem, JobsResponse } from "../types/job";

export function useJobs(params: JobFilters) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: () => getJobs(params),
    refetchInterval: 60_000,
  });
}

export type { JobItem, JobsResponse };
