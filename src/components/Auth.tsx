/* ================================================================
   FORGE — sign-in screen (coach: email+password, client: username).
   ================================================================ */

import { useState } from "react";
import { ArrowRight, Dumbbell, User, Users, Zap } from "lucide-react";
import { DEMO_COACH_EMAIL, DEMO_PASSWORD, isDemoMode } from "../services/backend";
import { coachSignIn, coachSignUp, clientSignIn } from "../services/auth";
import { errorMessage } from "../lib";
import { btnPrimary, inputCls, labelCls } from "./ui";

const TICKER = ["STRENGTH", "NUTRITION", "RECOVERY", "CONSISTENCY", "PROGRESS", "DISCIPLINE", "OVERLOAD", "FORM FIRST"];

export function Auth() {
  const [role, setRole] = useState<"coach" | "client">("coach");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      if (role === "coach") {
        if (mode === "signup") await coachSignUp(email.trim(), password, name.trim() || "Coach");
        else await coachSignIn(email.trim(), password);
      } else {
        await clientSignIn(username.trim(), clientPassword);
      }
      // store's onAuthChange listener boots the session.
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="noise relative flex min-h-screen flex-col overflow-hidden">
      <div className="app-glow pointer-events-none fixed inset-0" />
      <div className="dot-grid pointer-events-none fixed inset-0" />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="orb orb-a -right-32 -top-40" />
        <div className="orb orb-b -left-24 bottom-1/4" />
      </div>

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

          <h1 className="rise mt-14 font-display text-[88px] font-bold uppercase leading-[0.88] tracking-tight text-mist-100" style={{ animationDelay: "90ms" }}>
            Every rep.
            <br />
            <span className="text-stroke">Every meal.</span>
            <br />
            <span className="text-volt-400">Tracked.</span>
          </h1>

          <p className="rise mt-6 max-w-md text-sm leading-6 text-mist-400" style={{ animationDelay: "180ms" }}>
            The command center for coaches and their clients — workout plans, nutrition targets, daily check-ins and a
            direct chat in one place.
          </p>

          <div className="rise mt-10 flex gap-10" style={{ animationDelay: "260ms" }}>
            {[
              { v: "3", l: "Roles in sync" },
              { v: "10", l: "Data tables" },
              { v: "24/7", l: "Client access" },
            ].map((s, i) => (
              <div key={s.l} className={i > 0 ? "border-l border-night-600 pl-10" : ""}>
                <p className="font-display text-5xl font-bold leading-none text-volt-300 tnum">{s.v}</p>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-mist-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* sign-in side */}
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

            <div className="animate-pop mt-5 grid gap-3.5" key={role + mode}>
              {role === "coach" ? (
                <>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@forge.fit" autoComplete="email" />
                  </div>
                  {mode === "signup" && (
                    <div>
                      <label className={labelCls}>Your name</label>
                      <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Coach Dana" autoComplete="name" />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Password</label>
                    <input
                      className={inputCls}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      onKeyDown={(e) => e.key === "Enter" && void submit()}
                    />
                  </div>
                  <button className={`${btnPrimary} h-12 w-full text-base`} onClick={() => void submit()} disabled={busy}>
                    {busy ? "Signing in…" : mode === "signup" ? "Create coach account" : "Open coach dashboard"}
                    {!busy && <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
                  </button>
                  <button className="cursor-pointer text-center text-xs font-bold text-mist-400 transition hover:text-volt-300" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
                    {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>Username</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" />
                      <input className={`${inputCls} ps-9`} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your username" autoComplete="username" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Password</label>
                    <input
                      className={inputCls}
                      type="password"
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      onKeyDown={(e) => e.key === "Enter" && void submit()}
                    />
                  </div>
                  <button className={`${btnPrimary} h-12 w-full text-base`} onClick={() => void submit()} disabled={busy}>
                    {busy ? "Signing in…" : "Enter client space"}
                    {!busy && <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
                  </button>
                  <p className="text-center text-[11px] text-mist-500">Your coach gave you these credentials — no email needed.</p>
                </>
              )}

              {error && <p className="rounded-lg border border-danger-500/25 bg-danger-500/10 px-3 py-2 text-xs font-bold text-danger-300">{error}</p>}
            </div>

            {isDemoMode && (
              <div className="mt-5 rounded-lg border border-volt-400/20 bg-volt-400/5 p-3 text-[11px] leading-5 text-mist-400">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-volt-300">Demo credentials</p>
                <p className="mt-1">
                  Coach: <span className="font-bold text-mist-200">{DEMO_COACH_EMAIL}</span> / <span className="font-bold text-mist-200">{DEMO_PASSWORD}</span>
                </p>
                <p>
                  Clients: <span className="font-bold text-mist-200">ahmed</span>, <span className="font-bold text-mist-200">sara</span>,{" "}
                  <span className="font-bold text-mist-200">omar</span> / <span className="font-bold text-mist-200">{DEMO_PASSWORD}</span>
                </p>
              </div>
            )}
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
