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
import { addDays, diffDays, fmtDate, todayISO, uid } from "./lib";
import { makeSeed } from "./seed";
import type { ConnectionConfig, EntityOp, RemoteData, SyncInfo } from "./services/dataProvider";
import { errorMessage } from "./services/dataProvider";
import { googleSheetsProvider } from "./services/googleSheets";
import { clearToken, linkWithGoogle } from "./services/googleOAuth";
import { createSpreadsheet, spreadsheetIdFrom } from "./services/googleSheetsApi";
import {
  clearStoredConnection,
  loadStoredConnection,
  saveStoredConnection,
  type StoredConnection,
} from "./services/connection";

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
  deleteCheckIn: (id: string) => void;

  /* ---- subscriptions & payments ---- */
  addSubscription: (data: Omit<Subscription, "id" | "createdAt">) => Subscription;
  updateSubscription: (sub: Subscription) => void;
  /** Creates a NEW subscription record (history is never overwritten). */
  renewSubscription: (sub: Subscription) => Subscription;
  addPayment: (data: Omit<Payment, "id">) => Payment;
  updatePayment: (p: Payment) => void;
  deletePayment: (id: string) => void;

  /* ---- sessions ---- */
  addSession: (data: Omit<Session, "id">) => Session;
  updateSession: (s: Session) => void;
  deleteSession: (id: string) => void;
  setSessionStatus: (id: string, status: SessionStatus) => void;

  /* ---- coach notes / follow-ups / nutrition targets ---- */
  addCoachNote: (clientId: string, text: string) => void;
  updateCoachNote: (clientId: string, noteId: string, text: string) => void;
  deleteCoachNote: (clientId: string, noteId: string) => void;
  setFollowUpDays: (clientId: string, days: number) => void;
  markFollowUpDone: (clientId: string) => void;
  setNutritionTargets: (clientId: string, targets: NutritionTargets) => void;

  resetData: () => void;

  /* ---- Google Sheets connection & sync ---- */
  conn: ConnectionConfig | null;
  sync: SyncInfo;
  lastSync: string | null;
  /** OAuth "Link with Google" flow — consent, (optionally) create a sheet, init, load. */
  linkGoogle: (opts: {
    coachId: string;
    /** Optional override — the app ships with a built-in OAuth client id. */
    clientId?: string;
    /** When true a brand-new spreadsheet is created; otherwise `sheetUrl` is used. */
    createNew?: boolean;
    sheetUrl?: string;
  }) => Promise<ConnectionConfig>;
  disconnect: () => void;
  testConnection: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const Ctx = createContext<Store>(null!);

function load(): AppState {
  let base: Partial<AppState> | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      if (parsed && Array.isArray(parsed.clients)) base = parsed;
    }
  } catch {
    /* corrupted storage — fall through to seed */
  }
  const src = base ?? makeSeed();
  // Migration-safe: older caches may lack the newer collections.
  return {
    clients: src.clients ?? [],
    exercises: src.exercises ?? [],
    plans: src.plans ?? [],
    checkIns: src.checkIns ?? [],
    meals: src.meals ?? [],
    subscriptions: src.subscriptions ?? [],
    payments: src.payments ?? [],
    sessions: src.sessions ?? [],
  };
}

/** Remote wins for matching ids; local-only records (unsynced) are preserved. */
function mergeCollection<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const r of remote) byId.set(r.id, r);
  const localOnly: T[] = [];
  for (const l of local) if (!byId.has(l.id)) localOnly.push(l);
  return [...byId.values(), ...localOnly];
}

const RETRY_MS = 12000;
const DEBOUNCE_MS = 500;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);

  /* ---- connection + sync state ---- */
  const [stored, setStored] = useState<StoredConnection>(() => loadStoredConnection());
  const [sync, setSync] = useState<SyncInfo>(() => ({
    status: loadStoredConnection().config ? "idle" : "local",
    pending: 0,
    lastSync: loadStoredConnection().lastSync,
    error: null,
  }));

  const connRef = useRef<ConnectionConfig | null>(stored.config);
  const queueRef = useRef<EntityOp[]>([]);
  const flushingRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const retryRef = useRef<number | null>(null);
  const bootedRef = useRef(false);
  /** Latest state, readable inside async flows without stale closures. */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /* ---- local cache (unchanged behaviour — always on) ---- */
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

  /* ================= sync engine ================= */

  const persistConn = useCallback((config: ConnectionConfig | null, lastSync: string | null) => {
    const next: StoredConnection = { config, lastSync };
    if (config) saveStoredConnection(next);
    else clearStoredConnection();
    setStored(next);
    connRef.current = config;
  }, []);

  const markSync = useCallback((patch: Partial<SyncInfo>) => {
    setSync((s) => ({ ...s, ...patch, pending: queueRef.current.length }));
  }, []);

  const scheduleFlush = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void flushQueueRef.current(), DEBOUNCE_MS);
  }, []);

  const flushQueue = useCallback(async () => {
    const cfg = connRef.current;
    if (!cfg || flushingRef.current) return;
    if (queueRef.current.length === 0) {
      markSync({ status: "idle", error: null });
      return;
    }
    flushingRef.current = true;
    markSync({ status: "syncing" });
    const batch = [...queueRef.current];
    try {
      await googleSheetsProvider.apply(cfg, batch);
      // Drop only the operations that were part of this successful batch.
      queueRef.current = queueRef.current.filter((op) => !batch.includes(op));
      const nowIso = new Date().toISOString();
      persistConn(cfg, nowIso);
      markSync({ status: queueRef.current.length ? "syncing" : "idle", error: null, lastSync: nowIso });
      if (queueRef.current.length) scheduleFlush();
    } catch (e) {
      markSync({
        status: "error",
        error: `Unable to save changes to Google Sheets. ${errorMessage(e)}`,
      });
    } finally {
      flushingRef.current = false;
    }
  }, [markSync, persistConn, scheduleFlush]);

  // forward ref so scheduleFlush can call the latest flushQueue
  const flushQueueRef = useRef(flushQueue);
  useEffect(() => {
    flushQueueRef.current = flushQueue;
  }, [flushQueue]);

  // background retry while there are pending changes
  useEffect(() => {
    retryRef.current = window.setInterval(() => {
      if (connRef.current && queueRef.current.length > 0 && !flushingRef.current) {
        void flushQueueRef.current();
      }
    }, RETRY_MS);
    return () => {
      if (retryRef.current) window.clearInterval(retryRef.current);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const enqueue = useCallback(
    (op: EntityOp) => {
      if (!connRef.current) return; // local-only mode — localStorage cache already saved
      queueRef.current.push(op);
      markSync({ status: "syncing" });
      scheduleFlush();
    },
    [markSync, scheduleFlush],
  );

  const mergeRemote = useCallback((remote: RemoteData) => {
    setState((s) => ({
      clients: mergeCollection(s.clients, remote.clients),
      exercises: mergeCollection(s.exercises, remote.exercises),
      plans: mergeCollection(s.plans, remote.plans),
      checkIns: mergeCollection(s.checkIns, remote.checkIns),
      meals: mergeCollection(s.meals, remote.meals),
      subscriptions: mergeCollection(s.subscriptions, remote.subscriptions),
      payments: mergeCollection(s.payments, remote.payments),
      sessions: mergeCollection(s.sessions, remote.sessions),
    }));
  }, []);

  /* ---- initial load: if a connection exists, the sheet is the source of truth ---- */
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const cfg = connRef.current;
    if (!cfg) return;
    (async () => {
      try {
        markSync({ status: "syncing" });
        const remote = await googleSheetsProvider.load(cfg);
        mergeRemote(remote);
        const nowIso = new Date().toISOString();
        persistConn(cfg, nowIso);
        markSync({ status: "idle", error: null, lastSync: nowIso });
      } catch (e) {
        markSync({
          status: "error",
          error: `Couldn't reach Google Sheets — showing your local copy. ${errorMessage(e)}`,
        });
      }
    })();
  }, [markSync, mergeRemote, persistConn]);

  /* ---- public connection actions ---- */

  const linkGoogle = useCallback(
    async (opts: { coachId: string; clientId?: string; createNew?: boolean; sheetUrl?: string }) => {
      markSync({ status: "syncing", error: null });

      // 1. Explicit OAuth consent — the "Link with Google" moment.
      await linkWithGoogle(opts.clientId);

      // 2. Pick (or create) the spreadsheet that becomes the database.
      let spreadsheetId: string;
      let sheetUrl: string;
      if (opts.createNew) {
        const created = await createSpreadsheet(opts.clientId, "FORGE — Gym Database");
        spreadsheetId = created.spreadsheetId;
        sheetUrl = created.spreadsheetUrl;
      } else {
        sheetUrl = (opts.sheetUrl ?? "").trim();
        const id = spreadsheetIdFrom(sheetUrl);
        if (!id) throw new Error("That doesn't look like a valid Google Sheet URL.");
        spreadsheetId = id;
      }

      const cfg: ConnectionConfig = {
        clientId: opts.clientId,
        coachId: opts.coachId,
        spreadsheetId,
        sheetUrl: sheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      };

      // 3. Create any missing tabs/headers (existing data is never touched).
      await googleSheetsProvider.init(cfg);

      // 4. Load existing records and merge by unique id (no duplicates).
      const remote = await googleSheetsProvider.load(cfg);
      mergeRemote(remote);

      // 5. Push local-only records up so a fresh sheet gets populated.
      const remoteIds = new Set<string>([
        ...remote.clients,
        ...remote.exercises,
        ...remote.plans,
        ...remote.checkIns,
        ...remote.meals,
        ...remote.subscriptions,
        ...remote.payments,
        ...remote.sessions,
      ].map((r) => r.id));
      const s = stateRef.current;
      for (const c of s.clients) if (!remoteIds.has(c.id)) enqueue({ type: "upsert", entity: "client", record: c });
      for (const e of s.exercises) if (!remoteIds.has(e.id)) enqueue({ type: "upsert", entity: "exercise", record: e });
      for (const p of s.plans) if (!remoteIds.has(p.id)) enqueue({ type: "upsert", entity: "plan", record: p });
      for (const ci of s.checkIns) if (!remoteIds.has(ci.id)) enqueue({ type: "upsert", entity: "checkin", record: ci });
      for (const m of s.meals) if (!remoteIds.has(m.id)) enqueue({ type: "upsert", entity: "meal", record: m });
      for (const sb of s.subscriptions) if (!remoteIds.has(sb.id)) enqueue({ type: "upsert", entity: "subscription", record: sb });
      for (const py of s.payments) if (!remoteIds.has(py.id)) enqueue({ type: "upsert", entity: "payment", record: py });
      for (const ss of s.sessions) if (!remoteIds.has(ss.id)) enqueue({ type: "upsert", entity: "session", record: ss });

      const nowIso = new Date().toISOString();
      persistConn(cfg, nowIso);
      markSync({ status: queueRef.current.length ? "syncing" : "idle", error: null, lastSync: nowIso });
      toast("Linked with Google — your data now lives in the sheet");
      return cfg;
    },
    [enqueue, markSync, mergeRemote, persistConn, toast],
  );

  const disconnect = useCallback(() => {
    queueRef.current = [];
    clearToken();
    persistConn(null, null);
    markSync({ status: "local", error: null, lastSync: null });
    toast("Unlinked — your data stays saved on this device", "warn");
  }, [markSync, persistConn, toast]);

  const testConnection = useCallback(async () => {
    const target = connRef.current;
    if (!target) throw new Error("No Google account linked yet");
    await googleSheetsProvider.ping(target);
  }, []);

  const syncNow = useCallback(async () => {
    const cfg = connRef.current;
    if (!cfg) {
      toast("Connect Google Sheets first", "warn");
      return;
    }
    try {
      await flushQueueRef.current();
      markSync({ status: "syncing" });
      const remote = await googleSheetsProvider.load(cfg);
      mergeRemote(remote);
      const nowIso = new Date().toISOString();
      persistConn(cfg, nowIso);
      markSync({ status: "idle", error: null, lastSync: nowIso });
      toast("Synced with Google Sheets");
    } catch (e) {
      markSync({ status: "error", error: errorMessage(e) });
      toast(errorMessage(e), "warn");
    }
  }, [markSync, mergeRemote, persistConn, toast]);

  /* ================= entity mutations (unchanged signatures) ================= */

  const addClient = useCallback(
    (data: Omit<Client, "id">) => {
      const client: Client = { ...data, id: uid() };
      setState((s) => ({ ...s, clients: [client, ...s.clients] }));
      enqueue({ type: "upsert", entity: "client", record: client });
      toast(`${client.name} added to your roster`);
      return client;
    },
    [enqueue, toast],
  );

  const updateClient = useCallback(
    (client: Client) => {
      setState((s) => ({ ...s, clients: s.clients.map((x) => (x.id === client.id ? client : x)) }));
      enqueue({ type: "upsert", entity: "client", record: client });
      toast(`${client.name}'s profile updated`);
    },
    [enqueue, toast],
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
        subscriptions: s.subscriptions.filter((x) => x.clientId !== id),
        payments: s.payments.filter((x) => x.clientId !== id),
        sessions: s.sessions.filter((x) => x.clientId !== id),
      }));
      enqueue({ type: "remove", entity: "client", id });
      enqueue({ type: "removeWhere", entity: "plan", field: "clientId", value: id });
      enqueue({ type: "removeWhere", entity: "checkin", field: "clientId", value: id });
      enqueue({ type: "removeWhere", entity: "meal", field: "clientId", value: id });
      enqueue({ type: "removeWhere", entity: "subscription", field: "clientId", value: id });
      enqueue({ type: "removeWhere", entity: "payment", field: "clientId", value: id });
      enqueue({ type: "removeWhere", entity: "session", field: "clientId", value: id });
      toast(`${name} and all linked data removed`, "warn");
    },
    [enqueue, state.clients, toast],
  );

  const addExercise = useCallback(
    (data: Omit<Exercise, "id">) => {
      const ex: Exercise = { ...data, id: uid() };
      setState((s) => ({ ...s, exercises: [ex, ...s.exercises] }));
      enqueue({ type: "upsert", entity: "exercise", record: ex });
      toast(`"${data.name}" added to the library`);
    },
    [enqueue, toast],
  );

  const updateExercise = useCallback(
    (ex: Exercise) => {
      setState((s) => ({ ...s, exercises: s.exercises.map((x) => (x.id === ex.id ? ex : x)) }));
      enqueue({ type: "upsert", entity: "exercise", record: ex });
      toast(`"${ex.name}" updated`);
    },
    [enqueue, toast],
  );

  const deleteExercise = useCallback(
    (id: string) => {
      const name = state.exercises.find((x) => x.id === id)?.name ?? "Exercise";
      setState((s) => ({
        ...s,
        exercises: s.exercises.filter((x) => x.id !== id),
        plans: s.plans.filter((x) => x.exerciseId !== id),
      }));
      enqueue({ type: "remove", entity: "exercise", id });
      enqueue({ type: "removeWhere", entity: "plan", field: "exerciseId", value: id });
      toast(`"${name}" removed from the library`, "warn");
    },
    [enqueue, state.exercises, toast],
  );

  const addPlanItem = useCallback(
    (data: Omit<PlanItem, "id">) => {
      const item: PlanItem = { ...data, id: uid() };
      setState((s) => ({ ...s, plans: [...s.plans, item] }));
      enqueue({ type: "upsert", entity: "plan", record: item });
      toast(`Exercise added to Day ${data.day}`);
    },
    [enqueue, toast],
  );

  const updatePlanItem = useCallback(
    (item: PlanItem) => {
      setState((s) => ({ ...s, plans: s.plans.map((x) => (x.id === item.id ? item : x)) }));
      enqueue({ type: "upsert", entity: "plan", record: item });
    },
    [enqueue],
  );

  const deletePlanItem = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, plans: s.plans.filter((x) => x.id !== id) }));
      enqueue({ type: "remove", entity: "plan", id });
      toast("Exercise removed from the plan", "warn");
    },
    [enqueue, toast],
  );

  const addMeal = useCallback(
    (data: Omit<Meal, "id">) => {
      const meal: Meal = { ...data, id: uid() };
      setState((s) => ({ ...s, meals: [...s.meals, meal] }));
      enqueue({ type: "upsert", entity: "meal", record: meal });
      toast(`${data.type} added to the meal plan`);
    },
    [enqueue, toast],
  );

  const updateMeal = useCallback(
    (meal: Meal) => {
      setState((s) => ({ ...s, meals: s.meals.map((x) => (x.id === meal.id ? meal : x)) }));
      enqueue({ type: "upsert", entity: "meal", record: meal });
    },
    [enqueue],
  );

  const deleteMeal = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, meals: s.meals.filter((x) => x.id !== id) }));
      enqueue({ type: "remove", entity: "meal", id });
      toast("Meal removed", "warn");
    },
    [enqueue, toast],
  );

  const addCheckIn = useCallback(
    (data: Omit<CheckIn, "id" | "ts">) => {
      const clientName = state.clients.find((x) => x.id === data.clientId)?.name ?? "Check-in";
      const checkIn: CheckIn = { ...data, id: uid(), ts: Date.now() };
      setState((s) => ({ ...s, checkIns: [...s.checkIns, checkIn] }));
      enqueue({ type: "upsert", entity: "checkin", record: checkIn });
      toast(`Check-in logged for ${clientName} — ${fmtDate(data.date)}`);
    },
    [enqueue, state.clients, toast],
  );

  /* ================= subscriptions & payments ================= */

  const addSubscription = useCallback(
    (data: Omit<Subscription, "id" | "createdAt">): Subscription => {
      const sub: Subscription = { ...data, id: uid(), createdAt: Date.now() };
      setState((s) => ({ ...s, subscriptions: [...s.subscriptions, sub] }));
      enqueue({ type: "upsert", entity: "subscription", record: sub });
      toast(`Subscription added — ${sub.planName} until ${fmtDate(sub.endDate)}`);
      return sub;
    },
    [enqueue, toast],
  );

  const updateSubscription = useCallback(
    (sub: Subscription) => {
      setState((s) => ({ ...s, subscriptions: s.subscriptions.map((x) => (x.id === sub.id ? sub : x)) }));
      enqueue({ type: "upsert", entity: "subscription", record: sub });
      toast("Subscription updated");
    },
    [enqueue, toast],
  );

  const renewSubscription = useCallback(
    (prev: Subscription): Subscription => {
      const today = todayISO();
      // New record starts the day after the current one ends (or today if already expired).
      const start = prev.endDate >= today ? addDays(prev.endDate, 1) : today;
      const length = Math.max(1, diffDays(prev.startDate, prev.endDate));
      const sub: Subscription = {
        id: uid(),
        clientId: prev.clientId,
        planName: prev.planName,
        startDate: start,
        endDate: addDays(start, length),
        price: prev.price,
        paymentStatus: "Pending",
        createdAt: Date.now(),
      };
      setState((s) => ({ ...s, subscriptions: [...s.subscriptions, sub] }));
      enqueue({ type: "upsert", entity: "subscription", record: sub });
      toast(`Renewed — new ${sub.planName} until ${fmtDate(sub.endDate)} (history kept)`);
      return sub;
    },
    [enqueue, toast],
  );

  const addPayment = useCallback(
    (data: Omit<Payment, "id">): Payment => {
      const p: Payment = { ...data, id: uid() };
      setState((s) => ({ ...s, payments: [...s.payments, p] }));
      enqueue({ type: "upsert", entity: "payment", record: p });
      toast(`Payment recorded — ${p.amount.toLocaleString("en-US")} (${p.method})`);
      return p;
    },
    [enqueue, toast],
  );

  const updatePayment = useCallback(
    (p: Payment) => {
      setState((s) => ({ ...s, payments: s.payments.map((x) => (x.id === p.id ? p : x)) }));
      enqueue({ type: "upsert", entity: "payment", record: p });
      toast("Payment updated");
    },
    [enqueue, toast],
  );

  const deletePayment = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, payments: s.payments.filter((x) => x.id !== id) }));
      enqueue({ type: "remove", entity: "payment", id });
      toast("Payment deleted", "warn");
    },
    [enqueue, toast],
  );

  /* ================= sessions ================= */

  const addSession = useCallback(
    (data: Omit<Session, "id">): Session => {
      const session: Session = { ...data, id: uid() };
      setState((s) => ({ ...s, sessions: [...s.sessions, session] }));
      enqueue({ type: "upsert", entity: "session", record: session });
      toast(`Session booked — ${fmtDate(session.date)} at ${session.time}`);
      return session;
    },
    [enqueue, toast],
  );

  const updateSession = useCallback(
    (session: Session) => {
      setState((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === session.id ? session : x)) }));
      enqueue({ type: "upsert", entity: "session", record: session });
      toast("Session updated");
    },
    [enqueue, toast],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
      enqueue({ type: "remove", entity: "session", id });
      toast("Session deleted", "warn");
    },
    [enqueue, toast],
  );

  const setSessionStatus = useCallback(
    (id: string, status: SessionStatus) => {
      setState((s) => ({
        ...s,
        sessions: s.sessions.map((x) => (x.id === id ? { ...x, status } : x)),
      }));
      const session = stateRef.current.sessions.find((x) => x.id === id);
      if (session) enqueue({ type: "upsert", entity: "session", record: { ...session, status } });
    },
    [enqueue],
  );

  /* ================= check-ins (delete) ================= */

  const deleteCheckIn = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, checkIns: s.checkIns.filter((x) => x.id !== id) }));
      enqueue({ type: "remove", entity: "checkin", id });
      toast("Check-in deleted", "warn");
    },
    [enqueue, toast],
  );

  /* ================= coach notes / follow-ups / nutrition ================= */

  const patchClient = useCallback(
    (clientId: string, patch: Partial<Client>, msg?: string) => {
      let next: Client | undefined;
      setState((s) => ({
        ...s,
        clients: s.clients.map((x) => {
          if (x.id !== clientId) return x;
          next = { ...x, ...patch };
          return next;
        }),
      }));
      // enqueue needs the merged record — read it after the state patch is queued
      const merged = { ...stateRef.current.clients.find((x) => x.id === clientId)!, ...patch };
      enqueue({ type: "upsert", entity: "client", record: merged });
      if (msg) toast(msg);
      void next;
    },
    [enqueue, toast],
  );

  const addCoachNote = useCallback(
    (clientId: string, text: string) => {
      const note: CoachNote = { id: uid(), date: todayISO(), text };
      const client = stateRef.current.clients.find((x) => x.id === clientId);
      if (!client) return;
      const merged: Client = { ...client, coachNotes: [...(client.coachNotes ?? []), note] };
      setState((s) => ({ ...s, clients: s.clients.map((x) => (x.id === clientId ? merged : x)) }));
      enqueue({ type: "upsert", entity: "client", record: merged });
      toast("Coach note added");
    },
    [enqueue, toast],
  );

  const updateCoachNote = useCallback(
    (clientId: string, noteId: string, text: string) => {
      const client = stateRef.current.clients.find((x) => x.id === clientId);
      if (!client) return;
      const merged: Client = {
        ...client,
        coachNotes: (client.coachNotes ?? []).map((n) => (n.id === noteId ? { ...n, text } : n)),
      };
      setState((s) => ({ ...s, clients: s.clients.map((x) => (x.id === clientId ? merged : x)) }));
      enqueue({ type: "upsert", entity: "client", record: merged });
      toast("Coach note updated");
    },
    [enqueue, toast],
  );

  const deleteCoachNote = useCallback(
    (clientId: string, noteId: string) => {
      const client = stateRef.current.clients.find((x) => x.id === clientId);
      if (!client) return;
      const merged: Client = {
        ...client,
        coachNotes: (client.coachNotes ?? []).filter((n) => n.id !== noteId),
      };
      setState((s) => ({ ...s, clients: s.clients.map((x) => (x.id === clientId ? merged : x)) }));
      enqueue({ type: "upsert", entity: "client", record: merged });
      toast("Coach note deleted", "warn");
    },
    [enqueue, toast],
  );

  const setFollowUpDays = useCallback(
    (clientId: string, days: number) => {
      patchClient(clientId, { followUpDays: Math.max(1, days) }, `Follow-up set to every ${Math.max(1, days)} day${days === 1 ? "" : "s"}`);
    },
    [patchClient],
  );

  const markFollowUpDone = useCallback(
    (clientId: string) => {
      patchClient(clientId, { lastFollowUp: todayISO() }, "Follow-up marked as done");
    },
    [patchClient],
  );

  const setNutritionTargets = useCallback(
    (clientId: string, targets: NutritionTargets) => {
      patchClient(clientId, { nutritionTargets: targets }, "Nutrition targets saved");
    },
    [patchClient],
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
        conn: stored.config,
        sync,
        lastSync: stored.lastSync,
        linkGoogle,
        disconnect,
        testConnection,
        syncNow,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
export const startToday = () => todayISO();
