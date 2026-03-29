import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    await login({ email, password });
    toast.success("Welcome back");
    navigate("/dashboard");
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-4 card">
      <h2 className="font-display text-2xl font-bold">Login</h2>
      <input
        className="w-full rounded-lg border border-radar-300 px-3 py-2"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        type="password"
        className="w-full rounded-lg border border-radar-300 px-3 py-2"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button type="submit" className="w-full rounded-lg bg-radar-700 px-4 py-2 text-white">
        Login
      </button>
      <p className="text-sm">
        New here? <Link to="/register" className="text-radar-700">Create account</Link>
      </p>
    </form>
  );
}
