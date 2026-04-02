export interface User {
  id?: string;
  email: string;
  fullName: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

export interface JobMatch {
  match_pct: number;
  matched_skills: string[];
  missing_skills: string[];
  top_keywords: string[];
}

export interface Job extends JobMatch {
  id: string;
  title: string;
  company: string;
  company_logo_url?: string | null;
  location: string;
  is_remote: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  posted_at: string;
  source?: string;
  url?: string;
  description_raw?: string;
  description_clean?: string;
  tags?: string[];
  visa_sponsorship?: boolean;
}

export interface Resume {
  resume_id: string;
  skills: string[];
  job_titles: string[];
  years_experience: number;
  education_level: string;
  uploaded_at: string;
  original_filename?: string;
  file_type?: string;
}

export interface ResumeUpdatePayload {
  skills: string[];
  job_titles: string[];
  years_experience: number;
  education_level: string;
}

export interface ResumeUploadPayload {
  file: File;
  onUploadProgress?: (progress: number) => void;
}

export interface ScraperSourceStat {
  source: string;
  last_finished_at: string;
  jobs_found: number;
  jobs_new: number;
  jobs_updated: number;
  jobs_total: number;
  status: string;
}

export interface ScraperStatus {
  last_scrape_time: string | null;
  next_run: string;
  sources: ScraperSourceStat[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface JobFilters {
  sort?: "match_score" | "date" | "salary";
  query?: string;
  remote?: boolean;
  visa_sponsorship?: boolean;
  min_match?: number;
  page?: number;
  limit?: number;
  min_salary?: number;
}

export interface SaveJobResponse {
  job_id: string;
  saved: boolean;
}

export interface ScraperTriggerResponse {
  task_id: string;
  status: string;
  message: string;
}
