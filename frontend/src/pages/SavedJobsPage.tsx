import { useQueries } from "@tanstack/react-query";

import JobCard from "../components/JobCard";
import { useSavedJobs, useSavedJobsUpdater } from "../hooks/useSavedJobs";
import { getJob } from "../services/api";

export default function SavedJobsPage() {
  const { data: savedIds = [] } = useSavedJobs();
  const updateSavedIds = useSavedJobsUpdater();
  const jobQueries = useQueries({
    queries: savedIds.map((jobId) => ({
      queryKey: ["job", jobId],
      queryFn: () => getJob(jobId),
      staleTime: 60_000,
    })),
  });

  const jobs = jobQueries.flatMap((query) => (query.data ? [query.data] : []));
  const isLoading = jobQueries.some((query) => query.isLoading);

  if (!savedIds.length) {
    return (
      <section className="space-y-3">
        <h1 className="font-display text-3xl font-bold">Saved Jobs</h1>
        <div className="rounded-3xl border border-dashed border-radar-300 bg-radar-50 p-10 text-center text-radar-700">
          No saved jobs yet. Bookmark interesting roles from the jobs page.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Saved Jobs</h1>
        <p className="mt-2 text-radar-700">Your bookmarked opportunities stay here for quick follow-up.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: Math.min(4, savedIds.length) }).map((_, index) => (
            <div key={index} className="card h-48 animate-pulse bg-radar-100/80" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={savedIds.includes(job.id)}
              onToggleSaved={(jobId) => {
                updateSavedIds((ids) => (ids.includes(jobId) ? ids.filter((id) => id !== jobId) : [...ids, jobId]));
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
