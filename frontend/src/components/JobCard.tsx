import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import toast from "react-hot-toast";

import { saveJob } from "../services/api";
import type { Job } from "../types";

function badgeColor(match?: number | null): string {
  if (!match && match !== 0) return "bg-slate-200 text-slate-700";
  if (match >= 70) return "bg-alert-green/15 text-alert-green";
  if (match >= 40) return "bg-alert-amber/15 text-alert-amber";
  return "bg-alert-red/15 text-alert-red";
}

function formatSalary(job: Job): string {
  if (job.salary_min == null && job.salary_max == null) {
    return "Salary not listed";
  }
  const currency = job.salary_currency ?? "USD";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  if (job.salary_min != null && job.salary_max != null) {
    return `${formatter.format(job.salary_min)} - ${formatter.format(job.salary_max)}`;
  }
  if (job.salary_min != null) {
    return `From ${formatter.format(job.salary_min)}`;
  }
  return `Up to ${formatter.format(job.salary_max ?? 0)}`;
}

interface JobCardProps {
  job: Job;
  isSaved: boolean;
  onToggleSaved: (jobId: string) => void;
}

export default function JobCard({ job, isSaved, onToggleSaved }: JobCardProps) {
  const score = job.match_pct ?? 0;
  const saveMutation = useMutation({
    mutationFn: () => saveJob(job.id),
    onMutate: () => onToggleSaved(job.id),
    onSuccess: () => {
      toast.success(isSaved ? "Removed from saved jobs" : "Saved job");
    },
    onError: () => {
      onToggleSaved(job.id);
      toast.error("Unable to update saved jobs");
    },
  });

  return (
    <article className="card space-y-5 rounded-[1.75rem] border border-radar-300/60 bg-white/95">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          {job.company_logo_url ? (
            <img
              src={job.company_logo_url}
              alt={`${job.company} logo`}
              className="h-12 w-12 rounded-2xl border border-radar-300/60 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-radar-100 font-semibold text-radar-700">{job.company.slice(0, 2).toUpperCase()}</div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-bold">{job.title}</h3>
              <span className="rounded-full bg-radar-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-radar-700">{job.source ?? "source"}</span>
              {job.is_remote ? <span className="rounded-full bg-alert-green/15 px-3 py-1 text-xs font-semibold text-alert-green">Remote</span> : null}
            </div>
            <p className="mt-2 text-sm text-radar-700">{job.company} • {job.location}</p>
            <p className="mt-2 text-sm text-radar-700">{formatSalary(job)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx("rounded-full px-4 py-2 text-sm font-semibold", badgeColor(job.match_pct))}>
            {`${score}% match`}
          </span>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            aria-label={isSaved ? "Unsave job" : "Save job"}
            className={clsx(
              "inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-lg transition",
              isSaved ? "border-radar-900 bg-radar-900 text-white" : "border-radar-300 text-radar-800 hover:border-radar-700",
            )}
          >
            {saveMutation.isPending ? "..." : isSaved ? "★" : "☆"}
          </button>
        </div>
      </header>

      {job.description_clean ? <p className="line-clamp-3 text-sm leading-6 text-radar-800">{job.description_clean}</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Matched skills</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {job.matched_skills.length ? (
              job.matched_skills.slice(0, 3).map((skill) => (
                <span key={skill} className="rounded-full bg-radar-100 px-3 py-1 text-xs font-medium text-radar-700">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-radar-600">No matched skills yet</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">Missing skills</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {job.missing_skills.length ? (
              job.missing_skills.slice(0, 2).map((skill) => (
                <span key={skill} className="rounded-full bg-alert-red/10 px-3 py-1 text-xs font-medium text-alert-red">
                  missing {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-radar-600">No major gaps identified</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-radar-200 pt-4 text-sm text-radar-700">
        <span>Posted {new Date(job.posted_at).toLocaleDateString()}</span>
        {job.url ? (
          <a href={job.url} target="_blank" rel="noreferrer" className="font-semibold text-radar-900 underline decoration-radar-300 underline-offset-4">
            Open listing
          </a>
        ) : null}
      </div>
    </article>
  );
}
