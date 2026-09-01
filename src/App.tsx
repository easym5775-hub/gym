import { useState } from "react";
import type { CoachView } from "./types";
import { StoreProvider } from "./store";
import { Toasts } from "./components/ui";
import { Auth } from "./components/Auth";
import { CoachShell } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ClientsView } from "./components/Clients";
import { PlansView } from "./components/Schedule";
import { MealsView } from "./components/Payments";
import { LibraryView } from "./components/Library";
import { CheckInsView } from "./components/ClientDetails";
import { ClientApp } from "./components/ClientApp";

type Session = { role: "coach" } | { role: "client"; clientId: string } | null;

function Root() {
  const [session, setSession] = useState<Session>(null);
  const [view, setView] = useState<CoachView>("dashboard");
  const [planPreset, setPlanPreset] = useState<string | null>(null);
  const [mealPreset, setMealPreset] = useState<string | null>(null);

  const go = (v: CoachView, id?: string) => {
    if (v === "plans") setPlanPreset(id ?? null);
    if (v === "meals") setMealPreset(id ?? null);
    setView(v);
  };

  if (!session) {
    return (
      <>
        <Auth onCoach={() => { setSession({ role: "coach" }); setView("dashboard"); }} onClient={(id) => setSession({ role: "client", clientId: id })} />
        <Toasts />
      </>
    );
  }

  if (session.role === "client") {
    return (
      <>
        <ClientApp clientId={session.clientId} onLogout={() => setSession(null)} />
        <Toasts />
      </>
    );
  }

  return (
    <>
      <CoachShell view={view} setView={setView} onLogout={() => setSession(null)}>
        {view === "dashboard" && <Dashboard go={go} />}
        {view === "clients" && <ClientsView go={go} />}
        {view === "plans" && <PlansView presetClientId={planPreset} />}
        {view === "meals" && <MealsView presetClientId={mealPreset} />}
        {view === "library" && <LibraryView />}
        {view === "checkins" && <CheckInsView />}
      </CoachShell>
      <Toasts />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  );
}
