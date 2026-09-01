import { useState } from "react";
import type { View } from "./types";
import { StoreProvider, useApp } from "./store";
import { MobileNav, Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Clients } from "./components/Clients";
import { ClientDetails } from "./components/ClientDetails";
import { Schedule } from "./components/Schedule";
import { Payments } from "./components/Payments";
import { IconAlert, IconCheck, IconX } from "./icons";

function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[70] flex w-[min(92vw,370px)] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="animate-toast pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-xl border border-pine-800 bg-pine-950 px-4 py-3 text-start shadow-2xl"
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
              t.kind === "ok" ? "bg-volt-400 text-pine-950" : "bg-amber-400 text-pine-950"
            }`}
          >
            {t.kind === "ok" ? (
              <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />
            ) : (
              <IconAlert className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
          </span>
          <span className="flex-1 text-[13px] font-semibold leading-5 text-white">{t.msg}</span>
          <IconX className="h-4 w-4 shrink-0 text-pine-500" />
        </button>
      ))}
    </div>
  );
}

function Shell() {
  const [route, setRoute] = useState<{ view: View; id?: string }>({ view: "dashboard" });
  const go = (view: View, id?: string) => setRoute({ view, id });

  return (
    <div className="flex min-h-screen">
      <Sidebar view={route.view} go={go} />
      <main className="min-w-0 flex-1">
        <MobileNav view={route.view} go={go} />
        <div className="bg-dots min-h-screen">
          <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:py-8">
            <div key={`${route.view}-${route.id ?? ""}`} className="animate-view">
              {route.view === "dashboard" && <Dashboard go={go} />}
              {route.view === "clients" && <Clients go={go} />}
              {route.view === "client" && <ClientDetails id={route.id ?? ""} go={go} />}
              {route.view === "schedule" && <Schedule go={go} />}
              {route.view === "payments" && <Payments go={go} />}
            </div>
          </div>
        </div>
      </main>
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
