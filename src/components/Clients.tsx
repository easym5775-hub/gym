import { useState } from "react";
import type { Client, View } from "../types";
import { GOAL_META } from "../types";
import type { SubState } from "../lib";
import {
  fmtTime,
  fmtWeekday,
  latestWeight,
  subDaysLabel,
  subProgress,
  subState,
  todayISO,
  waLink,
  weightDelta,
  goalIsGain,
  SUB_META,
} from "../lib";
import { useApp } from "../store";
import { Avatar, Badge, btnVolt, EmptyState, inputCls, ProgressBar } from "./ui";
import { ClientFormModal } from "./modals";
import {
  IconClock,
  IconPlus,
  IconSearch,
  IconTrendDown,
  IconTrendUp,
  IconUsers,
  IconWhatsapp,
} from "../icons";

const FILTERS: { id: "all" | SubState; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "active", label: "نشط" },
  { id: "soon", label: "ينتهي قريبًا" },
  { id: "expired", label: "منتهي" },
];

const BAR: Record<SubState, string> = {
  active: "bg-pine-600",
  soon: "bg-amber-500",
  expired: "bg-red-500",
};

function ClientCard({ c, go, delay }: { c: Client; go: (v: View, id?: string) => void; delay: number }) {
  const { state } = useApp();
  const today = todayISO();
  const st = subState(c);
  const meta = SUB_META[st];
  const last = latestWeight(c);
  const d = weightDelta(c);
  const good = goalIsGain(c) ? d > 0 : d < 0;
  const next = state.sessions
    .filter((s) => s.clientId === c.id && !s.done && s.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => go("client", c.id)}
      onKeyDown={(e) => e.key === "Enter" && go("client", c.id)}
      className="rise card-hover w-full cursor-pointer rounded-xl border border-pine-100 bg-white p-4 text-start shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-volt-500"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={c.name} color={c.color} className="h-11 w-11 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold leading-6 text-pine-950">{c.name}</p>
          <p className="text-[11px] tracking-wide text-pine-400" dir="ltr" style={{ textAlign: "start" }}>
            {c.phone}
          </p>
        </div>
        <a
          href={waLink(c.phone)}
          target="_blank"
          rel="noreferrer"
          aria-label={`واتساب ${c.name}`}
          onClick={(e) => e.stopPropagation()}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-green-600 transition hover:bg-green-50"
        >
          <IconWhatsapp className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge className={GOAL_META[c.goal].badge}>{c.goal}</Badge>
        <Badge className={meta.badge}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </Badge>
        <span className={`ms-auto text-[11px] font-bold ${meta.text}`}>{subDaysLabel(c)}</span>
      </div>

      <div className="mt-3">
        <ProgressBar value={subProgress(c)} barCls={BAR[st]} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-pine-500">
          الوزن: <span className="font-display font-bold text-pine-900">{last ? `${last.kg} كجم` : "—"}</span>
        </span>
        {d !== 0 ? (
          <span className={`inline-flex items-center gap-1 font-display text-xs font-bold ${good ? "text-pine-600" : "text-amber-600"}`}>
            {d > 0 ? <IconTrendUp className="h-3.5 w-3.5" /> : <IconTrendDown className="h-3.5 w-3.5" />}
            {Math.abs(d)} كجم
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-pine-300">الوزن ثابت</span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 border-t border-dashed border-pine-100 pt-2.5 text-[11px]">
        <IconClock className="h-3.5 w-3.5 shrink-0 text-pine-300" />
        {next ? (
          <span className="truncate font-semibold text-pine-600">
            الجلسة الجاية: {fmtWeekday(next.date)} {fmtTime(next.time)}
          </span>
        ) : (
          <span className="text-pine-300">مفيش جلسة محجوزة</span>
        )}
      </div>
    </div>
  );
}

export function Clients({ go }: { go: (v: View, id?: string) => void }) {
  const { state } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | SubState>("all");
  const [formOpen, setFormOpen] = useState(false);

  const query = q.trim().toLowerCase();
  const filtered = state.clients.filter((c) => {
    const matchQ = !query || c.name.toLowerCase().includes(query) || c.phone.replace(/\s/g, "").includes(query);
    const matchF = filter === "all" || subState(c) === filter;
    return matchQ && matchF;
  });

  const counts = {
    all: state.clients.length,
    active: state.clients.filter((c) => subState(c) === "active").length,
    soon: state.clients.filter((c) => subState(c) === "soon").length,
    expired: state.clients.filter((c) => subState(c) === "expired").length,
  };

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-pine-950">العملاء</h1>
          <p className="mt-1 text-sm text-pine-500">{state.clients.length} عميل في قائمتك — تابع أوزانهم وجلساتهم واشتراكاتهم</p>
        </div>
        <button className={`${btnVolt} h-11`} onClick={() => setFormOpen(true)}>
          <IconPlus className="h-4 w-4" strokeWidth={2.4} />
          عميل جديد
        </button>
      </header>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <IconSearch className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pine-300" />
          <input
            className={`${inputCls} ps-9!`}
            placeholder="دوّر بالاسم أو رقم الموبايل…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                filter === f.id
                  ? "border-pine-800 bg-pine-800 text-volt-300"
                  : "border-pine-200 bg-white text-pine-600 hover:border-pine-400"
              }`}
            >
              {f.label}
              <span className={`ms-1.5 font-display ${filter === f.id ? "text-volt-200" : "text-pine-300"}`}>
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {state.clients.length === 0 ? (
          <EmptyState
            icon={<IconUsers className="h-6 w-6" />}
            title="قائمتك فاضية لسه"
            sub="ضيف أول عميل وابدأ تتابع أوزانه وجلساته واشتراكه من هنا."
          >
            <button className={`${btnVolt} mt-2`} onClick={() => setFormOpen(true)}>
              <IconPlus className="h-4 w-4" strokeWidth={2.4} />
              ضيف أول عميل
            </button>
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<IconSearch className="h-6 w-6" />}
            title="مفيش نتائج مطابقة"
            sub={`مفيش عميل مطابق لـ«${q}» بالفلتر الحالي. جرب تغيير البحث أو الفلتر.`}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c, i) => (
              <ClientCard key={c.id} c={c} go={go} delay={Math.min(i * 50, 350)} />
            ))}
          </div>
        )}
      </div>

      <ClientFormModal open={formOpen} initial={null} onClose={() => setFormOpen(false)} onSaved={(c) => go("client", c.id)} />
    </div>
  );
}
