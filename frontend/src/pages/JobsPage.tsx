import { useState } from "react";

import JobCard from "../components/JobCard";
import { useJobs } from "../hooks/useJobs";

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"match_score" | "posted_at" | "company">("match_score");
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [location, setLocation] = useState("");
  const [minSalaryInput, setMinSalaryInput] = useState("");

  const minSalary = minSalaryInput ? Number(minSalaryInput) : undefined;

  const { data, isLoading } = useJobs({
    page,
    limit: 20,
    sort,
    filter: remoteOnly ? "remote" : undefined,
    location: location || undefined,
    min_salary: Number.isFinite(minSalary) ? minSalary : undefined,
  });

  if (isLoading) {
    return <div className="card">Loading jobs...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="card flex flex-wrap items-center gap-3">
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as "match_score" | "posted_at" | "company")}
          className="rounded-lg border border-radar-300 bg-white px-3 py-2"
        >
          <option value="match_score">Sort by match %</option>
          <option value="posted_at">Sort by date</option>
          <option value="company">Sort by company</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(event) => setRemoteOnly(event.target.checked)}
          />
          Remote only
        </label>
        <input
          value={location}
          onChange={(event) => {
            setPage(1);
            setLocation(event.target.value);
          }}
          placeholder="Filter by location"
          className="rounded-lg border border-radar-300 bg-white px-3 py-2"
        />
        <input
          type="number"
          min={0}
          value={minSalaryInput}
          onChange={(event) => {
            setPage(1);
            setMinSalaryInput(event.target.value);
          }}
          placeholder="Min salary"
          className="rounded-lg border border-radar-300 bg-white px-3 py-2"
        />
      </div>

      <div className="grid gap-4">
        {(data?.data ?? []).map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-lg border border-radar-300 px-4 py-2"
          disabled={page <= 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          Previous
        </button>
        <span className="text-sm text-radar-700">
          Page {page} of {Math.max(1, Math.ceil((data?.pagination.total_count ?? 0) / (data?.pagination.limit ?? 20)))}
        </span>
        <button
          type="button"
          className="rounded-lg border border-radar-300 px-4 py-2"
          disabled={page >= Math.max(1, Math.ceil((data?.pagination.total_count ?? 0) / (data?.pagination.limit ?? 20)))}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
