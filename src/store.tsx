import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppState, CheckIn, Client, Exercise, Meal, PlanItem } from "./types";
import { fmtDate, todayISO, uid } from "./lib";
import { makeSeed } from "./seed";

const KEY = "forge-coaching-v1";

export interface ToastItem {
  id: string;
  msg: string;
  kind: "ok" | "warn";
}

interface Store {
  state: AppState;
  toasts: ToastItem[];
  toast: (msg: string, kind?: "ok" | "warn") => void;
  dismiss: (id: string) => void;

  addClient: (data: Omit<Client, "id">) => Client;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;

  addExercise: (data: Omit<Exercise, "id">) => void;
  updateExercise: (ex: Exercise) => void;
  deleteExercise: (id: string) => void;

  addPlanItem: (data: Omit<PlanItem, "id">) => void;
  updatePlanItem: (item: PlanItem) => void;
  deletePlanItem: (id: string) => void;

  addMeal: (data: Omit<Meal, "id">) => void;
  updateMeal: (meal: Meal) => void;
  deleteMeal: (id: string) => void;

  addCheckIn: (data: Omit<CheckIn, "id" | "ts">) => void;

  resetData: () => void;
}

const Ctx = createContext<Store>(null!);

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && Array.isArray(parsed.clients)) return parsed;
    }
  } catch {
    /* corrupted storage — fall through to seed */
  }
  return makeSeed();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      console.warn("Storage full — latest change kept in memory only.");
    }
  }, [state]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (msg: string, kind: "ok" | "warn" = "ok") => {
      const id = uid();
      setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
      timers.current.push(window.setTimeout(() => dismiss(id), 3800));
    },
    [dismiss],
  );

  /* ----- clients ----- */

  const addClient = useCallback(
    (data: Omit<Client, "id">) => {
      const client: Client = { ...data, id: uid() };
      setState((s) => ({ ...s, clients: [client, ...s.clients] }));
      toast(`${client.name} added to your roster`);
      return client;
    },
    [toast],
  );

  const updateClient = useCallback(
    (client: Client) => {
      setState((s) => ({ ...s, clients: s.clients.map((x) => (x.id === client.id ? client : x)) }));
      toast(`${client.name}'s profile updated`);
    },
    [toast],
  );

  const deleteClient = useCallback(
    (id: string) => {
      const name = state.clients.find((x) => x.id === id)?.name ?? "Client";
      setState((s) => ({
        ...s,
        clients: s.clients.filter((x) => x.id !== id),
        plans: s.plans.filter((x) => x.clientId !== id),
        checkIns: s.checkIns.filter((x) => x.clientId !== id),
        meals: s.meals.filter((x) => x.clientId !== id),
      }));
      toast(`${name} and all linked data removed`, "warn");
    },
    [state.clients, toast],
  );

  /* ----- exercises ----- */

  const addExercise = useCallback(
    (data: Omit<Exercise, "id">) => {
      setState((s) => ({ ...s, exercises: [{ ...data, id: uid() }, ...s.exercises] }));
      toast(`"${data.name}" added to the library`);
    },
    [toast],
  );

  const updateExercise = useCallback(
    (ex: Exercise) => {
      setState((s) => ({ ...s, exercises: s.exercises.map((x) => (x.id === ex.id ? ex : x)) }));
      toast(`"${ex.name}" updated`);
    },
    [toast],
  );

  const deleteExercise = useCallback(
    (id: string) => {
      const name = state.exercises.find((x) => x.id === id)?.name ?? "Exercise";
      setState((s) => ({
        ...s,
        exercises: s.exercises.filter((x) => x.id !== id),
        plans: s.plans.filter((x) => x.exerciseId !== id),
      }));
      toast(`"${name}" removed from the library`, "warn");
    },
    [state.exercises, toast],
  );

  /* ----- plans ----- */

  const addPlanItem = useCallback(
    (data: Omit<PlanItem, "id">) => {
      setState((s) => ({ ...s, plans: [...s.plans, { ...data, id: uid() }] }));
      toast(`Exercise added to Day ${data.day}`);
    },
    [toast],
  );

  const updatePlanItem = useCallback((item: PlanItem) => {
    setState((s) => ({ ...s, plans: s.plans.map((x) => (x.id === item.id ? item : x)) }));
  }, []);

  const deletePlanItem = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, plans: s.plans.filter((x) => x.id !== id) }));
      toast("Exercise removed from the plan", "warn");
    },
    [toast],
  );

  /* ----- meals ----- */

  const addMeal = useCallback(
    (data: Omit<Meal, "id">) => {
      setState((s) => ({ ...s, meals: [...s.meals, { ...data, id: uid() }] }));
      toast(`${data.type} added to the meal plan`);
    },
    [toast],
  );

  const updateMeal = useCallback((meal: Meal) => {
    setState((s) => ({ ...s, meals: s.meals.map((x) => (x.id === meal.id ? meal : x)) }));
  }, []);

  const deleteMeal = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, meals: s.meals.filter((x) => x.id !== id) }));
      toast("Meal removed", "warn");
    },
    [toast],
  );

  /* ----- check-ins ----- */

  const addCheckIn = useCallback(
    (data: Omit<CheckIn, "id" | "ts">) => {
      const clientName = state.clients.find((x) => x.id === data.clientId)?.name ?? "Check-in";
      setState((s) => ({
        ...s,
        checkIns: [...s.checkIns, { ...data, id: uid(), ts: Date.now() }],
      }));
      toast(`Check-in logged for ${clientName} — ${fmtDate(data.date)}`);
    },
    [state.clients, toast],
  );

  const resetData = useCallback(() => {
    setState(makeSeed());
    toast("Demo data restored");
  }, [toast]);

  return (
    <Ctx.Provider
      value={{
        state,
        toasts,
        toast,
        dismiss,
        addClient,
        updateClient,
        deleteClient,
        addExercise,
        updateExercise,
        deleteExercise,
        addPlanItem,
        updatePlanItem,
        deletePlanItem,
        addMeal,
        updateMeal,
        deleteMeal,
        addCheckIn,
        resetData,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
export const startToday = () => todayISO();
