import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import {
  clearAuthSession,
  getStoredAccessToken,
  getStoredUser,
  login as loginRequest,
  persistAuthSession,
  register as registerRequest,
  registerAuthFailureHandler,
} from "../services/api";
import type { LoginPayload, RegisterPayload, User } from "../types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function deriveUserFromLogin(email: string): User {
  const existing = getStoredUser();
  if (existing && existing.email === email) {
    return existing;
  }
  return {
    email,
    fullName: email.split("@")[0] || "JobRadar User",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    registerAuthFailureHandler(() => {
      clearAuthSession();
      setUser(null);
      navigate("/login", { replace: true });
    });
    return () => registerAuthFailureHandler(null);
  }, [navigate]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(getStoredAccessToken()),
    isLoading,
    login: async (payload) => {
      setIsLoading(true);
      try {
        const tokens = await loginRequest(payload);
        const nextUser = deriveUserFromLogin(payload.email);
        persistAuthSession(tokens, nextUser);
        setUser(nextUser);
      } finally {
        setIsLoading(false);
      }
    },
    register: async (payload) => {
      setIsLoading(true);
      try {
        const tokens = await registerRequest(payload);
        const nextUser: User = {
          email: payload.email,
          fullName: payload.full_name,
        };
        persistAuthSession(tokens, nextUser);
        setUser(nextUser);
      } finally {
        setIsLoading(false);
      }
    },
    logout,
  }), [user, isLoading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="grid min-h-[40vh] place-items-center text-radar-700">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
