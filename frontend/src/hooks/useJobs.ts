import { useQuery } from "@tanstack/react-query";

import api from "../services/api";
import type { JobsResponse } from "../types/job";

interface UseJobsParams {
  page: number;
  limit: number;
  sort: "match_score" | "posted_at" | "company";
  filter?: string;
  location?: string;
  min_salary?: number;
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
