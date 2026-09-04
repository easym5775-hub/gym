/* ================================================================
   FORGE — app root: auth phases + coach/client/owner routing.
   ================================================================ */

import { useState, useEffect } from "react";
import { Dumbbell } from "lucide-react";
import type { CoachView } from "./types";
import { StoreProvider, useApp } from "./store";
import { Toasts } from "./components/ui";
import { Auth } from "./components/Auth";
import { AdminAuth } from "./components/AdminAuth";
import { CoachShell } from "./components/Shell";
import { OwnerShell } from "./components/OwnerShell";
import { Dashboard } from "./components/Dashboard";
import { ClientsView, ClientProfile, type ClientsFilter } from "./components/Clients";
import { PlansView, MealsView, LibraryView, CheckInsView } from "./components/Workspaces";
import { SettingsView } from "./components/Settings";
import { ClientApp } from "./components/ClientApp";
import { NutritionPlanView } from "./components/NutritionPlan";
import { OwnerDashboard } from "./components/OwnerDashboard";
import { OwnerCoachesView } from "./components/OwnerCoachesView";
import { OwnerSubscriptionsView } from "./components/OwnerSubscriptionsView";
import { OwnerAnalyticsView } from "./components/OwnerAnalyticsView";
import { OwnerSettingsView } from "./components/OwnerSettingsView";
import { signOut } from "./services/auth";

type OwnerView = "dashboard" | "coaches" | "subscriptions" | "analytics" | "settings";

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
  const [coachView, setCoachView] = useState<CoachView>("dashboard");
  const [ownerView, setOwnerView] = useState<OwnerView>("dashboard");
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [clientPreset, setClientPreset] = useState<string | null>(null);
  const [planPreset, setPlanPreset] = useState<string | null>(null);
  const [mealPreset, setMealPreset] = useState<string | null>(null);
  const [clientsFilter, setClientsFilter] = useState<ClientsFilter | null>(null);

  // Listen for owner view change events from dashboard
  useEffect(() => {
    const handleOwnerViewChange = (event: CustomEvent<OwnerView>) => {
      setOwnerView(event.detail);
    };
    window.addEventListener('owner-view-change', handleOwnerViewChange as EventListener);
    return () => {
      window.removeEventListener('owner-view-change', handleOwnerViewChange as EventListener);
    };
  }, []);

  /** Internal navigation — keeps deep-link presets in sync. */
  const go = (v: CoachView, id?: string) => {
    if (v === "client") setClientPreset(id ?? null);
    if (v === "plans") setPlanPreset(id ?? null);
    if (v === "meals") setMealPreset(id ?? null);
    if (v === "clients") setClientsFilter(null);
    setCoachView(v);
  };

  /** Dashboard deep-link: jump straight into a pre-filtered roster. */
  const openClientsWithFilter = (f: "Active" | "Expiring Soon" | "Expired") => {
    setClientsFilter(f);
    setCoachView("clients");
  };

  /** Sidebar navigation always lands on an unfiltered view. */
  const nav = (v: CoachView) => {
    if (v === "clients") setClientsFilter(null);
    setCoachView(v);
  };

  // If authenticated as owner, show Owner Mode directly (no AdminAuth screen)
  if (phase === "ready" && me?.role === "owner") {
    return (
      <OwnerShell view={ownerView} setView={setOwnerView} onLogout={() => void signOut()}>
        {ownerView === "dashboard" && <OwnerDashboard />}
        {ownerView === "coaches" && <OwnerCoachesView />}
        {ownerView === "subscriptions" && <OwnerSubscriptionsView />}
        {ownerView === "analytics" && <OwnerAnalyticsView />}
        {ownerView === "settings" && <OwnerSettingsView />}
      </OwnerShell>
    );
  }

  // Show admin auth screen only when explicitly requested AND not already authenticated
  if (showAdminAuth && (!me || me.role !== "owner")) {
    return <AdminAuth onBack={() => setShowAdminAuth(false)} />;
  }

  if (phase === "booting" || phase === "loading") {
    return <Splash label={phase === "booting" ? "Waking up…" : "Loading your data…"} />;
  }

  if (phase === "signed-out" || !me) {
    return <Auth onShowAdmin={() => setShowAdminAuth(true)} />;
  }

  if (me.role === "client") {
    return <ClientApp onLogout={() => void signOut()} />;
  }

  // Coach mode (me.role === "coach")
  return (
    <CoachShell view={coachView} setView={nav} onLogout={() => void signOut()}>
      {coachView === "dashboard" && <Dashboard go={go} openClientsWithFilter={openClientsWithFilter} />}
      {coachView === "clients" && <ClientsView key={clientsFilter ?? "all"} go={go} initialFilter={clientsFilter ?? undefined} />}
      {coachView === "client" && clientPreset && <ClientProfile key={clientPreset} clientId={clientPreset} go={go} />}
      {coachView === "plans" && <PlansView presetClientId={planPreset} />}
      {coachView === "meals" && <NutritionPlanView presetClientId={mealPreset} />}
      {coachView === "library" && <LibraryView />}
      {coachView === "checkins" && <CheckInsView go={go} />}
      {coachView === "settings" && <SettingsView />}
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
