import { useState } from "react";
import { GOAL_META } from "../types";
import { todayISO } from "../lib";
import { useApp } from "../store";
import { Avatar, btnVolt, chip } from "./ui";
import { IconArrowRight, IconDumbbell, IconUsers, IconZap } from "../icons";

const TICKER = [
  "STRENGTH",
  "NUTRITION",
  "RECOVERY",
  "CONSISTENCY",
  "PROGRESS",
  "DISCIPLINE",
  "OVERLOAD",
  "FORM FIRST",
];

export function Auth({ onCoach, onClient }: { onCoach: () => void; onClient: (id: string) => void }) {
  const { state } = useApp();
  const [role, setRole] = useState<"coach" | "client">("coach");
  const [picked, setPicked] = useState("");

  const weekStart = todayISO();
  const checkInsWeek = state.checkIns.filter((c) => c.date >= addISO(weekStart, -6)).length;
  const active = state.clients.filter((c) => c.status === "Active").length;

  const enter = () => {
    if (role === "coach") onCoach();
    else if (picked) onClient(picked);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="app-glow pointer-events-none fixed inset-0" />
      <div className="dot-grid pointer-events-none fixed inset-0 opacity-60" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center gap-10 px-5 py-10 lg:gap-16 lg:px-8">
        {/* brand side */}
        <div className="hidden flex-1 flex-col lg:flex">
          <div className="rise flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-volt-400 text-night-950 shadow-[0_10px_30px_-10px_rgba(205,241,75,0.55)]">
              <IconDumbbell className="h-7 w-7" strokeWidth={2.2} />
            </span>
            <div>
              <p className="font-display text-3xl font-bold uppercase leading-none tracking-wide text-mist-100">Forge</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-mist-500">Coaching OS</p>
            </div>
          </div>

          <h1 className="rise mt-14 font-display text-[86px] font-bold uppercase leading-[0.9] tracking-tight text-mist-100" style={{ animationDelay: "90ms" }}>
            Every rep.
            <br />
            Every meal.
            <br />
            <span className="text-volt-400">Tracked.</span>
          </h1>

          <p className="rise mt-6 max-w-md text-sm leading-6 text-mist-400" style={{ animationDelay: "180ms" }}>
            The command center for coaches and their clients — workout plans, nutrition targets and daily
            check-ins in one place.
          </p>

          <div className="rise mt-10 flex gap-8" style={{ animationDelay: "260ms" }}>
            {[
              { v: String(active), l: "Active clients" },
              { v: String(checkInsWeek), l: "Check-ins · 7d" },
              { v: String(state.exercises.length), l: "Exercises in library" },
            ].map((s) => (
              <div key={s.l}>
                <p className="font-display text-4xl font-bold text-volt-300">{s.v}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-mist-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* sign-in side */}
        <div className="rise w-full max-w-md flex-none lg:w-auto" style={{ animationDelay: "140ms" }}>
          <div className="rounded-xl border border-night-600 bg-night-850/90 p-6 shadow-2xl backdrop-blur">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-volt-400 text-night-950">
                <IconDumbbell className="h-5.5 w-5.5" strokeWidth={2.2} />
              </span>
              <div>
                <p className="font-display text-2xl font-bold uppercase leading-none text-mist-100">Forge</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-mist-500">Coaching OS</p>
              </div>
            </div>

            <p className="font-display text-2xl font-semibold uppercase tracking-wide text-mist-100">Sign in to your space</p>
            <p className="mt-1 text-xs text-mist-400">Pick who is stepping onto the floor today.</p>

            <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-lg border border-night-600 bg-night-900 p-1.5">
              <button
                onClick={() => setRole("coach")}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-md py-2.5 text-sm font-bold transition ${
                  role === "coach" ? "bg-volt-400 text-night-950 shadow" : "text-mist-400 hover:text-mist-100"
                }`}
              >
                <IconZap className="h-4 w-4" />
                Coach
              </button>
              <button
                onClick={() => setRole("client")}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-md py-2.5 text-sm font-bold transition ${
                  role === "client" ? "bg-volt-400 text-night-950 shadow" : "text-mist-400 hover:text-mist-100"
                }`}
              >
                <IconUsers className="h-4 w-4" />
                Client
              </button>
            </div>

            {role === "coach" ? (
              <div className="animate-pop mt-5">
                <div className="flex items-center gap-3 rounded-lg border border-night-600 bg-night-800 p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-moss-700 font-display font-bold text-moss-300">C</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-mist-100">Coach Dana</p>
                    <p className="text-[11px] text-mist-500">Full access — clients, plans, meals & check-ins</p>
                  </div>
                </div>
                <button className={`${btnVolt} mt-4 h-12 w-full text-base`} onClick={enter}>
                  Open coach dashboard
                  <IconArrowRight className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="animate-pop mt-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist-400">Choose your profile</p>
                <div className="grid max-h-64 gap-1.5 overflow-y-auto pe-1">
                  {state.clients.length === 0 && (
                    <p className="rounded-lg border border-dashed border-night-500 p-4 text-center text-xs text-mist-500">
                      No clients yet — sign in as coach and add the first one.
                    </p>
                  )}
                  {state.clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setPicked(c.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-start transition ${
                        picked === c.id
                          ? "border-volt-400 bg-volt-400/10"
                          : "border-night-600 bg-night-800 hover:border-night-500"
                      }`}
                    >
                      <Avatar name={c.name} photo={c.photo} className="h-9 w-9 text-[11px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-mist-100">{c.name}</span>
                        <span className="block truncate text-[11px] text-mist-500">{c.email || c.phone}</span>
                      </span>
                      <span className={`${chip} ${GOAL_META[c.goal].chip}`}>{c.goal}</span>
                    </button>
                  ))}
                </div>
                <button className={`${btnVolt} mt-4 h-12 w-full text-base`} onClick={enter} disabled={!picked}>
                  {picked ? "Enter client space" : "Select a client first"}
                  <IconArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}

            <p className="mt-5 text-center text-[11px] text-mist-500">
              Demo workspace — all data lives in this browser only.
            </p>
          </div>
        </div>
      </div>

      {/* ticker */}
      <div className="relative z-10 border-t border-night-700 bg-night-900/70 py-3 backdrop-blur">
        <div className="overflow-hidden">
          <div className="ticker-track flex w-max items-center gap-8">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-8 font-display text-sm font-semibold uppercase tracking-[0.35em] text-mist-500">
                {t}
                <span className="text-volt-500">/</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function addISO(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, (d ?? 1) + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
