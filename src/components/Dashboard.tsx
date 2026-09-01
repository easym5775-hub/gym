import { useState, type ReactNode } from "react";
import type { CoachView } from "../types";
import { GOAL_META, GOALS, WEEK_SHORT } from "../types";
import { addDays, fmtDate, relDay, signed, todayISO } from "../lib";
import { useApp } from "../store";
import { Avatar, Badge, MoodDots, SectionCard, btnGhost, btnVolt, useCountUp, EmptyState } from "./ui";
import { WeekBars } from "./Chart";
import { ClientFormModal } from "./modals";
import { IconCamera, IconCheck, IconClipboard, IconDrop, IconHeartPulse, IconPlus, IconScale, IconUsers, IconX } from "../icons";

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
    <div className="rise card-lift flex items-center gap-4 rounded-xl border border-night-700 bg-night-850 p-4" style={{ animationDelay: `${delay}ms` }}>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="font-display text-[30px] font-bold leading-7 text-mist-100">{value}</p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-mist-400">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-mist-500">{sub}</p>
      </div>
    </div>
  );
}

export function Dashboard({ go }: { go: (v: CoachView, id?: string) => void }) {
  const { state } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const today = todayISO();

  const active = state.clients.filter((c) => c.status === "Active").length;
  const weekStart = addDays(today, -6);
  const weekIns = state.checkIns.filter((c) => c.date >= weekStart);
  const compliance = weekIns.length ? Math.round((weekIns.filter((c) => c.workoutDone).length / weekIns.length) * 100) : 0;

  const animTotal = useCountUp(state.clients.length);
  const animActive = useCountUp(active);
  const animWeek = useCountUp(weekIns.length);
  const animComp = useCountUp(compliance);

  const recent = [...state.checkIns].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 7);
  const nameOf = (id: string) => state.clients.find((c) => c.id === id);

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, -(6 - i));
    return {
      label: WEEK_SHORT[(((new Date(d).getDay() + 6) % 7))] ?? "",
      value: state.checkIns.filter((c) => c.date === d).length,
      isToday: i === 6,
    };
  });

  const goalCounts = GOALS.map((g) => ({ g, n: state.clients.filter((c) => c.goal === g).length }));

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-mist-500">{fmtDate(today)}</p>
          <h1 className="mt-1 font-display text-4xl font-bold uppercase leading-none tracking-tight text-mist-100 sm:text-5xl">
            Command <span className="text-volt-400">center</span>
          </h1>
          <p className="mt-2 text-sm text-mist-400">
            {weekIns.length} check-ins in the last 7 days · compliance at {compliance}%
          </p>
        </div>
        <button className={`${btnVolt} h-11`} onClick={() => setAddOpen(true)}>
          <IconPlus className="h-4 w-4" strokeWidth={2.4} />
          New client
        </button>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile tone="bg-night-700 text-volt-300" icon={<IconUsers className="h-6 w-6" />} label="Total clients" value={String(Math.round(animTotal))} sub="everyone on the roster" delay={0} />
        <Tile tone="bg-volt-400/15 text-volt-300" icon={<IconHeartPulse className="h-6 w-6" />} label="Active now" value={String(Math.round(animActive))} sub="training this block" delay={70} />
        <Tile tone="bg-moss-700/40 text-moss-300" icon={<IconCamera className="h-6 w-6" />} label="Check-ins · 7d" value={String(Math.round(animWeek))} sub="from all clients" delay={140} />
        <Tile tone="bg-warn-400/15 text-warn-300" icon={<IconClipboard className="h-6 w-6" />} label="Compliance" value={`${Math.round(animComp)}%`} sub="workouts completed" delay={210} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Recent check-ins"
          icon={<IconCamera className="h-5 w-5" />}
          className="lg:col-span-2"
          delay={120}
          bodyCls="p-2.5"
          action={
            <button className={`${btnGhost} px-3! py-1.5! text-xs`} onClick={() => go("checkins")}>
              View all
            </button>
          }
        >
          {recent.length === 0 ? (
            <div className="p-2">
              <EmptyState icon={<IconCamera className="h-6 w-6" />} title="No check-ins yet" sub="Once clients start logging, their numbers land here." />
            </div>
          ) : (
            <ul className="grid gap-1">
              {recent.map((ci) => {
                const c = nameOf(ci.clientId);
                const mine = state.checkIns
                  .filter((x) => x.clientId === ci.clientId)
                  .sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
                const idx = mine.findIndex((x) => x.id === ci.id);
                const prev = idx > 0 ? mine[idx - 1] : undefined;
                const delta = prev ? ci.weight - prev.weight : 0;
                return (
                  <li key={ci.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition hover:bg-night-800">
                    <Avatar name={c?.name ?? "?"} photo={c?.photo} className="h-9 w-9 text-[11px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-mist-100">
                        {c?.name ?? "Former client"}
                        <span className="ms-2 text-[11px] font-semibold text-mist-500">{relDay(ci.date)}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-mist-400">
                        <span className="inline-flex items-center gap-1 text-mist-200">
                          <IconScale className="h-3.5 w-3.5 text-volt-400" />
                          {ci.weight} kg
                          {prev && (
                            <span className={delta <= 0 ? "text-moss-300" : "text-warn-300"}>{signed(delta)}</span>
                          )}
                        </span>
                        <MoodDots mood={ci.mood} />
                        <span className="inline-flex items-center gap-1">
                          <IconDrop className="h-3.5 w-3.5 text-sky-400" />
                          {ci.water}L
                        </span>
                      </p>
                    </div>
                    {ci.photo && <img src={ci.photo} alt="" className="h-9 w-9 rounded-md object-cover ring-1 ring-night-600" />}
                    <Badge className={ci.workoutDone ? "border-volt-400/25 bg-volt-400/10 text-volt-300" : "border-danger-500/25 bg-danger-500/10 text-danger-300"}>
                      {ci.workoutDone ? <IconCheck className="h-3 w-3" strokeWidth={2.6} /> : <IconX className="h-3 w-3" strokeWidth={2.6} />}
                      {ci.workoutDone ? "Done" : "Skipped"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard title="Check-ins · 7 days" icon={<IconClipboard className="h-5 w-5" />} delay={180} bodyCls="p-5 pt-6">
            <WeekBars data={weekData} />
          </SectionCard>

          <SectionCard title="Roster by goal" icon={<IconUsers className="h-5 w-5" />} delay={240} bodyCls="p-5">
            <div className="grid gap-3.5">
              {goalCounts.map(({ g, n }) => (
                <div key={g}>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                    <span className="text-mist-200">{g}</span>
                    <span className="font-display text-base text-mist-400">{n}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-night-700">
                    <div
                      className={`h-full rounded-full ${GOAL_META[g].bar} transition-all duration-700 ease-out`}
                      style={{ width: state.clients.length ? `${(n / state.clients.length) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <ClientFormModal open={addOpen} initial={null} onClose={() => setAddOpen(false)} />
    </div>
  );
}
