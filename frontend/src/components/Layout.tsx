import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

const navigation = [
  { to: "/dashboard", label: "Dashboard", short: "Home" },
  { to: "/jobs", label: "Jobs", short: "Jobs" },
  { to: "/resume", label: "Resume", short: "Resume" },
  { to: "/saved", label: "Saved Jobs", short: "Saved" },
];

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean).slice(0, 2);
  if (!parts.length) {
    return "JR";
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const displayName = user?.fullName || user?.email || "JobRadar User";

  return (
    <div className="min-h-screen bg-radar-50 text-radar-900">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 pb-24 pt-4 md:px-6 md:pb-6">
        <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-radar-300/50 bg-white/85 p-6 shadow-[0_20px_60px_-30px_rgba(21,42,29,0.35)] backdrop-blur md:flex md:flex-col">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-radar-700 text-lg font-bold text-white">JR</div>
              <div>
                <p className="font-display text-xl font-bold">JobRadar</p>
                <p className="text-sm text-radar-700">Real-time career radar</p>
              </div>
            </div>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    isActive ? "bg-radar-700 text-white shadow-lg" : "text-radar-700 hover:bg-radar-100 hover:text-radar-900",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-radar-300/60 bg-radar-50 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-radar-900 font-semibold text-white">
                {initials(displayName)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-radar-900">{displayName}</p>
                <p className="truncate text-sm text-radar-700">{user?.email ?? "Authenticated session"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-4 w-full rounded-xl border border-radar-300 px-4 py-2 text-sm font-semibold text-radar-800 transition hover:border-radar-700 hover:text-radar-900"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <div className="min-h-[calc(100vh-2rem)] rounded-[2rem] border border-radar-300/40 bg-white/75 p-5 shadow-[0_20px_60px_-30px_rgba(21,42,29,0.35)] backdrop-blur md:p-8">
            {children}
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-radar-300/60 bg-white/95 p-2 shadow-2xl backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-2">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "rounded-2xl px-2 py-3 text-center text-xs font-semibold transition",
                  isActive ? "bg-radar-700 text-white" : "text-radar-700 hover:bg-radar-100",
                ].join(" ")
              }
            >
              {item.short}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
