import { useDeferredValue, useMemo, useState } from "react";

import JobCard from "../components/JobCard";
import { useJobs } from "../hooks/useJobs";
import { useSavedJobs, useSavedJobsUpdater } from "../hooks/useSavedJobs";

function JobsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="card h-56 animate-pulse rounded-[1.75rem] bg-radar-100/70" />
      ))}
    </div>
  );
}

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"match_score" | "date" | "salary">("match_score");
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [minSalaryInput, setMinSalaryInput] = useState("50000");
  const [minMatch, setMinMatch] = useState(40);
  const deferredMinSalary = useDeferredValue(minSalaryInput);
  const minSalary = deferredMinSalary ? Number(deferredMinSalary) : undefined;

  const { data, isLoading, isFetching } = useJobs({
    page,
    limit: 12,
    sort,
    remote: remoteOnly ? true : undefined,
    min_salary: Number.isFinite(minSalary) ? minSalary : undefined,
    min_match: minMatch,
  });
  const { data: savedIds = [] } = useSavedJobs();
  const updateSavedIds = useSavedJobsUpdater();

  const jobs = data?.items ?? [];
  const totalPages = Math.max(1, data?.pages ?? 1);
  const pagination = useMemo(() => {
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Jobs</p>
          <h1 className="mt-2 font-display text-4xl font-bold">Live roles ranked by your resume</h1>
          <p className="mt-3 max-w-2xl text-radar-700">Filter for match quality and compensation, then save the strongest listings without leaving the feed.</p>
        </div>
        <div className="rounded-2xl bg-radar-100 px-4 py-3 text-sm text-radar-700">
          Showing {jobs.length} of {data?.total ?? 0} jobs {isFetching ? "• refreshing" : ""}
        </div>
      </div>

      <div className="card grid gap-4 rounded-[1.75rem] lg:grid-cols-[1fr_1fr_1.1fr_1.3fr]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-radar-800">Sort</span>
          <select
            value={sort}
            onChange={(event) => {
              setPage(1);
              setSort(event.target.value as "match_score" | "date" | "salary");
            }}
            className="field"
          >
            <option value="match_score">Sort by match %</option>
            <option value="date">Sort by date</option>
            <option value="salary">Sort by salary</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-radar-800">Min salary</span>
          <input
            type="number"
            min={0}
            value={minSalaryInput}
            onChange={(event) => {
              setPage(1);
              setMinSalaryInput(event.target.value);
            }}
            className="field"
            placeholder="50000"
          />
        </label>
        <label className="space-y-2">
          <span className="flex items-center justify-between text-sm font-semibold text-radar-800">
            <span>Minimum match</span>
            <span>{minMatch}%</span>
          </span>
          <input type="range" min={0} max={100} step={5} value={minMatch} onChange={(event) => {
            setPage(1);
            setMinMatch(Number(event.target.value));
          }} className="w-full" />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-radar-300/60 bg-radar-50 px-4 py-3 text-sm font-semibold text-radar-800">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(event) => {
              setPage(1);
              setRemoteOnly(event.target.checked);
            }}
            className="h-4 w-4 rounded border-radar-400"
          />
          Remote only
        </label>
      </div>

      {isLoading ? <JobsSkeleton /> : null}

      {!isLoading && jobs.length ? (
        <div className="grid gap-4">
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
      ) : null}

      {!isLoading && !jobs.length ? (
        <div className="card rounded-[1.75rem] border border-dashed border-radar-300/80 bg-radar-50 py-16 text-center">
          <h2 className="font-display text-2xl font-bold">No jobs match these filters</h2>
          <p className="mt-3 text-radar-700">Loosen the salary or match threshold to widen the search radius.</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          className="rounded-2xl border border-radar-300 px-4 py-3 font-semibold text-radar-800 transition hover:border-radar-700"
          disabled={page <= 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          Previous
        </button>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {pagination.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={[
                "h-11 w-11 rounded-2xl text-sm font-semibold transition",
                pageNumber === page ? "bg-radar-900 text-white" : "border border-radar-300 text-radar-800 hover:border-radar-700",
              ].join(" ")}
            >
              {pageNumber}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-2xl border border-radar-300 px-4 py-3 font-semibold text-radar-800 transition hover:border-radar-700"
          disabled={page >= totalPages}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
        >
          Next
        </button>
      </div>
    </section>
  );
}
