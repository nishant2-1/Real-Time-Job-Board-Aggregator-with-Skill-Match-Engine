import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

import JobCard from "../components/JobCard";
import { useJobs } from "../hooks/useJobs";
import { getResume, saveJob } from "../services/api";
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

function formatSalaryLabel(salaryMin?: number | null, salaryMax?: number | null, currency?: string | null): string {
  if (salaryMin == null && salaryMax == null) {
    return "Salary hidden";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
  });

  if (salaryMin != null && salaryMax != null) {
    return `${formatter.format(salaryMin)} - ${formatter.format(salaryMax)}`;
  }

  if (salaryMin != null) {
    return `From ${formatter.format(salaryMin)}`;
  }

  return `Up to ${formatter.format(salaryMax ?? 0)}`;
}

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"match_score" | "date" | "salary">("match_score");
  const [searchInput, setSearchInput] = useState("");
  const [jobView, setJobView] = useState<"all" | "remote" | "visa">("all");
  const [minSalaryInput, setMinSalaryInput] = useState("");
  const [minMatch, setMinMatch] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchInput.trim());
  const deferredMinSalary = useDeferredValue(minSalaryInput);
  const minSalary = deferredMinSalary ? Number(deferredMinSalary) : undefined;
  const remoteOnly = jobView === "remote" ? true : undefined;
  const visaOnly = jobView === "visa" ? true : undefined;

  const { data, isLoading, isFetching } = useJobs({
    page,
    limit: 20,
    sort,
    query: deferredSearch || undefined,
    remote: remoteOnly,
    visa_sponsorship: visaOnly,
    min_salary: Number.isFinite(minSalary) ? minSalary : undefined,
    min_match: minMatch,
  });
  const { data: visaJobs } = useJobs({
    page: 1,
    limit: 4,
    sort: "date",
    visa_sponsorship: true,
  });
  const { data: resume } = useQuery({
    queryKey: ["resume"],
    queryFn: getResume,
    staleTime: 60_000,
  });
  const { data: savedIds = [] } = useSavedJobs();
  const updateSavedIds = useSavedJobsUpdater();
  const saveDetailMutation = useMutation({
    mutationFn: (jobId: string) => saveJob(jobId),
    onSuccess: ({ job_id, saved }) => {
      updateSavedIds((ids) => (saved ? Array.from(new Set([...ids, job_id])) : ids.filter((id) => id !== job_id)));
      toast.success(saved ? "Saved job" : "Removed from saved jobs");
    },
    onError: () => {
      toast.error("Unable to update saved jobs");
    },
  });

  const jobs = useMemo(() => data?.items ?? [], [data?.items]);
  const featuredVisaJobs = useMemo(() => visaJobs?.items ?? [], [visaJobs?.items]);
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? featuredVisaJobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null,
    [featuredVisaJobs, jobs, selectedJobId],
  );
  const remoteCount = jobs.filter((job) => job.is_remote).length;
  const visaCount = jobs.filter((job) => job.visa_sponsorship).length;
  const averageMatch = jobs.length
    ? Math.round(jobs.reduce((total, job) => total + (job.match_pct ?? 0), 0) / jobs.length)
    : 0;
  const totalPages = Math.max(1, data?.pages ?? 1);
  const pagination = useMemo(() => {
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  useEffect(() => {
    if (!jobs.length) {
      setSelectedJobId(null);
      return;
    }

    setSelectedJobId((current) => (current && jobs.some((job) => job.id === current) ? current : jobs[0].id));
  }, [jobs]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Jobs</p>
          <h1 className="mt-2 font-display text-4xl font-bold">Live roles ranked by your resume</h1>
          <p className="mt-3 max-w-3xl text-radar-700">Search across global roles, narrow to remote jobs, or focus on visa-sponsored openings without losing the broader market view.</p>
        </div>
        <div className="rounded-2xl bg-radar-100 px-4 py-3 text-sm text-radar-700">
          Showing {jobs.length} of {data?.total ?? 0} jobs {isFetching ? "• refreshing" : ""}
        </div>
      </div>

      {!resume ? (
        <div className="card rounded-[1.75rem] border border-amber-200 bg-amber-50/70 text-radar-800">
          <p className="font-semibold">Upload your resume to unlock real match scoring.</p>
          <p className="mt-2 text-sm text-radar-700">Until then, JobRadar will still show live jobs, but match percentages will stay at 0% because no resume has been parsed yet.</p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card rounded-[1.75rem]">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All global roles" },
              { key: "remote", label: "Remote-first roles" },
              { key: "visa", label: "Visa-sponsored roles" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setPage(1);
                  setJobView(item.key as "all" | "remote" | "visa");
                }}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  jobView === item.key ? "bg-radar-900 text-white" : "bg-radar-100 text-radar-700 hover:bg-radar-200",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-radar-800">Search title, company, location, or keyword</span>
              <input
                value={searchInput}
                onChange={(event) => {
                  setPage(1);
                  setSearchInput(event.target.value);
                }}
                className="field"
                placeholder="Search software engineer, Germany, React, backend..."
              />
            </label>
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
                <option value="date">Newest first</option>
                <option value="salary">Highest salary</option>
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
                placeholder="Optional"
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
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
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setSearchInput("");
                setSort("match_score");
                setJobView("all");
                setMinSalaryInput("");
                setMinMatch(0);
              }}
              className="rounded-2xl border border-radar-300 px-4 py-3 text-sm font-semibold text-radar-800 transition hover:border-radar-700"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="card rounded-[1.75rem]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Market snapshot</p>
          <h2 className="mt-2 font-display text-2xl font-bold">Browse it like a real hiring board</h2>
          <p className="mt-2 text-sm text-radar-700">Use the left rail to scan quickly, then keep one role open in the detail cockpit while you compare match quality, skill gaps, and application signals.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl bg-radar-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Jobs on screen</p>
              <p className="mt-2 font-display text-3xl font-bold text-radar-900">{jobs.length}</p>
              <p className="mt-1 text-sm text-radar-700">from {data?.total ?? 0} total indexed roles</p>
            </div>
            <div className="rounded-2xl bg-radar-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Remote on page</p>
              <p className="mt-2 font-display text-3xl font-bold text-radar-900">{remoteCount}</p>
              <p className="mt-1 text-sm text-radar-700">matching the current view</p>
            </div>
            <div className="rounded-2xl bg-radar-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Average match</p>
              <p className="mt-2 font-display text-3xl font-bold text-radar-900">{averageMatch}%</p>
              <p className="mt-1 text-sm text-radar-700">based on the visible job set</p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? <JobsSkeleton /> : null}

      {!isLoading && jobs.length ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved={savedIds.includes(job.id)}
                isSelected={job.id === selectedJob?.id}
                onSelect={setSelectedJobId}
                onToggleSaved={(jobId) => {
                  updateSavedIds((ids) => (ids.includes(jobId) ? ids.filter((id) => id !== jobId) : [...ids, jobId]));
                }}
              />
            ))}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
            <div className="card rounded-[1.75rem]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Selected role</p>
              {selectedJob ? (
                <div className="mt-4 space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-3xl font-bold text-radar-900">{selectedJob.title}</h2>
                      {selectedJob.is_remote ? <span className="rounded-full bg-alert-green/15 px-3 py-1 text-xs font-semibold text-alert-green">Remote</span> : null}
                      {selectedJob.visa_sponsorship ? <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Visa sponsored</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-radar-700">{selectedJob.company} • {selectedJob.location}</p>
                    <p className="mt-2 text-sm text-radar-700">{selectedJob.source?.toUpperCase()} • Posted {new Date(selectedJob.posted_at).toLocaleDateString()}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-2xl bg-radar-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Match score</p>
                      <p className="mt-2 font-display text-2xl font-bold text-radar-900">{selectedJob.match_pct ?? 0}%</p>
                    </div>
                    <div className="rounded-2xl bg-radar-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Compensation</p>
                      <p className="mt-2 text-sm font-semibold text-radar-900">{formatSalaryLabel(selectedJob.salary_min, selectedJob.salary_max, selectedJob.salary_currency)}</p>
                    </div>
                    <div className="rounded-2xl bg-radar-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Skill gaps</p>
                      <p className="mt-2 text-sm font-semibold text-radar-900">{selectedJob.missing_skills.length}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Top matched skills</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedJob.matched_skills.length ? selectedJob.matched_skills.slice(0, 6).map((skill) => (
                        <span key={skill} className="rounded-full bg-radar-100 px-3 py-1 text-xs font-medium text-radar-700">
                          {skill}
                        </span>
                      )) : <span className="text-sm text-radar-700">Upload a resume to see stronger matching.</span>}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Watch-outs</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedJob.missing_skills.length ? selectedJob.missing_skills.slice(0, 6).map((skill) => (
                        <span key={skill} className="rounded-full bg-alert-red/10 px-3 py-1 text-xs font-medium text-alert-red">
                          missing {skill}
                        </span>
                      )) : <span className="text-sm text-radar-700">No major gaps identified for this role.</span>}
                    </div>
                  </div>

                  {selectedJob.top_keywords.length ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Hiring signals</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedJob.top_keywords.slice(0, 6).map((keyword) => (
                          <span key={keyword} className="rounded-full bg-radar-50 px-3 py-1 text-xs font-medium text-radar-700">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedJob.description_clean ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Role brief</p>
                      <p className="mt-3 text-sm leading-6 text-radar-800">{selectedJob.description_clean}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    {selectedJob.url ? (
                      <a
                        href={selectedJob.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl bg-radar-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-radar-700"
                      >
                        Open original listing
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => saveDetailMutation.mutate(selectedJob.id)}
                      disabled={saveDetailMutation.isPending}
                      className="rounded-2xl border border-radar-300 px-4 py-3 text-sm font-semibold text-radar-800 transition hover:border-radar-700"
                    >
                      {saveDetailMutation.isPending ? "Updating shortlist..." : savedIds.includes(selectedJob.id) ? "Saved in shortlist" : "Shortlist this role"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-radar-700">Pick a role from the list to inspect it here.</p>
              )}
            </div>

            <div className="card rounded-[1.75rem]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Visa spotlight</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Global mobility signals</h2>
              <p className="mt-2 text-sm text-radar-700">Roles here mention sponsorship, relocation, immigration support, or work-authorization language.</p>
              <div className="mt-4 space-y-3">
                {featuredVisaJobs.slice(0, 4).map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className="w-full rounded-2xl bg-radar-50 px-4 py-3 text-left transition hover:bg-radar-100"
                  >
                    <p className="font-semibold text-radar-900">{job.title}</p>
                    <p className="mt-1 text-sm text-radar-700">{job.company} • {job.location}</p>
                  </button>
                ))}
                {!featuredVisaJobs.length ? <p className="text-sm text-radar-700">Run the scraper or wait for the next sync to populate sponsorship-tagged roles.</p> : null}
                <p className="text-sm text-radar-700">Visible visa-signal roles on this page: {visaCount}</p>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {!isLoading && !jobs.length ? (
        <div className="card rounded-[1.75rem] border border-dashed border-radar-300/80 bg-radar-50 py-16 text-center">
          <h2 className="font-display text-2xl font-bold">No jobs match the current search</h2>
          <p className="mt-3 text-radar-700">Try clearing filters, lowering salary or match requirements, or switching between all roles, remote, and visa-sponsored views.</p>
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
