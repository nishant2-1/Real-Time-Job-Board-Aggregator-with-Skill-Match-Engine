import { useQuery } from "@tanstack/react-query";

import api from "../services/api";
import type { JobsResponse } from "../types/job";

interface UseJobsParams {
  page: number;
  limit: number;
  sort: "match_score" | "date" | "salary";
  remote?: boolean;
  min_salary?: number;
  min_match?: number;
}

export function useJobs(params: UseJobsParams) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: async () => {
      const response = await api.get<JobsResponse>("/jobs", { params });
      return response.data;
    },
    refetchInterval: 60_000,
  });
}
