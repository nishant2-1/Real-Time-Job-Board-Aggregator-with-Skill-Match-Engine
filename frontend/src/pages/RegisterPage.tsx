import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../hooks/useAuth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (fullName.trim().length < 2) {
      nextErrors.fullName = "Full name must be at least 2 characters.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (password.length < 8 || !hasUpper || !hasLower || !hasDigit) {
      nextErrors.password = "Use at least 8 characters with uppercase, lowercase, and a number.";
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords must match.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await register({ full_name: fullName, email, password });
      toast.success("Account created");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const apiMessage = axios.isAxiosError(error)
        ? (error.response?.data as { detail?: string; error?: { message?: string } } | undefined)?.detail
            || (error.response?.data as { detail?: string; error?: { message?: string } } | undefined)?.error?.message
            || error.message
        : undefined;
      const fallback = "Registration failed. Try a different email or try again later.";
      const message = apiMessage || fallback;
      toast.error(message);
      setErrors({ form: message });
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,_rgba(184,210,192,0.55),_transparent_28%),linear-gradient(180deg,_#f4f7f5_0%,_#eef5f0_100%)] px-4">
      <form onSubmit={onSubmit} className="w-full max-w-lg space-y-5 rounded-[2rem] border border-radar-300/60 bg-white/95 p-8 shadow-[0_30px_80px_-35px_rgba(21,42,29,0.45)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-radar-500">JobRadar</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Create your search cockpit</h1>
          <p className="mt-2 text-sm text-radar-700">Register once, upload your resume, and let the skill-match engine rank your next opportunities.</p>
        </div>

        {errors.form ? <p className="rounded-2xl bg-alert-red/10 px-4 py-3 text-sm text-alert-red">{errors.form}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-radar-800">Full name</span>
            <input className="field" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nishant Kumar" />
            {errors.fullName ? <span className="text-sm text-alert-red">{errors.fullName}</span> : null}
          </label>
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-radar-800">Email</span>
            <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            {errors.email ? <span className="text-sm text-alert-red">{errors.email}</span> : null}
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-radar-800">Password</span>
            <input type="password" className="field" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" />
            {errors.password ? <span className="text-sm text-alert-red">{errors.password}</span> : null}
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-radar-800">Confirm password</span>
            <input type="password" className="field" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" />
            {errors.confirmPassword ? <span className="text-sm text-alert-red">{errors.confirmPassword}</span> : null}
          </label>
        </div>

        <button type="submit" disabled={isLoading} className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-radar-700 px-4 py-3 font-semibold text-white transition hover:bg-radar-900">
          {isLoading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
          <span>{isLoading ? "Creating account..." : "Register"}</span>
        </button>

        <p className="text-sm text-radar-700">
          Already have an account? <Link to="/login" className="font-semibold text-radar-900 underline decoration-radar-300 underline-offset-4">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
