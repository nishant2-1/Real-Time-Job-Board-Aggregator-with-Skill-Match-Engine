import { useMemo, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || "/dashboard";
  }, [location.state]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await login({ email, password });
      toast.success("Welcome back");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const apiMessage = axios.isAxiosError(error)
        ? (error.response?.data as { detail?: string; error?: { message?: string } } | undefined)?.detail
            || (error.response?.data as { detail?: string; error?: { message?: string } } | undefined)?.error?.message
            || error.message
        : undefined;
      const fallback = "Login failed. Check your credentials and try again.";
      const message = apiMessage || fallback;
      setErrors({ form: message });
      toast.error(message);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_rgba(184,210,192,0.55),_transparent_25%),linear-gradient(180deg,_#f4f7f5_0%,_#eef5f0_100%)] px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 rounded-[2rem] border border-radar-300/60 bg-white/95 p-8 shadow-[0_30px_80px_-35px_rgba(21,42,29,0.45)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">JobRadar</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Sign in to your search radar</h1>
          <p className="mt-2 text-sm text-radar-700">Track scraped roles, refresh your resume profile, and stay on top of new high-match opportunities.</p>
        </div>

        {errors.form ? <p className="rounded-2xl bg-alert-red/10 px-4 py-3 text-sm text-alert-red">{errors.form}</p> : null}

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-radar-800">Email</span>
          <input className="field" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          {errors.email ? <span className="text-sm text-alert-red">{errors.email}</span> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-radar-800">Password</span>
          <input
            type="password"
            className="field"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {errors.password ? <span className="text-sm text-alert-red">{errors.password}</span> : null}
        </label>

        <button type="submit" disabled={isLoading} className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-radar-700 px-4 py-3 font-semibold text-white transition hover:bg-radar-900">
          {isLoading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
          <span>{isLoading ? "Signing in..." : "Login"}</span>
        </button>

        <p className="text-sm text-radar-700">
          New here? <Link to="/register" className="font-semibold text-radar-900 underline decoration-radar-300 underline-offset-4">Create account</Link>
        </p>
      </form>
    </div>
  );
}
