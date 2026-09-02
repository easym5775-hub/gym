/* ================================================================
   FORGE — Coach command center.
   Answers: what's happening today → what needs attention → how the
   business is performing. All values are computed from real data.
   ================================================================ */

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Plus,
  RefreshCw,
  Scale,
  Users,
  Wallet,
} from "lucide-react";
import type { Client, CoachView, SubState } from "../types";
import { SESSION_STATUS_META } from "../types";
import { addDays, fmtDate, fmtMoney, fmtTime, signed, todayISO } from "../lib";
import { actionLists, remainingLabel, currentSubscription, subscriptionState } from "../logic";
import { useApp } from "../store";
import { Avatar, Badge, SectionCard, Skeleton, Stat, btnGhost, btnPrimary, btnSecondary, btnSm, useCountUp } from "./ui";
import { ClientFormModal, PaymentFormModal, SessionFormModal } from "./modals";

type Severity = "high" | "med" | "low";
interface AlertItem {
  key: string;
  client: Client;
  severity: Severity;
  title: string;
  detail: string;
  sort: number;
}

const SEV_DOT: Record<Severity, string> = { high: "bg-danger-400", med: "bg-warn-400", low: "bg-mist-400" };
const SEV_RING: Record<Severity, string> = { high: "ring-danger-400/25", med: "ring-warn-400/25", low: "ring-night-500/40" };

export function Dashboard({
  go,
  openClientsWithFilter,
}: {
  go: (v: CoachView, id?: string) => void;
  openClientsWithFilter: (f: "Active" | "Expiring Soon" | "Expired") => void;
}) {
  const { state, me } = useApp();
  const [clientModal, setClientModal] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [weekOpen, setWeekOpen] = useState(false);

  const today = todayISO();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (me?.name ?? "Coach").split(" ")[0];

  const lists = useMemo(() => actionLists(state), [state]);
  const activeCount = state.clients.filter((c) => c.status === "Active").length;

  const todaySessions = useMemo(
    () => state.sessions.filter((s) => s.date === today).sort((a, b) => a.time.localeCompare(b.time)),
    [state.sessions, today],
  );
  const completedToday = todaySessions.filter((s) => s.status === "Completed").length;

  const freshCheckIns = useMemo(
    () => state.checkIns.filter((c) => Date.now() - c.ts < 86_400_000).sort((a, b) => b.ts - a.ts),
    [state.checkIns],
  );

  const monthKey = today.slice(0, 7);
  const prevKey = addDays(today.slice(0, 8) + "01", -1).slice(0, 7);
  const paidIn = (key: string) =>
    state.payments.filter((p) => p.status === "Paid" && p.date.slice(0, 7) === key).reduce((s, p) => s + p.amount, 0);
  const revenueMonth = paidIn(monthKey);
  const revenuePrev = paidIn(prevKey);

  /* needs attention — real issues only, sorted by urgency */
  const alerts = useMemo<AlertItem[]>(() => {
    const out: AlertItem[] = [];
    const flagged = new Set<string>();
    for (const { client, info } of lists.expired) {
      out.push({ key: `exp-${client.id}`, client, severity: "high", title: "Subscription expired", detail: remainingLabel(info.daysLeft), sort: 0 });
      flagged.add(client.id);
    }
    for (const { client, info } of lists.overdueFollowUps) {
      const d = Math.abs(info.daysToNext ?? 0);
      out.push({ key: `fu-${client.id}`, client, severity: "high", title: "Check-in overdue", detail: `${d}d since last contact`, sort: 1 });
      flagged.add(client.id);
    }
    for (const s of state.sessions) {
      if (s.date === today && s.status === "Missed") {
        const client = state.clients.find((c) => c.id === s.clientId);
        if (client) out.push({ key: `miss-${s.id}`, client, severity: "high", title: "Missed session", detail: `${fmtTime(s.time)} · ${s.type}`, sort: 2 });
      }
    }
    for (const { client, info } of lists.expiringSoon) {
      out.push({ key: `soon-${client.id}`, client, severity: "med", title: "Subscription expiring", detail: remainingLabel(info.daysLeft), sort: 3 });
    }
    for (const p of state.payments) {
      if (p.status === "Pending") {
        const client = state.clients.find((c) => c.id === p.clientId);
        if (client) out.push({ key: `pay-${p.id}`, client, severity: "med", title: "Payment pending", detail: `${fmtMoney(p.amount)} EGP · ${p.method}`, sort: 4 });
      }
    }
    for (const client of lists.staleCheckIns) {
      if (flagged.has(client.id)) continue;
      out.push({ key: `stale-${client.id}`, client, severity: "low", title: "No recent activity", detail: "no check-in this week", sort: 5 });
    }
    return out.sort((a, b) => a.sort - b.sort);
  }, [lists, state.sessions, state.payments, state.clients, today]);

  /* activity feed — merged real events */
  const activity = useMemo(() => {
    type Ev = { key: string; clientId: string; ts: number; kind: "checkin" | "subscription" | "payment"; text: string; meta: string };
    const evs: Ev[] = [];
    const name = (id: string) => state.clients.find((c) => c.id === id)?.name ?? "Former client";
    for (const ci of state.checkIns) {
      evs.push({ key: `ci-${ci.id}`, clientId: ci.clientId, ts: ci.ts, kind: "checkin", text: `${name(ci.clientId)} submitted a check-in`, meta: `${ci.weight} kg · mood ${ci.mood}/5` });
    }
    for (const s of state.subscriptions) {
      evs.push({ key: `sub-${s.id}`, clientId: s.clientId, ts: s.createdAt, kind: "subscription", text: `${name(s.clientId)} — subscription ${s.planName}`, meta: `${fmtMoney(s.price)} EGP · ends ${fmtDate(s.endDate)}` });
    }
    for (const p of state.payments) {
      if (p.status !== "Paid") continue;
      evs.push({ key: `pay-${p.id}`, clientId: p.clientId, ts: new Date(p.date + "T12:00:00").getTime(), kind: "payment", text: `Payment received from ${name(p.clientId)}`, meta: `${fmtMoney(p.amount)} EGP · ${p.method}` });
    }
    return evs.sort((a, b) => b.ts - a.ts).slice(0, 8);
  }, [state]);

  /* upcoming week */
  const upcoming = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(today, i + 1))
      .map((d) => ({ date: d, items: state.sessions.filter((s) => s.date === d).sort((a, b) => a.time.localeCompare(b.time)) }))
      .filter((d) => d.items.length > 0);
  }, [state.sessions, today]);

  const animActive = useCountUp(activeCount);
  const animSessions = useCountUp(todaySessions.length);
  const animCheckIns = useCountUp(freshCheckIns.length);
  const animExpiring = useCountUp(lists.expiringSoon.length + lists.expired.length);
  const animRevenue = useCountUp(revenueMonth);

  const attentionCount = alerts.length;
  const summary =
    attentionCount > 0
      ? `${attentionCount} thing${attentionCount === 1 ? "" : "s"} need${attentionCount === 1 ? "s" : ""} your attention today.`
      : todaySessions.length > 0
        ? `You're all caught up — ${todaySessions.length} session${todaySessions.length === 1 ? "" : "s"} on the books.`
        : "You're all caught up. Quiet day ahead.";

  return (
    <div>
      {/* header */}
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-mist-500">{fmtDate(today)}</p>
          <h1 className="mt-1.5 font-display text-[42px] font-bold uppercase leading-[0.95] tracking-tight text-mist-100 sm:text-[52px]">
            {greeting}, <span className="text-volt-400">{firstName}.</span>
          </h1>
          <p className="mt-2 text-sm text-mist-400">{summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={`${btnSecondary} ${btnSm}`} onClick={() => setSessionModal(true)}>
            <CalendarDays className="h-3.5 w-3.5" /> Add session
          </button>
          <button className={`${btnSecondary} ${btnSm}`} onClick={() => setPaymentModal(true)}>
            <Wallet className="h-3.5 w-3.5" /> Add payment
          </button>
          <button className={`${btnPrimary} ${btnSm}`} onClick={() => setClientModal(true)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> New client
          </button>
        </div>
      </header>

      {/* KPI band */}
      <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-night-700 bg-night-700 lg:grid-cols-5">
        <KpiCell delay={0} onClick={() => openClientsWithFilter("Active")}>
          <Stat label="Active clients" value={String(Math.round(animActive))} sub={`of ${state.clients.length} on roster`} />
        </KpiCell>
        <KpiCell delay={60}>
          <Stat label="Sessions today" value={String(Math.round(animSessions))} sub={todaySessions.length ? `${completedToday} completed` : "schedule is clear"} />
        </KpiCell>
        <KpiCell delay={120} onClick={() => go("checkins")}>
          <Stat label="New check-ins" value={String(Math.round(animCheckIns))} sub="last 24 hours" />
        </KpiCell>
        <KpiCell delay={180} onClick={() => openClientsWithFilter("Expiring Soon")}>
          <Stat label="Expiring subs" value={String(Math.round(animExpiring))} sub={lists.expired.length ? `${lists.expired.length} already expired` : "within 7 days"} tone={animExpiring > 0 ? "warn" : undefined} />
        </KpiCell>
        <KpiCell delay={240}>
          <Stat label="Revenue · month" value={fmtMoney(Math.round(animRevenue))} unit="EGP" sub="paid invoices" />
        </KpiCell>
      </div>

      {/* attention + schedule */}
      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        <AttentionPanel className="lg:col-span-7" alerts={alerts} go={go} openClients={openClientsWithFilter} />
        <SchedulePanel
          className="lg:col-span-5"
          sessions={todaySessions}
          upcoming={upcoming}
          weekOpen={weekOpen}
          setWeekOpen={setWeekOpen}
          go={go}
          clients={state.clients}
        />
      </div>

      {/* activity */}
      <ActivityPanel activity={activity} go={go} />

      {/* progress + business health */}
      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        <ProgressPanel className="lg:col-span-7" state={state} go={go} />
        <BusinessPanel className="lg:col-span-5" state={state} revenueMonth={revenueMonth} revenuePrev={revenuePrev} today={today} openClients={openClientsWithFilter} />
      </div>

      <ClientFormModal open={clientModal} initial={null} onClose={() => setClientModal(false)} onSaved={(c) => go("client", c.id)} />
      <SessionFormModal open={sessionModal} clientId={null} initial={null} presetDate={today} onClose={() => setSessionModal(false)} />
      <PaymentFormModal open={paymentModal} clientId={null} initial={null} subscriptions={state.subscriptions} onClose={() => setPaymentModal(false)} />
    </div>
  );
}

/* ---------------- KPI cell (clickable wrapper) ---------------- */

function KpiCell({ children, delay, onClick }: { children: ReactNode; delay: number; onClick?: () => void }) {
  return (
    <div
      className="rise bg-night-850 transition-colors"
      style={{ animationDelay: `${delay}ms` }}
      {...(onClick ? { onClick, role: "button", tabIndex: 0 } : {})}
    >
      <div className={`h-full ${onClick ? "cursor-pointer hover:bg-night-800/70" : ""}`}>{children}</div>
    </div>
  );
}

/* ---------------- needs attention ---------------- */

function AttentionPanel({
  alerts,
  go,
  openClients,
  className = "",
}: {
  alerts: AlertItem[];
  go: (v: CoachView, id?: string) => void;
  openClients: (f: "Active" | "Expiring Soon" | "Expired") => void;
  className?: string;
}) {
  const shown = alerts.slice(0, 6);
  const hidden = alerts.length - shown.length;
  return (
    <SectionCard
      title="Needs attention"
      icon={<AlertTriangle className="h-4.5 w-4.5" />}
      className={`${className} flex flex-col`}
      bodyCls="p-0 flex-1"
      delay={120}
      action={
        alerts.length > 0 ? (
          <span className="rounded-md bg-danger-500/15 px-2 py-0.5 font-display text-sm font-bold leading-5 text-danger-300 tnum">{alerts.length}</span>
        ) : (
          <span className="rounded-md bg-moss-400/15 px-2 py-0.5 font-display text-sm font-bold leading-5 text-moss-300">clear</span>
        )
      }
    >
      {alerts.length === 0 ? (
        <div className="grid h-full place-items-center px-6 py-12 text-center">
          <div className="animate-pop">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-moss-400/10 text-moss-300 ring-1 ring-moss-400/25">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <p className="mt-3 font-display text-xl font-semibold text-mist-100">You're all caught up.</p>
            <p className="mt-1 text-xs text-mist-400">No urgent actions today — nice work staying on top of things.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-night-700/70">
          {shown.map((a, i) => (
            <li key={a.key} className="rise" style={{ animationDelay: `${160 + i * 45}ms` }}>
              <div className="group flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-night-800/60">
                <span className="relative grid h-10 w-10 shrink-0 place-items-center">
                  <span className={`absolute inset-0 rounded-full ring-4 ${SEV_RING[a.severity]}`} />
                  <Avatar name={a.client.name} photo={a.client.photo} className="h-10 w-10 text-xs" />
                  <span className={`absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-night-850 ${SEV_DOT[a.severity]} ${a.severity === "high" ? "tick-pulse" : ""}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-mist-100">{a.client.name}</p>
                  <p className="truncate text-xs text-mist-400">
                    <span className={a.severity === "high" ? "font-bold text-danger-300" : a.severity === "med" ? "font-bold text-warn-300" : "font-semibold text-mist-300"}>
                      {a.title}
                    </span>
                    <span className="text-mist-500"> — {a.detail}</span>
                  </p>
                </div>
                <button className={`${btnGhost} ${btnSm} shrink-0 border border-night-600 opacity-70 transition group-hover:border-volt-400/60 group-hover:text-volt-300 group-hover:opacity-100`} onClick={() => go("client", a.client.id)}>
                  Open client
                </button>
              </div>
            </li>
          ))}
          {hidden > 0 && (
            <li className="px-5 py-2.5 text-center">
              <button className="cursor-pointer text-xs font-bold text-mist-400 transition hover:text-volt-300" onClick={() => openClients("Active")}>
                + {hidden} more in the clients list
              </button>
            </li>
          )}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------------- today's schedule ---------------- */

function SchedulePanel({
  sessions,
  upcoming,
  weekOpen,
  setWeekOpen,
  go,
  clients,
  className = "",
}: {
  sessions: { id: string; clientId: string; time: string; type: string; status: string }[];
  upcoming: { date: string; items: { time: string; clientId: string }[] }[];
  weekOpen: boolean;
  setWeekOpen: (v: boolean) => void;
  go: (v: CoachView, id?: string) => void;
  clients: Client[];
  className?: string;
}) {
  const nameOf = (id: string) => clients.find((c) => c.id === id);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <SectionCard
      title="Today's schedule"
      icon={<Clock className="h-4.5 w-4.5" />}
      className={`${className} flex flex-col`}
      bodyCls="p-0 flex-1"
      delay={170}
      action={
        upcoming.length > 0 ? (
          <button className={`${btnGhost} ${btnSm}`} onClick={() => setWeekOpen(!weekOpen)} aria-expanded={weekOpen}>
            {weekOpen ? "Hide week" : "View schedule"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${weekOpen ? "rotate-180" : ""}`} />
          </button>
        ) : undefined
      }
    >
      {sessions.length === 0 ? (
        <div className="grid h-full place-items-center px-6 py-12 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-night-800 text-mist-400 ring-1 ring-night-600">
              <CalendarDays className="h-5 w-5" />
            </span>
            <p className="mt-3 font-display text-lg font-semibold text-mist-100">No sessions scheduled today.</p>
            <p className="mt-1 text-xs text-mist-400">Your schedule is clear.</p>
          </div>
        </div>
      ) : (
        <ul className="relative px-5 py-4">
          <span className="absolute bottom-6 start-[31px] top-6 w-px bg-night-700" aria-hidden />
          {sessions.map((s, i) => {
            const c = nameOf(s.clientId);
            const meta = SESSION_STATUS_META[s.status as keyof typeof SESSION_STATUS_META];
            const [h, m] = s.time.split(":").map(Number);
            const past = (h ?? 0) * 60 + (m ?? 0) < nowMin;
            const isDone = s.status === "Completed";
            const missed = s.status === "Missed" || s.status === "Cancelled";
            return (
              <li key={s.id} className="rise relative flex items-center gap-3.5 py-2.5" style={{ animationDelay: `${200 + i * 50}ms` }}>
                <span className={`relative z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 bg-night-850 ${isDone ? "border-moss-400 text-moss-300" : missed ? "border-danger-400/60 text-danger-300" : past ? "border-night-500 text-mist-500" : "border-volt-400 text-volt-300"}`}>
                  {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : <span className={`h-1.5 w-1.5 rounded-full bg-current ${!past && !missed ? "tick-pulse" : ""}`} />}
                </span>
                <span className="w-16 shrink-0 font-display text-lg font-bold leading-5 text-mist-100 tnum">{fmtTime(s.time)}</span>
                <button className="min-w-0 flex-1 cursor-pointer text-start" onClick={() => c && go("client", c.id)}>
                  <span className={`block truncate text-sm font-bold transition hover:text-volt-300 ${missed ? "text-mist-400 line-through decoration-night-500" : "text-mist-100"}`}>
                    {c?.name ?? "Former client"}
                  </span>
                  <span className="block truncate text-[11px] font-semibold text-mist-500">{s.type}</span>
                </button>
                <Badge className={meta?.chip}>{s.status}</Badge>
              </li>
            );
          })}
        </ul>
      )}

      <div className={`grid transition-all duration-300 ease-out ${weekOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-night-700 px-5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-mist-500">Next 7 days</p>
            <ul className="mt-2 grid gap-1.5">
              {upcoming.map((d) => (
                <li key={d.date} className="flex items-baseline gap-3 text-xs">
                  <span className="w-20 shrink-0 font-display text-sm font-bold text-mist-300">{fmtDate(d.date).split(",")[0]}</span>
                  <span className="truncate text-mist-500">
                    {d.items.map((s) => `${fmtTime(s.time)} ${nameOf(s.clientId)?.name.split(" ")[0] ?? "?"}`).join(" · ")}
                  </span>
                  <span className="ms-auto shrink-0 font-bold text-mist-400 tnum">{d.items.length}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/* ---------------- recent activity ---------------- */

function ActivityPanel({
  activity,
  go,
}: {
  activity: { key: string; clientId: string; ts: number; kind: "checkin" | "subscription" | "payment"; text: string; meta: string }[];
  go: (v: CoachView, id?: string) => void;
}) {
  const iconFor = (kind: string) =>
    kind === "checkin" ? <Scale className="h-3.5 w-3.5" /> : kind === "subscription" ? <BadgeCheck className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />;
  const toneFor = (kind: string) =>
    kind === "checkin" ? "bg-volt-400/10 text-volt-300" : kind === "subscription" ? "bg-moss-400/10 text-moss-300" : "bg-warn-400/10 text-warn-300";

  return (
    <SectionCard title="Recent activity" icon={<RefreshCw className="h-4.5 w-4.5" />} bodyCls="p-0" delay={220} className="mt-5">
      {activity.length === 0 ? (
        <div className="grid place-items-center px-6 py-10 text-center">
          <div>
            <p className="font-display text-lg font-semibold text-mist-100">Nothing yet.</p>
            <p className="mt-1 text-xs text-mist-400">Client check-ins, renewals and payments will show up here.</p>
          </div>
        </div>
      ) : (
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {activity.map((ev, i) => (
            <li key={ev.key} className="rise border-b border-night-700/60 sm:[&:nth-last-child(-n+2)]:border-b-0 max-sm:last:border-b-0" style={{ animationDelay: `${250 + i * 40}ms` }}>
              <button className="group flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-start transition-colors hover:bg-night-800/60" onClick={() => go("client", ev.clientId)}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneFor(ev.kind)}`}>{iconFor(ev.kind)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-mist-100">{ev.text}</span>
                  <span className="block truncate text-[11px] font-semibold text-mist-500">{ev.meta}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-mist-500 opacity-0 transition group-hover:translate-x-0.5 group-hover:text-volt-300 group-hover:opacity-100 rtl:rotate-180" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------------- client progress ---------------- */

function ProgressPanel({
  state,
  go,
  className = "",
}: {
  state: { checkIns: { id: string; clientId: string; date: string; ts: number; weight: number }[]; clients: Client[] };
  go: (v: CoachView, id?: string) => void;
  className?: string;
}) {
  const [sel, setSel] = useState(0);

  const candidates = useMemo(
    () =>
      state.clients
        .map((c) => ({ c, list: state.checkIns.filter((x) => x.clientId === c.id).sort((a, b) => a.date.localeCompare(a.date) || a.ts - b.ts) }))
        .filter((x) => x.list.length >= 2)
        .sort((a, b) => b.list.length - a.list.length)
        .slice(0, 5),
    [state],
  );

  const chosen = candidates[Math.min(sel, Math.max(0, candidates.length - 1))];
  const points = chosen?.list ?? [];
  const delta = points.length >= 2 ? Math.round((points[points.length - 1].weight - points[0].weight) * 10) / 10 : null;

  const W = 560;
  const H = 200;
  const padL = 8;
  const padR = 12;
  const padT = 14;
  const padB = 24;
  const ws = points.map((p) => p.weight);
  const min = ws.length ? Math.min(...ws) - 1 : 0;
  const max = ws.length ? Math.max(...ws) + 1 : 1;
  const x = (i: number) => padL + (W - padL - padR) * (i / Math.max(1, points.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min || 1));
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.weight).toFixed(1)}`).join(" L");

  return (
    <SectionCard
      title="Client progress"
      icon={<Scale className="h-4.5 w-4.5" />}
      className={`${className} flex flex-col`}
      bodyCls="p-5 flex-1"
      delay={260}
      action={
        chosen ? (
          <button className={`${btnGhost} ${btnSm}`} onClick={() => go("client", chosen.c.id)}>
            Open profile <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </button>
        ) : undefined
      }
    >
      {candidates.length === 0 ? (
        <div className="grid h-full place-items-center px-6 py-12 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-night-800 text-mist-400 ring-1 ring-night-600">
              <Scale className="h-5 w-5" />
            </span>
            <p className="mt-3 font-display text-lg font-semibold text-mist-100">Not enough data yet.</p>
            <p className="mt-1 text-xs text-mist-400">A client needs at least two check-ins before a trend can be drawn.</p>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-center gap-1.5">
            {candidates.map((cand, i) => (
              <button
                key={cand.c.id}
                onClick={() => setSel(i)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full py-1 pe-3 ps-1 text-[11px] font-bold transition ${
                  i === Math.min(sel, candidates.length - 1) ? "bg-volt-400 text-night-950" : "bg-night-800 text-mist-400 hover:text-mist-100"
                }`}
              >
                <Avatar name={cand.c.name} photo={cand.c.photo} className="h-5 w-5 text-[8px]" />
                {cand.c.name.split(" ")[0]}
              </button>
            ))}
            {delta !== null && (
              <span className={`ms-auto font-display text-lg font-bold tnum ${delta <= 0 ? "text-moss-300" : "text-warn-300"}`}>
                {signed(delta)} <span className="text-xs font-semibold text-mist-500">kg total</span>
              </span>
            )}
          </div>
          <div className="mt-3 flex-1">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${chosen?.c.name ?? "Client"} weight trend`}>
              <defs>
                <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#cdf14b" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#cdf14b" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={padL} x2={W - padR} y1={padT + (H - padT - padB) * f} y2={padT + (H - padT - padB) * f} stroke="#1a251d" strokeWidth="1" />
              ))}
              <path d={`M${line} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`} fill="url(#dashArea)" />
              <path d={`M${line}`} fill="none" stroke="#cdf14b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <circle key={p.id} cx={x(i)} cy={y(p.weight)} r="2.6" fill="#0f1611" stroke="#cdf14b" strokeWidth="1.8" />
              ))}
              <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].weight)} r="10" fill="#cdf14b" opacity="0.18" className="ring-pulse" />
              <text x={x(0)} y={H - 6} textAnchor="middle" fontSize="10" fill="#71897b">{fmtDate(points[0].date)}</text>
              <text x={x(points.length - 1)} y={H - 6} textAnchor="middle" fontSize="10" fill="#71897b">{fmtDate(points[points.length - 1].date)}</text>
            </svg>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ---------------- business health ---------------- */

function BusinessPanel({
  state,
  revenueMonth,
  revenuePrev,
  today,
  openClients,
  className = "",
}: {
  state: { clients: Client[]; subscriptions: { id: string; clientId: string; endDate: string }[]; payments: { date: string; amount: number; status: string }[] };
  revenueMonth: number;
  revenuePrev: number;
  today: string;
  openClients: (f: "Active" | "Expiring Soon" | "Expired") => void;
  className?: string;
}) {
  const counts = useMemo(() => {
    const c = { Active: 0, "Expiring Soon": 0, Expired: 0, none: 0 };
    for (const cl of state.clients) {
      const subs = state.subscriptions.filter((s) => s.clientId === cl.id);
      const info = subscriptionState(currentSubscription(subs as Parameters<typeof currentSubscription>[0]));
      if (info.state === "No Subscription") c.none += 1;
      else if (info.state === "Expiring Soon") c["Expiring Soon"] += 1;
      else if (info.state === "Expired") c.Expired += 1;
      else c.Active += 1;
    }
    return c;
  }, [state]);

  const weeks = useMemo(() => {
    const todayDow = (new Date(today + "T12:00:00").getDay() + 6) % 7;
    const monday = addDays(today, -todayDow);
    return Array.from({ length: 6 }, (_, i) => {
      const start = addDays(monday, (i - 5) * 7);
      const end = addDays(start, 6);
      const total = state.payments
        .filter((p) => p.status === "Paid" && p.date >= start && p.date <= end)
        .reduce((s, p) => s + p.amount, 0);
      return { start, total, current: i === 5 };
    });
  }, [state.payments, today]);
  const weekMax = Math.max(...weeks.map((w) => w.total), 1);

  const diff = revenueMonth - revenuePrev;

  return (
    <SectionCard title="Business health" icon={<Wallet className="h-4.5 w-4.5" />} className={`${className} flex flex-col`} bodyCls="p-5 flex-1" delay={300}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-mist-500">Subscriptions</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <SubCount label="Active" value={counts.Active} tone="text-moss-300" filter="Active" openClients={openClients} />
        <SubCount label="Expiring" value={counts["Expiring Soon"]} tone="text-warn-300" filter="Expiring Soon" openClients={openClients} />
        <SubCount label="Expired" value={counts.Expired} tone="text-danger-300" filter="Expired" openClients={openClients} />
      </div>
      {counts.none > 0 && <p className="mt-2 text-[11px] font-semibold text-mist-500">{counts.none} client{counts.none === 1 ? " has" : "s have"} no subscription</p>}

      <div className="my-4 border-t border-night-700" />

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-mist-500">Revenue · this month</p>
          <p className="mt-1 font-display text-[34px] font-bold leading-8 text-mist-100 tnum">
            {fmtMoney(revenueMonth)} <span className="text-sm font-semibold text-mist-500">EGP</span>
          </p>
        </div>
        {revenuePrev > 0 ? (
          <span className={`mb-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold tnum ${diff >= 0 ? "bg-moss-400/10 text-moss-300" : "bg-danger-500/10 text-danger-300"}`}>
            {diff >= 0 ? "+" : ""}
            {fmtMoney(diff)} EGP vs last month
          </span>
        ) : (
          <span className="mb-1 text-[11px] font-semibold text-mist-500">no payments last month</span>
        )}
      </div>

      <div className="mt-4 flex items-end gap-2" aria-label="Weekly revenue, last 6 weeks">
        {weeks.map((w, i) => (
          <div key={w.start} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className={`font-display text-[11px] font-bold tnum ${w.total > 0 ? "text-mist-300" : "text-night-500"}`}>{w.total > 0 ? `${Math.round(w.total / 100) / 10}k` : ""}</span>
            <div className="flex h-16 w-full items-end" title={`Week of ${fmtDate(w.start)}: ${fmtMoney(w.total)} EGP`}>
              <div
                className={`bar-grow w-full rounded-t-[4px] ${w.current ? "bg-volt-400" : w.total > 0 ? "bg-moss-600" : "bg-night-700"}`}
                style={{ height: w.total > 0 ? `${Math.max(8, (w.total / weekMax) * 100)}%` : "4px", animationDelay: `${i * 60}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-mist-500">last 6 weeks · paid only</p>
    </SectionCard>
  );
}

function SubCount({
  label,
  value,
  tone,
  filter,
  openClients,
}: {
  label: string;
  value: number;
  tone: string;
  filter: "Active" | "Expiring Soon" | "Expired";
  openClients: (f: "Active" | "Expiring Soon" | "Expired") => void;
}) {
  return (
    <button
      onClick={() => openClients(filter)}
      className="group cursor-pointer rounded-lg border border-night-700 bg-night-800/60 px-3 py-2.5 text-start transition hover:border-night-500 hover:bg-night-800"
      title={`Open clients — ${label.toLowerCase()}`}
    >
      <span className={`block font-display text-[26px] font-bold leading-7 tnum ${value > 0 ? tone : "text-mist-500"}`}>{value}</span>
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-mist-500 transition group-hover:text-mist-300">
        {label}
        <ArrowUpRight className="h-2.5 w-2.5 opacity-0 transition group-hover:opacity-100" />
      </span>
    </button>
  );
}

export { Skeleton };
