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
  match_score?: number | null;
  top_matched_skills: string[];
  missing_skills: string[];
  posted_at: string;
}

export interface PaginationMeta {
  total_count: number;
  page: number;
  limit: number;
}

export interface JobsResponse {
  data: JobItem[];
  pagination: PaginationMeta;
}

export interface ScraperSourceStatus {
  source: string;
  last_finished_at: string;
  jobs_inserted: number;
  jobs_updated: number;
}

export interface ScraperStatusResponse {
  sources: ScraperSourceStatus[];
}
