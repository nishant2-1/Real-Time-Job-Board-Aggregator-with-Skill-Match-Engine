import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

import MatchScoreRing from "../components/MatchScoreRing";
import { useJobs } from "../hooks/useJobs";
import api from "../services/api";
import type { ScraperStatusResponse } from "../types/job";

export default function DashboardPage() {
  const { data } = useJobs({ page: 1, limit: 20, sort: "match_score", filter: "remote" });
  const { data: scraperStatus } = useQuery({
    queryKey: ["scraper-status"],
    queryFn: async () => {
      const response = await api.get<ScraperStatusResponse>("/scraper/status");
      return response.data;
    },
    refetchInterval: 60_000,
  });

  const previousBestScoreRef = useRef<number>(0);
  const previousScrapeTimestampRef = useRef<string>("");
  const hasInitializedToastsRef = useRef<boolean>(false);

  const summary = useMemo(() => {
    const items = data?.data ?? [];
    const total = items.length;
    const avgMatch = total ? items.reduce((acc, item) => acc + (item.match_score ?? 0), 0) / total : 0;
    const topSkills = [...new Set(items.flatMap((job) => job.top_matched_skills))].slice(0, 8);
    const bestScore = items.reduce((acc, item) => Math.max(acc, item.match_score ?? 0), 0);
    const today = new Date().toISOString().slice(0, 10);
    const newToday = items.filter((item) => item.posted_at.slice(0, 10) === today).length;
    return { total, avgMatch, topSkills, bestScore, newToday };
  }, [data]);

  useEffect(() => {
    if (
      hasInitializedToastsRef.current &&
      summary.bestScore > previousBestScoreRef.current &&
      summary.bestScore >= 70
    ) {
      toast.success(`New high match found: ${Math.round(summary.bestScore)}%`);
    }
    previousBestScoreRef.current = summary.bestScore;
    hasInitializedToastsRef.current = true;
  }, [summary.bestScore]);

  useEffect(() => {
    const latestTimestamp =
      scraperStatus?.sources
        ?.map((source) => source.last_finished_at)
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
      <div className="card flex flex-col items-center justify-between gap-6 md:flex-row">
        <MatchScoreRing score={summary.avgMatch} />
        <div>
          <h2 className="font-display text-2xl font-bold">Your Job Match Radar</h2>
          <p className="text-radar-700">Total tracked jobs: {summary.total}</p>
          <p className="text-radar-700">New today: {summary.newToday}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 font-display text-lg font-semibold">Top Matched Skills</h3>
        <div className="flex flex-wrap gap-2">
          {summary.topSkills.map((skill) => (
            <span key={skill} className="rounded-full bg-radar-100 px-3 py-1 text-sm text-radar-700">
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
