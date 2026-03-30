import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import toast from "react-hot-toast";

import { useJobs } from "../hooks/useJobs";
import { getResume, getScraperStatus, triggerScraper } from "../services/api";

const CHART_COLORS = ["#2f5b40", "#5f8f6f", "#89b497", "#c8dbc9", "#152a1d"];
const STATUS_COLOR: Record<string, string> = {
  success: "bg-alert-green",
  partial: "bg-alert-red",
  failed: "bg-alert-red",
};

export default function DashboardPage() {
  const { data } = useJobs({ page: 1, limit: 100, sort: "match_score", remote: true });
  const { data: resume } = useQuery({
    queryKey: ["resume"],
    queryFn: getResume,
    staleTime: 60_000,
  });
  const { data: scraperStatus } = useQuery({
    queryKey: ["scraper-status"],
    queryFn: getScraperStatus,
    refetchInterval: 60_000,
  });
  const triggerMutation = useMutation({
    mutationFn: triggerScraper,
    onSuccess: () => toast.success("Scraper triggered"),
    onError: () => toast.error("Unable to trigger scraper"),
  });

  const previousHighMatchIdsRef = useRef<string[]>([]);
  const previousScrapeTimestampRef = useRef<string>("");

  const summary = useMemo(() => {
    const items = data?.items ?? [];
    const total = data?.total ?? items.length;
    const avgMatch = total ? items.reduce((acc, item) => acc + item.match_pct, 0) / Math.max(1, items.length) : 0;
    const skillCounts = new Map<string, number>();
    items.forEach((job) => {
      job.matched_skills.forEach((skill) => {
        skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
      });
    });
    const topSkills = [...skillCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
    const today = new Date().toISOString().slice(0, 10);
    const newToday = items.filter((item) => item.posted_at.slice(0, 10) === today).length;
    const recentMatches = [...items].sort((left, right) => right.match_pct - left.match_pct).slice(0, 5);
    const highMatchIds = recentMatches.filter((job) => job.match_pct >= 70).map((job) => job.id);
    return { total, avgMatch, topSkills, newToday, recentMatches, highMatchIds };
  }, [data]);

  useEffect(() => {
    if (previousHighMatchIdsRef.current.length > 0) {
      const previousIds = new Set(previousHighMatchIdsRef.current);
      const incoming = summary.highMatchIds.filter((id) => !previousIds.has(id));
      if (incoming.length > 0) {
        toast.success(`New high-match jobs found: ${incoming.length}`);
      }
    }
    previousHighMatchIdsRef.current = summary.highMatchIds;
  }, [summary.highMatchIds]);

  useEffect(() => {
    const latestTimestamp =
      scraperStatus?.sources
        .map((source) => source.last_finished_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? "";

    if (latestTimestamp && previousScrapeTimestampRef.current && latestTimestamp !== previousScrapeTimestampRef.current) {
      toast("Scraper run completed. New listings may be available.");
    }
    if (latestTimestamp) {
      previousScrapeTimestampRef.current = latestTimestamp;
    }
  }, [scraperStatus]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">Overview</p>
          <h1 className="mt-2 font-display text-4xl font-bold">Your job search command center</h1>
          <p className="mt-3 max-w-2xl text-radar-700">Keep tabs on real-time scraper health, monitor resume coverage, and focus on the jobs with the highest relevance.</p>
        </div>
        <button
          type="button"
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
          className="inline-flex items-center justify-center gap-3 rounded-2xl bg-radar-700 px-5 py-3 font-semibold text-white transition hover:bg-radar-900"
        >
          {triggerMutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
          <span>{triggerMutation.isPending ? "Triggering scraper..." : "Trigger scraper"}</span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="metric-card">
          <p className="text-sm text-radar-700">Total Jobs</p>
          <p className="mt-3 font-display text-4xl font-bold">{summary.total}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-radar-700">New Today</p>
          <p className="mt-3 font-display text-4xl font-bold">{summary.newToday}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-radar-700">Avg Match %</p>
          <p className="mt-3 font-display text-4xl font-bold">{Math.round(summary.avgMatch)}%</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-radar-700">Resume Skills Count</p>
          <p className="mt-3 font-display text-4xl font-bold">{resume?.skills.length ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Skill match breakdown</h2>
              <p className="mt-2 text-sm text-radar-700">Top five matched skills across your freshest high-signal jobs.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.topSkills} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={2}>
                    {summary.topSkills.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {summary.topSkills.map((skill, index) => (
                <div key={skill.name} className="flex items-center justify-between rounded-2xl bg-radar-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="font-medium text-radar-900">{skill.name}</span>
                  </div>
                  <span className="text-sm text-radar-700">{skill.value} jobs</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-2xl font-bold">Scraper status</h2>
          <p className="mt-2 text-sm text-radar-700">Last scrape: {scraperStatus?.last_scrape_time ? new Date(scraperStatus.last_scrape_time).toLocaleString() : "Not yet run"}</p>
          <div className="mt-5 space-y-3">
            {scraperStatus?.sources.map((source) => (
              <div key={source.source} className="rounded-2xl border border-radar-300/50 bg-radar-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={["h-3 w-3 rounded-full", STATUS_COLOR[source.status] ?? "bg-alert-red"].join(" ")} />
                    <span className="font-semibold capitalize text-radar-900">{source.source}</span>
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-radar-500">{source.status}</span>
                </div>
                <p className="mt-2 text-sm text-radar-700">Last scraped {new Date(source.last_finished_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-radar-700">Next run: {scraperStatus?.next_run ? new Date(scraperStatus.next_run).toLocaleString() : "Pending"}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Recent top matches</h2>
          <span className="text-sm text-radar-700">Top 5 roles by match score</span>
        </div>
        <div className="mt-5 space-y-3">
          {summary.recentMatches.map((job) => (
            <div key={job.id} className="flex flex-col gap-3 rounded-2xl border border-radar-300/50 bg-radar-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-radar-900">{job.title}</p>
                <p className="text-sm text-radar-700">{job.company}</p>
              </div>
              <span className="rounded-full bg-alert-green/15 px-3 py-1 text-sm font-semibold text-alert-green">{job.match_pct}% match</span>
            </div>
          ))}
          {!summary.recentMatches.length ? <p className="text-radar-700">No matched jobs yet. Upload a resume to start ranking listings.</p> : null}
        </div>
      </div>
    </section>
  );
}
