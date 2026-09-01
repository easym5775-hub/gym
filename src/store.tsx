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

  resetData: () => void;

  /* ---- Google Sheets connection & sync ---- */
  conn: ConnectionConfig | null;
  sync: SyncInfo;
  lastSync: string | null;
  /** OAuth "Link with Google" flow — consent, (optionally) create a sheet, init, load. */
  linkGoogle: (opts: {
    clientId: string;
    coachId: string;
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
    async (opts: { clientId: string; coachId: string; createNew?: boolean; sheetUrl?: string }) => {
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
      ].map((r) => r.id));
      const s = stateRef.current;
      for (const c of s.clients) if (!remoteIds.has(c.id)) enqueue({ type: "upsert", entity: "client", record: c });
      for (const e of s.exercises) if (!remoteIds.has(e.id)) enqueue({ type: "upsert", entity: "exercise", record: e });
      for (const p of s.plans) if (!remoteIds.has(p.id)) enqueue({ type: "upsert", entity: "plan", record: p });
      for (const ci of s.checkIns) if (!remoteIds.has(ci.id)) enqueue({ type: "upsert", entity: "checkin", record: ci });
      for (const m of s.meals) if (!remoteIds.has(m.id)) enqueue({ type: "upsert", entity: "meal", record: m });

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
      }));
      enqueue({ type: "remove", entity: "client", id });
      enqueue({ type: "removeWhere", entity: "plan", field: "clientId", value: id });
      enqueue({ type: "removeWhere", entity: "checkin", field: "clientId", value: id });
      enqueue({ type: "removeWhere", entity: "meal", field: "clientId", value: id });
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
