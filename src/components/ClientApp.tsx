/* ================================================================
   FORGE — Client mode: today's plan & meals, daily check-in, progress.
   A client only ever sees their own data (RLS in live mode, scoping in demo).
   ================================================================ */

import { useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ClipboardList,
  Clock,
  Droplets,
  Dumbbell,
  Flame,
  Image as ImageIcon,
  LogOut,
  Play,
  Scale,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { CAT_META, GOAL_META, MEAL_META, MEAL_TYPES, WEEK_DAYS } from "../types";
import { dayNum, fileToDataUrl, relDay, round1, signed, todayISO } from "../lib";
import { attendance, progressOf } from "../logic";
import { useApp } from "../store";
import { Avatar, Badge, EmptyState, MoodPicker, SectionCard, Toggle, btnPrimary, chip } from "./ui";
import { WeightLine } from "./Chart";

type Tab = "today" | "checkin" | "progress";

export function ClientApp({ onLogout }: { onLogout: () => void }) {
  const { state, me } = useApp();
  const [tab, setTab] = useState<Tab>("today");

  const clientId = me?.userId ?? "";
  const client = state.clients.find((c) => c.id === clientId);
  const plans = useMemo(() => state.plans.filter((p) => p.clientId === clientId), [state.plans, clientId]);
  const meals = useMemo(() => state.meals.filter((m) => m.clientId === clientId), [state.meals, clientId]);
  const checkIns = useMemo(() => state.checkIns.filter((c) => c.clientId === clientId), [state.checkIns, clientId]);
  const sessions = useMemo(() => state.sessions.filter((s) => s.clientId === clientId), [state.sessions, clientId]);

  if (!client) {
    return (
      <div className="relative grid min-h-screen place-items-center p-6">
        <div className="app-glow pointer-events-none fixed inset-0" />
        <EmptyState icon={<LogOut className="h-6 w-6" />} title="Profile unavailable" sub="Your account isn't linked to a client record. Ask your coach to re-add you.">
          <button className={`${btnPrimary} mt-2`} onClick={onLogout}>
            <ArrowRight className="h-4 w-4 rotate-180 rtl:rotate-0" /> Back to sign in
          </button>
        </EmptyState>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "checkin", label: "Daily check-in" },
    { id: "progress", label: "My progress" },
  ];

  return (
    <div className="noise relative min-h-screen">
      <div className="app-glow pointer-events-none fixed inset-0" />
      <div className="dot-grid pointer-events-none fixed inset-0 opacity-40" />

      <header className="sticky top-0 z-40 border-b border-night-700 bg-night-900/90 backdrop-blur">
        <span className="absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-transparent via-volt-400/40 to-transparent" />
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Avatar name={client.name} photo={client.photo} className="h-10 w-10 text-xs" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold uppercase leading-5 tracking-wide text-mist-100">{client.name}</p>
            <span className={`${chip} mt-0.5 ${GOAL_META[client.goal].chip}`}>{client.goal}</span>
          </div>
          <nav className="ms-auto hidden gap-1.5 sm:flex">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition ${tab === t.id ? "bg-volt-400 text-night-950" : "bg-night-800 text-mist-400 hover:text-mist-100"}`}>
                {t.label}
              </button>
            ))}
          </nav>
          <button onClick={onLogout} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-night-600 text-mist-400 transition hover:border-night-500 hover:text-mist-100" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <nav className="mx-auto flex w-full max-w-4xl gap-1.5 overflow-x-auto px-4 pb-3 sm:hidden">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${tab === t.id ? "bg-volt-400 text-night-950" : "bg-night-800 text-mist-400"}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        {tab === "today" && <TodayTab plans={plans} meals={meals} exercises={state.exercises} onCheckIn={() => setTab("checkin")} sessionsToday={sessions.filter((s) => s.date === todayISO())} />}
        {tab === "checkin" && <CheckInTab clientId={clientId} onDone={() => setTab("progress")} alreadyToday={checkIns.some((c) => c.date === todayISO())} />}
        {tab === "progress" && <ProgressTab checkIns={checkIns} sessionsCount={attendance(sessions)} />}
      </main>
    </div>
  );
}

/* ---------------- today ---------------- */

function TodayTab({
  plans,
  meals,
  exercises,
  sessionsToday,
  onCheckIn,
}: {
  plans: { id: string; day: number; exerciseId: string; sets: number; reps: number; rest: number; notes: string }[];
  meals: { id: string; type: keyof typeof MEAL_META; description: string; calories: number; protein: number; carbs: number; fats: number }[];
  exercises: { id: string; name: string; category: keyof typeof CAT_META; videoUrl: string }[];
  sessionsToday: { id: string; time: string; type: string; status: string }[];
  onCheckIn: () => void;
}) {
  const dn = dayNum();
  const todayPlan = plans.filter((p) => p.day === dn);
  const exOf = (id: string) => exercises.find((e) => e.id === id);
  const kcal = meals.reduce((s, m) => s + m.calories, 0);

  return (
    <div className="grid gap-4">
      <div className="rise flex flex-wrap items-center gap-4 rounded-xl border border-night-700 bg-night-850 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-mist-500">Your program</p>
          <h1 className="mt-1 font-display text-4xl font-bold uppercase leading-none text-mist-100 sm:text-5xl">
            Day {dn} <span className="text-volt-400">· {WEEK_DAYS[dn - 1]}</span>
          </h1>
          <p className="mt-2 text-sm text-mist-400">
            {todayPlan.length > 0 ? `${todayPlan.length} exercise${todayPlan.length > 1 ? "s" : ""} today` : "Recovery day"} · {kcal > 0 ? `${kcal.toLocaleString("en-US")} kcal planned` : "no meals assigned"}
          </p>
        </div>
        <button className={`${btnPrimary} h-12`} onClick={onCheckIn}>
          <Camera className="h-5 w-5" /> Submit daily check-in
        </button>
      </div>

      {sessionsToday.length > 0 && (
        <SectionCard title="Today's sessions" icon={<Clock className="h-4.5 w-4.5" />} bodyCls="p-3">
          <ul className="grid gap-2">
            {sessionsToday.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg border border-night-700 bg-night-800 p-3">
                <span className="font-display text-lg font-bold text-mist-100 tnum">{s.time}</span>
                <span className="text-sm font-semibold text-mist-300">{s.type}</span>
                <Badge className="ms-auto border-night-600 bg-night-700 text-mist-300">{s.status}</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Today's workout" icon={<ClipboardList className="h-4.5 w-4.5" />} delay={80} bodyCls="p-3">
        {todayPlan.length === 0 ? (
          <EmptyState icon={<Dumbbell className="h-6 w-6" />} title="Rest day" sub="No session programmed today. Sleep well, eat well, come back stronger tomorrow." />
        ) : (
          <ul className="grid gap-2">
            {todayPlan.map((item, i) => {
              const ex = exOf(item.exerciseId);
              return (
                <li key={item.id} className="rise flex items-center gap-3 rounded-lg border border-night-700 bg-night-800 p-3 transition hover:border-night-500" style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-night-700 font-display text-lg font-bold text-volt-300">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-mist-100">{ex?.name ?? "Exercise"}</p>
                      {ex && (
                        <Badge className={CAT_META[ex.category].chip}>
                          <span className={`h-1.5 w-1.5 rounded-full ${CAT_META[ex.category].dot}`} />
                          {ex.category}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs font-semibold text-mist-400">
                      <span className="font-display text-base text-mist-200">
                        {item.sets} × {item.reps} <span className="text-mist-500">reps</span>
                      </span>
                      <span>{item.rest > 0 ? `${item.rest}s rest` : "no rest"}</span>
                    </p>
                    {item.notes && <p className="mt-1 text-[11px] italic text-mist-500">Coach: "{item.notes}"</p>}
                  </div>
                  {ex?.videoUrl && (
                    <a href={ex.videoUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-night-700 px-2.5 py-2 text-[11px] font-bold text-volt-300 transition hover:bg-night-600">
                      <Play className="h-3 w-3" /> Video
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Today's meals" icon={<UtensilsCrossed className="h-4.5 w-4.5" />} delay={160} bodyCls="p-3">
        {meals.length === 0 ? (
          <EmptyState icon={<UtensilsCrossed className="h-6 w-6" />} title="No meal plan yet" sub="Your coach hasn't assigned meals — check back soon." />
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {MEAL_TYPES.filter((t) => meals.some((m) => m.type === t)).map((t) =>
                meals
                  .filter((m) => m.type === t)
                  .map((m) => (
                    <div key={m.id} className="rounded-lg border border-night-700 bg-night-800 p-3 transition hover:border-night-500">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={MEAL_META[m.type].chip}>{m.type}</Badge>
                        <span className="font-display text-lg font-bold text-warn-300 tnum">{m.calories} kcal</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-5 text-mist-100">{m.description}</p>
                      <p className="mt-1.5 flex gap-3 text-[11px] font-bold tnum">
                        <span className="text-volt-300">P {m.protein}g</span>
                        <span className="text-sky-300">C {m.carbs}g</span>
                        <span className="text-warn-300">F {m.fats}g</span>
                      </p>
                    </div>
                  )),
              )}
            </div>
            <p className="mt-3 text-center text-xs font-bold text-mist-500">
              Daily total: <span className="font-display text-base text-warn-300 tnum">{kcal.toLocaleString("en-US")} kcal</span>
            </p>
          </>
        )}
      </SectionCard>
    </div>
  );
}

/* ---------------- check-in ---------------- */

function CheckInTab({ clientId, onDone, alreadyToday }: { clientId: string; onDone: () => void; alreadyToday: boolean }) {
  const { state, addCheckIn } = useApp();
  const last = useMemo(
    () => [...state.checkIns].filter((c) => c.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts)[0],
    [state.checkIns, clientId],
  );

  const [weight, setWeight] = useState(last ? String(last.weight) : "");
  const [waist, setWaist] = useState(last?.waist !== undefined ? String(last.waist) : "");
  const [mood, setMood] = useState(last?.mood ?? 3);
  const [water, setWater] = useState("2");
  const [done, setDone] = useState(true);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [photoErr, setPhotoErr] = useState("");
  const [error, setError] = useState("");

  const pickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setPhotoErr("");
      setPhoto(await fileToDataUrl(f, 640));
    } catch {
      setPhotoErr("Could not read that image.");
    }
  };

  const submit = () => {
    const w = Number(weight);
    if (!weight || Number.isNaN(w) || w <= 0) {
      setError("Enter your weight — it's the core of the check-in.");
      return;
    }
    addCheckIn({
      clientId,
      date: todayISO(),
      weight: round1(w),
      waist: waist && !Number.isNaN(Number(waist)) ? round1(Number(waist)) : undefined,
      mood,
      water: Math.max(0, Number(water) || 0),
      workoutDone: done,
      notes: notes.trim() || undefined,
      photo,
    });
    onDone();
  };

  return (
    <div className="grid gap-4">
      <div className="rise rounded-xl border border-night-700 bg-night-850 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-mist-500">{relDay(todayISO())}</p>
        <h1 className="mt-1 font-display text-4xl font-bold uppercase leading-none text-mist-100 sm:text-5xl">
          Daily <span className="text-volt-400">check-in</span>
        </h1>
        <p className="mt-2 text-sm text-mist-400">Sixty honest seconds. Your coach sees this instantly.</p>
        {alreadyToday && (
          <p className="mt-3 rounded-lg border border-warn-400/25 bg-warn-400/10 px-3 py-2 text-xs font-semibold text-warn-300">
            You already checked in today — logging again is fine, the latest numbers count.
          </p>
        )}
      </div>

      <SectionCard title="Numbers" icon={<Scale className="h-4.5 w-4.5" />} delay={80} bodyCls="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-mist-400">Weight (kg) *</label>
            <input className="h-10 w-full rounded-lg border border-night-600 bg-night-800 px-3 text-sm text-mist-100 outline-none transition focus:border-volt-400" type="number" step="0.1" min="0" placeholder={last ? `last: ${last.weight}` : "e.g. 74.5"} value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-mist-400">Waist (cm)</label>
            <input className="h-10 w-full rounded-lg border border-night-600 bg-night-800 px-3 text-sm text-mist-100 outline-none transition focus:border-volt-400" type="number" step="0.1" min="0" placeholder={last?.waist !== undefined ? `last: ${last.waist}` : "optional"} value={waist} onChange={(e) => setWaist(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-mist-400">Mood</label>
            <MoodPicker value={mood} onChange={setMood} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-mist-400">Water intake (liters)</label>
            <input className="h-10 w-full rounded-lg border border-night-600 bg-night-800 px-3 text-sm text-mist-100 outline-none transition focus:border-volt-400" type="number" step="0.1" min="0" value={water} onChange={(e) => setWater(e.target.value)} />
            <div className="mt-2 flex gap-1.5">
              {[1.5, 2, 2.5, 3].map((v) => (
                <button key={v} type="button" onClick={() => setWater(String(v))} className={`cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-bold transition ${water === String(v) ? "border-sky-400 bg-sky-400/15 text-sky-300" : "border-night-600 bg-night-800 text-mist-400 hover:border-night-500"}`}>
                  {v}L
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <Toggle checked={done} onChange={setDone} label="Workout completed" />
            <p className="text-[11px] text-mist-500">Be honest — skipped days are part of the process.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Photo & notes" icon={<Camera className="h-4.5 w-4.5" />} delay={160} bodyCls="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-mist-400">Progress photo (optional)</label>
            <div className="flex items-center gap-3">
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="Progress" className="h-20 w-20 rounded-lg object-cover ring-1 ring-night-600" />
                  <button type="button" onClick={() => setPhoto(undefined)} className="absolute -end-2 -top-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-danger-500 text-white shadow" aria-label="Remove photo">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-night-500 text-night-400">
                  <ImageIcon className="h-7 w-7" />
                </span>
              )}
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-night-500 bg-night-700 px-3 text-xs font-bold text-mist-100 transition hover:bg-night-600">
                <Camera className="h-4 w-4" />
                {photo ? "Replace photo" : "Upload photo"}
                <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
              </label>
            </div>
            {photoErr && <p className="mt-1 text-xs font-semibold text-danger-400">{photoErr}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-mist-400">Notes for your coach</label>
            <textarea className="w-full rounded-lg border border-night-600 bg-night-800 px-3 py-2 text-sm text-mist-100 outline-none transition focus:border-volt-400 min-h-20 resize-y" placeholder="Energy, sleep, soreness, PRs…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        {error && <p className="mt-3 text-xs font-bold text-danger-400">{error}</p>}
        <button className={`${btnPrimary} mt-5 h-12 w-full text-base`} onClick={submit}>
          <Check className="h-5 w-5" strokeWidth={2.4} /> Submit check-in
        </button>
      </SectionCard>
    </div>
  );
}

/* ---------------- progress ---------------- */

function ProgressTab({ checkIns, sessionsCount }: { checkIns: Parameters<typeof progressOf>[0]; sessionsCount: ReturnType<typeof attendance> }) {
  const prog = progressOf(checkIns);
  const sorted = useMemo(() => [...checkIns].sort((a, b) => a.date.localeCompare(a.date) || a.ts - b.ts), [checkIns]);

  const streak = useMemo(() => {
    const dates = new Set(checkIns.map((c) => c.date));
    let s = 0;
    let cursor = todayISO();
    if (!dates.has(cursor)) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      cursor = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    }
    while (dates.has(cursor)) {
      s += 1;
      const d = new Date(cursor + "T12:00:00");
      d.setDate(d.getDate() - 1);
      cursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return s;
  }, [checkIns]);

  return (
    <div className="grid gap-4">
      <div className="rise grid grid-cols-3 gap-3">
        <MiniKpi icon={<Scale className="h-4 w-4" />} label="Latest weight" value={prog.currentWeight !== null ? `${prog.currentWeight}` : "—"} unit="kg" />
        <MiniKpi icon={<Droplets className="h-4 w-4" />} label="Total change" value={prog.weightChange !== null ? signed(prog.weightChange) : "—"} unit="kg" tone={prog.weightChange !== null && prog.weightChange <= 0 ? "text-moss-300" : "text-warn-300"} />
        <MiniKpi icon={<Flame className="h-4 w-4" />} label="Day streak" value={String(streak)} unit="days" tone="text-volt-300" />
      </div>

      <SectionCard title="Weight trend" icon={<Scale className="h-4.5 w-4.5" />} delay={80} bodyCls="p-4">
        <WeightLine entries={sorted} />
      </SectionCard>

      <SectionCard title="Attendance" icon={<Check className="h-4.5 w-4.5" />} delay={160} bodyCls="p-5">
        <p className="text-sm text-mist-300">
          You've completed <span className="font-display text-xl font-bold text-volt-300 tnum">{sessionsCount.completed}</span> of{" "}
          <span className="font-bold tnum">{sessionsCount.countable}</span> sessions ({sessionsCount.pct}%).
        </p>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-night-700">
          <div className="grow-x h-full rounded-full bg-volt-400" style={{ width: `${sessionsCount.pct}%` }} />
        </div>
      </SectionCard>
    </div>
  );
}

function MiniKpi({ icon, label, value, unit, tone }: { icon: React.ReactNode; label: string; value: string; unit: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-night-700 bg-night-850 p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-mist-500">
        <span className="text-volt-400">{icon}</span> {label}
      </p>
      <p className={`mt-1 font-display text-[30px] font-bold leading-8 tnum ${tone ?? "text-mist-100"}`}>
        {value}
        <span className="text-sm font-semibold text-mist-500"> {unit}</span>
      </p>
    </div>
  );
}
