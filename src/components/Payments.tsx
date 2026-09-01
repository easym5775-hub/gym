import { useState } from "react";
import type { Client, View } from "../types";
import {
  fmtDate,
  fmtMoney,
  monthKey,
  subDaysLabel,
  subState,
  todayISO,
  SUB_META,
} from "../lib";
import { useApp } from "../store";
import { Avatar, Badge, SectionCard, btnVolt, useCountUp } from "./ui";
import { RevenueBars } from "./Chart";
import { RenewModal } from "./modals";
import { IconAlert, IconWallet } from "../icons";

export function Payments({ go }: { go: (v: View, id?: string) => void }) {
  const { state } = useApp();
  const [renewFor, setRenewFor] = useState<Client | null>(null);

  const today = todayISO();
  const nowKey = monthKey(today);
  const monthPays = state.payments.filter((p) => monthKey(p.date) === nowKey);
  const revenueMonth = monthPays.reduce((s, p) => s + p.amount, 0);
  const needRenew = state.clients
    .filter((c) => subState(c) !== "active")
    .sort((a, b) => a.subEnd.localeCompare(b.subEnd));
  const activeClients = state.clients.filter((c) => subState(c) !== "expired");
  const avgPlan = activeClients.length
    ? Math.round(activeClients.reduce((s, c) => s + c.planPrice, 0) / activeClients.length)
    : 0;
  const lastPays = [...state.payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const nameOf = (id: string) => state.clients.find((c) => c.id === id);

  const animRevenue = useCountUp(revenueMonth);

  const sortedClients = [...state.clients].sort((a, b) => {
    const order = { expired: 0, soon: 1, active: 2 } as const;
    const diff = order[subState(a)] - order[subState(b)];
    return diff !== 0 ? diff : a.subEnd.localeCompare(b.subEnd);
  });

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-pine-950">الاشتراكات والمدفوعات</h1>
          <p className="mt-1 text-sm text-pine-500">تابع الإيراد، وجدّد الاشتراكات قبل ما العملاء يمشوا</p>
        </div>
        <button className={`${btnVolt} h-11 disabled:pointer-events-none disabled:opacity-40`} onClick={() => setRenewFor(needRenew[0] ?? null)} disabled={!needRenew.length}>
          <IconAlert className="h-4 w-4" />
          تجديد أسرع حالة
        </button>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rise rounded-xl border border-pine-100 bg-pine-950 p-4 text-white shadow-sm sidebar-glow">
          <p className="text-[11px] font-semibold text-pine-300">إيراد الشهر الحالي</p>
          <p className="mt-1 font-display text-[26px] font-bold leading-7 text-volt-300">
            {Math.round(animRevenue).toLocaleString("en-US")} <span className="text-sm font-medium text-pine-200">ج.م</span>
          </p>
          <p className="mt-1 text-[11px] text-pine-400">{monthPays.length} دفعة</p>
        </div>
        <div className="rise rounded-xl border border-pine-100 bg-white p-4 shadow-sm" style={{ animationDelay: "70ms" }}>
          <p className="text-[11px] font-semibold text-pine-500">محتاجين تجديد</p>
          <p className={`mt-1 font-display text-[26px] font-bold leading-7 ${needRenew.length ? "text-red-600" : "text-pine-950"}`}>
            {needRenew.length}
          </p>
          <p className="mt-1 text-[11px] text-pine-400">منتهي أو باقي له أسبوع</p>
        </div>
        <div className="rise rounded-xl border border-pine-100 bg-white p-4 shadow-sm" style={{ animationDelay: "140ms" }}>
          <p className="text-[11px] font-semibold text-pine-500">متوسط قيمة الاشتراك</p>
          <p className="mt-1 font-display text-[26px] font-bold leading-7 text-pine-950">{avgPlan.toLocaleString("en-US")}</p>
          <p className="mt-1 text-[11px] text-pine-400">ج.م للعميل النشط</p>
        </div>
        <div className="rise rounded-xl border border-pine-100 bg-white p-4 shadow-sm" style={{ animationDelay: "210ms" }}>
          <p className="text-[11px] font-semibold text-pine-500">إجمالي الدفعات</p>
          <p className="mt-1 font-display text-[26px] font-bold leading-7 text-pine-950">{state.payments.length}</p>
          <p className="mt-1 text-[11px] text-pine-400">منذ بداية الاستخدام</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <SectionCard title="الإيرادات — آخر 6 شهور" icon={<IconWallet className="h-4.5 w-4.5" />} className="lg:col-span-2" delay={120} bodyCls="p-5 pt-6">
          <RevenueBars payments={state.payments} />
        </SectionCard>

        <SectionCard title="آخر الدفعات" icon={<IconWallet className="h-4.5 w-4.5" />} delay={180} bodyCls="p-3">
          {lastPays.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-pine-400">مفيش دفعات مسجلة لسه</p>
          ) : (
            <ul className="grid gap-1">
              {lastPays.map((p) => {
                const c = nameOf(p.clientId);
                return (
                  <li key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-pine-50">
                    <Avatar name={c?.name ?? "؟"} color={c?.color ?? "pine"} className="h-9 w-9 rounded-lg text-xs" />
                    <button className="min-w-0 flex-1 cursor-pointer text-start" onClick={() => c && go("client", c.id)}>
                      <span className="block truncate text-sm font-semibold text-pine-950">{c?.name ?? "عميل محذوف"}</span>
                      <span className="block text-[11px] text-pine-400">
                        {p.plan} • {fmtDate(p.date)}
                      </span>
                    </button>
                    <span className="shrink-0 font-display text-sm font-bold text-pine-700">+{fmtMoney(p.amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="اشتراكات العملاء" icon={<IconAlert className="h-4.5 w-4.5" />} delay={240} bodyCls="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-pine-100 bg-pine-50/60 text-[11px] font-bold text-pine-400">
                <th className="px-5 py-3 text-start">العميل</th>
                <th className="px-4 py-3 text-start">الخطة</th>
                <th className="px-4 py-3 text-start">القيمة</th>
                <th className="px-4 py-3 text-start">تاريخ الانتهاء</th>
                <th className="px-4 py-3 text-start">الحالة</th>
                <th className="px-4 py-3 text-start">آخر دفعة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((c) => {
                const st = subState(c);
                const meta = SUB_META[st];
                const lastPay = state.payments
                  .filter((p) => p.clientId === c.id)
                  .sort((a, b) => b.date.localeCompare(a.date))[0];
                return (
                  <tr key={c.id} className="border-b border-pine-100/60 transition last:border-0 hover:bg-pine-50/50">
                    <td className="px-5 py-3">
                      <button className="flex cursor-pointer items-center gap-2.5 text-start" onClick={() => go("client", c.id)}>
                        <Avatar name={c.name} color={c.color} className="h-9 w-9 rounded-lg text-xs" />
                        <span>
                          <span className="block font-semibold text-pine-950 hover:underline">{c.name}</span>
                          <span className="block text-[11px] text-pine-400" dir="ltr" style={{ textAlign: "start" }}>
                            {c.phone}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 font-semibold text-pine-800">{c.plan}</td>
                    <td className="px-4 py-3 font-display font-bold text-pine-900">{fmtMoney(c.planPrice)}</td>
                    <td className="px-4 py-3">
                      <span className="block text-pine-800">{fmtDate(c.subEnd)}</span>
                      <span className={`block text-[11px] font-bold ${meta.text}`}>{subDaysLabel(c)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={meta.badge}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-pine-600">{lastPay ? `${fmtMoney(lastPay.amount)} • ${fmtDate(lastPay.date)}` : "—"}</td>
                    <td className="px-4 py-3 text-end">
                      <button
                        onClick={() => setRenewFor(c)}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                          st === "expired"
                            ? "bg-red-600 text-white hover:bg-red-500"
                            : st === "soon"
                              ? "bg-amber-500 text-white hover:bg-amber-400"
                              : "border border-pine-200 text-pine-700 hover:border-pine-400 hover:bg-pine-50"
                        }`}
                      >
                        تجديد
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <RenewModal client={renewFor} onClose={() => setRenewFor(null)} />
    </div>
  );
}
