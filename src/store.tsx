import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppState, Client, Session } from "./types";
import { AVATAR_COLORS, PLANS } from "./types";
import { addDays, daysLeft, fmtDate, todayISO, uid } from "./lib";
import { makeSeed } from "./seed";

const KEY = "coach-crm-v1";

export interface ToastItem {
  id: string;
  msg: string;
  kind: "ok" | "warn";
}

interface Store {
  state: AppState;
  toasts: ToastItem[];
  toast: (msg: string, kind?: "ok" | "warn") => void;
  dismissToast: (id: string) => void;
  addClient: (data: Omit<Client, "id" | "color">) => Client;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  logWeight: (clientId: string, kg: number, date: string) => void;
  updateNotes: (clientId: string, notes: string) => void;
  addSession: (data: Omit<Session, "id" | "done">) => void;
  toggleSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renew: (clientId: string, planName: string) => void;
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
    /* ignore corrupted storage */
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
      /* storage full — ignore */
    }
  }, [state]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (msg: string, kind: "ok" | "warn" = "ok") => {
      const id = uid();
      setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
      timers.current.push(window.setTimeout(() => dismissToast(id), 3600));
    },
    [dismissToast],
  );

  const addClient = useCallback((data: Omit<Client, "id" | "color">) => {
    const keys = Object.keys(AVATAR_COLORS);
    const client: Client = {
      ...data,
      id: uid(),
      color: keys[Math.floor(Math.random() * keys.length)],
    };
    setState((s) => ({ ...s, clients: [client, ...s.clients] }));
    toast(`تمت إضافة ${client.name} لعملائك`);
    return client;
  }, [toast]);

  const updateClient = useCallback((client: Client) => {
    setState((s) => ({
      ...s,
      clients: s.clients.map((x) => (x.id === client.id ? client : x)),
    }));
    toast(`تم حفظ بيانات ${client.name}`);
  }, [toast]);

  const deleteClient = useCallback((id: string) => {
    const name = state.clients.find((x) => x.id === id)?.name ?? "";
    setState((s) => ({
      clients: s.clients.filter((x) => x.id !== id),
      sessions: s.sessions.filter((x) => x.clientId !== id),
      payments: s.payments.filter((x) => x.clientId !== id),
    }));
    toast(`تم حذف ${name} نهائيًا`, "warn");
  }, [state.clients, toast]);

  const logWeight = useCallback((clientId: string, kg: number, date: string) => {
    setState((s) => ({
      ...s,
      clients: s.clients.map((x) =>
        x.id === clientId
          ? { ...x, weights: [...x.weights, { id: uid(), date, kg }].sort((a, b) => a.date.localeCompare(b.date)) }
          : x,
      ),
    }));
    toast(`تم تسجيل الوزن: ${kg} كجم`);
  }, [toast]);

  const updateNotes = useCallback((clientId: string, notes: string) => {
    setState((s) => ({
      ...s,
      clients: s.clients.map((x) => (x.id === clientId ? { ...x, notes } : x)),
    }));
  }, []);

  const addSession = useCallback((data: Omit<Session, "id" | "done">) => {
    setState((s) => ({
      ...s,
      sessions: [...s.sessions, { ...data, id: uid(), done: false }],
    }));
    const name = state.clients.find((x) => x.id === data.clientId)?.name ?? "العميل";
    toast(`تم حجز جلسة ${data.type} لـ${name} — ${fmtDate(data.date)}`);
  }, [state.clients, toast]);

  const toggleSession = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
    }));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
    toast("تم إلغاء الجلسة", "warn");
  }, [toast]);

  const renew = useCallback((clientId: string, planName: string) => {
    const plan = PLANS.find((x) => x.name === planName);
    const client = state.clients.find((x) => x.id === clientId);
    if (!plan || !client) return;
    const base = daysLeft(client.subEnd) > 0 ? client.subEnd : todayISO();
    const newEnd = addDays(base, plan.days);
    setState((s) => ({
      ...s,
      clients: s.clients.map((x) =>
        x.id === clientId ? { ...x, subEnd: newEnd, plan: plan.name, planPrice: plan.price } : x,
      ),
      payments: [...s.payments, { id: uid(), clientId, date: todayISO(), amount: plan.price, plan: plan.name }],
    }));
    toast(`تم تجديد اشتراك ${client.name} (${plan.name}) حتى ${fmtDate(newEnd)}`);
  }, [state.clients, toast]);

  const resetData = useCallback(() => {
    setState(makeSeed());
    toast("تمت إعادة البيانات التجريبية من جديد");
  }, [toast]);

  return (
    <Ctx.Provider
      value={{
        state,
        toasts,
        toast,
        dismissToast,
        addClient,
        updateClient,
        deleteClient,
        logWeight,
        updateNotes,
        addSession,
        toggleSession,
        deleteSession,
        renew,
        resetData,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
