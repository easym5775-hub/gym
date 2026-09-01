import { useState } from "react";
import type { View } from "../types";
import { subState } from "../lib";
import { useApp } from "../store";
import {
  IconAlert,
  IconCalendar,
  IconCheck,
  IconDumbbell,
  IconGrid,
  IconRefresh,
  IconUsers,
  IconWallet,
} from "../icons";
import { ConfirmModal } from "./ui";

const NAV: { id: View; label: string; icon: (p: { className?: string }) => JSX.Element }[] = [
  { id: "dashboard", label: "لوحة المتابعة", icon: IconGrid },
  { id: "clients", label: "العملاء", icon: IconUsers },
  { id: "schedule", label: "جدول الجلسات", icon: IconCalendar },
  { id: "payments", label: "الاشتراكات", icon: IconWallet },
];

function Logo() {
  return (
    <div className="flex items-center gap-3 px-5 pb-5 pt-6">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-volt-400 text-pine-950 shadow-[0_6px_18px_-6px_rgba(216,242,75,0.5)] transition-transform hover:-rotate-6">
        <IconDumbbell className="h-6 w-6" strokeWidth={2.2} />
      </div>
      <div>
        <p className="font-display text-2xl font-bold leading-none text-white">كابتن</p>
        <p className="mt-1 text-[10.5px] font-medium text-pine-300">سيستم متابعة العملاء</p>
      </div>
    </div>
  );
}

export function Sidebar({ view, go }: { view: View; go: (v: View, id?: string) => void }) {
  const { state, resetData } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);

  const alerts = state.clients.filter((c) => {
    const s = subState(c);
    return s === "soon" || s === "expired";
  }).length;

  return (
    <aside className="sidebar-glow sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-y-auto bg-pine-950 lg:flex">
      <Logo />

      <nav className="mt-1 flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = view === item.id || (view === "client" && item.id === "clients");
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`relative flex cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-pine-800 text-volt-300"
                  : "text-pine-200 hover:bg-pine-900 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute top-1/2 start-0 h-6 w-1 -translate-y-1/2 rounded-e-full bg-volt-400" />
              )}
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
              {item.id === "clients" && (
                <span
                  className={`ms-auto rounded-md px-1.5 py-0.5 font-display text-[11px] leading-4 ${
                    active ? "bg-pine-700 text-volt-200" : "bg-pine-900 text-pine-300"
                  }`}
                >
                  {state.clients.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="px-3 pb-3">
        {alerts > 0 ? (
          <button
            onClick={() => go("payments")}
            className="group flex w-full cursor-pointer items-start gap-2.5 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3.5 text-start transition hover:border-amber-300/50 hover:bg-amber-300/15"
          >
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              <span className="block text-xs font-bold text-amber-100">
                {alerts === 1 ? "اشتراك واحد" : `${alerts} اشتراكات`} محتاجة تجديد
              </span>
              <span className="mt-0.5 block text-[10.5px] leading-4 text-amber-200/70 transition group-hover:text-amber-200">
                افتح صفحة الاشتراكات وجدّد قبل ما يمشي العميل
              </span>
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-pine-700 bg-pine-900/60 p-3.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pine-700 text-volt-300">
              <IconCheck className="h-3.5 w-3.5" strokeWidth={2.6} />
            </span>
            <p className="text-[11px] font-semibold text-pine-200">كل الاشتراكات مظبوطة، كمّل شغل</p>
          </div>
        )}

        <button
          onClick={() => setConfirmReset(true)}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium text-pine-400 transition hover:bg-pine-900 hover:text-pine-200"
        >
          <IconRefresh className="h-3.5 w-3.5" />
          إعادة البيانات التجريبية
        </button>
      </div>

      <p className="border-t border-pine-900 px-5 py-3.5 text-[10px] leading-4 text-pine-500">
        بياناتك محفوظة على جهازك بس — مفيش أي حاجة بتتبعت لأي سيرفر.
      </p>

      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="إعادة البيانات التجريبية؟"
        message="كل العملاء والجلسات والمدفوعات الحالية هتتمسح وهترجع بيانات العرض من الأول."
        confirmLabel="أيوه، ارجّعها"
        onConfirm={resetData}
      />
    </aside>
  );
}

export function MobileNav({ view, go }: { view: View; go: (v: View, id?: string) => void }) {
  const { state } = useApp();
  return (
    <div className="sticky top-0 z-40 border-b border-pine-800 bg-pine-950 lg:hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-volt-400 text-pine-950">
          <IconDumbbell className="h-4.5 w-4.5" strokeWidth={2.2} />
        </span>
        <p className="font-display text-lg font-bold leading-none text-white">كابتن</p>
        <span className="ms-auto text-[10px] text-pine-400">{state.clients.length} عميل</span>
      </div>
      <nav className="flex gap-1.5 overflow-x-auto px-4 py-3">
        {NAV.map((item) => {
          const active = view === item.id || (view === "client" && item.id === "clients");
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                active ? "bg-volt-400 text-pine-950" : "bg-pine-900 text-pine-200 hover:bg-pine-800"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
