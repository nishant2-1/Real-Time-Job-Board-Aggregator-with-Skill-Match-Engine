import { useQuery, useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "jobrador_saved_job_ids";
export const SAVED_JOBS_QUERY_KEY = ["saved-job-ids"] as const;

function readSavedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function writeSavedIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(ids)).sort()));
}

export function useSavedJobs() {
  return useQuery({
    queryKey: SAVED_JOBS_QUERY_KEY,
    queryFn: async () => readSavedIds(),
    initialData: readSavedIds,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSavedJobsUpdater() {
  const queryClient = useQueryClient();

  return (updater: (ids: string[]) => string[]) => {
    const current = (queryClient.getQueryData<string[]>(SAVED_JOBS_QUERY_KEY) ?? readSavedIds()).slice();
    const next = Array.from(new Set(updater(current)));
    writeSavedIds(next);
    queryClient.setQueryData(SAVED_JOBS_QUERY_KEY, next);
  };
}
