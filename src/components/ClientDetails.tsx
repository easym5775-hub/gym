import { useEffect, useState } from "react";
import type { View } from "../types";
import { GOAL_META, SESSION_TYPE_META } from "../types";
import {
  addDays,
  fmtDate,
  fmtTime,
  fmtWeekday,
  goalIsGain,
  latestWeight,
  planDaysOf,
  subDaysLabel,
  subProgress,
  subState,
  todayISO,
  waLink,
  weightDelta,
  SUB_META,
} from "../lib";
import { useApp } from "../store";
import {
  Avatar,
  Badge,
  btnDanger,
  btnGhost,
  btnVolt,
  ConfirmModal,
  EmptyState,
  ProgressBar,
  SectionCard,
} from "./ui";
import { WeightChart } from "./Chart";
import { ClientFormModal, RenewModal, SessionModal, WeightModal } from "./modals";
import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconNote,
  IconPencil,
  IconPhone,
  IconPlus,
  IconScale,
  IconTarget,
  IconTrash,
  IconUsers,
  IconWhatsapp,
} from "../icons";

export function ClientDetails({ id, go }: { id: string; go: (v: View, id?: string) => void }) {
  const { state, deleteClient, toggleSession, deleteSession, updateNotes, toast } = useApp();
  const client = state.clients.find((c) => c.id === id);

  const [formOpen, setFormOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (client) setNotes(client.notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!client) {
    return (
      <EmptyState icon={<IconUsers className="h-6 w-6" />} title="العميل ده مش موجود" sub="ممكن يكون اتحذف — ارجع لقائمة العملاء.">
        <button className={`${btnGhost} mt-2`} onClick={() => go("clients")}>
          <IconChevronRight className="h-4 w-4" />
          رجوع للعملاء
        </button>
      </EmptyState>
    );
  }

  const st = subState(client);
  const meta = SUB_META[st];
  const last = latestWeight(client);
  const cur = last?.kg ?? client.startWeight;
  const d = weightDelta(client);
  const remaining = +(cur - client.targetWeight).toFixed(1);
  const total = client.startWeight - client.targetWeight;
  const pct = Math.max(0, Math.min(100, total === 0 ? 100 : Math.round(((client.startWeight - cur) / total) * 100)));
  const subStart = addDays(client.subEnd, -planDaysOf(client));

  const all = state.sessions
    .filter((s) => s.clientId === client.id)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const today = todayISO();
  const next = [...all].reverse().find((s) => !s.done && s.date >= today);

  const saveNotes = () => {
    if (notes.trim() !== client.notes) {
      updateNotes(client.id, notes.trim());
      toast("تم حفظ الملاحظات");
    }
  };

  return (
    <div>
      {/* header */}
      <div className="rise flex flex-wrap items-center gap-4 rounded-xl border border-pine-100 bg-white p-5 shadow-sm">
        <button
          onClick={() => go("clients")}
          aria-label="رجوع"
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-pine-200 text-pine-500 transition hover:border-pine-400 hover:bg-pine-50 hover:text-pine-800"
        >
          <IconChevronRight className="h-5 w-5" />
        </button>
        <Avatar name={client.name} color={client.color} className="h-16 w-16 rounded-2xl text-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-pine-950">{client.name}</h1>
            <Badge className={GOAL_META[client.goal].badge}>{client.goal}</Badge>
            <Badge className={meta.badge}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label} — {subDaysLabel(client)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-pine-500">
            {client.age} سنة • {client.height} سم • انضم {fmtDate(client.joinDate)} •{" "}
            <span dir="ltr">{client.phone}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${client.phone}`} className={`${btnGhost} px-3!`} aria-label="اتصال">
            <IconPhone className="h-4 w-4" />
            اتصال
          </a>
          <a
            href={waLink(client.phone, `أهلًا ${client.name}! معاك الكابتن محمود — جاهز لجلسة النهارده؟`)}
            target="_blank"
            rel="noreferrer"
            className={`${btnGhost} border-green-200! px-3! text-green-700! hover:bg-green-50!`}
          >
            <IconWhatsapp className="h-4 w-4" />
            واتساب
          </a>
          <button className={`${btnGhost} px-3!`} onClick={() => setFormOpen(true)}>
            <IconPencil className="h-4 w-4" />
            تعديل
          </button>
          <button className={`${btnDanger} px-3!`} onClick={() => setConfirmDel(true)} aria-label="حذف">
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* weight + sessions */}
        <div className="grid content-start gap-4 lg:col-span-3">
          <SectionCard
            title="منحنى الوزن"
            icon={<IconScale className="h-4.5 w-4.5" />}
            delay={80}
            action={
              <button className={`${btnVolt} px-3! py-1.5! text-xs`} onClick={() => setWeightOpen(true)}>
                <IconPlus className="h-3.5 w-3.5" strokeWidth={2.6} />
                تسجيل وزن
              </button>
            }
          >
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-pine-50 px-3 py-2.5">
                <p className="text-[10.5px] font-semibold text-pine-500">الوزن الحالي</p>
                <p className="font-display text-xl font-bold text-pine-950">
                  {cur} <span className="text-[11px] font-medium text-pine-400">كجم</span>
                </p>
              </div>
              <div className="rounded-lg bg-pine-50 px-3 py-2.5">
                <p className="text-[10.5px] font-semibold text-pine-500">وزن البداية</p>
                <p className="font-display text-xl font-bold text-pine-800">
                  {client.startWeight} <span className="text-[11px] font-medium text-pine-400">كجم</span>
                </p>
              </div>
              <div className="rounded-lg bg-pine-50 px-3 py-2.5">
                <p className="text-[10.5px] font-semibold text-pine-500">الهدف</p>
                <p className="font-display text-xl font-bold text-amber-700">
                  {client.targetWeight} <span className="text-[11px] font-medium text-pine-400">كجم</span>
                </p>
              </div>
              <div className="rounded-lg bg-pine-50 px-3 py-2.5">
                <p className="text-[10.5px] font-semibold text-pine-500">{goalIsGain(client) ? "فاضل زيادة" : "فاضل نزول"}</p>
                <p className={`font-display text-xl font-bold ${Math.abs(remaining) === 0 ? "text-pine-600" : "text-pine-950"}`}>
                  {Math.abs(remaining)} <span className="text-[11px] font-medium text-pine-400">كجم</span>
                </p>
              </div>
            </div>
            <WeightChart entries={client.weights} target={client.targetWeight} start={client.startWeight} />
          </SectionCard>

          <SectionCard
            title="الجلسات"
            icon={<IconCalendar className="h-4.5 w-4.5" />}
            delay={160}
            bodyCls="p-3"
            action={
              <button className={`${btnGhost} px-3! py-1.5! text-xs`} onClick={() => setSessionOpen(true)}>
                <IconPlus className="h-3.5 w-3.5" strokeWidth={2.6} />
                حجز جلسة
              </button>
            }
          >
            {next && (
              <div className="mx-2 mb-2 flex items-center gap-2.5 rounded-lg border border-volt-500/50 bg-volt-100/60 px-3 py-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-volt-400 text-pine-950">
                  <IconCalendar className="h-4 w-4" />
                </span>
                <p className="text-xs font-bold text-pine-900">
                  الجلسة الجاية: {fmtWeekday(next.date)} {fmtDate(next.date)} — {fmtTime(next.time)}
                  <span className="ms-2 font-medium text-pine-500">({next.type})</span>
                </p>
              </div>
            )}
            {all.length === 0 ? (
              <div className="p-2">
                <EmptyState icon={<IconCalendar className="h-6 w-6" />} title="مفيش جلسات لسه" sub="احجز أول جلسة وابدأ المتابعة." />
              </div>
            ) : (
              <ul className="grid gap-1">
                {all.slice(0, 10).map((s) => {
                  const tm = SESSION_TYPE_META[s.type];
                  return (
                    <li key={s.id} className={`group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-pine-50 ${s.done ? "opacity-55" : ""}`}>
                      <button
                        onClick={() => toggleSession(s.id)}
                        aria-label="تبديل حالة الجلسة"
                        className={`grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-all ${
                          s.done ? "border-pine-600 bg-pine-600 text-white" : "border-pine-300 text-transparent hover:border-pine-500"
                        }`}
                      >
                        <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                      <div className="w-28 shrink-0">
                        <p className="font-display text-[13px] font-bold leading-4 text-pine-900">{fmtDate(s.date)}</p>
                        <p className="text-[10.5px] text-pine-400">
                          {fmtWeekday(s.date)} • {fmtTime(s.time)}
                        </p>
                      </div>
                      <Badge className={`${tm.chip} shrink-0`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${tm.dot}`} />
                        {s.type}
                      </Badge>
                      {s.note && <span className="hidden truncate text-[11px] text-pine-400 sm:block">{s.note}</span>}
                      <button
                        onClick={() => deleteSession(s.id)}
                        aria-label="حذف الجلسة"
                        className="ms-auto grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-lg text-pine-200 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* side column */}
        <div className="grid content-start gap-4 lg:col-span-2">
          <SectionCard title="الاشتراك" icon={<IconTarget className="h-4.5 w-4.5" />} delay={120}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-bold text-pine-950">{client.plan}</p>
                <p className="text-xs text-pine-400">{client.planPrice} ج.م</p>
              </div>
              <Badge className={meta.badge}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </Badge>
            </div>
            <p className="mt-3 text-xs text-pine-500">
              من <span className="font-semibold text-pine-800">{fmtDate(subStart)}</span> حتى{" "}
              <span className="font-semibold text-pine-800">{fmtDate(client.subEnd)}</span>
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <ProgressBar
                value={subProgress(client)}
                barCls={st === "expired" ? "bg-red-500" : st === "soon" ? "bg-amber-500" : "bg-pine-600"}
                className="flex-1"
              />
              <span className={`shrink-0 text-[11px] font-bold ${meta.text}`}>{subDaysLabel(client)}</span>
            </div>
            <button className={`${btnVolt} mt-4 w-full`} onClick={() => setRenewOpen(true)}>
              تجديد الاشتراك
            </button>
          </SectionCard>

          <SectionCard title="تقدّم الهدف" icon={<IconScale className="h-4.5 w-4.5" />} delay={200}>
            <div className="flex items-end justify-between">
              <p className="font-display text-3xl font-bold text-pine-950">
                {pct}
                <span className="text-base text-pine-400">%</span>
              </p>
              <p className="text-[11px] font-semibold text-pine-500">
                {goalIsGain(client)
                  ? `زاد ${Math.max(0, d)} كجم من أصل ${Math.abs(total)}`
                  : `نزل ${Math.max(0, -d)} كجم من أصل ${Math.abs(total)}`}
              </p>
            </div>
            <ProgressBar value={pct} barCls="bg-gradient-to-l from-volt-500 to-pine-500" trackCls="bg-pine-100" className="mt-3 h-2.5!" />
            <div className="mt-2 flex justify-between text-[10.5px] font-semibold text-pine-400">
              <span>البداية {client.startWeight}</span>
              <span>دلوقتي {cur}</span>
              <span>الهدف {client.targetWeight}</span>
            </div>
          </SectionCard>

          <SectionCard title="ملاحظات الكوتش" icon={<IconNote className="h-4.5 w-4.5" />} delay={260} bodyCls="p-3">
            <textarea
              rows={6}
              className="w-full resize-none rounded-lg border border-pine-200 bg-pine-50/50 p-3 text-sm leading-6 text-ink outline-none transition focus:border-pine-500 focus:bg-white focus:ring-2 focus:ring-volt-400/50"
              placeholder="نظام الأكل، إصابات، تعليمات الجلسة الجاية…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
            />
            <p className="mt-1.5 px-1 text-[10.5px] text-pine-300">بتتحفظ تلقائيًا لما تخرج من الحقل</p>
          </SectionCard>
        </div>
      </div>

      <ClientFormModal open={formOpen} initial={client} onClose={() => setFormOpen(false)} />
      {weightOpen && <WeightModal client={client} onClose={() => setWeightOpen(false)} />}
      <SessionModal open={sessionOpen} presetClient={client} onClose={() => setSessionOpen(false)} />
      <RenewModal client={renewOpen ? client : null} onClose={() => setRenewOpen(false)} />
      <ConfirmModal
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title={`حذف ${client.name}؟`}
        message="هيتمسح العميل مع كل الجلسات والمدفوعات بتاعته نهائيًا. مفيش رجوع في الخطوة دي."
        confirmLabel="أيوه، امسحه"
        onConfirm={() => {
          deleteClient(client.id);
          go("clients");
        }}
      />
    </div>
  );
}
