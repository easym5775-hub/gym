/* ================================================================
   FORGE — app store (React Context).

   Holds the current AppState + session role, exposes CRUD action
   creators. Mutations update local state optimistically and persist to
   the active backend (Supabase or demo); on failure the store resyncs
   from the backend so the UI never shows an unsaved change as truth.
   ================================================================ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppState,
  CheckIn,
  Client,
  CoachNote,
  Exercise,
  Meal,
  NutritionTargets,
  Payment,
  PlanItem,
  Session,
  SessionStatus,
  Subscription,
} from "./types";
import { errorMessage, todayISO, uid, uuid } from "./lib";
import {
  backend,
  checkInToRow,
  clientToRow,
  exerciseToRow,
  mealToRow,
  paymentToRow,
  planToRow,
  sessionToRow,
  subscriptionToRow,
  type NewClientInput,
  type RoleInfo,
} from "./services/backend";
import { getSessionUserId, onAuthChange, resolveRole } from "./services/auth";
import { isDemoMode } from "./services/supabase";

export type Phase = "booting" | "signed-out" | "loading" | "ready";

export interface ToastItem {
  id: string;
  msg: string;
  kind: "ok" | "warn";
}

interface Store {
  phase: Phase;
  me: RoleInfo | null;
  isDemo: boolean;
  state: AppState;

  toasts: ToastItem[];
  toast: (msg: string, kind?: "ok" | "warn") => void;
  dismiss: (id: string) => void;

  reload: () => Promise<void>;

  /* clients (account lifecycle goes through the edge function) */
  createClient: (input: NewClientInput) => Promise<Client>;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  resetClientPassword: (clientId: string, newPassword: string) => Promise<void>;

  addExercise: (input: Omit<Exercise, "id" | "coachId">) => void;
  updateExercise: (ex: Exercise) => void;
  deleteExercise: (id: string) => void;

  addPlanItem: (input: Omit<PlanItem, "id" | "coachId">) => void;
  updatePlanItem: (item: PlanItem) => void;
  deletePlanItem: (id: string) => void;

  addMeal: (input: Omit<Meal, "id" | "coachId">) => void;
  updateMeal: (meal: Meal) => void;
  deleteMeal: (id: string) => void;

  addCheckIn: (input: Omit<CheckIn, "id" | "ts" | "coachId">) => void;
  deleteCheckIn: (id: string) => void;

  addSubscription: (input: Omit<Subscription, "id" | "createdAt" | "coachId">) => Subscription;
  updateSubscription: (sub: Subscription) => void;
  renewSubscription: (sub: Subscription) => Subscription;
  addPayment: (input: Omit<Payment, "id" | "coachId">) => Payment;
  updatePayment: (p: Payment) => void;
  deletePayment: (id: string) => void;

  addSession: (input: Omit<Session, "id" | "coachId">) => Session;
  updateSession: (s: Session) => void;
  deleteSession: (id: string) => void;
  setSessionStatus: (id: string, status: SessionStatus) => void;

  addCoachNote: (clientId: string, text: string) => void;
  updateCoachNote: (clientId: string, noteId: string, text: string) => void;
  deleteCoachNote: (clientId: string, noteId: string) => void;
  setFollowUpDays: (clientId: string, days: number) => void;
  markFollowUpDone: (clientId: string) => void;
  setNutritionTargets: (clientId: string, targets: NutritionTargets) => void;

  resetData: () => Promise<void>;
}

const Ctx = createContext<Store>(null!);

const EMPTY: AppState = {
  clients: [],
  exercises: [],
  plans: [],
  checkIns: [],
  meals: [],
  subscriptions: [],
  payments: [],
  sessions: [],
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [phase, setPhase] = useState<Phase>("booting");
  const [me, setMe] = useState<RoleInfo | null>(null);

  const stateRef = useRef(state);
  const meRef = useRef(me);
  const phaseRef = useRef(phase);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    meRef.current = me;
  }, [me]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  /* ---------------- toasts ---------------- */

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (msg: string, kind: "ok" | "warn" = "ok") => {
      const id = uid();
      setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
      timersRef.current.push(window.setTimeout(() => dismiss(id), 3400));
    },
    [dismiss],
  );

  /* ---------------- load / auth bootstrap ---------------- */

  const reload = useCallback(async () => {
    try {
      setState(await backend.load());
    } catch (e) {
      toast(`Couldn't load data — ${errorMessage(e)}`, "warn");
    }
  }, [toast]);

  const bootSession = useCallback(
    async (userId: string | null) => {
      if (!userId) {
        setMe(null);
        setState(EMPTY);
        setPhase("signed-out");
        return;
      }
      setPhase("loading");
      try {
        const role = await resolveRole(userId);
        if (!role) {
          setMe(null);
          setState(EMPTY);
          setPhase("signed-out");
          toast("That account has no FORGE profile.", "warn");
          return;
        }
        setMe(role);
        setState(await backend.load());
        setPhase("ready");
      } catch (e) {
        setMe(null);
        setState(EMPTY);
        setPhase("signed-out");
        toast(`Couldn't load your data. ${errorMessage(e)}`, "warn");
      }
    },
    [toast],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getSessionUserId();
      if (!cancelled) await bootSession(userId);
    })();
    const off = onAuthChange((userId) => {
      if (!cancelled) void bootSession(userId);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [bootSession]);

  /* ---------------- mutation core ---------------- */

  const coachId = () => meRef.current?.coachId ?? "";

  /**
   * Optimistically apply `recipe`, then persist. On failure resync from the
   * backend so the UI reflects what was actually saved, and warn the user.
   */
  const mutate = useCallback(
    (recipe: (s: AppState) => AppState, persist: () => Promise<unknown>, okMsg?: string) => {
      setState(recipe);
      persist()
        .then(() => {
          if (okMsg) toast(okMsg);
        })
        .catch((e) => {
          toast(`Couldn't save — ${errorMessage(e)}`, "warn");
          void reload();
        });
    },
    [toast, reload],
  );

  /* ---------------- clients ---------------- */

  const createClient = useCallback(
    async (input: NewClientInput): Promise<Client> => {
      const client = await backend.createClientAccount(input);
      setState((s) => ({ ...s, clients: [client, ...s.clients] }));
      toast(`${client.name} added — their login works right away`);
      return client;
    },
    [toast],
  );

  const updateClient = useCallback(
    (client: Client) => {
      mutate(
        (s) => ({ ...s, clients: s.clients.map((x) => (x.id === client.id ? client : x)) }),
        () => backend.update("clients", client.id, clientToRow(client)),
        "Client updated",
      );
    },
    [mutate],
  );

  const deleteClient = useCallback(
    (id: string) => {
      const name = stateRef.current.clients.find((x) => x.id === id)?.name ?? "Client";
      mutate(
        (s) => ({
          ...s,
          clients: s.clients.filter((x) => x.id !== id),
          plans: s.plans.filter((x) => x.clientId !== id),
          checkIns: s.checkIns.filter((x) => x.clientId !== id),
          meals: s.meals.filter((x) => x.clientId !== id),
          subscriptions: s.subscriptions.filter((x) => x.clientId !== id),
          payments: s.payments.filter((x) => x.clientId !== id),
          sessions: s.sessions.filter((x) => x.clientId !== id),
        }),
        () => backend.deleteClientAccount(id),
      );
      toast(`${name} deleted`, "warn");
    },
    [mutate, toast],
  );

  const resetClientPassword = useCallback(
    async (clientId: string, newPassword: string) => {
      await backend.resetClientPassword(clientId, newPassword);
      toast("Client password reset");
    },
    [toast],
  );

  /* ---------------- exercises ---------------- */

  const addExercise = useCallback(
    (input: Omit<Exercise, "id" | "coachId">) => {
      const ex: Exercise = { ...input, id: uuid(), coachId: coachId() };
      mutate(
        (s) => ({ ...s, exercises: [ex, ...s.exercises] }),
        () => backend.insert("exercises", exerciseToRow(ex)),
        `${ex.name} added to library`,
      );
    },
    [mutate],
  );

  const updateExercise = useCallback(
    (ex: Exercise) => {
      mutate(
        (s) => ({ ...s, exercises: s.exercises.map((x) => (x.id === ex.id ? ex : x)) }),
        () => backend.update("exercises", ex.id, exerciseToRow(ex)),
        "Exercise updated",
      );
    },
    [mutate],
  );

  const deleteExercise = useCallback(
    (id: string) => {
      const name = stateRef.current.exercises.find((x) => x.id === id)?.name ?? "Exercise";
      mutate(
        (s) => ({
          ...s,
          exercises: s.exercises.filter((x) => x.id !== id),
          plans: s.plans.filter((x) => x.exerciseId !== id),
        }),
        () => backend.remove("exercises", id),
      );
      toast(`${name} removed`, "warn");
    },
    [mutate, toast],
  );

  /* ---------------- plan items ---------------- */

  const addPlanItem = useCallback(
    (input: Omit<PlanItem, "id" | "coachId">) => {
      const item: PlanItem = { ...input, id: uuid(), coachId: coachId() };
      mutate(
        (s) => ({ ...s, plans: [...s.plans, item] }),
        () => backend.insert("plan_items", planToRow(item)),
        "Exercise added to plan",
      );
    },
    [mutate],
  );

  const updatePlanItem = useCallback(
    (item: PlanItem) => {
      mutate(
        (s) => ({ ...s, plans: s.plans.map((x) => (x.id === item.id ? item : x)) }),
        () => backend.update("plan_items", item.id, planToRow(item)),
        "Plan updated",
      );
    },
    [mutate],
  );

  const deletePlanItem = useCallback(
    (id: string) => {
      mutate(
        (s) => ({ ...s, plans: s.plans.filter((x) => x.id !== id) }),
        () => backend.remove("plan_items", id),
        "Removed from plan",
      );
    },
    [mutate],
  );

  /* ---------------- meals ---------------- */

  const addMeal = useCallback(
    (input: Omit<Meal, "id" | "coachId">) => {
      const meal: Meal = { ...input, id: uuid(), coachId: coachId() };
      mutate(
        (s) => ({ ...s, meals: [...s.meals, meal] }),
        () => backend.insert("meals", mealToRow(meal)),
        "Meal added",
      );
    },
    [mutate],
  );

  const updateMeal = useCallback(
    (meal: Meal) => {
      mutate(
        (s) => ({ ...s, meals: s.meals.map((x) => (x.id === meal.id ? meal : x)) }),
        () => backend.update("meals", meal.id, mealToRow(meal)),
        "Meal updated",
      );
    },
    [mutate],
  );

  const deleteMeal = useCallback(
    (id: string) => {
      mutate(
        (s) => ({ ...s, meals: s.meals.filter((x) => x.id !== id) }),
        () => backend.remove("meals", id),
        "Meal removed",
      );
    },
    [mutate],
  );

  /* ---------------- check-ins ---------------- */

  const addCheckIn = useCallback(
    (input: Omit<CheckIn, "id" | "ts" | "coachId">) => {
      const ci: CheckIn = { ...input, id: uuid(), ts: Date.now(), coachId: coachId() };
      mutate(
        (s) => ({ ...s, checkIns: [...s.checkIns, ci] }),
        () => backend.insert("check_ins", checkInToRow(ci)),
        "Check-in logged",
      );
    },
    [mutate],
  );

  const deleteCheckIn = useCallback(
    (id: string) => {
      mutate(
        (s) => ({ ...s, checkIns: s.checkIns.filter((x) => x.id !== id) }),
        () => backend.remove("check_ins", id),
        "Check-in deleted",
      );
    },
    [mutate],
  );

  /* ---------------- subscriptions & payments ---------------- */

  const addSubscription = useCallback(
    (input: Omit<Subscription, "id" | "createdAt" | "coachId">) => {
      const sub: Subscription = { ...input, id: uuid(), createdAt: Date.now(), coachId: coachId() };
      mutate(
        (s) => ({ ...s, subscriptions: [...s.subscriptions, sub] }),
        () => backend.insert("subscriptions", subscriptionToRow(sub)),
        "Subscription added",
      );
      return sub;
    },
    [mutate],
  );

  const updateSubscription = useCallback(
    (sub: Subscription) => {
      mutate(
        (s) => ({ ...s, subscriptions: s.subscriptions.map((x) => (x.id === sub.id ? sub : x)) }),
        () => backend.update("subscriptions", sub.id, subscriptionToRow(sub)),
        "Subscription updated",
      );
    },
    [mutate],
  );

  const renewSubscription = useCallback(
    (sub: Subscription) => {
      const today = todayISO();
      const start = sub.endDate >= today ? sub.endDate : today;
      const length = Math.max(
        1,
        Math.round((new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / 86_400_000),
      );
      const end = new Date(start);
      end.setDate(end.getDate() + length);
      const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
      const next: Subscription = {
        ...sub,
        id: uuid(),
        startDate: start,
        endDate: endIso,
        paymentStatus: "Pending",
        createdAt: Date.now(),
      };
      mutate(
        (s) => ({ ...s, subscriptions: [...s.subscriptions, next] }),
        () => backend.insert("subscriptions", subscriptionToRow(next)),
        "Subscription renewed — history preserved",
      );
      return next;
    },
    [mutate],
  );

  const addPayment = useCallback(
    (input: Omit<Payment, "id" | "coachId">) => {
      const p: Payment = { ...input, id: uuid(), coachId: coachId() };
      mutate(
        (s) => ({ ...s, payments: [...s.payments, p] }),
        () => backend.insert("payments", paymentToRow(p)),
        "Payment recorded",
      );
      return p;
    },
    [mutate],
  );

  const updatePayment = useCallback(
    (p: Payment) => {
      mutate(
        (s) => ({ ...s, payments: s.payments.map((x) => (x.id === p.id ? p : x)) }),
        () => backend.update("payments", p.id, paymentToRow(p)),
        "Payment updated",
      );
    },
    [mutate],
  );

  const deletePayment = useCallback(
    (id: string) => {
      mutate(
        (s) => ({ ...s, payments: s.payments.filter((x) => x.id !== id) }),
        () => backend.remove("payments", id),
        "Payment deleted",
      );
    },
    [mutate],
  );

  /* ---------------- sessions ---------------- */

  const addSession = useCallback(
    (input: Omit<Session, "id" | "coachId">) => {
      const se: Session = { ...input, id: uuid(), coachId: coachId() };
      mutate(
        (s) => ({ ...s, sessions: [...s.sessions, se] }),
        () => backend.insert("sessions", sessionToRow(se)),
        "Session scheduled",
      );
      return se;
    },
    [mutate],
  );

  const updateSession = useCallback(
    (se: Session) => {
      mutate(
        (s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === se.id ? se : x)) }),
        () => backend.update("sessions", se.id, sessionToRow(se)),
        "Session updated",
      );
    },
    [mutate],
  );

  const deleteSession = useCallback(
    (id: string) => {
      mutate(
        (s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }),
        () => backend.remove("sessions", id),
        "Session deleted",
      );
    },
    [mutate],
  );

  const setSessionStatus = useCallback(
    (id: string, status: SessionStatus) => {
      const cur = stateRef.current.sessions.find((x) => x.id === id);
      if (!cur) return;
      const updated: Session = { ...cur, status };
      mutate(
        (s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? updated : x)) }),
        () => backend.update("sessions", id, sessionToRow(updated)),
      );
    },
    [mutate],
  );

  /* ---------------- coach notes / follow-up / nutrition ---------------- */

  const patchClient = useCallback(
    (clientId: string, patch: Partial<Client>, okMsg?: string) => {
      const cur = stateRef.current.clients.find((c) => c.id === clientId);
      if (!cur) return;
      const updated: Client = { ...cur, ...patch };
      mutate(
        (s) => ({ ...s, clients: s.clients.map((x) => (x.id === clientId ? updated : x)) }),
        () => backend.update("clients", clientId, clientToRow(updated)),
        okMsg,
      );
    },
    [mutate],
  );

  const addCoachNote = useCallback(
    (clientId: string, text: string) => {
      const note: CoachNote = { id: uid(), text, createdAt: Date.now() };
      const cur = stateRef.current.clients.find((c) => c.id === clientId);
      patchClient(clientId, { coachNotes: [...(cur?.coachNotes ?? []), note] }, "Note added");
    },
    [patchClient],
  );

  const updateCoachNote = useCallback(
    (clientId: string, noteId: string, text: string) => {
      const cur = stateRef.current.clients.find((c) => c.id === clientId);
      patchClient(
        clientId,
        { coachNotes: (cur?.coachNotes ?? []).map((n) => (n.id === noteId ? { ...n, text } : n)) },
        "Note updated",
      );
    },
    [patchClient],
  );

  const deleteCoachNote = useCallback(
    (clientId: string, noteId: string) => {
      const cur = stateRef.current.clients.find((c) => c.id === clientId);
      patchClient(
        clientId,
        { coachNotes: (cur?.coachNotes ?? []).filter((n) => n.id !== noteId) },
        "Note deleted",
      );
    },
    [patchClient],
  );

  const setFollowUpDays = useCallback(
    (clientId: string, days: number) => {
      patchClient(clientId, { followUpDays: days }, "Follow-up frequency updated");
    },
    [patchClient],
  );

  const markFollowUpDone = useCallback(
    (clientId: string) => {
      patchClient(clientId, { lastFollowUp: todayISO() }, "Follow-up marked done");
    },
    [patchClient],
  );

  const setNutritionTargets = useCallback(
    (clientId: string, targets: NutritionTargets) => {
      patchClient(clientId, { nutritionTargets: targets }, "Nutrition targets saved");
    },
    [patchClient],
  );

  const resetData = useCallback(async () => {
    if (!isDemoMode) {
      toast("Reset is only available in demo mode.", "warn");
      return;
    }
    localStorage.removeItem("forge-demo-data-v1");
    await reload();
    toast("Demo data restored");
  }, [reload, toast]);

  return (
    <Ctx.Provider
      value={{
        phase,
        me,
        isDemo: isDemoMode,
        state,
        toasts,
        toast,
        dismiss,
        reload,
        createClient,
        updateClient,
        deleteClient,
        resetClientPassword,
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
        deleteCheckIn,
        addSubscription,
        updateSubscription,
        renewSubscription,
        addPayment,
        updatePayment,
        deletePayment,
        addSession,
        updateSession,
        deleteSession,
        setSessionStatus,
        addCoachNote,
        updateCoachNote,
        deleteCoachNote,
        setFollowUpDays,
        markFollowUpDone,
        setNutritionTargets,
        resetData,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
