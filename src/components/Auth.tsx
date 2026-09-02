/* ================================================================
   FORGE — sign-in screen (Coach email + Client username login).
   ================================================================ */

import { useState, type FormEvent } from "react";
import { ArrowRight, Dumbbell, Loader2, ShieldCheck, Users, Zap } from "lucide-react";
import { clientSignIn, coachSignIn, coachSignUp, DEMO_HINT, demoMode } from "../services/auth";
import { errorMessage } from "../lib";
import { btnPrimary, inputCls, labelCls } from "./ui";

const TICKER = ["STRENGTH", "NUTRITION", "RECOVERY", "CONSISTENCY", "PROGRESS", "DISCIPLINE", "OVERLOAD", "FORM FIRST"];

type Role = "coach" | "client";
type CoachMode = "signin" | "signup";

export function Auth() {
  const [role, setRole] = useState<Role>("coach");
  const [coachMode, setCoachMode] = useState<CoachMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [coachName, setCoachName] = useState("");
  const [username, setUsername] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (role === "coach") {
        if (coachMode === "signup") await coachSignUp(email.trim(), password, coachName.trim() || "Coach");
        else await coachSignIn(email.trim(), password);
      } else {
        await clientSignIn(username, clientPassword);
      }
      // Session change is picked up by the store via onAuthChange.
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="app-glow pointer-events-none fixed inset-0" />
      <div className="dot-grid pointer-events-none fixed inset-0" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center gap-10 px-5 py-10 lg:gap-16 lg:px-8">
        {/* brand side */}
        <div className="hidden flex-1 flex-col lg:flex">
          <div className="rise flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-volt-400 text-night-950 shadow-[0_10px_30px_-10px_rgba(205,241,75,0.55)]">
              <Dumbbell className="h-7 w-7" strokeWidth={2.2} />
            </span>
            <div>
              <p className="font-display text-3xl font-bold uppercase leading-none tracking-wide text-mist-100">Forge</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-mist-500">Coaching OS</p>
            </div>
          </div>

          <h1 className="rise mt-14 font-display text-[84px] font-bold uppercase leading-[0.88] tracking-tight text-mist-100" style={{ animationDelay: "90ms" }}>
            Every rep.
            <br />
            <span className="text-stroke">Every meal.</span>
            <br />
            <span className="text-volt-400">Tracked.</span>
          </h1>

          <p className="rise mt-6 max-w-md text-sm leading-6 text-mist-400" style={{ animationDelay: "180ms" }}>
            The command center for coaches and their clients — workout plans, nutrition targets and daily check-ins,
            backed by Supabase auth and Postgres.
          </p>

          <div className="rise mt-10 flex items-center gap-3 text-xs text-mist-500" style={{ animationDelay: "240ms" }}>
            <ShieldCheck className="h-4 w-4 text-moss-400" />
            Row-level security keeps every coach's clients private.
          </div>

          {demoMode && (
            <div className="rise mt-6 max-w-md rounded-xl border border-warn-400/25 bg-warn-400/10 p-4 text-xs leading-5 text-warn-300" style={{ animationDelay: "300ms" }}>
              <p className="font-display text-sm font-bold uppercase tracking-wide">Demo mode</p>
              <p className="mt-1 text-warn-300/90">
                Supabase credentials aren't set, so data lives in this browser. Sign in with password{" "}
                <code className="rounded bg-night-800 px-1.5 py-0.5 font-bold text-volt-300">{DEMO_HINT}</code> — coach uses any
                email, clients use <code className="rounded bg-night-800 px-1.5 py-0.5 font-bold text-volt-300">ahmed</code>,{" "}
                <code className="rounded bg-night-800 px-1.5 py-0.5 font-bold text-volt-300">sara</code> or{" "}
                <code className="rounded bg-night-800 px-1.5 py-0.5 font-bold text-volt-300">omar</code>.
              </p>
            </div>
          )}
        </div>

        {/* form side */}
        <div className="rise w-full max-w-md flex-none lg:w-auto" style={{ animationDelay: "140ms" }}>
          <div className="relative rounded-xl border border-night-600 bg-night-850/90 p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
            <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-volt-400/50 to-transparent" />

            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-volt-400 text-night-950">
                <Dumbbell className="h-5 w-5" strokeWidth={2.2} />
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
                type="button"
                onClick={() => {
                  setRole("coach");
                  setError("");
                }}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-md py-2.5 text-sm font-bold transition ${
                  role === "coach" ? "bg-volt-400 text-night-950 shadow" : "text-mist-400 hover:text-mist-100"
                }`}
              >
                <Zap className="h-4 w-4" /> Coach
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("client");
                  setError("");
                }}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-md py-2.5 text-sm font-bold transition ${
                  role === "client" ? "bg-volt-400 text-night-950 shadow" : "text-mist-400 hover:text-mist-100"
                }`}
              >
                <Users className="h-4 w-4" /> Client
              </button>
            </div>

            <form onSubmit={submit} className="animate-pop mt-5 grid gap-4">
              {role === "coach" ? (
                <>
                  <div className="flex gap-1.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCoachMode("signin")}
                      className={`flex-1 cursor-pointer rounded-md border py-1.5 transition ${
                        coachMode === "signin" ? "border-volt-400/60 bg-volt-400/10 text-volt-300" : "border-night-600 text-mist-400 hover:text-mist-200"
                      }`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoachMode("signup")}
                      className={`flex-1 cursor-pointer rounded-md border py-1.5 transition ${
                        coachMode === "signup" ? "border-volt-400/60 bg-volt-400/10 text-volt-300" : "border-night-600 text-mist-400 hover:text-mist-200"
                      }`}
                    >
                      Create account
                    </button>
                  </div>
                  {coachMode === "signup" && (
                    <div>
                      <label className={labelCls}>Name</label>
                      <input className={inputCls} value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="Coach Dana" autoComplete="name" />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Email</label>
                    <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gym.com" autoComplete="email" />
                  </div>
                  <div>
                    <label className={labelCls}>Password</label>
                    <input className={inputCls} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={coachMode === "signup" ? "new-password" : "current-password"} />
                  </div>
                  <button className={`${btnPrimary} h-12 w-full text-base`} type="submit" disabled={busy}>
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    {coachMode === "signup" ? "Create coach account" : "Open coach dashboard"}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>Username</label>
                    <input className={inputCls} required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your username" autoComplete="username" />
                  </div>
                  <div>
                    <label className={labelCls}>Password</label>
                    <input className={inputCls} type="password" required value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                  </div>
                  <button className={`${btnPrimary} h-12 w-full text-base`} type="submit" disabled={busy}>
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    Enter client space
                  </button>
                  <p className="text-center text-[11px] text-mist-500">Your coach gave you these credentials — no email needed.</p>
                </>
              )}

              {error && <p className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-xs font-semibold text-danger-300">{error}</p>}
            </form>
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
