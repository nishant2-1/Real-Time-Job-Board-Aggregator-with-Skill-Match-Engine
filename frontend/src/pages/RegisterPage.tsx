import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../hooks/useAuth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (fullName.trim().length < 2) {
      toast.error("Full name must be at least 2 characters");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (password.length < 8 || !hasUpper || !hasLower || !hasDigit) {
      toast.error("Password must include upper, lower, digit, and 8+ chars");
      return;
    }
    await register({ full_name: fullName, email, password });
    toast.success("Account created");
    navigate("/dashboard");
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-4 card">
      <h2 className="font-display text-2xl font-bold">Register</h2>
      <input
        className="w-full rounded-lg border border-radar-300 px-3 py-2"
        placeholder="Full name"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
      />
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
        Register
      </button>
      <p className="text-sm">
        Already have an account? <Link to="/login" className="text-radar-700">Sign in</Link>
      </p>
    </form>
  );
}
