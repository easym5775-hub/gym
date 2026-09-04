/* ================================================================
   FORGE — Admin/Owner sign-in screen.
   ================================================================ */

import { useState } from "react";
import { ArrowRight, Dumbbell, Shield } from "lucide-react";
import { DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD, isDemoMode } from "../services/backend";
import { ownerSignIn } from "../services/auth";
import { errorMessage } from "../lib";
import { btnPrimary, inputCls, labelCls } from "./ui";

export function AdminAuth({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await ownerSignIn(email.trim(), password, remember);
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

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 py-10">
        {/* back button */}
        <button
          onClick={onBack}
          className="absolute left-4 top-4 cursor-pointer rounded-xl border border-night-600 bg-night-850/50 px-3 py-2 text-xs font-bold text-mist-400 transition-all duration-200 hover:border-volt-400/40 hover:bg-volt-400/10 hover:text-volt-300 lg:left-8 lg:top-8"
        >
          ← Back to Sign In
        </button>

        <div className="rise mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-volt-400 text-night-950 shadow-[0_10px_30px_-10px_rgba(205,241,75,0.55)]">
            <Shield className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-display text-2xl font-bold uppercase leading-none text-mist-100">Forge Owner</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-mist-500">Admin Access</p>
          </div>
        </div>

        <div className="rise w-full max-w-md overflow-hidden rounded-2xl border border-night-600 bg-night-850/90 p-6 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.95)] backdrop-blur-md">
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt-400/50 to-transparent" />
          
          <div className="mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-volt-400" />
            <p className="font-display text-xl font-semibold uppercase tracking-wide text-mist-100">Owner Sign In</p>
          </div>
          
          <p className="mt-1 text-xs text-mist-400">Access the SaaS administration dashboard.</p>

          <div className="animate-pop mt-5 grid gap-3.5">
            <div>
              <label className={labelCls}>Email</label>
              <input
                className={inputCls}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@forge.demo"
                autoComplete="email"
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input
                className={inputCls}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </div>
            <RememberMe checked={remember} onChange={setRemember} />
            <button className={`${btnPrimary} h-12 w-full text-base`} onClick={() => void submit()} disabled={busy}>
              {busy ? "Signing in…" : "Enter Owner Dashboard"}
              {!busy && <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
            </button>

            {error && (
              <p className="rounded-xl border border-danger-500/25 bg-danger-500/10 px-3 py-2 text-xs font-bold text-danger-300">
                {error}
              </p>
            )}
          </div>

          {isDemoMode && (
            <div className="mt-5 rounded-xl border border-volt-400/20 bg-volt-400/5 p-3 text-[11px] leading-5 text-mist-400">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-volt-300">Demo Credentials</p>
              <p className="mt-1">
                Email: <span className="font-bold text-mist-200">{DEMO_OWNER_EMAIL}</span>
              </p>
              <p>
                Password: <span className="font-bold text-mist-200">{DEMO_OWNER_PASSWORD}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- remember me ---------------- */

function RememberMe({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="group flex w-full cursor-pointer items-center gap-2.5 text-start"
    >
      <span
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-lg border transition-all duration-150 ${
          checked
            ? "border-volt-400 bg-volt-400 text-night-950 shadow-[0_0_14px_-2px_rgba(205,241,75,0.6)]"
            : "border-night-500 bg-night-800 text-transparent group-hover:border-mist-400"
        }`}
      >
        <svg className={`h-3 w-3 ${checked ? "scale-100" : "scale-0"} transition-transform duration-150`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="text-xs font-semibold text-mist-300 transition group-hover:text-mist-100">
        Remember me
        <span className="ms-1.5 font-normal text-mist-500">{checked ? "stay signed in on this device" : "sign out when the browser closes"}</span>
      </span>
    </button>
  );
}
