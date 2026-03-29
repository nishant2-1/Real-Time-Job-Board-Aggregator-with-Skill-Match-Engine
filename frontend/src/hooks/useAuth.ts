import api from "../services/api";
import type { LoginPayload, RegisterPayload, TokenPair } from "../types/auth";

const ACCESS_KEY = "jobrador_access_token";
const REFRESH_KEY = "jobrador_refresh_token";

export function useAuth() {
  const isAuthenticated = Boolean(localStorage.getItem(ACCESS_KEY));

  const setTokens = (tokens: TokenPair) => {
    localStorage.setItem(ACCESS_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  };

  const login = async (payload: LoginPayload) => {
    const response = await api.post<TokenPair>("/auth/login", payload);
    setTokens(response.data);
  };

  const register = async (payload: RegisterPayload) => {
    const response = await api.post<TokenPair>("/auth/register", payload);
    setTokens(response.data);
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  };

  return { isAuthenticated, login, register, logout };
}
