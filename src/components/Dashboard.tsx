import { useState, type ReactNode } from "react";
import type { Client, View } from "../types";
import { SESSION_TYPE_META } from "../types";
import {
  fmtFullToday,
  fmtTime,
  monthKey,
  subDaysLabel,
  subState,
  todayISO,
  waLink,
  weightDelta,
  goalIsGain,
} from "../lib";
import { useApp } from "../store";
import { Avatar, Badge, btnGhost, btnVolt, EmptyState, SectionCard, useCountUp } from "./ui";
import { RevenueBars, Sparkline } from "./Chart";
import { ClientFormModal, RenewModal } from "./modals";
import {
  IconAlert,
  IconCalendar,
  IconCheck,
  IconDumbbell,
  IconFlame,
  IconPlus,
  IconTrendDown,
  IconTrendUp,
  IconUsers,
  IconWallet,
  IconWhatsapp,
} from "../icons";

const TONES: Record<string, string> = {
  pine: "bg-pine-100 text-pine-700",
  teal: "bg-teal-100 text-teal-700",
  amber: "bg-amber-100 text-amber-700",
  volt: "bg-volt-200 text-pine-800",
};

function Tile({
  icon,
  tone,
  label,
  value,
  sub,
  delay,
}: {
  icon: ReactNode;
  tone: string;
  label: string;
  value: string;
  sub: string;
  delay: number;
}) {
  return (
    <div
      className="rise card-hover flex items-center gap-4 rounded-xl border border-pine-100 bg-white p-4 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="font-display text-[26px] font-bold leading-7 text-pine-950">{value}</p>
        <p className="text-xs font-bold text-pine-800">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-pine-400">{sub}</p>
      </div>
    </div>
  );
}

function Delta({ c }: { c: Client }) {
  const d = weightDelta(c);
  if (d === 0) return <span className="text-[11px] font-semibold text-pine-300">ثابت</span>;
  const good = goalIsGain(c) ? d > 0 : d < 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-display text-xs font-bold ${
        good ? "text-pine-600" : "text-amber-600"
      }`}
    >
      {d > 0 ? <IconTrendUp className="h-3.5 w-3.5" /> : <IconTrendDown className="h-3.5 w-3.5" />}
      {Math.abs(d)} كجم
    </span>
  );
}

export function Dashboard({ go }: { go: (v: View, id?: string) => void }) {
  const { state, toggleSession } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [renewFor, setRenewFor] = useState<Client | null>(null);

  const today = todayISO();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح النشاط" : hour < 18 ? "يلا نكمّل شغل" : "مساء القوة";

  const todaySessions = state.sessions.filter((s) => s.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const doneToday = todaySessions.filter((s) => s.done).length;

  const active = state.clients.filter((c) => subState(c) !== "expired").length;
  const alerts = state.clients
    .filter((c) => subState(c) !== "active")
    .sort((a, b) => a.subEnd.localeCompare(b.subEnd));

  const monthPayments = state.payments.filter((p) => monthKey(p.date) === monthKey(today));
  const revenueMonth = monthPayments.reduce((s, p) => s + p.amount, 0);

  const animActive = useCountUp(active);
  const animRevenue = useCountUp(revenueMonth);
  const animAlerts = useCountUp(alerts.length);

  const topProgress = [...state.clients]
    .filter((c) => weightDelta(c) !== 0)
    .sort((a, b) => Math.abs(weightDelta(b)) - Math.abs(weightDelta(a)))
    .slice(0, 3);

  const nameOf = (id: string) => state.clients.find((c) => c.id === id);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-pine-500">{fmtFullToday()}</p>
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-pine-950 sm:text-4xl">
            {greeting} يا كابتن محمود
          </h1>
          <p className="mt-1.5 text-sm text-pine-600">
            عندك {todaySessions.length === 0 ? "يوم فاضي من الجلسات" : `${todaySessions.length} جلسات النهارده خلصت منها ${doneToday}`}
            {alerts.length > 0 && (
              <span className="font-semibold text-amber-700">
                {" "}
                — وفي {alerts.length === 1 ? "اشتراك مستني تجديد" : `${alerts.length} اشتراكات مستنية تجديد`}
              </span>
            )}
          </p>
        </div>
        <button className={`${btnVolt} h-11`} onClick={() => setFormOpen(true)}>
          <IconPlus className="h-4 w-4" strokeWidth={2.4} />
          عميل جديد
        </button>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile tone="pine" icon={<IconUsers className="h-6 w-6" />} label="عملاء نشطين" value={String(Math.round(animActive))} sub={`من أصل ${state.clients.length} عميل`} delay={0} />
        <Tile tone="teal" icon={<IconCalendar className="h-6 w-6" />} label="جلسات النهارده" value={`${doneToday}/${todaySessions.length}`} sub={doneToday === todaySessions.length && todaySessions.length > 0 ? "خلصت كل الجلسات، برافو" : "كمّل وعلّم على اللي خلص"} delay={70} />
        <Tile tone="amber" icon={<IconAlert className="h-6 w-6" />} label="محتاجين تجديد" value={String(Math.round(animAlerts))} sub="منتهي أو باقي له 7 أيام" delay={140} />
        <Tile tone="volt" icon={<IconWallet className="h-6 w-6" />} label="إيراد الشهر" value={`${Math.round(animRevenue).toLocaleString("en-US")} ج.م`} sub={`${monthPayments.length} دفعة اتسجلت`} delay={210} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="جلسات النهارده"
          icon={<IconCalendar className="h-4.5 w-4.5" />}
          className="lg:col-span-2"
          delay={120}
          bodyCls="p-3"
          action={
            <button className={`${btnGhost} px-3! py-1.5! text-xs`} onClick={() => go("schedule")}>
              الجدول كامل
            </button>
          }
        >
          {todaySessions.length === 0 ? (
            <div className="p-2">
              <EmptyState icon={<IconDumbbell className="h-6 w-6" />} title="مفيش جلسات النهارده" sub="يوم استشفاء؟ أو افتح الجدول واحجز جلسة لحد من عملائك." />
            </div>
          ) : (
            <ul className="grid gap-1">
              {todaySessions.map((s) => {
                const c = nameOf(s.clientId);
                const meta = SESSION_TYPE_META[s.type];
                return (
                  <li key={s.id} className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 transition hover:bg-pine-50 ${s.done ? "opacity-55" : ""}`}>
                    <button
                      onClick={() => toggleSession(s.id)}
                      aria-label="تبديل حالة الجلسة"
                      className={`grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-all ${
                        s.done
                          ? "border-pine-600 bg-pine-600 text-white"
                          : "border-pine-300 text-transparent hover:border-pine-500"
                      }`}
                    >
                      <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                    <span className="w-16 shrink-0 font-display text-sm font-bold text-pine-900">{fmtTime(s.time)}</span>
                    <button
                      className="flex min-w-0 cursor-pointer items-center gap-2.5 text-start"
                      onClick={() => c && go("client", c.id)}
                    >
                      {c && <Avatar name={c.name} color={c.color} className="h-8 w-8 rounded-lg text-[11px]" />}
                      <span className="min-w-0">
                        <span className={`block truncate text-sm font-semibold text-pine-950 ${s.done ? "line-through" : ""}`}>
                          {c?.name ?? "عميل"}
                        </span>
                        {s.note && <span className="block truncate text-[11px] text-pine-400">{s.note}</span>}
                      </span>
                    </button>
                    <Badge className={`ms-auto shrink-0 ${meta.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {s.type}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="محتاجين تجديد"
          icon={<IconAlert className="h-4.5 w-4.5" />}
          delay={180}
          bodyCls="p-3"
          action={
            alerts.length > 0 ? (
              <button className={`${btnGhost} px-3! py-1.5! text-xs`} onClick={() => go("payments")}>
                الكل
              </button>
            ) : undefined
          }
        >
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-pine-100 text-pine-600">
                <IconCheck className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <p className="text-sm font-semibold text-pine-800">كل الاشتراكات مظبوطة</p>
              <p className="text-[11px] text-pine-400">مفيش حد محتاج تجديد دلوقتي</p>
            </div>
          ) : (
            <ul className="grid gap-1">
              {alerts.slice(0, 5).map((c) => {
                const st = subState(c);
                return (
                  <li key={c.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-pine-50">
                    <button className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-start" onClick={() => go("client", c.id)}>
                      <Avatar name={c.name} color={c.color} className="h-9 w-9 rounded-lg text-xs" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-pine-950">{c.name}</span>
                        <span className={`block text-[11px] font-semibold ${st === "expired" ? "text-red-500" : "text-amber-600"}`}>
                          {subDaysLabel(c)}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => setRenewFor(c)}
                      className="shrink-0 cursor-pointer rounded-lg bg-pine-800 px-2.5 py-1.5 text-[11px] font-bold text-volt-300 transition hover:bg-pine-700 active:scale-95"
                    >
                      تجديد
                    </button>
                    <a
                      href={waLink(c.phone, `أهلًا ${c.name}! معاك الكابتن محمود — اشتراك التدريب بتاعك ${st === "expired" ? "خلص" : "هينتهي قريب"}، حابب نجدده ونكمل المشوار؟`)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="تذكير واتساب"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-green-600 transition hover:bg-green-50"
                    >
                      <IconWhatsapp className="h-4.5 w-4.5" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="الإيرادات — آخر 6 شهور"
          icon={<IconWallet className="h-4.5 w-4.5" />}
          className="lg:col-span-2"
          delay={240}
          bodyCls="p-5 pt-6"
          action={
            <button className={`${btnGhost} px-3! py-1.5! text-xs`} onClick={() => go("payments")}>
              الاشتراكات
            </button>
          }
        >
          <RevenueBars payments={state.payments} />
        </SectionCard>

        <SectionCard title="أكبر تقدّم" icon={<IconFlame className="h-4.5 w-4.5" />} delay={300} bodyCls="p-3">
          {topProgress.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-pine-400">لسه مفيش تغييرات أوزان مسجلة</p>
          ) : (
            <ul className="grid gap-1">
              {topProgress.map((c, i) => (
                <li key={c.id}>
                  <button
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-start transition hover:bg-pine-50"
                    onClick={() => go("client", c.id)}
                  >
                    <span className="font-display text-sm font-bold text-pine-300">{i + 1}</span>
                    <Avatar name={c.name} color={c.color} className="h-9 w-9 rounded-lg text-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-pine-950">{c.name}</span>
                      <Delta c={c} />
                    </span>
                    <Sparkline values={[...c.weights].sort((a, b) => a.date.localeCompare(b.date)).map((w) => w.kg)} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <ClientFormModal open={formOpen} initial={null} onClose={() => setFormOpen(false)} onSaved={(c) => go("client", c.id)} />
      <RenewModal client={renewFor} onClose={() => setRenewFor(null)} />
    </div>
  );
}
