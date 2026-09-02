/* ================================================================
   FORGE — clients roster + full client profile.
   ================================================================ */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ClipboardList,
  KeyRound,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RotateCw,
  Scale,
  Search,
  StickyNote,
  Trash2,
  User,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import type { CheckIn, Client, ClientStatus, CoachView, Payment, Session, SubState, Subscription } from "../types";
import {
  FOLLOW_UP_PRESETS,
  GOAL_META,
  PAYMENT_STATUS_META,
  SESSION_STATUS_META,
  STATUS_META,
  SUB_STATE_META,
  WEEK_DAYS,
} from "../types";
import { fmtDate, fmtMoney, fmtTime, relDay, signed, waHref } from "../lib";
import {
  attendance,
  currentSubscription,
  latestCheckIn,
  outstandingAmount,
  progressOf,
  remainingLabel,
  sortCheckIns,
  sortSessions,
  subHistory,
  subscriptionState,
  totalPaid,
  followUpInfo,
} from "../logic";
import { useApp } from "../store";
import {
  Avatar,
  Badge,
  ConfirmModal,
  EmptyState,
  Modal,
  MoodDots,
  SectionCard,
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSecondary,
  btnSm,
  inputCls,
  labelCls,
} from "./ui";
import { WeightLine, AttendanceRing, MacroSplit } from "./Chart";
import {
  ClientFormModal,
  NutritionTargetsModal,
  PaymentFormModal,
  PhotoModal,
  SessionFormModal,
  SubscriptionFormModal,
} from "./modals";

/* ================================================================
   Roster
   ================================================================ */

export type Filter = "All" | "Active" | "Inactive" | SubState;

const FILTERS: Filter[] = ["All", "Active", "Inactive", "Active", "Expiring Soon", "Expired", "No Subscription"];

export function ClientsView({
  go,
  initialFilter,
}: {
  go: (v: CoachView, id?: string) => void;
  initialFilter?: Filter;
}) {
  const { state } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter ?? "All");
  const [formOpen, setFormOpen] = useState(false);

  const subInfoFor = (id: string) =>
    subscriptionState(currentSubscription(state.subscriptions.filter((s) => s.clientId === id)));

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.clients
      .filter((c) => {
        switch (filter) {
          case "Active":
            return c.status === "Active";
          case "Inactive":
            return c.status !== "Active";
          case "Expiring Soon":
          case "Expired":
          case "No Subscription":
            return subInfoFor(c.id).state === filter;
          default:
            return true;
        }
      })
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.phone.replace(/\D/g, "").includes(needle.replace(/\D/g, "") || "\u0000") || c.username.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.clients, state.subscriptions, q, filter]);

  return (
    <div>
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight text-mist-100 sm:text-5xl">
            Clients <span className="text-volt-400">roster</span>
          </h1>
          <p className="mt-2 text-sm text-mist-400">
            {state.clients.length} total · {state.clients.filter((c) => c.status === "Active").length} active
          </p>
        </div>
        <button className={`${btnPrimary} h-11`} onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={2.4} /> Add client
        </button>
      </header>

      <div className="rise mt-5 flex flex-wrap items-center gap-3" style={{ animationDelay: "80ms" }}>
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" />
          <input className={`${inputCls} ps-9!`} placeholder="Search name, phone, username…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", "Active", "Inactive", "Expiring Soon", "Expired", "No Subscription"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as Filter)}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                filter === f ? "bg-volt-400 text-night-950" : "bg-night-800 text-mist-400 hover:text-mist-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <SectionCard title={`Roster (${rows.length})`} icon={<User className="h-4.5 w-4.5" />} className="mt-4" delay={140} bodyCls="p-0">
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<User className="h-6 w-6" />} title="No clients match" sub={q ? `Nothing found for "${q}".` : "Add your first client to start coaching."}>
              {!q && (
                <button className={`${btnPrimary} mt-2`} onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" strokeWidth={2.4} /> Add client
                </button>
              )}
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-night-700 bg-night-800/50 text-[11px] font-bold uppercase tracking-wider text-mist-500">
                  <th className="px-5 py-3 text-start">Client</th>
                  <th className="px-4 py-3 text-start">Goal</th>
                  <th className="px-4 py-3 text-start">Status</th>
                  <th className="px-4 py-3 text-start">Subscription</th>
                  <th className="px-4 py-3 text-start">Last check-in</th>
                  <th className="px-4 py-3 text-end">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const si = subInfoFor(c.id);
                  const last = latestCheckIn(state.checkIns.filter((x) => x.clientId === c.id));
                  return (
                    <tr key={c.id} className="group cursor-pointer border-b border-night-700/60 transition last:border-0 hover:bg-night-800/50" onClick={() => go("client", c.id)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} photo={c.photo} className="h-10 w-10 text-xs" />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-mist-100">{c.name}</p>
                            <p className="truncate text-[11px] text-mist-500">@{c.username}{c.phone ? ` · ${c.phone}` : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={GOAL_META[c.goal].chip}>
                          <span className={`h-1.5 w-1.5 rounded-full ${GOAL_META[c.goal].dot}`} />
                          {c.goal}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_META[c.status].chip}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[c.status].dot} ${c.status === "Active" ? "tick-pulse" : ""}`} />
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={SUB_STATE_META[si.state].chip}>
                          {si.state === "No Subscription" ? "None" : si.state}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-mist-300">
                        {last ? (
                          <span>
                            {last.weight} kg <span className="ms-1 text-[11px] text-mist-500">{relDay(last.date)}</span>
                          </span>
                        ) : (
                          <span className="text-mist-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <span className="inline-flex h-8 w-8 place-items-center rounded-lg text-mist-500 transition group-hover:bg-night-700 group-hover:text-volt-300">
                          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ClientFormModal open={formOpen} initial={null} onClose={() => setFormOpen(false)} onSaved={(c) => go("client", c.id)} />
    </div>
  );
}

/* ================================================================
   Client Profile
   ================================================================ */

export function ClientProfile({ clientId, go }: { clientId: string; go: (v: CoachView, id?: string) => void }) {
  const app = useApp();
  const { state } = app;

  const [editOpen, setEditOpen] = useState(false);
  const [subModal, setSubModal] = useState<{ open: boolean; initial: Subscription | null }>({ open: false, initial: null });
  const [payModal, setPayModal] = useState<{ open: boolean; initial: Payment | null }>({ open: false, initial: null });
  const [sessionModal, setSessionModal] = useState<{ open: boolean; initial: Session | null }>({ open: false, initial: null });
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [detail, setDetail] = useState<CheckIn | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [delPayment, setDelPayment] = useState<Payment | null>(null);
  const [delSession, setDelSession] = useState<Session | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const client = state.clients.find((c) => c.id === clientId);

  const subs = useMemo(() => state.subscriptions.filter((s) => s.clientId === clientId), [state.subscriptions, clientId]);
  const payments = useMemo(() => state.payments.filter((p) => p.clientId === clientId), [state.payments, clientId]);
  const sessions = useMemo(() => sortSessions(state.sessions.filter((s) => s.clientId === clientId)), [state.sessions, clientId]);
  const checkIns = useMemo(() => state.checkIns.filter((c) => c.clientId === clientId), [state.checkIns, clientId]);
  const plans = useMemo(() => state.plans.filter((p) => p.clientId === clientId), [state.plans, clientId]);
  const meals = useMemo(() => state.meals.filter((m) => m.clientId === clientId), [state.meals, clientId]);

  if (!client) {
    return (
      <EmptyState icon={<User className="h-6 w-6" />} title="Client not found" sub="They may have been removed.">
        <button className={`${btnSecondary} mt-2`} onClick={() => go("clients")}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> Back to clients
        </button>
      </EmptyState>
    );
  }

  const subInfo = subscriptionState(currentSubscription(subs));
  const prog = progressOf(checkIns);
  const att = attendance(sessions);
  const fu = followUpInfo(client, checkIns);
  const latest = latestCheckIn(checkIns);
  const wa = waHref(client.phone);
  const outstanding = outstandingAmount(subInfo.sub, payments);

  return (
    <div>
      {/* header */}
      <div className="rise overflow-hidden rounded-xl border border-night-700 bg-gradient-to-b from-night-800 to-night-850">
        <div className="p-5 sm:p-6">
          <button className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-mist-400 transition hover:text-volt-300" onClick={() => go("clients")}>
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> Back to clients
          </button>
          <div className="flex flex-wrap items-start gap-4">
            <Avatar name={client.name} photo={client.photo} className="h-16 w-16 text-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-mist-100 sm:text-4xl">{client.name}</h1>
                <Badge className={STATUS_META[client.status].chip}>
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[client.status].dot} ${client.status === "Active" ? "tick-pulse" : ""}`} />
                  {client.status}
                </Badge>
                <Badge className={GOAL_META[client.goal].chip}>{client.goal}</Badge>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-mist-400">@{client.username}</p>
              <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-semibold text-mist-400">
                {client.phone && (
                  <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-mist-500" />{client.phone}</span>
                )}
                {client.email && (
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-mist-500" />{client.email}</span>
                )}
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-mist-500" />Joined {fmtDate(client.startDate)}</span>
                {client.age !== undefined && (
                  <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-mist-500" />{client.age} yrs{client.gender ? ` · ${client.gender}` : ""}</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer" className={`${btnSecondary} ${btnSm} border-moss-600/50 text-moss-300 hover:bg-moss-900`}>
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              ) : (
                <span className={`${btnGhost} ${btnSm} cursor-not-allowed opacity-50`} title="No phone number available">
                  <MessageCircle className="h-3.5 w-3.5" /> No phone number
                </span>
              )}
              <button className={`${btnSecondary} ${btnSm}`} onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button className={`${btnGhost} ${btnSm}`} onClick={() => setPwOpen(true)} title="Reset login password">
                <KeyRound className="h-3.5 w-3.5" /> Reset password
              </button>
              <button className={`${btnDanger} ${btnSm}`} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* body grid */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* main column */}
        <div className="grid gap-5 lg:col-span-2">
          <ProgressCard prog={prog} checkIns={checkIns} />
          <CheckInsCard checkIns={checkIns} onView={setDetail} />
          <SessionsCard sessions={sessions} att={att} onAdd={() => setSessionModal({ open: true, initial: null })} onEdit={(s) => setSessionModal({ open: true, initial: s })} onDelete={setDelSession} onStatus={app.setSessionStatus} />
          <PaymentsCard payments={payments} sub={subInfo.sub} outstanding={outstanding} onAdd={() => setPayModal({ open: true, initial: null })} onEdit={(p) => setPayModal({ open: true, initial: p })} onDelete={setDelPayment} />
        </div>

        {/* side column */}
        <div className="grid gap-5">
          <SubscriptionCard subInfo={subInfo} subs={subs} onAdd={() => setSubModal({ open: true, initial: null })} onEdit={(s) => setSubModal({ open: true, initial: s })} onRenew={(s) => app.renewSubscription(s)} />
          <FollowUpCard client={client} fu={fu} onSetDays={(d) => app.setFollowUpDays(client.id, d)} onDone={() => app.markFollowUpDone(client.id)} />
          <NutritionCard client={client} meals={meals} onEdit={() => setNutritionOpen(true)} go={go} />
          <PlanCard plans={plans} go={go} clientId={client.id} />
          <CoachNotesCard client={client} onAdd={(t) => app.addCoachNote(client.id, t)} onUpdate={(id, t) => app.updateCoachNote(client.id, id, t)} onDelete={(id) => app.deleteCoachNote(client.id, id)} />
          <BasicInfoCard client={client} />
        </div>
      </div>

      {/* modals */}
      <ClientFormModal open={editOpen} initial={client} onClose={() => setEditOpen(false)} />
      <SubscriptionFormModal open={subModal.open} clientId={client.id} initial={subModal.initial} onClose={() => setSubModal({ open: false, initial: null })} />
      <PaymentFormModal open={payModal.open} clientId={client.id} initial={payModal.initial} subscriptions={subs} onClose={() => setPayModal({ open: false, initial: null })} />
      <SessionFormModal open={sessionModal.open} clientId={client.id} initial={sessionModal.initial} onClose={() => setSessionModal({ open: false, initial: null })} />
      <NutritionTargetsModal open={nutritionOpen} clientId={client.id} onClose={() => setNutritionOpen(false)} />
      <ResetPasswordModal open={pwOpen} clientId={client.id} clientName={client.name} onClose={() => setPwOpen(false)} />

      {detail && <CheckInDetailModal checkIn={detail} onClose={() => setDetail(null)} onPhoto={setPhoto} onDelete={(id) => { app.deleteCheckIn(id); setDetail(null); }} />}
      <PhotoModal src={photo} onClose={() => setPhoto(null)} />

      <ConfirmModal open={!!delPayment} onClose={() => setDelPayment(null)} title="Delete payment?" message={`The ${delPayment ? fmtMoney(delPayment.amount) : ""} EGP payment will be removed.`} onConfirm={() => delPayment && app.deletePayment(delPayment.id)} />
      <ConfirmModal open={!!delSession} onClose={() => setDelSession(null)} title="Delete session?" message={`${delSession ? `${relDay(delSession.date)} · ${fmtTime(delSession.time)}` : ""} will be removed from the schedule.`} onConfirm={() => delSession && app.deleteSession(delSession.id)} />
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete client?"
        message={<><strong className="text-mist-100">{client.name}</strong> and all their plans, check-ins, meals, subscriptions, payments and sessions will be permanently removed. Their login will stop working.</>}
        confirmLabel="Delete permanently"
        onConfirm={() => {
          app.deleteClient(client.id);
          go("clients");
        }}
      />
    </div>
  );
}

/* ---------------- progress ---------------- */

function ProgressCard({ prog, checkIns }: { prog: ReturnType<typeof progressOf>; checkIns: CheckIn[] }) {
  const stats = [
    { label: "Starting weight", value: prog.startWeight !== null ? `${prog.startWeight}` : "—", unit: "kg" },
    { label: "Current weight", value: prog.currentWeight !== null ? `${prog.currentWeight}` : "—", unit: "kg" },
    {
      label: "Weight change",
      value: prog.weightChange !== null ? signed(prog.weightChange) : "—",
      unit: "kg",
      tone: prog.weightChange !== null ? (prog.weightChange <= 0 ? "text-moss-300" : "text-warn-300") : undefined,
    },
    { label: "Starting waist", value: prog.startWaist !== null ? `${prog.startWaist}` : "—", unit: "cm" },
    { label: "Current waist", value: prog.currentWaist !== null ? `${prog.currentWaist}` : "—", unit: "cm" },
    {
      label: "Waist change",
      value: prog.waistChange !== null ? signed(prog.waistChange) : "—",
      unit: "cm",
      tone: prog.waistChange !== null ? (prog.waistChange <= 0 ? "text-moss-300" : "text-warn-300") : undefined,
    },
  ];
  return (
    <SectionCard title="Progress overview" icon={<Scale className="h-4.5 w-4.5" />} bodyCls="p-5">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-night-700 bg-night-800/60 p-2.5 text-center">
            <p className={`font-display text-xl font-bold leading-6 tnum ${s.tone ?? "text-mist-100"}`}>
              {s.value}
              {s.value !== "—" && <span className="ms-0.5 text-[10px] font-semibold text-mist-500">{s.unit}</span>}
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-mist-500">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <WeightLine entries={checkIns} />
      </div>
    </SectionCard>
  );
}

/* ---------------- check-ins ---------------- */

function CheckInsCard({ checkIns, onView }: { checkIns: CheckIn[]; onView: (c: CheckIn) => void }) {
  const sorted = sortCheckIns(checkIns);
  const latest = sorted[0];
  return (
    <SectionCard title="Check-ins" icon={<Camera className="h-4.5 w-4.5" />} bodyCls="p-0">
      {!latest ? (
        <div className="p-5">
          <EmptyState icon={<Camera className="h-6 w-6" />} title="No check-in submitted yet." sub="Daily check-ins from the client will appear here, newest first." />
        </div>
      ) : (
        <div>
          <button className="block w-full cursor-pointer border-b border-night-700 bg-night-800/40 px-5 py-4 text-start transition hover:bg-night-800/70" onClick={() => onView(latest)}>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-volt-300">Latest · {relDay(latest.date)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm font-semibold text-mist-200">
              <span className="font-display text-2xl font-bold text-mist-100 tnum">{latest.weight} kg</span>
              {latest.waist !== undefined && <span className="tnum">waist {latest.waist} cm</span>}
              <MoodDots mood={latest.mood} />
              <span className="tnum">{latest.water}L water</span>
              <Badge className={latest.workoutDone ? "border-moss-400/25 bg-moss-400/10 text-moss-300" : "border-danger-500/25 bg-danger-500/10 text-danger-300"}>
                {latest.workoutDone ? <Check className="h-3 w-3" strokeWidth={2.6} /> : <X className="h-3 w-3" strokeWidth={2.6} />}
                {latest.workoutDone ? "Workout done" : "Skipped"}
              </Badge>
              {latest.photo && <img src={latest.photo} alt="" className="h-9 w-9 rounded-md object-cover ring-1 ring-night-600" />}
            </div>
          </button>
          {sorted.length > 1 && (
            <ul className="divide-y divide-night-700/60">
              {sorted.slice(1).map((ci) => (
                <li key={ci.id}>
                  <button className="flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-start transition hover:bg-night-800/60" onClick={() => onView(ci)}>
                    <span className="w-24 shrink-0 text-xs font-bold text-mist-400">{relDay(ci.date)}</span>
                    <span className="font-display text-base font-bold text-mist-100 tnum">{ci.weight} kg</span>
                    {ci.waist !== undefined && <span className="text-xs text-mist-500 tnum">waist {ci.waist}</span>}
                    <span className="ms-auto text-[11px] font-bold text-mist-500">View</span>
                    <ArrowRight className="h-3.5 w-3.5 text-mist-500 rtl:rotate-180" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function CheckInDetailModal({
  checkIn,
  onClose,
  onPhoto,
  onDelete,
}: {
  checkIn: CheckIn;
  onClose: () => void;
  onPhoto: (src: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Modal open onClose={onClose} title={`Check-in · ${fmtDate(checkIn.date)}`} description={relDay(checkIn.date)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DetailStat label="Weight" value={`${checkIn.weight} kg`} />
        <DetailStat label="Waist" value={checkIn.waist !== undefined ? `${checkIn.waist} cm` : "—"} />
        <DetailStat label="Water" value={`${checkIn.water} L`} />
        <div className="rounded-lg border border-night-700 bg-night-800 p-3">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-mist-500">Mood</p>
          <div className="mt-2"><MoodDots mood={checkIn.mood} /></div>
        </div>
        <div className="rounded-lg border border-night-700 bg-night-800 p-3">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-mist-500">Workout</p>
          <p className={`mt-1 font-display text-lg font-bold ${checkIn.workoutDone ? "text-moss-300" : "text-danger-300"}`}>{checkIn.workoutDone ? "Completed" : "Skipped"}</p>
        </div>
      </div>
      {checkIn.notes && (
        <div className="mt-3 rounded-lg border border-night-700 bg-night-800 p-3">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-mist-500">Client notes</p>
          <p className="mt-1.5 text-sm leading-6 text-mist-200">"{checkIn.notes}"</p>
        </div>
      )}
      {checkIn.photo && (
        <div className="mt-3">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-mist-500">Progress photo</p>
          <button className="mt-1.5 cursor-zoom-in" onClick={() => onPhoto(checkIn.photo!)}>
            <img src={checkIn.photo} alt="Progress" className="h-32 rounded-lg object-cover ring-1 ring-night-600 transition hover:ring-volt-400" />
          </button>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <button className={`${btnDanger} ${btnSm}`} onClick={() => onDelete(checkIn.id)}>
          <Trash2 className="h-3.5 w-3.5" /> Delete check-in
        </button>
      </div>
    </Modal>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-night-700 bg-night-800 p-3">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-mist-500">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-mist-100 tnum">{value}</p>
    </div>
  );
}

/* ---------------- sessions + attendance ---------------- */

function SessionsCard({
  sessions,
  att,
  onAdd,
  onEdit,
  onDelete,
  onStatus,
}: {
  sessions: Session[];
  att: ReturnType<typeof attendance>;
  onAdd: () => void;
  onEdit: (s: Session) => void;
  onDelete: (s: Session) => void;
  onStatus: (id: string, status: Session["status"]) => void;
}) {
  return (
    <SectionCard
      title="Sessions"
      icon={<CalendarDays className="h-4.5 w-4.5" />}
      bodyCls="p-0"
      action={
        <button className={`${btnPrimary} ${btnSm}`} onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> Book session
        </button>
      }
    >
      <div className="border-b border-night-700 px-5 py-4">
        <AttendanceRing pct={att.pct} completed={att.completed} countable={att.countable} />
      </div>
      {sessions.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No sessions yet" sub="Book the first session to start tracking attendance." />
        </div>
      ) : (
        <ul className="divide-y divide-night-700/60">
          {[...sessions].reverse().map((s) => {
            const meta = SESSION_STATUS_META[s.status];
            return (
              <li key={s.id} className="group flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-mist-100">
                    {relDay(s.date)} <span className="ms-1 font-display text-mist-300 tnum">{fmtTime(s.time)}</span>
                  </p>
                  <p className="text-[11px] font-semibold text-mist-500">{s.type}{s.notes ? ` — ${s.notes}` : ""}</p>
                </div>
                <Badge className={meta.chip}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {s.status}
                </Badge>
                <div className="flex items-center gap-1 opacity-60 transition group-hover:opacity-100">
                  {(s.status === "Scheduled" || s.status === "Confirmed") && (
                    <>
                      <button className={`${btnGhost} ${btnSm}`} title="Mark completed" onClick={() => onStatus(s.id, "Completed")}>
                        <Check className="h-3.5 w-3.5 text-moss-300" />
                      </button>
                      <button className={`${btnGhost} ${btnSm}`} title="Mark missed" onClick={() => onStatus(s.id, "Missed")}>
                        <X className="h-3.5 w-3.5 text-danger-300" />
                      </button>
                    </>
                  )}
                  <button className={`${btnGhost} ${btnSm}`} title="Edit" onClick={() => onEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button className={`${btnGhost} ${btnSm}`} title="Delete" onClick={() => onDelete(s)}>
                    <Trash2 className="h-3.5 w-3.5 text-danger-300" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------------- payments ---------------- */

function PaymentsCard({
  payments,
  sub,
  outstanding,
  onAdd,
  onEdit,
  onDelete,
}: {
  payments: Payment[];
  sub: Subscription | null;
  outstanding: number;
  onAdd: () => void;
  onEdit: (p: Payment) => void;
  onDelete: (p: Payment) => void;
}) {
  const paid = totalPaid(payments);
  const sorted = [...payments].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <SectionCard
      title="Payments"
      icon={<Wallet className="h-4.5 w-4.5" />}
      bodyCls="p-0"
      action={
        <button className={`${btnPrimary} ${btnSm}`} onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> Record payment
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-2 border-b border-night-700 px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-mist-500">Total paid</p>
          <p className="mt-1 font-display text-2xl font-bold text-moss-300 tnum">{fmtMoney(paid)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-mist-500">Current plan</p>
          <p className="mt-1 font-display text-2xl font-bold text-mist-100 tnum">{sub ? fmtMoney(sub.price) : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-mist-500">Outstanding</p>
          <p className={`mt-1 font-display text-2xl font-bold tnum ${outstanding > 0 ? "text-warn-300" : "text-mist-500"}`}>{fmtMoney(outstanding)}</p>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={<Wallet className="h-6 w-6" />} title="No payments yet" sub="Record the first payment for this client." />
        </div>
      ) : (
        <ul className="divide-y divide-night-700/60">
          {sorted.map((p) => (
            <li key={p.id} className="group flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-mist-100 tnum">{fmtMoney(p.amount)} EGP</p>
                <p className="text-[11px] font-semibold text-mist-500">{relDay(p.date)} · {p.method}{p.notes ? ` — ${p.notes}` : ""}</p>
              </div>
              <Badge className={PAYMENT_STATUS_META[p.status].chip}>{p.status}</Badge>
              <div className="flex items-center gap-1 opacity-60 transition group-hover:opacity-100">
                <button className={`${btnGhost} ${btnSm}`} title="Edit" onClick={() => onEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button className={`${btnGhost} ${btnSm}`} title="Delete" onClick={() => onDelete(p)}>
                  <Trash2 className="h-3.5 w-3.5 text-danger-300" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------------- subscription ---------------- */

function SubscriptionCard({
  subInfo,
  subs,
  onAdd,
  onEdit,
  onRenew,
}: {
  subInfo: ReturnType<typeof subscriptionState>;
  subs: Subscription[];
  onAdd: () => void;
  onEdit: (s: Subscription) => void;
  onRenew: (s: Subscription) => void;
}) {
  const { sub, state, daysLeft } = subInfo;
  const meta = SUB_STATE_META[state];
  const history = subHistory(subs);
  return (
    <SectionCard
      title="Subscription"
      icon={<RotateCw className="h-4.5 w-4.5" />}
      bodyCls="p-5"
      action={
        sub ? (
          <button className={`${btnPrimary} ${btnSm}`} onClick={() => onRenew(sub)}>
            <RotateCw className="h-3.5 w-3.5" /> Renew
          </button>
        ) : (
          <button className={`${btnPrimary} ${btnSm}`} onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> Add
          </button>
        )
      }
    >
      {!sub ? (
        <p className="rounded-lg border border-dashed border-night-600 px-4 py-5 text-center text-xs text-mist-500">No subscription yet.</p>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-2">
            <Badge className={meta.chip}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${state === "Expired" ? "" : "tick-pulse"}`} />
              {state}
            </Badge>
            <span className={`text-xs font-bold ${daysLeft < 0 ? "text-danger-300" : daysLeft <= 7 ? "text-warn-300" : "text-mist-400"}`}>{remainingLabel(daysLeft)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <KV k="Plan" v={sub.planName} />
            <KV k="Price" v={`${fmtMoney(sub.price)} EGP`} />
            <KV k="Starts" v={fmtDate(sub.startDate)} />
            <KV k="Ends" v={fmtDate(sub.endDate)} />
            <KV k="Payment" v={sub.paymentStatus} />
          </div>
          <button className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-mist-400 transition hover:text-volt-300" onClick={() => onEdit(sub)}>
            <Pencil className="h-3.5 w-3.5" /> Edit subscription
          </button>
        </div>
      )}
      {history.length > 1 && (
        <div className="mt-4 border-t border-night-700 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-mist-500">History ({history.length})</p>
          <ul className="mt-2 grid gap-1.5">
            {history.slice(1, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-xs text-mist-400">
                <span>{s.planName} · ended {fmtDate(s.endDate)}</span>
                <span className="font-bold text-mist-300 tnum">{fmtMoney(s.price)} EGP</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-night-800/60 px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-mist-500">{k}</p>
      <p className="mt-0.5 truncate font-semibold text-mist-100">{v}</p>
    </div>
  );
}

/* ---------------- follow-up ---------------- */

function FollowUpCard({
  client,
  fu,
  onSetDays,
  onDone,
}: {
  client: Client;
  fu: ReturnType<typeof followUpInfo>;
  onSetDays: (d: number) => void;
  onDone: () => void;
}) {
  return (
    <SectionCard title="Follow-up" icon={<Bell className="h-4.5 w-4.5" />} bodyCls="p-5">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-md border px-2.5 py-1 text-xs font-bold ${fu.overdue ? "border-danger-500/30 bg-danger-500/10 text-danger-300" : fu.daysToNext === 0 ? "border-warn-400/30 bg-warn-400/10 text-warn-300" : "border-night-600 bg-night-800 text-mist-300"}`}>
          {fu.label}
        </span>
        <button className={`${btnGhost} ${btnSm}`} onClick={onDone}>
          <Check className="h-3.5 w-3.5 text-moss-300" /> Mark done
        </button>
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-mist-500">Frequency</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {FOLLOW_UP_PRESETS.map((d) => (
          <button
            key={d}
            onClick={() => onSetDays(d)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
              fu.frequency === d ? "bg-volt-400 text-night-950" : "bg-night-800 text-mist-400 hover:text-mist-100"
            }`}
          >
            Every {d}d
          </button>
        ))}
      </div>
      {fu.next && <p className="mt-3 text-[11px] font-semibold text-mist-500">Next follow-up: {fmtDate(fu.next)}</p>}
    </SectionCard>
  );
}

/* ---------------- nutrition ---------------- */

function NutritionCard({ client, meals, onEdit, go }: { client: Client; meals: { calories: number; protein: number; carbs: number; fats: number }[]; onEdit: () => void; go: (v: CoachView, id?: string) => void }) {
  const t = client.nutritionTargets;
  const totals = meals.reduce((a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fats: a.fats + m.fats }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  return (
    <SectionCard
      title="Nutrition"
      icon={<UtensilsCrossed className="h-4.5 w-4.5" />}
      bodyCls="p-5"
      action={
        <button className={`${btnGhost} ${btnSm}`} onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Targets
        </button>
      }
    >
      {!t ? (
        <p className="rounded-lg border border-dashed border-night-600 px-4 py-5 text-center text-xs text-mist-500">No nutrition targets set.</p>
      ) : (
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {[
            { l: "Kcal", v: t.calories },
            { l: "Protein", v: t.protein },
            { l: "Carbs", v: t.carbs },
            { l: "Fats", v: t.fats },
            { l: "Water", v: t.water },
          ].map((x) => (
            <div key={x.l} className="rounded-lg bg-night-800/60 px-1 py-2">
              <p className="font-display text-lg font-bold text-volt-300 tnum">{x.v}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-mist-500">{x.l}</p>
            </div>
          ))}
        </div>
      )}
      {meals.length > 0 && (
        <div className="mt-4 border-t border-night-700 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-mist-500">Assigned meals · {totals.calories} kcal</p>
          <div className="mt-2"><MacroSplit protein={totals.protein} carbs={totals.carbs} fats={totals.fats} /></div>
        </div>
      )}
      <button className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-mist-400 transition hover:text-volt-300" onClick={() => go("meals", client.id)}>
        Manage meals <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
      </button>
    </SectionCard>
  );
}

/* ---------------- workout plan summary ---------------- */

function PlanCard({ plans, go, clientId }: { plans: { day: number }[]; go: (v: CoachView, id?: string) => void; clientId: string }) {
  const days = Array.from(new Set(plans.map((p) => p.day))).sort((a, b) => a - b);
  return (
    <SectionCard
      title="Workout plan"
      icon={<ClipboardList className="h-4.5 w-4.5" />}
      bodyCls="p-5"
      action={
        <button className={`${btnGhost} ${btnSm}`} onClick={() => go("plans", clientId)}>
          <Pencil className="h-3.5 w-3.5" /> Open
        </button>
      }
    >
      {plans.length === 0 ? (
        <p className="rounded-lg border border-dashed border-night-600 px-4 py-5 text-center text-xs text-mist-500">No workout plan assigned.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-3xl font-bold text-mist-100 tnum">{plans.length}</span>
          <span className="text-xs font-semibold text-mist-500">exercises across {days.length} day{days.length === 1 ? "" : "s"}</span>
          <div className="mt-1 flex w-full flex-wrap gap-1.5">
            {days.map((d) => (
              <span key={d} className="rounded-md border border-night-600 bg-night-800 px-2 py-0.5 text-[10px] font-bold text-mist-300">
                {WEEK_DAYS[d - 1]?.slice(0, 3)} · {plans.filter((p) => p.day === d).length}
              </span>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ---------------- coach notes ---------------- */

function CoachNotesCard({
  client,
  onAdd,
  onUpdate,
  onDelete,
}: {
  client: Client;
  onAdd: (text: string) => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const notes = [...(client.coachNotes ?? [])].sort((a, b) => b.createdAt - a.createdAt);

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
  };

  return (
    <SectionCard title="Coach notes" icon={<StickyNote className="h-4.5 w-4.5" />} bodyCls="p-5">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Private note — only you see this…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button className={`${btnPrimary} ${btnSm} shrink-0`} onClick={submit} disabled={!draft.trim()}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-night-600 px-4 py-4 text-center text-xs text-mist-500">No coach notes yet.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-lg border border-night-700 bg-night-800/60 p-3">
              {editingId === n.id ? (
                <div className="flex gap-2">
                  <input className={inputCls} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                  <button className={`${btnPrimary} ${btnSm} shrink-0`} onClick={() => { onUpdate(n.id, editText.trim()); setEditingId(null); }}>
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-6 text-mist-200">{n.text}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-mist-500">{new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    <div className="ms-auto flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button className={`${btnGhost} ${btnSm}`} title="Edit" onClick={() => { setEditingId(n.id); setEditText(n.text); }}>
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button className={`${btnGhost} ${btnSm}`} title="Delete" onClick={() => onDelete(n.id)}>
                        <Trash2 className="h-3 w-3 text-danger-300" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------------- basic info ---------------- */

function BasicInfoCard({ client }: { client: Client }) {
  return (
    <SectionCard title="Basic information" icon={<User className="h-4.5 w-4.5" />} bodyCls="p-5">
      <dl className="grid gap-2 text-sm">
        <InfoRow k="Full name" v={client.name} />
        <InfoRow k="Username" v={`@${client.username}`} />
        <InfoRow k="Phone" v={client.phone || "—"} />
        <InfoRow k="Email" v={client.email || "—"} />
        <InfoRow k="Age" v={client.age !== undefined ? `${client.age}` : "—"} />
        <InfoRow k="Gender" v={client.gender ?? "—"} />
        <InfoRow k="Goal" v={client.goal} />
        <InfoRow k="Joined" v={fmtDate(client.startDate)} />
      </dl>
      {client.notes && (
        <div className="mt-3 border-t border-night-700 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-mist-500">Intake notes</p>
          <p className="mt-1.5 text-sm leading-6 text-mist-300">{client.notes}</p>
        </div>
      )}
    </SectionCard>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-night-700/50 pb-1.5 last:border-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-mist-500">{k}</dt>
      <dd className="truncate font-semibold text-mist-100">{v}</dd>
    </div>
  );
}

/* ---------------- reset password ---------------- */

function ResetPasswordModal({ open, clientId, clientName, onClose }: { open: boolean; clientId: string; clientName: string; onClose: () => void }) {
  const { resetClientPassword } = useApp();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setPw("");
      setErr("");
    }
  }, [open, setPw, setErr]);

  const submit = async () => {
    if (pw.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await resetClientPassword(clientId, pw);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not reset password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reset client password" description={`${clientName} signs in with their username + this new password.`}>
      <label className={labelCls}>New password</label>
      <div className="flex gap-2">
        <input className={inputCls} type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="min 6 characters" />
        <button className={`${btnGhost} ${btnSm} shrink-0`} onClick={() => setPw(`${["forge", "lift", "iron"][Math.floor(Math.random() * 3)]}-${Math.floor(100 + Math.random() * 900)}-Go`)}>
          <RotateCw className="h-3.5 w-3.5" /> Gen
        </button>
      </div>
      {err && <p className="mt-2 text-xs font-bold text-danger-400">{err}</p>}
      <div className="mt-5 flex gap-2">
        <button className={`${btnPrimary} flex-1`} onClick={submit} disabled={busy}>
          {busy ? "Resetting…" : "Reset password"}
        </button>
        <button className={btnSecondary} onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}


