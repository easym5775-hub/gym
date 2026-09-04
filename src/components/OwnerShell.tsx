/* ================================================================
   FORGE — Owner/Admin shell: sidebar, mobile nav and page frame.
   ================================================================ */

import type { ReactNode } from "react";
import {
  BarChart3,
  Dumbbell,
  LayoutGrid,
  LogOut,
  Settings as SettingsIcon,
  Shield,
  Users,
} from "lucide-react";
import { Avatar } from "./ui";

export type OwnerView = "dashboard" | "coaches" | "subscriptions" | "analytics" | "settings";

const NAV: { id: OwnerView; label: string; icon: (p: { className?: string }) => ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "coaches", label: "Coaches", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: Shield },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function OwnerShell({
  view,
  setView,
  onLogout,
  children,
}: {
  view: OwnerView;
  setView: (v: OwnerView) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const isActive = (id: OwnerView) => view === id;

  return (
    <div className="noise relative flex min-h-screen">
      <div className="app-glow pointer-events-none fixed inset-0" />
      <div className="dot-grid pointer-events-none fixed inset-0 opacity-40" />

      {/* sidebar */}
      <aside className="sticky top-0 z-30 hidden h-screen w-[260px] shrink-0 flex-col border-e border-night-700 bg-night-900/80 backdrop-blur-md lg:flex">
        <div className="group flex items-center gap-2.5 px-4 pb-6 pt-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-volt-400 text-night-950 shadow-[0_10px_28px_-10px_rgba(205,241,75,0.6)] transition-transform duration-500 ease-out group-hover:-rotate-12 group-hover:scale-105">
            <Shield className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-display text-xl font-bold uppercase leading-none tracking-wide text-mist-100">Forge</p>
            <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.28em] text-volt-400">Owner Dashboard</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active = isActive(item.id);
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active ? "bg-night-700/80 text-volt-300 shadow-inner" : "text-mist-400 hover:bg-night-800 hover:text-mist-100"
                }`}
              >
                {active && (
                  <span className="absolute start-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-e-full bg-volt-400 shadow-[0_0_12px_-2px_rgba(205,241,75,0.5)]" />
                )}
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="mx-3 mb-3 overflow-hidden rounded-2xl border border-night-700 bg-night-850 p-3 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2.5">
            <Avatar name="Owner" className="h-10 w-10 text-xs" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-mist-100">Owner Admin</p>
              <p className="truncate text-[10.5px] text-volt-400">SaaS Control Center</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-night-600 py-1.5 text-[11px] font-bold text-mist-400 transition-all duration-200 hover:border-danger-500/40 hover:bg-danger-500/10 hover:text-danger-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* content */}
      <div className="min-w-0 flex-1">
        {/* mobile top bar */}
        <div className="sticky top-0 z-30 border-b border-night-700 bg-night-900/90 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2.5 px-4 pt-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-volt-400 text-night-950 shadow-[0_8px_20px_-8px_rgba(205,241,75,0.5)]">
              <Shield className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div>
              <p className="font-display text-lg font-bold uppercase leading-none text-mist-100">Forge</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-volt-400">Owner</p>
            </div>
            <button
              onClick={onLogout}
              className="ms-auto cursor-pointer rounded-xl border border-night-600 p-1.5 text-mist-400 transition-all duration-200 hover:border-danger-500/40 hover:bg-danger-500/10 hover:text-danger-300"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex gap-1.5 overflow-x-auto px-4 py-3">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  isActive(item.id)
                    ? "bg-volt-400 text-night-950 shadow-[0_4px_14px_-4px_rgba(205,241,75,0.4)]"
                    : "bg-night-800 text-mist-400 hover:bg-night-700 hover:text-mist-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

/* ---------------- shared page header ---------------- */

export function OwnerPageHeader({
  title,
  accent,
  sub,
  action,
}: {
  title: string;
  accent?: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <header className="rise flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight text-mist-100 sm:text-5xl">
          {title} {accent && <span className="text-volt-400">{accent}</span>}
        </h1>
        {sub && <p className="mt-2 text-sm text-mist-400">{sub}</p>}
      </div>
      {action}
    </header>
  );
}
