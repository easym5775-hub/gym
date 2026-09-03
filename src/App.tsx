/* ================================================================
   FORGE — app root: auth phases + coach/client routing.
   ================================================================ */

import { useState } from "react";
import { Dumbbell } from "lucide-react";
import type { CoachView } from "./types";
import { StoreProvider, useApp } from "./store";
import { Toasts } from "./components/ui";
import { Auth } from "./components/Auth";
import { CoachShell } from "./components/Shell";
import { Dashboard } from "./components/Dashboard";
import { ClientsView, ClientProfile, type ClientsFilter } from "./components/Clients";
import { PlansView, MealsView, LibraryView, CheckInsView } from "./components/Workspaces";
import { SettingsView } from "./components/Settings";
import { ClientApp } from "./components/ClientApp";
import { signOut } from "./services/auth";

function Splash({ label }: { label: string }) {
  return (
    <div className="noise relative grid min-h-screen place-items-center">
      <div className="app-glow pointer-events-none fixed inset-0" />
      <div className="dot-grid pointer-events-none fixed inset-0" />
      <div className="rise flex flex-col items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-volt-400 text-night-950 shadow-[0_10px_40px_-10px_rgba(205,241,75,0.55)]">
          <Dumbbell className="h-8 w-8" strokeWidth={2.2} />
        </span>
        <p className="font-display text-2xl font-bold uppercase tracking-wide text-mist-100">Forge</p>
        <p className="text-xs font-semibold text-mist-500">{label}</p>
        <span className="h-1 w-32 overflow-hidden rounded-full bg-night-700">
          <span className="skeleton block h-full w-full" />
        </span>
      </div>
    </div>
  );
}

function Root() {
  const { phase, me } = useApp();
  const [view, setView] = useState<CoachView>("dashboard");
  const [clientPreset, setClientPreset] = useState<string | null>(null);
  const [planPreset, setPlanPreset] = useState<string | null>(null);
  const [mealPreset, setMealPreset] = useState<string | null>(null);
  const [clientsFilter, setClientsFilter] = useState<ClientsFilter | null>(null);

  /** Internal navigation — keeps deep-link presets in sync. */
  const go = (v: CoachView, id?: string) => {
    if (v === "client") setClientPreset(id ?? null);
    if (v === "plans") setPlanPreset(id ?? null);
    if (v === "meals") setMealPreset(id ?? null);
    if (v === "clients") setClientsFilter(null);
    setView(v);
  };

  /** Dashboard deep-link: jump straight into a pre-filtered roster. */
  const openClientsWithFilter = (f: "Active" | "Expiring Soon" | "Expired") => {
    setClientsFilter(f);
    setView("clients");
  };

  /** Sidebar navigation always lands on an unfiltered view. */
  const nav = (v: CoachView) => {
    if (v === "clients") setClientsFilter(null);
    setView(v);
  };

  if (phase === "booting" || phase === "loading") {
    return <Splash label={phase === "booting" ? "Waking up…" : "Loading your data…"} />;
  }

  if (phase === "signed-out" || !me) {
    return <Auth />;
  }

  if (me.role === "client") {
    return <ClientApp onLogout={() => void signOut()} />;
  }

  return (
    <CoachShell view={view} setView={nav} onLogout={() => void signOut()}>
      {view === "dashboard" && <Dashboard go={go} openClientsWithFilter={openClientsWithFilter} />}
      {view === "clients" && <ClientsView key={clientsFilter ?? "all"} go={go} initialFilter={clientsFilter ?? undefined} />}
      {view === "client" && clientPreset && <ClientProfile key={clientPreset} clientId={clientPreset} go={go} />}
      {view === "plans" && <PlansView presetClientId={planPreset} />}
      {view === "meals" && <MealsView presetClientId={mealPreset} />}
      {view === "library" && <LibraryView />}
      {view === "checkins" && <CheckInsView go={go} />}
      {view === "settings" && <SettingsView />}
    </CoachShell>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Root />
      <Toasts />
    </StoreProvider>
  );
}
