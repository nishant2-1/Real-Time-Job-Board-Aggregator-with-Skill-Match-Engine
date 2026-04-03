import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { getAdminOverview } from "../services/api";

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Not available";
  }
  return new Date(value).toLocaleString();
}

function StorageRow({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <div className="rounded-2xl bg-radar-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-radar-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-radar-900">{String(value)}</p>
    </div>
  );
}

export default function AdminPage() {
  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
    retry: false,
    staleTime: 30_000,
  });

  if (isLoading) {
    return <section className="card">Loading admin overview...</section>;
  }

  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return (
      <section className="card space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Admin</p>
        <h1 className="font-display text-3xl font-bold text-radar-900">Admin access required</h1>
        <p className="max-w-2xl text-radar-700">This page is available only for emails listed in `ADMIN_EMAILS`. Add your email to the backend environment if you want to inspect users, storage, and scraper state from the UI.</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="card space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Admin</p>
        <h1 className="font-display text-3xl font-bold text-radar-900">Unable to load admin overview</h1>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-2xl bg-radar-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-radar-900"
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Admin</p>
          <h1 className="mt-2 font-display text-4xl font-bold">Storage, users, jobs, and scraper operations</h1>
          <p className="mt-3 max-w-3xl text-radar-700">Inspect where the platform stores its data, how much content is indexed, and what has happened in the latest scraper runs.</p>
        </div>
        <div className="rounded-2xl bg-radar-100 px-4 py-3 text-sm text-radar-700">
          Snapshot generated {formatDateTime(data.generated_at)} {isFetching ? "• refreshing" : ""}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="metric-card">
          <p className="text-sm text-radar-700">Registered users</p>
          <p className="mt-3 font-display text-4xl font-bold">{data.counts.users}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-radar-700">Uploaded resumes</p>
          <p className="mt-3 font-display text-4xl font-bold">{data.counts.resumes}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-radar-700">Indexed jobs</p>
          <p className="mt-3 font-display text-4xl font-bold">{data.counts.jobs}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-radar-700">Direct ATS jobs</p>
          <p className="mt-3 font-display text-4xl font-bold">{data.counts.direct_jobs}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-radar-700">Saved-job rows</p>
          <p className="mt-3 font-display text-4xl font-bold">{data.counts.saved_jobs}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-radar-700">Scraper run rows</p>
          <p className="mt-3 font-display text-4xl font-bold">{data.counts.scraper_runs}</p>
        </div>
      </div>

      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Runtime and storage</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StorageRow label="Environment" value={data.storage.app_env} />
          <StorageRow label="Version" value={data.storage.app_version} />
          <StorageRow label="Postgres" value={`${data.storage.postgres_host}:${data.storage.postgres_port}/${data.storage.postgres_db}`} />
          <StorageRow label="Redis" value={`${data.storage.redis_host}:${data.storage.redis_port}/${data.storage.redis_db}`} />
          <StorageRow label="Rate limit" value={data.storage.rate_limit_default} />
          <StorageRow label="Scrape interval" value={`${data.storage.scrape_interval_minutes} min`} />
          <StorageRow label="Match cache TTL" value={`${data.storage.match_cache_ttl_seconds} sec`} />
          <StorageRow label="Allowed origins" value={data.storage.cors_origin_count} />
          <StorageRow label="Admin emails" value={data.storage.admin_email_count} />
          <StorageRow label="Adzuna configured" value={data.storage.adzuna_configured} />
          <StorageRow label="Greenhouse boards" value={data.storage.greenhouse_board_count} />
          <StorageRow label="Lever companies" value={data.storage.lever_company_count} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="card">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Recent users</p>
          <div className="mt-4 space-y-3">
            {data.recent_users.map((user) => (
              <div key={user.id} className="rounded-2xl border border-radar-300/50 bg-radar-50 px-4 py-3">
                <p className="font-semibold text-radar-900">{user.full_name}</p>
                <p className="text-sm text-radar-700">{user.email}</p>
                <p className="mt-2 text-xs text-radar-500">Joined {formatDateTime(user.created_at)} • Last login {formatDateTime(user.last_login_at)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Recent jobs</p>
          <div className="mt-4 space-y-3">
            {data.recent_jobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-radar-300/50 bg-radar-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-radar-900">{job.title}</p>
                  <span className="rounded-full bg-radar-100 px-3 py-1 text-xs font-semibold text-radar-700">{job.source}</span>
                  {job.is_remote ? <span className="rounded-full bg-alert-green/15 px-3 py-1 text-xs font-semibold text-alert-green">Remote</span> : null}
                </div>
                <p className="mt-1 text-sm text-radar-700">{job.company} • {job.location}</p>
                <p className="mt-2 text-xs text-radar-500">Posted {formatDateTime(job.posted_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Latest scraper runs</p>
        <div className="mt-4 overflow-x-auto scrollbar-thin">
          <table className="min-w-full text-left text-sm text-radar-800">
            <thead>
              <tr className="border-b border-radar-300/60 text-radar-500">
                <th className="px-3 py-3 font-semibold">Source</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Fetched</th>
                <th className="px-3 py-3 font-semibold">Inserted</th>
                <th className="px-3 py-3 font-semibold">Updated</th>
                <th className="px-3 py-3 font-semibold">Started</th>
                <th className="px-3 py-3 font-semibold">Finished</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_scraper_runs.map((run) => (
                <tr key={run.id} className="border-b border-radar-200/70 align-top last:border-b-0">
                  <td className="px-3 py-3 font-semibold capitalize text-radar-900">{run.source}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-radar-100 px-3 py-1 text-xs font-semibold text-radar-700">{run.status}</span>
                    {run.error_message ? <p className="mt-2 max-w-xs text-xs text-alert-red">{run.error_message}</p> : null}
                  </td>
                  <td className="px-3 py-3">{run.jobs_fetched}</td>
                  <td className="px-3 py-3">{run.jobs_inserted}</td>
                  <td className="px-3 py-3">{run.jobs_updated}</td>
                  <td className="px-3 py-3">{formatDateTime(run.started_at)}</td>
                  <td className="px-3 py-3">{formatDateTime(run.finished_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}