/* ================================================================
   FORGE — Settings: account, password and (demo) data controls.
   ================================================================ */

import { useState } from "react";
import { Database, KeyRound, Loader2, LogOut, RefreshCw, ShieldCheck, User } from "lucide-react";
import { signOut } from "../services/auth";
import { supabase } from "../services/supabase";
import { errorMessage } from "../lib";
import { useApp } from "../store";
import { PageHeader } from "./Shell";
import { btnPrimary, btnSecondary, btnSm, inputCls, labelCls, SectionCard } from "./ui";

export function SettingsView() {
  const { me, isDemo, resetData, toast } = useApp();
  const [name, setName] = useState(me?.role === "coach" ? me.name : "");
  const [savingName, setSavingName] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveName = async () => {
    if (!me || me.role !== "coach") return;
    setSavingName(true);
    try {
      const { error } = await supabase.from("coaches").update({ name: name.trim() || me.name }).eq("id", me.userId);
      if (error) throw error;
      toast("Profile updated");
    } catch (e) {
      toast(`Couldn't save — ${errorMessage(e)}`, "warn");
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    setPwMsg(null);
    if (newPw.length < 6) {
      setPwMsg({ ok: false, text: "New password must be at least 6 characters." });
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwMsg({ ok: true, text: "Password updated." });
      setCurPw("");
      setNewPw("");
    } catch (e) {
      setPwMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" sub="Account, security and data controls" />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* account */}
        <SectionCard title="Account" icon={<User className="h-4.5 w-4.5" />} bodyCls="p-5">
          <dl className="grid gap-2 text-sm">
            <Row k="Signed in as" v={me?.name ?? "—"} />
            <Row k="Role" v={me?.role === "coach" ? "Coach" : "Client"} />
            <Row k="Email" v={me?.email || "—"} />
            <Row k="Data source" v={isDemo ? "Local demo (browser)" : "Supabase (live)"} />
          </dl>

          {me?.role === "coach" && !isDemo && (
            <div className="mt-4 border-t border-night-700 pt-4">
              <label className={labelCls}>Display name</label>
              <div className="flex gap-2">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
                <button className={`${btnSecondary} ${btnSm} shrink-0`} onClick={saveName} disabled={savingName}>
                  {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-night-700 pt-4">
            <button className={`${btnSecondary} w-full`} onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </SectionCard>

        {/* security */}
        <SectionCard title="Security" icon={<ShieldCheck className="h-4.5 w-4.5" />} bodyCls="p-5">
          {isDemo ? (
            <p className="rounded-lg border border-night-600 bg-night-800/60 p-4 text-xs leading-5 text-mist-400">
              In demo mode accounts are simulated locally. Connect Supabase (set{" "}
              <code className="rounded bg-night-900 px-1 text-volt-300">VITE_SUPABASE_URL</code> and{" "}
              <code className="rounded bg-night-900 px-1 text-volt-300">VITE_SUPABASE_ANON_KEY</code>) to enable real
              email/password auth, client username logins and row-level security.
            </p>
          ) : (
            <>
              <div className="grid gap-3">
                <div>
                  <label className={labelCls}>Current password</label>
                  <input className={inputCls} type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} autoComplete="current-password" />
                </div>
                <div>
                  <label className={labelCls}>New password</label>
                  <input className={inputCls} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
                </div>
              </div>
              {pwMsg && (
                <p className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold ${pwMsg.ok ? "border-moss-400/30 bg-moss-400/10 text-moss-300" : "border-danger-500/30 bg-danger-500/10 text-danger-300"}`}>
                  {pwMsg.text}
                </p>
              )}
              <button className={`${btnPrimary} mt-4 w-full`} onClick={changePassword} disabled={savingPw}>
                {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Change password
              </button>
            </>
          )}
        </SectionCard>

        {/* database */}
        <SectionCard title="Database" icon={<Database className="h-4.5 w-4.5" />} bodyCls="p-5" className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-mist-100">
                <span className={`h-2 w-2 rounded-full ${isDemo ? "bg-warn-400" : "bg-moss-400 tick-pulse"}`} />
                {isDemo ? "Demo mode — data lives in this browser" : "Connected to Supabase"}
              </p>
              <p className="mt-1 max-w-lg text-xs leading-5 text-mist-400">
                {isDemo
                  ? "Add Supabase credentials in .env, run supabase/migrations/0001_init.sql, and deploy the create-client-account edge function to go live. The same UI then reads and writes Postgres with row-level security."
                  : "All clients, plans, meals, check-ins, subscriptions, payments and sessions are stored in Postgres and scoped to your account via RLS."}
              </p>
            </div>
            {isDemo && (
              <button className={`${btnSecondary} ${btnSm}`} onClick={() => void resetData()}>
                <RefreshCw className="h-3.5 w-3.5" /> Reset demo data
              </button>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-night-700/50 pb-1.5 last:border-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-mist-500">{k}</dt>
      <dd className="truncate font-semibold text-mist-100">{v}</dd>
    </div>
  );
}
