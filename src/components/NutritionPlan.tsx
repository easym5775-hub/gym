/* ================================================================
   FORGE — 7-Day Nutrition Plan Builder (Coach Mode)
   ================================================================ */

import { useEffect, useState, useMemo } from "react";
import type { Meal, MealType, Client } from "../types";
import { MEAL_TYPES, WEEK_DAYS, WEEK_SHORT, MEAL_META } from "../types";
import { useApp } from "../store";
import { Badge, EmptyState, SectionCard, inputCls, labelCls, btnPrimary, btnSecondary } from "./ui";
import { MealFormModal, CopyDayModal } from "./modals";
import { IconFlame, IconPlus, IconTrash, IconPencil, IconUtensils, IconCopy, IconCalendar } from "../icons";

export function NutritionPlanView({ presetClientId }: { presetClientId: string | null }) {
  const { state, addMeal, updateMeal, deleteMeal } = useApp();
  const [clientId, setClientId] = useState(presetClientId ?? state.clients[0]?.id ?? "");
  const [selectedDay, setSelectedDay] = useState<number>(1); // 1 = Monday
  const [modalOpen, setModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [deleting, setDeleting] = useState<Meal | null>(null);
  const [defaultType, setDefaultType] = useState<MealType>("Breakfast");

  useEffect(() => {
    if (presetClientId) setClientId(presetClientId);
  }, [presetClientId]);

  useEffect(() => {
    if (!clientId && state.clients.length) setClientId(state.clients[0].id);
  }, [clientId, state.clients]);

  const client = state.clients.find((c) => c.id === clientId);
  const allClientMeals = state.meals.filter((m) => m.clientId === clientId);
  
  // Filter meals for selected day
  const dayMeals = useMemo(() => 
    allClientMeals.filter((m) => m.day === selectedDay),
    [allClientMeals, selectedDay]
  );

  // Sort meals by time then by type order
  const sortedMeals = useMemo(() => {
    const typeOrder: Record<MealType, number> = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };
    return [...dayMeals].sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }, [dayMeals]);

  // Calculate daily totals
  const dailyTotals = useMemo(() => 
    dayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fats: acc.fats + m.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    ),
    [dayMeals]
  );

  // Weekly completion status
  const weeklyStatus = useMemo(() => {
    const daysWithMeals = new Set(allClientMeals.map((m) => m.day));
    return {
      planned: daysWithMeals.size,
      total: 7,
      hasMeals: (day: number) => daysWithMeals.has(day),
    };
  }, [allClientMeals]);

  // Nutrition targets comparison
  const targets = client?.nutritionTargets;

  const handleAddMeal = () => {
    setEditing(null);
    setDefaultType("Breakfast");
    setModalOpen(true);
  };

  const handleEditMeal = (meal: Meal) => {
    setEditing(meal);
    setModalOpen(true);
  };

  const handleDeleteMeal = (meal: Meal) => {
    setDeleting(meal);
  };

  const confirmDelete = () => {
    if (deleting) {
      deleteMeal(deleting.id);
      setDeleting(null);
    }
  };

  if (!client) {
    return (
      <div>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight text-mist-100 sm:text-5xl">
              Nutrition <span className="text-volt-400">Plan</span>
            </h1>
            <p className="mt-2 text-sm text-mist-400">Build complete weekly meal plans for your clients</p>
          </div>
        </header>
        <div className="mt-6">
          <EmptyState icon={<IconUtensils className="h-6 w-6" />} title="No clients yet" sub="Add a client first, then build their nutrition plan." />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight text-mist-100 sm:text-5xl">
            Nutrition <span className="text-volt-400">Plan</span>
          </h1>
          <p className="mt-2 text-sm text-mist-400">Build complete weekly meal plans — {client.name}</p>
        </div>
        <div className="flex gap-3">
          <div className="w-48">
            <label className={labelCls}>Client</label>
            <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Week Navigation */}
      <div className="rise mt-6 rounded-xl border border-night-700 bg-night-850 p-4" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-mist-400">Week Overview</h2>
          <span className="text-xs font-semibold text-mist-500">
            {weeklyStatus.planned} / {weeklyStatus.total} days planned
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((dayName, idx) => {
            const dayNum = idx + 1;
            const hasMeals = weeklyStatus.hasMeals(dayNum);
            const isSelected = selectedDay === dayNum;
            
            return (
              <button
                key={dayName}
                onClick={() => setSelectedDay(dayNum)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                  isSelected
                    ? "border-volt-400 bg-volt-400/15 text-volt-300"
                    : hasMeals
                    ? "border-night-600 bg-night-800 text-mist-200 hover:border-night-500"
                    : "border-night-700 bg-night-900 text-mist-500 hover:border-night-600"
                }`}
              >
                <span>{WEEK_SHORT[idx]}</span>
                {hasMeals && <span className="h-1.5 w-1.5 rounded-full bg-volt-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Summary */}
      <div className="rise mt-4 rounded-xl border border-night-700 bg-night-850 p-5" style={{ animationDelay: "120ms" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-warn-400/15 text-warn-300">
              <IconFlame className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-[30px] font-bold leading-7 text-mist-100">
                {dailyTotals.calories.toLocaleString("en-US")}
                <span className="ms-1.5 text-sm font-semibold text-mist-500">kcal</span>
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-mist-500">{WEEK_DAYS[selectedDay - 1]}</p>
            </div>
          </div>
          <div className="flex gap-5">
            {([
              ["Protein", dailyTotals.protein, "text-volt-300"],
              ["Carbs", dailyTotals.carbs, "text-sky-300"],
              ["Fats", dailyTotals.fats, "text-warn-300"],
            ] as const).map(([label, v, tone]) => (
              <div key={label} className="text-center">
                <p className={`font-display text-2xl font-bold ${tone}`}>{v}g</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-mist-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Targets Comparison */}
        {targets && (
          <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t border-night-700">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-mist-500">Target</p>
              <p className="font-display text-lg font-bold text-mist-300">{targets.calories} kcal</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-mist-500">Protein</p>
              <p className={`font-display text-lg font-bold ${dailyTotals.protein >= targets.protein ? "text-volt-300" : "text-mist-400"}`}>
                {dailyTotals.protein} / {targets.protein}g
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-mist-500">Carbs</p>
              <p className={`font-display text-lg font-bold ${dailyTotals.carbs >= targets.carbs ? "text-sky-300" : "text-mist-400"}`}>
                {dailyTotals.carbs} / {targets.carbs}g
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-mist-500">Fat</p>
              <p className={`font-display text-lg font-bold ${dailyTotals.fats >= targets.fats ? "text-warn-300" : "text-mist-400"}`}>
                {dailyTotals.fats} / {targets.fats}g
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Meals List */}
      <div className="rise mt-4" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold uppercase tracking-wider text-mist-300">{WEEK_DAYS[selectedDay - 1]}</h2>
          <div className="flex gap-2">
            <button
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-night-600 bg-night-800 px-3 py-1.5 text-xs font-bold text-mist-300 transition hover:border-volt-400 hover:text-volt-300"
              onClick={() => setCopyModalOpen(true)}
            >
              <IconCopy className="h-3.5 w-3.5" />
              Copy Day
            </button>
            <button
              className={`${btnPrimary} inline-flex items-center gap-1.5`}
              onClick={handleAddMeal}
            >
              <IconPlus className="h-4 w-4" />
              Add Meal
            </button>
          </div>
        </div>

        {sortedMeals.length === 0 ? (
          <SectionCard
            title=""
            icon={<IconUtensils className="h-5 w-5" />}
            bodyCls="p-6"
          >
            <div className="text-center py-8">
              <IconUtensils className="mx-auto h-12 w-12 text-night-500" />
              <p className="mt-3 text-sm font-semibold text-mist-400">No meals planned for {WEEK_DAYS[selectedDay - 1]}</p>
              <p className="mt-1 text-xs text-mist-500">Start building this day's nutrition plan</p>
              <button className={`${btnPrimary} mt-4`} onClick={handleAddMeal}>
                <IconPlus className="h-4 w-4" />
                Add First Meal
              </button>
            </div>
          </SectionCard>
        ) : (
          <ul className="grid gap-3">
            {sortedMeals.map((meal) => (
              <li key={meal.id} className="group rounded-xl border border-night-700 bg-night-850 p-4 transition hover:border-night-600">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={MEAL_META[meal.type].chip}>{meal.type}</Badge>
                      {meal.time && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-mist-500">
                          <IconCalendar className="h-3 w-3" />
                          {meal.time}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-base font-semibold leading-snug text-mist-100">{meal.description}</p>
                    <div className="mt-2 flex items-center gap-4 flex-wrap">
                      <span className="font-display text-lg font-bold text-warn-300">{meal.calories} kcal</span>
                      <span className="text-sm font-bold text-volt-300">P {meal.protein}g</span>
                      <span className="text-sm font-bold text-sky-300">C {meal.carbs}g</span>
                      <span className="text-sm font-bold text-warn-300">F {meal.fats}g</span>
                    </div>
                    {meal.notes && (
                      <p className="mt-2 text-xs text-mist-500 italic">{meal.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 opacity-60 transition group-hover:opacity-100">
                    <button
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-mist-400 transition hover:bg-night-700 hover:text-mist-100"
                      title="Edit"
                      onClick={() => handleEditMeal(meal)}
                    >
                      <IconPencil className="h-4 w-4" />
                    </button>
                    <button
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-mist-400 transition hover:bg-danger-500/15 hover:text-danger-300"
                      title="Delete"
                      onClick={() => handleDeleteMeal(meal)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modals */}
      <MealFormModal
        open={modalOpen}
        clientId={client.id}
        initial={editing}
        defaultType={defaultType}
        defaultDay={editing?.day ?? selectedDay}
        onClose={() => setModalOpen(false)}
      />
      
      <CopyDayModal
        open={copyModalOpen}
        clientId={client.id}
        sourceDay={selectedDay}
        meals={allClientMeals}
        onClose={() => setCopyModalOpen(false)}
      />

      {/* Delete Confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-night-700 bg-night-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-mist-100">Remove meal?</h3>
            <p className="mt-2 text-sm text-mist-400">
              "{deleting.description}" will be removed from the plan.
            </p>
            <div className="mt-5 flex gap-2">
              <button className={`${btnPrimary} flex-1 bg-danger-500 hover:bg-danger-600`} onClick={confirmDelete}>
                Remove
              </button>
              <button className={btnSecondary} onClick={() => setDeleting(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
