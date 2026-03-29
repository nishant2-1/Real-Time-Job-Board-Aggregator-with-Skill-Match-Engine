import clsx from "clsx";

import type { JobItem } from "../types/job";

function badgeColor(match?: number | null): string {
  if (!match && match !== 0) return "bg-slate-200 text-slate-700";
  if (match > 70) return "bg-alert-green/15 text-alert-green";
  if (match >= 40) return "bg-alert-amber/15 text-alert-amber";
  return "bg-alert-red/15 text-alert-red";
}

export default function JobCard({ job }: { job: JobItem }) {
  const hasScore = job.match_pct !== null && job.match_pct !== undefined;

  return (
    <article className="card space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {job.company_logo_url ? (
            <img
              src={job.company_logo_url}
              alt={`${job.company} logo`}
              className="h-10 w-10 rounded-md border border-radar-300/60 object-cover"
              loading="lazy"
            />
          ) : null}
          <div>
            <h3 className="font-display text-lg font-bold">{job.title}</h3>
            <p className="text-sm text-radar-700">{job.company} • {job.location}</p>
          </div>
        </div>
        <span className={clsx("rounded-full px-3 py-1 text-sm font-semibold", badgeColor(job.match_pct))}>
          {hasScore ? `${job.match_pct}%` : "N/A"}
        </span>
      </header>

      <div className="flex flex-wrap gap-2">
        {job.matched_skills.slice(0, 5).map((skill) => (
          <span key={skill} className="rounded-full bg-radar-100 px-2 py-1 text-xs text-radar-700">
            {skill}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {job.missing_skills.slice(0, 5).map((skill) => (
          <span key={skill} className="rounded-full bg-alert-red/10 px-2 py-1 text-xs text-alert-red">
            Missing: {skill}
          </span>
        ))}
      </div>
    </article>
  );
}
