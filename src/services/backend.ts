/* ================================================================
   FORGE — backend abstraction.

   The UI and the store never talk to Supabase directly; they talk to
   a `Backend`. Two implementations exist:

     • SupabaseBackend — live Postgres + Auth + Edge Functions (used
       when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set).
     • DemoBackend     — a clearly-labelled local store (localStorage)
       so the app is fully usable with zero credentials.

   Row mapping between Postgres snake_case and the app's camelCase
   types lives here.
   ================================================================ */

import { createClient } from "@supabase/supabase-js";
import type {
  AppNotification,
  AppState,
  CheckIn,
  Client,
  Exercise,
  Meal,
  Message,
  NewClientInput,
  Payment,
  PlanItem,
  Session,
  Subscription,
} from "../types";
import { todayISO, uuid } from "../lib";
import { rememberAwareStorage, setRemember } from "./remember";

/* ---------------- config ---------------- */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
export const isDemoMode = !isSupabaseConfigured;

const supabase = createClient(
  SUPABASE_URL || "https://not-configured.supabase.co",
  SUPABASE_ANON_KEY || "public-anon-key-not-set",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Honour "Remember me": localStorage vs sessionStorage.
      storage: rememberAwareStorage,
    },
  },
);

/* ---------------- role model ---------------- */

export interface RoleInfo {
  role: "coach" | "client";
  userId: string;
  coachId: string;
  name: string;
  email: string;
  client?: Client;
}

/* ---------------- row mappers (snake_case ⇄ camelCase) ---------------- */

type Row = Record<string, unknown>;

export const clientToRow = (c: Client): Row => ({
  username: c.username,
  name: c.name,
  email: c.email,
  phone: c.phone,
  gender: c.gender ?? null,
  age: c.age ?? null,
  goal: c.goal,
  status: c.status,
  start_date: c.startDate,
  notes: c.notes,
  photo: c.photo ?? null,
  follow_up_days: c.followUpDays ?? null,
  last_follow_up: c.lastFollowUp ?? null,
  coach_notes: JSON.stringify(c.coachNotes ?? []),
  nutrition_targets: c.nutritionTargets ? JSON.stringify(c.nutritionTargets) : null,
});

const jsonField = <T,>(v: unknown, fallback: T): T => {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "object") return v as T;
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return fallback;
  }
};

export const rowToClient = (r: Row): Client => ({
  id: String(r.id),
  coachId: String(r.coach_id ?? ""),
  username: String(r.username ?? ""),
  name: String(r.name ?? ""),
  email: String(r.email ?? ""),
  phone: String(r.phone ?? ""),
  gender: (r.gender as Client["gender"]) ?? undefined,
  age: r.age === null || r.age === undefined || r.age === "" ? undefined : Number(r.age),
  goal: (r.goal as Client["goal"]) ?? "General fitness",
  startDate: String(r.start_date ?? todayISO()),
  status: (r.status as Client["status"]) ?? "Active",
  notes: String(r.notes ?? ""),
  photo: r.photo ? String(r.photo) : undefined,
  followUpDays: r.follow_up_days === null || r.follow_up_days === undefined || r.follow_up_days === "" ? undefined : Number(r.follow_up_days),
  lastFollowUp: r.last_follow_up ? String(r.last_follow_up) : undefined,
  coachNotes: jsonField<Client["coachNotes"]>(r.coach_notes, []),
  nutritionTargets: r.nutrition_targets ? jsonField<Client["nutritionTargets"]>(r.nutrition_targets, undefined as unknown as Client["nutritionTargets"]) : undefined,
});

export const exerciseToRow = (e: Exercise): Row => ({
  name: e.name,
  category: e.category,
  description: e.description,
  video_url: e.videoUrl,
});

export const rowToExercise = (r: Row): Exercise => ({
  id: String(r.id),
  coachId: String(r.coach_id ?? ""),
  name: String(r.name ?? ""),
  category: (r.category as Exercise["category"]) ?? "Chest",
  description: String(r.description ?? ""),
  videoUrl: String(r.video_url ?? ""),
});

export const planToRow = (p: PlanItem): Row => ({
  client_id: p.clientId,
  day: p.day,
  exercise_id: p.exerciseId,
  sets: p.sets,
  reps: p.reps,
  rest: p.rest,
  notes: p.notes,
});

export const rowToPlan = (r: Row): PlanItem => ({
  id: String(r.id),
  coachId: String(r.coach_id ?? ""),
  clientId: String(r.client_id ?? ""),
  day: Number(r.day) || 1,
  exerciseId: String(r.exercise_id ?? ""),
  sets: Number(r.sets) || 1,
  reps: Number(r.reps) || 1,
  rest: Number(r.rest) || 0,
  notes: String(r.notes ?? ""),
});

export const checkInToRow = (c: CheckIn): Row => ({
  client_id: c.clientId,
  date: c.date,
  ts: c.ts,
  weight: c.weight,
  waist: c.waist ?? null,
  mood: c.mood,
  water: c.water,
  workout_done: c.workoutDone,
  notes: c.notes ?? null,
  photo: c.photo ?? null,
});

export const rowToCheckIn = (r: Row): CheckIn => ({
  id: String(r.id),
  coachId: String(r.coach_id ?? ""),
  clientId: String(r.client_id ?? ""),
  date: String(r.date ?? todayISO()),
  ts: Number(r.ts) || 0,
  weight: Number(r.weight) || 0,
  waist: r.waist === null || r.waist === undefined || r.waist === "" ? undefined : Number(r.waist),
  mood: Number(r.mood) || 3,
  water: Number(r.water) || 0,
  workoutDone: Boolean(r.workout_done),
  notes: r.notes ? String(r.notes) : undefined,
  photo: r.photo ? String(r.photo) : undefined,
});

export const mealToRow = (m: Meal): Row => ({
  client_id: m.clientId,
  type: m.type,
  description: m.description,
  calories: m.calories,
  protein: m.protein,
  carbs: m.carbs,
  fats: m.fats,
});

export const rowToMeal = (r: Row): Meal => ({
  id: String(r.id),
  coachId: String(r.coach_id ?? ""),
  clientId: String(r.client_id ?? ""),
  type: (r.type as Meal["type"]) ?? "Snack",
  description: String(r.description ?? ""),
  calories: Number(r.calories) || 0,
  protein: Number(r.protein) || 0,
  carbs: Number(r.carbs) || 0,
  fats: Number(r.fats) || 0,
});

export const subscriptionToRow = (s: Subscription): Row => ({
  client_id: s.clientId,
  plan_name: s.planName,
  start_date: s.startDate,
  end_date: s.endDate,
  price: s.price,
  payment_status: s.paymentStatus,
  created_at: s.createdAt,
});

export const rowToSubscription = (r: Row): Subscription => ({
  id: String(r.id),
  coachId: String(r.coach_id ?? ""),
  clientId: String(r.client_id ?? ""),
  planName: String(r.plan_name ?? ""),
  startDate: String(r.start_date ?? todayISO()),
  endDate: String(r.end_date ?? todayISO()),
  price: Number(r.price) || 0,
  paymentStatus: (r.payment_status as Subscription["paymentStatus"]) ?? "Pending",
  createdAt: Number(r.created_at) || 0,
});

export const paymentToRow = (p: Payment): Row => ({
  client_id: p.clientId,
  subscription_id: p.subscriptionId ?? null,
  amount: p.amount,
  date: p.date,
  method: p.method,
  status: p.status,
  notes: p.notes,
});

export const rowToPayment = (r: Row): Payment => ({
  id: String(r.id),
  coachId: String(r.coach_id ?? ""),
  clientId: String(r.client_id ?? ""),
  subscriptionId: r.subscription_id ? String(r.subscription_id) : undefined,
  amount: Number(r.amount) || 0,
  date: String(r.date ?? todayISO()),
  method: (r.method as Payment["method"]) ?? "Cash",
  status: (r.status as Payment["status"]) ?? "Paid",
  notes: String(r.notes ?? ""),
});

export const sessionToRow = (s: Session): Row => ({
  client_id: s.clientId,
  date: s.date,
  time: s.time,
  type: s.type,
  status: s.status,
  notes: s.notes,
});

export const rowToSession = (r: Row): Session => ({
  id: String(r.id),
  coachId: String(r.coach_id ?? ""),
  clientId: String(r.client_id ?? ""),
  date: String(r.date ?? todayISO()),
  time: String(r.time ?? "18:00"),
  type: String(r.type ?? "Training"),
  status: (r.status as Session["status"]) ?? "Scheduled",
  notes: String(r.notes ?? ""),
});

export const messageToRow = (m: Message): Row => ({
  client_id: m.clientId,
  sender_role: m.senderRole,
  text: m.text,
  ts: m.createdAt,
});

export const rowToMessage = (r: Row): Message => ({
  id: String(r.id),
  coachId: String(r.coach_id ?? ""),
  clientId: String(r.client_id ?? ""),
  senderRole: (r.sender_role as Message["senderRole"]) ?? "client",
  text: String(r.text ?? ""),
  createdAt: Number(r.ts) || 0,
});

export const notificationToRow = (n: AppNotification): Row => ({
  client_id: n.clientId,
  kind: n.kind,
  text: n.text,
  ts: n.createdAt,
  read: n.read,
});

export const rowToNotification = (r: Row): AppNotification => ({
  id: String(r.id),
  coachId: String(r.coach_id ?? ""),
  clientId: String(r.client_id ?? ""),
  kind: (r.kind as AppNotification["kind"]) ?? "reminder",
  text: String(r.text ?? ""),
  createdAt: Number(r.ts) || 0,
  read: Boolean(r.read),
});

/** Table name → entity converter (used by the demo merge path). */
export function rowFromTable(table: string, row: Row): unknown {
  switch (table) {
    case "clients":
      return rowToClient(row);
    case "exercises":
      return rowToExercise(row);
    case "plan_items":
      return rowToPlan(row);
    case "check_ins":
      return rowToCheckIn(row);
    case "meals":
      return rowToMeal(row);
    case "subscriptions":
      return rowToSubscription(row);
    case "payments":
      return rowToPayment(row);
    case "sessions":
      return rowToSession(row);
    case "messages":
      return rowToMessage(row);
    case "notifications":
      return rowToNotification(row);
    default:
      return row;
  }
}

/** Convert a typed entity back to a full snake_case row (for demo merges). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function entityToRow(table: string, entity: any): Row {
  switch (table) {
    case "clients":
      return { id: entity.id, coach_id: entity.coachId, ...clientToRow(entity) };
    case "exercises":
      return exerciseToRow(entity);
    case "plan_items":
      return planToRow(entity);
    case "check_ins":
      return checkInToRow(entity);
    case "meals":
      return mealToRow(entity);
    case "subscriptions":
      return subscriptionToRow(entity);
    case "payments":
      return paymentToRow(entity);
    case "sessions":
      return sessionToRow(entity);
    case "messages":
      return messageToRow(entity);
    case "notifications":
      return notificationToRow(entity);
    default:
      return entity;
  }
}

/** Strip columns the frontend must never write on update. */
function clean(row: Row): Row {
  const out: Row = { ...row };
  for (const k of ["id", "coach_id", "created_at", "updated_at", "login_email"]) delete out[k];
  return out;
}

/* ---------------- Backend interface ---------------- */

export interface Backend {
  readonly kind: "demo" | "supabase";
  getSessionUserId(): Promise<string | null>;
  onAuthChange(cb: (userId: string | null) => void): () => void;
  coachSignUp(email: string, password: string, name: string, remember: boolean): Promise<void>;
  coachSignIn(email: string, password: string, remember: boolean): Promise<void>;
  clientSignIn(username: string, password: string, remember: boolean): Promise<void>;
  signOut(): Promise<void>;
  resolveRole(userId: string): Promise<RoleInfo | null>;
  load(): Promise<AppState>;
  insert(table: string, row: Row): Promise<void>;
  update(table: string, id: string, row: Row): Promise<void>;
  remove(table: string, id: string): Promise<void>;
  createClientAccount(input: NewClientInput): Promise<Client>;
  resetClientPassword(clientId: string, newPassword: string): Promise<void>;
  deleteClientAccount(clientId: string): Promise<void>;
  updateCoachName(name: string): Promise<void>;
}

const TABLES = [
  "clients",
  "exercises",
  "plan_items",
  "check_ins",
  "meals",
  "subscriptions",
  "payments",
  "sessions",
  "messages",
  "notifications",
] as const;

/* ================================================================
   SupabaseBackend — live Postgres + Auth (RLS scopes everything).
   ================================================================ */

class SupabaseBackend implements Backend {
  readonly kind = "supabase" as const;

  async getSessionUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  }

  onAuthChange(cb: (userId: string | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(session?.user?.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }

  async coachSignUp(email: string, password: string, name: string, remember: boolean): Promise<void> {
    setRemember(remember);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    const userId = data.user?.id;
    if (userId) {
      const { error: insErr } = await supabase.from("coaches").upsert({ id: userId, name, email });
      if (insErr) throw new Error(insErr.message);
    }
  }

  async coachSignIn(email: string, password: string, remember: boolean): Promise<void> {
    setRemember(remember);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async clientSignIn(username: string, password: string, remember: boolean): Promise<void> {
    setRemember(remember);
    const { data, error } = await supabase.rpc("client_login_email", { p_username: username });
    if (error) throw new Error(error.message);
    const email = typeof data === "string" ? data : "";
    if (!email) throw new Error("Invalid username or password.");
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) throw new Error("Invalid username or password.");
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  async resolveRole(userId: string): Promise<RoleInfo | null> {
    const { data: coach } = await supabase.from("coaches").select("id, name, email").eq("id", userId).maybeSingle();
    if (coach) {
      return { role: "coach", userId, coachId: userId, name: String(coach.name ?? "Coach"), email: String(coach.email ?? "") };
    }
    const { data: clientRow } = await supabase.from("clients").select("*").eq("id", userId).maybeSingle();
    if (clientRow) {
      const client = rowToClient(clientRow as Row);
      return { role: "client", userId, coachId: client.coachId, name: client.name, email: client.email, client };
    }
    return null;
  }

  async load(): Promise<AppState> {
    const results = await Promise.all(TABLES.map((t) => supabase.from(t).select("*")));
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
    const [clients, exercises, plans, checkIns, meals, subscriptions, payments, sessions, messages, notifications] = results;
    return {
      clients: (clients.data as Row[]).map(rowToClient),
      exercises: (exercises.data as Row[]).map(rowToExercise),
      plans: (plans.data as Row[]).map(rowToPlan),
      checkIns: (checkIns.data as Row[]).map(rowToCheckIn),
      meals: (meals.data as Row[]).map(rowToMeal),
      subscriptions: (subscriptions.data as Row[]).map(rowToSubscription),
      payments: (payments.data as Row[]).map(rowToPayment),
      sessions: (sessions.data as Row[]).map(rowToSession),
      messages: (messages.data as Row[]).map(rowToMessage),
      notifications: (notifications.data as Row[]).map(rowToNotification),
    };
  }

  async insert(table: string, row: Row): Promise<void> {
    const { error } = await supabase.from(table).insert(row);
    if (error) throw new Error(error.message);
  }

  async update(table: string, id: string, row: Row): Promise<void> {
    const { error } = await supabase.from(table).update(clean(row)).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async remove(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async createClientAccount(input: NewClientInput): Promise<Client> {
    const { data, error } = await supabase.functions.invoke("create-client-account", {
      body: { action: "create", ...input },
    });
    if (error) throw new Error(error.message);
    const body = data as { ok?: boolean; client?: Row; error?: string };
    if (!body?.ok || !body.client) throw new Error(body?.error ?? "Couldn't create the client account.");
    return rowToClient(body.client);
  }

  async resetClientPassword(clientId: string, newPassword: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke("create-client-account", {
      body: { action: "reset-password", clientId, password: newPassword },
    });
    if (error) throw new Error(error.message);
    const body = data as { ok?: boolean; error?: string };
    if (!body?.ok) throw new Error(body?.error ?? "Couldn't reset the password.");
  }

  async deleteClientAccount(clientId: string): Promise<void> {
    const { data } = await supabase.functions.invoke("create-client-account", {
      body: { action: "delete", clientId },
    });
    const body = data as { ok?: boolean } | undefined;
    if (!body?.ok) {
      // Fallback: RLS-scoped delete (auth user stays, data cascades).
      const { error } = await supabase.from("clients").delete().eq("id", clientId);
      if (error) throw new Error(error.message);
    }
  }

  async updateCoachName(name: string): Promise<void> {
    const userId = await this.getSessionUserId();
    if (!userId) throw new Error("Not signed in.");
    const { error } = await supabase.from("coaches").update({ name }).eq("id", userId);
    if (error) throw new Error(error.message);
  }
}

/* ================================================================
   DemoBackend — local store so the app runs with zero credentials.
   ================================================================ */

const DEMO_DATA_KEY = "forge-demo-data-v1";
const DEMO_SESSION_KEY = "forge-demo-session-v1";
const DEMO_COACH_ID = "coach-demo-0001";
export const DEMO_PASSWORD = "forge123";
export const DEMO_COACH_EMAIL = "coach@forge.fit";

interface DemoAuthEntry {
  password: string;
  name?: string;
}

interface DemoStore {
  state: AppState;
  auth: Record<string, DemoAuthEntry>;
}

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysAhead = (n: number): string => daysAgo(-n);

function seedData(): DemoStore {
  const coachId = DEMO_COACH_ID;

  const mkClient = (username: string, name: string, phone: string, goal: Client["goal"], age: number, gender: Client["gender"]): Client => ({
    id: uuid(),
    coachId,
    username,
    name,
    email: `${username}@example.com`,
    phone,
    gender,
    age,
    goal,
    startDate: daysAgo(30),
    status: "Active",
    notes: "",
    coachNotes: [],
    followUpDays: 7,
  });

  const c1 = mkClient("ahmed", "Ahmed Hassan", "01012345678", "Lose weight", 29, "Male");
  const c2 = mkClient("sara", "Sara Ali", "+201098765432", "Build muscle", 26, "Female");
  const c3 = mkClient("omar", "Omar Khaled", "201055551234", "General fitness", 33, "Male");
  const clients = [c1, c2, c3];

  const exercises: Exercise[] = [
    { id: uuid(), coachId, name: "Barbell Bench Press", category: "Chest", description: "Retract shoulder blades, bar to lower chest.", videoUrl: "https://www.youtube.com/results?search_query=bench+press" },
    { id: uuid(), coachId, name: "Pull-up", category: "Back", description: "Dead hang to chin over bar. Bands OK.", videoUrl: "https://www.youtube.com/results?search_query=pull+up" },
    { id: uuid(), coachId, name: "Barbell Back Squat", category: "Legs", description: "Break at hips and knees together, below parallel.", videoUrl: "https://www.youtube.com/results?search_query=back+squat" },
    { id: uuid(), coachId, name: "Dumbbell Biceps Curl", category: "Arms", description: "Elbows pinned, slow negative.", videoUrl: "https://www.youtube.com/results?search_query=dumbbell+curl" },
    { id: uuid(), coachId, name: "Plank Hold", category: "Core", description: "Glutes tight, ribs down.", videoUrl: "https://www.youtube.com/results?search_query=plank" },
    { id: uuid(), coachId, name: "Rowing Intervals", category: "Cardio", description: "500m hard / 90s easy ×6.", videoUrl: "https://www.youtube.com/results?search_query=rowing+machine" },
  ];

  const [bench, pullup, squat] = exercises;

  const plans: PlanItem[] = [
    { id: uuid(), coachId, clientId: c1.id, day: 1, exerciseId: squat.id, sets: 4, reps: 8, rest: 90, notes: "Tempo 3-1-1" },
    { id: uuid(), coachId, clientId: c1.id, day: 1, exerciseId: bench.id, sets: 4, reps: 8, rest: 90, notes: "" },
    { id: uuid(), coachId, clientId: c1.id, day: 2, exerciseId: pullup.id, sets: 3, reps: 6, rest: 90, notes: "Band assist OK" },
    { id: uuid(), coachId, clientId: c2.id, day: 1, exerciseId: bench.id, sets: 5, reps: 5, rest: 120, notes: "Add 2.5kg weekly" },
    { id: uuid(), coachId, clientId: c3.id, day: 1, exerciseId: squat.id, sets: 3, reps: 10, rest: 75, notes: "" },
  ];

  const meals: Meal[] = [
    { id: uuid(), coachId, clientId: c1.id, type: "Breakfast", description: "Oats + berries + whey", calories: 380, protein: 32, carbs: 48, fats: 7 },
    { id: uuid(), coachId, clientId: c1.id, type: "Lunch", description: "Grilled chicken, rice, salad", calories: 620, protein: 45, carbs: 62, fats: 12 },
    { id: uuid(), coachId, clientId: c2.id, type: "Breakfast", description: "4 eggs, toast, avocado", calories: 720, protein: 38, carbs: 48, fats: 36 },
  ];

  const checkIns: CheckIn[] = [
    { id: uuid(), coachId, clientId: c1.id, date: daysAgo(0), ts: Date.now() - 3600_000, weight: 82.4, waist: 84, mood: 4, water: 2.5, workoutDone: true, notes: "Felt strong." },
    { id: uuid(), coachId, clientId: c1.id, date: daysAgo(2), ts: Date.now() - 2 * 86400_000, weight: 82.9, waist: 84.5, mood: 3, water: 2, workoutDone: true },
    { id: uuid(), coachId, clientId: c1.id, date: daysAgo(4), ts: Date.now() - 4 * 86400_000, weight: 83.4, waist: 85, mood: 3, water: 1.8, workoutDone: false, notes: "Skipped — late meeting." },
    { id: uuid(), coachId, clientId: c2.id, date: daysAgo(1), ts: Date.now() - 86400_000, weight: 58.2, waist: 64, mood: 5, water: 3, workoutDone: true, notes: "Bench PR!" },
  ];

  const subscriptions: Subscription[] = [
    { id: uuid(), coachId, clientId: c1.id, planName: "Monthly", startDate: daysAgo(20), endDate: daysAhead(10), price: 1200, paymentStatus: "Paid", createdAt: Date.now() - 20 * 86400_000 },
    { id: uuid(), coachId, clientId: c2.id, planName: "Monthly", startDate: daysAgo(26), endDate: daysAhead(4), price: 1200, paymentStatus: "Paid", createdAt: Date.now() - 26 * 86400_000 },
    { id: uuid(), coachId, clientId: c3.id, planName: "Quarterly", startDate: daysAgo(35), endDate: daysAgo(2), price: 3000, paymentStatus: "Pending", createdAt: Date.now() - 35 * 86400_000 },
  ];

  const payments: Payment[] = [
    { id: uuid(), coachId, clientId: c1.id, subscriptionId: subscriptions[0].id, amount: 1200, date: daysAgo(20), method: "Cash", status: "Paid", notes: "" },
    { id: uuid(), coachId, clientId: c2.id, subscriptionId: subscriptions[1].id, amount: 1200, date: daysAgo(26), method: "Bank Transfer", status: "Paid", notes: "" },
  ];

  const sessions: Session[] = [
    { id: uuid(), coachId, clientId: c1.id, date: todayISO(), time: "10:00", type: "Personal Training", status: "Confirmed", notes: "" },
    { id: uuid(), coachId, clientId: c2.id, date: todayISO(), time: "12:30", type: "Online Coaching", status: "Scheduled", notes: "" },
    { id: uuid(), coachId, clientId: c3.id, date: todayISO(), time: "17:00", type: "Personal Training", status: "Completed", notes: "" },
    { id: uuid(), coachId, clientId: c1.id, date: daysAhead(1), time: "10:00", type: "Personal Training", status: "Scheduled", notes: "" },
  ];

  const h = 3600_000;
  const messages: Message[] = [
    { id: uuid(), coachId, clientId: c1.id, senderRole: "coach", text: "Great session today, Ahmed! Keep the protein high this week.", createdAt: Date.now() - 26 * h },
    { id: uuid(), coachId, clientId: c1.id, senderRole: "client", text: "Thanks coach! Should I do cardio on rest days?", createdAt: Date.now() - 25 * h },
    { id: uuid(), coachId, clientId: c1.id, senderRole: "coach", text: "Light 20-min walks are perfect. Save the hard intervals for training days.", createdAt: Date.now() - 2 * h },
    { id: uuid(), coachId, clientId: c2.id, senderRole: "coach", text: "Bench PR — huge! We'll bump the load 2.5kg next week.", createdAt: Date.now() - 20 * h },
    { id: uuid(), coachId, clientId: c2.id, senderRole: "client", text: "Let's go!", createdAt: Date.now() - 19 * h },
    { id: uuid(), coachId, clientId: c3.id, senderRole: "coach", text: "Omar, your plan is ready for this week. Check the Today tab.", createdAt: Date.now() - 8 * h },
  ];

  const notifications: AppNotification[] = [
    { id: uuid(), coachId, clientId: c1.id, kind: "message", text: "New message from Coach Dana", createdAt: Date.now() - 2 * h, read: false },
    { id: uuid(), coachId, clientId: c1.id, kind: "plan_updated", text: "Your workout plan was updated", createdAt: Date.now() - 30 * h, read: true },
    { id: uuid(), coachId, clientId: c2.id, kind: "message", text: "New message from Coach Dana", createdAt: Date.now() - 20 * h, read: false },
    { id: uuid(), coachId, clientId: c2.id, kind: "subscription", text: "Your subscription renews in 4 days", createdAt: Date.now() - 6 * h, read: false },
    { id: uuid(), coachId, clientId: c3.id, kind: "meal_updated", text: "Your meal plan was updated", createdAt: Date.now() - 40 * h, read: true },
  ];

  return {
    state: { clients, exercises, plans, checkIns, meals, subscriptions, payments, sessions, messages, notifications },
    auth: {
      [DEMO_COACH_ID]: { password: DEMO_PASSWORD, name: "Coach Dana" },
      [c1.id]: { password: DEMO_PASSWORD },
      [c2.id]: { password: DEMO_PASSWORD },
      [c3.id]: { password: DEMO_PASSWORD },
    },
  };
}

/** Backfill stores saved by older versions (missing chat/notification tables). */
function migrateDemo(parsed: DemoStore): DemoStore {
  const s = parsed.state;
  s.clients ??= [];
  s.exercises ??= [];
  s.plans ??= [];
  s.checkIns ??= [];
  s.meals ??= [];
  s.subscriptions ??= [];
  s.payments ??= [];
  s.sessions ??= [];
  let changed = false;
  if (!Array.isArray(s.messages)) {
    const seeded = seedData();
    const byName = new Map(seeded.state.clients.map((c, i) => [c.username, s.clients[i]?.id]));
    s.messages = seeded.state.messages
      .filter((m) => {
        const seedClient = seeded.state.clients.find((c) => c.id === m.clientId);
        return seedClient ? byName.has(seedClient.username) : false;
      })
      .map((m) => {
        const seedClient = seeded.state.clients.find((c) => c.id === m.clientId)!;
        return { ...m, clientId: byName.get(seedClient.username) ?? m.clientId };
      });
    changed = true;
  }
  if (!Array.isArray(s.notifications)) {
    s.notifications = [];
    changed = true;
  }
  if (changed) writeDemo(parsed);
  return parsed;
}

function readDemo(): DemoStore {
  try {
    const raw = localStorage.getItem(DEMO_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoStore;
      if (parsed?.state?.clients) return migrateDemo(parsed);
    }
  } catch {
    /* fall through to reseed */
  }
  const seeded = seedData();
  writeDemo(seeded);
  return seeded;
}

function writeDemo(store: DemoStore): void {
  try {
    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(store));
  } catch {
    /* storage full — non-fatal in demo */
  }
}

type StateKey = keyof AppState;
function tableToKey(table: string): StateKey {
  const map: Record<string, StateKey> = {
    clients: "clients",
    exercises: "exercises",
    plan_items: "plans",
    check_ins: "checkIns",
    meals: "meals",
    subscriptions: "subscriptions",
    payments: "payments",
    sessions: "sessions",
    messages: "messages",
    notifications: "notifications",
  };
  return map[table] ?? "clients";
}

class DemoBackend implements Backend {
  readonly kind = "demo" as const;
  private listeners = new Set<(userId: string | null) => void>();

  private session(): { userId: string; role: "coach" | "client" } | null {
    try {
      // A still-live non-remembered (sessionStorage) session takes precedence.
      const raw = sessionStorage.getItem(DEMO_SESSION_KEY) ?? localStorage.getItem(DEMO_SESSION_KEY);
      return raw ? (JSON.parse(raw) as { userId: string; role: "coach" | "client" }) : null;
    } catch {
      return null;
    }
  }

  private setSession(userId: string | null, role: "coach" | "client" = "coach", remember = true): void {
    setRemember(remember);
    try {
      if (userId) {
        const payload = JSON.stringify({ userId, role });
        (remember ? localStorage : sessionStorage).setItem(DEMO_SESSION_KEY, payload);
        // Keep the two stores mutually exclusive.
        (remember ? sessionStorage : localStorage).removeItem(DEMO_SESSION_KEY);
      } else {
        localStorage.removeItem(DEMO_SESSION_KEY);
        sessionStorage.removeItem(DEMO_SESSION_KEY);
      }
    } catch {
      /* storage unavailable — non-fatal */
    }
    this.listeners.forEach((cb) => cb(userId));
  }

  async getSessionUserId(): Promise<string | null> {
    return this.session()?.userId ?? null;
  }

  onAuthChange(cb: (userId: string | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async coachSignUp(_email: string, password: string, _name: string, remember: boolean): Promise<void> {
    if (password !== DEMO_PASSWORD) throw new Error(`Demo mode: use password "${DEMO_PASSWORD}".`);
    this.setSession(DEMO_COACH_ID, "coach", remember);
  }

  async coachSignIn(email: string, password: string, remember: boolean): Promise<void> {
    if (email.trim().toLowerCase() !== DEMO_COACH_EMAIL || password !== DEMO_PASSWORD) {
      throw new Error(`Demo mode: use ${DEMO_COACH_EMAIL} / ${DEMO_PASSWORD}.`);
    }
    this.setSession(DEMO_COACH_ID, "coach", remember);
  }

  async clientSignIn(username: string, password: string, remember: boolean): Promise<void> {
    const store = readDemo();
    const uname = username.trim().toLowerCase();
    const client = store.state.clients.find((c) => c.username.toLowerCase() === uname);
    if (!client) throw new Error("Invalid username or password.");
    const entry = store.auth[client.id];
    if (!entry || entry.password !== password) throw new Error("Invalid username or password.");
    this.setSession(client.id, "client", remember);
  }

  async signOut(): Promise<void> {
    this.setSession(null);
  }

  async resolveRole(userId: string): Promise<RoleInfo | null> {
    if (userId === DEMO_COACH_ID) {
      const store = readDemo();
      return {
        role: "coach",
        userId,
        coachId: DEMO_COACH_ID,
        name: store.auth[DEMO_COACH_ID]?.name ?? "Coach Dana",
        email: DEMO_COACH_EMAIL,
      };
    }
    const store = readDemo();
    const client = store.state.clients.find((c) => c.id === userId);
    if (!client) return null;
    return { role: "client", userId, coachId: DEMO_COACH_ID, name: client.name, email: client.email, client };
  }

  async load(): Promise<AppState> {
    const store = readDemo();
    const s = store.state;
    const safe: AppState = {
      clients: s.clients ?? [],
      exercises: s.exercises ?? [],
      plans: s.plans ?? [],
      checkIns: s.checkIns ?? [],
      meals: s.meals ?? [],
      subscriptions: s.subscriptions ?? [],
      payments: s.payments ?? [],
      sessions: s.sessions ?? [],
      messages: s.messages ?? [],
      notifications: s.notifications ?? [],
    };
    const sess = this.session();
    if (sess?.role === "client") {
      // A client only ever sees their own slice.
      const id = sess.userId;
      return {
        clients: safe.clients.filter((c) => c.id === id),
        exercises: safe.exercises,
        plans: safe.plans.filter((p) => p.clientId === id),
        checkIns: safe.checkIns.filter((c) => c.clientId === id),
        meals: safe.meals.filter((m) => m.clientId === id),
        subscriptions: safe.subscriptions.filter((x) => x.clientId === id),
        payments: safe.payments.filter((x) => x.clientId === id),
        sessions: safe.sessions.filter((x) => x.clientId === id),
        messages: safe.messages.filter((x) => x.clientId === id),
        notifications: safe.notifications.filter((x) => x.clientId === id),
      };
    }
    return JSON.parse(JSON.stringify(safe)) as AppState;
  }

  private mutate(fn: (s: AppState) => void): void {
    const store = readDemo();
    fn(store.state);
    writeDemo(store);
  }

  async insert(table: string, row: Row): Promise<void> {
    this.mutate((s) => {
      const key = tableToKey(table);
      (s[key] as unknown[]).push(rowFromTable(table, row));
    });
  }

  async update(table: string, id: string, row: Row): Promise<void> {
    this.mutate((s) => {
      const key = tableToKey(table);
      const arr = s[key] as unknown as { id: string }[];
      const i = arr.findIndex((x) => x.id === id);
      if (i < 0) return;
      const merged = { ...entityToRow(table, arr[i]), ...row, id };
      arr[i] = rowFromTable(table, merged) as never;
    });
  }

  async remove(table: string, id: string): Promise<void> {
    this.mutate((s) => {
      const key = tableToKey(table);
      (s[key] as { id: string }[]) = (s[key] as { id: string }[]).filter((x) => x.id !== id) as never;
    });
  }

  async createClientAccount(input: NewClientInput): Promise<Client> {
    const store = readDemo();
    const uname = input.username.trim().toLowerCase();
    if (store.state.clients.some((c) => c.username.toLowerCase() === uname)) {
      throw new Error(`Username "${uname}" is already taken.`);
    }
    const client: Client = {
      id: uuid(),
      coachId: DEMO_COACH_ID,
      username: uname,
      name: input.name,
      email: input.email ?? "",
      phone: input.phone ?? "",
      gender: input.gender,
      age: input.age,
      goal: input.goal,
      startDate: input.startDate,
      status: input.status,
      notes: input.notes ?? "",
      photo: input.photo,
      coachNotes: [],
    };
    this.mutate((s) => {
      s.clients.push(client);
    });
    const fresh = readDemo();
    fresh.auth[client.id] = { password: input.password };
    writeDemo(fresh);
    return client;
  }

  async resetClientPassword(clientId: string, newPassword: string): Promise<void> {
    const store = readDemo();
    store.auth[clientId] = { ...store.auth[clientId], password: newPassword };
    writeDemo(store);
  }

  async deleteClientAccount(clientId: string): Promise<void> {
    this.mutate((s) => {
      s.clients = s.clients.filter((c) => c.id !== clientId);
      s.plans = s.plans.filter((p) => p.clientId !== clientId);
      s.checkIns = s.checkIns.filter((c) => c.clientId !== clientId);
      s.meals = s.meals.filter((m) => m.clientId !== clientId);
      s.subscriptions = s.subscriptions.filter((x) => x.clientId !== clientId);
      s.payments = s.payments.filter((x) => x.clientId !== clientId);
      s.sessions = s.sessions.filter((x) => x.clientId !== clientId);
      s.messages = s.messages.filter((x) => x.clientId !== clientId);
      s.notifications = s.notifications.filter((x) => x.clientId !== clientId);
    });
    const fresh = readDemo();
    delete fresh.auth[clientId];
    writeDemo(fresh);
  }

  async updateCoachName(name: string): Promise<void> {
    const store = readDemo();
    store.auth[DEMO_COACH_ID] = { ...store.auth[DEMO_COACH_ID], password: store.auth[DEMO_COACH_ID]?.password ?? DEMO_PASSWORD, name };
    writeDemo(store);
  }
}

/* ---------------- singleton ---------------- */

export const backend: Backend = isDemoMode ? new DemoBackend() : new SupabaseBackend();
