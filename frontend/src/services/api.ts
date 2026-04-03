import axios, { AxiosError, type AxiosProgressEvent, type InternalAxiosRequestConfig } from "axios";

import type {
  AuthTokens,
  AdminOverview,
  Job,
  JobFilters,
  LoginPayload,
  PaginatedResponse,
  RegisterPayload,
  Resume,
  ResumeUpdatePayload,
  ResumeUploadPayload,
  SaveJobResponse,
  ScraperStatus,
  ScraperTriggerResponse,
  User,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const ACCESS_TOKEN_KEY = "jobrador_access_token";
export const REFRESH_TOKEN_KEY = "jobrador_refresh_token";
export const USER_KEY = "jobrador_user";

const authClient = axios.create({ baseURL: BASE_URL });
const api = axios.create({ baseURL: BASE_URL });

let refreshPromise: Promise<AuthTokens> | null = null;
let authFailureHandler: (() => void) | null = null;

function toUser(input: Partial<User> & { email: string }): User {
  return {
    id: input.id,
    email: input.email,
    fullName: input.fullName || input.email.split("@")[0] || "JobRadar User",
  };
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    return toUser(JSON.parse(raw) as User);
  } catch {
    return null;
  }
}

export function persistAuthSession(tokens: AuthTokens, user: User): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function registerAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler;
}

function handleAuthFailure(): void {
  clearAuthSession();
  if (authFailureHandler) {
    authFailureHandler();
    return;
  }
  window.location.assign("/login");
}

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? "";

    if (!originalRequest || status !== 401 || originalRequest._retry || requestUrl.includes("/auth/refresh")) {
      throw error;
    }

    const refreshTokenValue = getStoredRefreshToken();
    if (!refreshTokenValue) {
      handleAuthFailure();
      throw error;
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshToken(refreshTokenValue).finally(() => {
          refreshPromise = null;
        });
      }
      const tokens = await refreshPromise;
      originalRequest.headers.set("Authorization", `Bearer ${tokens.access_token}`);
      return api(originalRequest);
    } catch {
      handleAuthFailure();
      throw error;
    }
  },
);

type BackendJobsResponse = {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const response = await authClient.post<AuthTokens>("/auth/login", payload);
  return response.data;
}

export async function register(payload: RegisterPayload): Promise<AuthTokens> {
  const response = await authClient.post<AuthTokens>("/auth/register", payload);
  return response.data;
}

export async function refreshToken(refresh_token: string): Promise<AuthTokens> {
  const response = await authClient.post<AuthTokens>("/auth/refresh", { refresh_token });
  const existingUser = getStoredUser();
  if (existingUser) {
    persistAuthSession(response.data, existingUser);
  } else {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
  }
  return response.data;
}

export async function uploadResume(payload: ResumeUploadPayload): Promise<Resume> {
  const formData = new FormData();
  formData.append("file", payload.file);

  const response = await api.post<Resume>("/resume/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (!event.total || !payload.onUploadProgress) {
        return;
      }
      payload.onUploadProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return response.data;
}

export async function getResume(): Promise<Resume | null> {
  try {
    const response = await api.get<Resume>("/resume/me");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function updateResume(payload: ResumeUpdatePayload): Promise<Resume> {
  const response = await api.patch<Resume>("/resume/me", payload);
  return response.data;
}

export async function deleteResume(): Promise<{ deleted: boolean }> {
  const response = await api.delete<{ deleted: boolean }>("/resume/me");
  return response.data;
}

export async function getJobs(params: JobFilters): Promise<PaginatedResponse<Job>> {
  const response = await api.get<BackendJobsResponse>("/jobs", { params });
  return {
    items: response.data.jobs,
    total: response.data.total,
    page: response.data.page,
    limit: response.data.limit,
    pages: response.data.pages,
  };
}

export async function getJob(id: string): Promise<Job> {
  const response = await api.get<Job>(`/jobs/${id}`);
  return response.data;
}

export async function saveJob(id: string): Promise<SaveJobResponse> {
  const response = await api.post<SaveJobResponse>(`/jobs/${id}/save`);
  return response.data;
}

export async function getScraperStatus(): Promise<ScraperStatus> {
  const response = await api.get<ScraperStatus>("/scraper/status");
  return response.data;
}

export async function triggerScraper(): Promise<ScraperTriggerResponse> {
  const response = await api.post<ScraperTriggerResponse>("/scraper/trigger");
  return response.data;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const response = await api.get<AdminOverview>("/admin/overview");
  return response.data;
}

export default api;
