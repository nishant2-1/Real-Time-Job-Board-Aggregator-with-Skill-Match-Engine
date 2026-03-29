export interface JobItem {
  id: string;
  title: string;
  company: string;
  company_logo_url?: string | null;
  location: string;
  is_remote: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  match_pct: number;
  matched_skills: string[];
  missing_skills: string[];
  top_keywords: string[];
  posted_at: string;
}

export interface JobsResponse {
  jobs: JobItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ScraperSourceStatus {
  source: string;
  last_finished_at: string;
  jobs_found: number;
  jobs_new: number;
  jobs_updated: number;
  jobs_total: number;
}

export interface ScraperStatusResponse {
  last_scrape_time: string | null;
  next_run: string;
  sources: ScraperSourceStatus[];
}
