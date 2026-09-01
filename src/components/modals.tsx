import { useEffect, useState, type ChangeEvent } from "react";
import type { Client, Exercise, Goal, ClientStatus, ExerciseCategory, Meal, MealType, PlanItem } from "../types";
import { CATEGORIES, GOALS, MEAL_TYPES, STATUSES, WEEK_DAYS } from "../types";
import { fileToDataUrl, todayISO } from "../lib";
import { useApp } from "../store";
import { Avatar, Modal, btnGhost, btnVolt, inputCls, labelCls } from "./ui";
import { IconCamera, IconImage, IconX } from "../icons";

/* ---------- shared photo field ---------- */

function PhotoField({
  value,
  onChange,
  label = "Profile photo",
}: {
  value?: string;
  onChange: (v?: string) => void;
  label?: string;
}) {
  const [err, setErr] = useState("");
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setErr("");
      onChange(await fileToDataUrl(f));
    } catch {
      setErr("Could not read that image — try another file.");
    }
  };
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="Preview" className="h-16 w-16 rounded-lg object-cover ring-1 ring-night-600" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-night-500 text-night-400">
            <IconCamera className="h-6 w-6" />
          </span>
        )}
        <div className="flex flex-col gap-1.5">
          <label className={`${btnGhost} cursor-pointer !px-3 !py-1.5 text-xs`}>
            <IconImage className="h-4 w-4" />
            {value ? "Replace" : "Upload"}
            <input type="file" accept="image/*" className="hidden" onChange={pick} />
          </label>
          {value && (
            <button type="button" onClick={() => onChange(undefined)} className="cursor-pointer text-[11px] font-semibold text-danger-400 hover:underline">
              Remove photo
            </button>
          )}
        </div>
      </div>
      {err && <p className="mt-1 text-xs font-semibold text-danger-400">{err}</p>}
    </div>
  );
}

/* ---------- client form ---------- */

export function ClientFormModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Client | null;
  onClose: () => void;
  onSaved?: (c: Client) => void;
}) {
  const { addClient, updateClient } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState<Goal>("Lose weight");
  const [status, setStatus] = useState<ClientStatus>("Active");
  const [startDate, setStartDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setGoal(initial?.goal ?? "Lose weight");
    setStatus(initial?.status ?? "Active");
    setStartDate(initial?.startDate ?? todayISO());
    setNotes(initial?.notes ?? "");
    setPhoto(initial?.photo);
    setError("");
  }, [open, initial]);

  const save = () => {
    if (!name.trim()) {
      setError("Client name is required.");
      return;
    }
    const data = { name: name.trim(), email: email.trim(), phone: phone.trim(), goal, status, startDate, notes: notes.trim(), photo };
    if (initial) {
      updateClient({ ...initial, ...data });
    } else {
      const c = addClient(data);
      onSaved?.(c);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit client" : "New client"} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <PhotoField value={photo} onChange={setPhoto} />
        <div>
          <label className={labelCls}>Name *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@email.com" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 1234" />
        </div>
        <div>
          <label className={labelCls}>Goal</label>
          <select className={inputCls} value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            {GOALS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ClientStatus)}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Start date</label>
          <input className={inputCls} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls} min-h-20 resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Injuries, preferences, schedule…" />
        </div>
      </div>
      {error && <p className="mt-3 text-xs font-bold text-danger-400">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button className={`${btnVolt} flex-1`} onClick={save}>
          {initial ? "Save changes" : "Add client"}
        </button>
        <button className={btnGhost} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/* ---------- exercise form ---------- */

export function ExerciseFormModal({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: Exercise | null;
  onClose: () => void;
}) {
  const { addExercise, updateExercise } = useApp();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("Chest");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setCategory(initial?.category ?? "Chest");
    setDescription(initial?.description ?? "");
    setVideoUrl(initial?.videoUrl ?? "");
    setImage(initial?.image);
    setError("");
  }, [open, initial]);

  const save = () => {
    if (!name.trim()) {
      setError("Exercise name is required.");
      return;
    }
    const data = { name: name.trim(), category, description: description.trim(), videoUrl: videoUrl.trim(), image };
    if (initial) updateExercise({ ...initial, ...data });
    else addExercise(data);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit exercise" : "New exercise"} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <PhotoField value={image} onChange={setImage} label="Exercise image" />
        <div>
          <label className={labelCls}>Exercise name *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Goblet Squat" />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as ExerciseCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Video URL (YouTube)</label>
          <input className={inputCls} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/…" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Coaching cues / description</label>
          <textarea className={`${inputCls} min-h-20 resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Setup, tempo, common mistakes…" />
        </div>
      </div>
      {error && <p className="mt-3 text-xs font-bold text-danger-400">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button className={`${btnVolt} flex-1`} onClick={save}>
          {initial ? "Save changes" : "Add to library"}
        </button>
        <button className={btnGhost} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/* ---------- plan item form ---------- */

export function PlanItemFormModal({
  open,
  clientId,
  day,
  initial,
  onClose,
}: {
  open: boolean;
  clientId: string;
  day: number;
  initial: PlanItem | null;
  onClose: () => void;
}) {
  const { state, addPlanItem, updatePlanItem, toast } = useApp();
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [rest, setRest] = useState("60");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setExerciseId(initial?.exerciseId ?? state.exercises[0]?.id ?? "");
    setSets(String(initial?.sets ?? 3));
    setReps(String(initial?.reps ?? 10));
    setRest(String(initial?.rest ?? 60));
    setNotes(initial?.notes ?? "");
  }, [open, initial, state.exercises]);

  const save = () => {
    if (!exerciseId) {
      toast("Add an exercise to the library first", "warn");
      return;
    }
    const data = {
      exerciseId,
      sets: Math.max(1, Number(sets) || 1),
      reps: Math.max(1, Number(reps) || 1),
      rest: Math.max(0, Number(rest) || 0),
      notes: notes.trim(),
    };
    if (initial) updatePlanItem({ ...initial, ...data });
    else addPlanItem({ clientId, day, ...data });
    onClose();
  };

  const picked = state.exercises.find((e) => e.id === exerciseId);

  return (
    <Modal open={open} onClose={onClose} title={`${initial ? "Edit" : "Add"} exercise — Day ${day} (${WEEK_DAYS[day - 1]})`}>
      {state.exercises.length === 0 ? (
        <p className="rounded-lg border border-warn-400/25 bg-warn-400/10 p-3 text-sm text-warn-300">
          The library is empty — add an exercise there first.
        </p>
      ) : (
        <div className="grid gap-4">
          <div>
            <label className={labelCls}>Exercise</label>
            <select className={inputCls} value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
              {state.exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.category}
                </option>
              ))}
            </select>
            {picked && picked.description && (
              <p className="mt-2 rounded-lg bg-night-800 p-2.5 text-xs leading-5 text-mist-400">{picked.description}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Sets</label>
              <input className={inputCls} type="number" min={1} value={sets} onChange={(e) => setSets(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Reps</label>
              <input className={inputCls} type="number" min={1} value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Rest (s)</label>
              <input className={inputCls} type="number" min={0} step={15} value={rest} onChange={(e) => setRest(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes for this day</label>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tempo, load target, cue…" />
          </div>
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <button className={`${btnVolt} flex-1`} onClick={save} disabled={state.exercises.length === 0}>
          {initial ? "Save changes" : "Add to plan"}
        </button>
        <button className={btnGhost} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/* ---------- meal form ---------- */

export function MealFormModal({
  open,
  clientId,
  initial,
  defaultType,
  onClose,
}: {
  open: boolean;
  clientId: string;
  initial: Meal | null;
  defaultType?: MealType;
  onClose: () => void;
}) {
  const { addMeal, updateMeal } = useApp();
  const [type, setType] = useState<MealType>("Breakfast");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("450");
  const [protein, setProtein] = useState("30");
  const [carbs, setCarbs] = useState("40");
  const [fats, setFats] = useState("12");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setType(initial?.type ?? defaultType ?? "Breakfast");
    setDescription(initial?.description ?? "");
    setCalories(String(initial?.calories ?? 450));
    setProtein(String(initial?.protein ?? 30));
    setCarbs(String(initial?.carbs ?? 40));
    setFats(String(initial?.fats ?? 12));
    setError("");
  }, [open, initial, defaultType]);

  const save = () => {
    if (!description.trim()) {
      setError("Describe the meal first.");
      return;
    }
    const data = {
      type,
      description: description.trim(),
      calories: Math.max(0, Number(calories) || 0),
      protein: Math.max(0, Number(protein) || 0),
      carbs: Math.max(0, Number(carbs) || 0),
      fats: Math.max(0, Number(fats) || 0),
    };
    if (initial) updateMeal({ ...initial, ...data });
    else addMeal({ clientId, ...data });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit meal" : "Assign meal"}>
      <div className="grid gap-4">
        <div>
          <label className={labelCls}>Meal type</label>
          <div className="grid grid-cols-4 gap-1.5">
            {MEAL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`cursor-pointer rounded-lg border px-1 py-2 text-[11px] font-bold transition ${
                  type === t
                    ? "border-volt-400 bg-volt-400/15 text-volt-300"
                    : "border-night-600 bg-night-800 text-mist-400 hover:border-night-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Food description *</label>
          <textarea className={`${inputCls} min-h-16 resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Grilled chicken, rice, salad…" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { l: "Kcal", v: calories, s: setCalories },
            { l: "Protein", v: protein, s: setProtein },
            { l: "Carbs", v: carbs, s: setCarbs },
            { l: "Fats", v: fats, s: setFats },
          ].map((f) => (
            <div key={f.l}>
              <label className={labelCls}>{f.l}</label>
              <input className={inputCls} type="number" min={0} value={f.v} onChange={(e) => f.s(e.target.value)} />
            </div>
          ))}
        </div>
      </div>
      {error && <p className="mt-3 text-xs font-bold text-danger-400">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button className={`${btnVolt} flex-1`} onClick={save}>
          {initial ? "Save changes" : "Add meal"}
        </button>
        <button className={btnGhost} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/* ---------- photo lightbox ---------- */

export function PhotoModal({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="animate-fade absolute inset-0 bg-night-950/90" onClick={onClose} />
      <div className="animate-pop relative">
        <img src={src} alt="Check-in" className="max-h-[80vh] max-w-full rounded-xl ring-1 ring-night-600" />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-volt-400 text-night-950 shadow-lg transition hover:bg-volt-300"
          aria-label="Close"
        >
          <IconX className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
