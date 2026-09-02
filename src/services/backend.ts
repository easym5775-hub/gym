/* ================================================================
   FORGE — backend abstraction.

   The UI and the store never talk to Supabase directly; they talk to a
   `Backend`. Two implementations exist:

     • SupabaseBackend — live Postgres + Auth + Edge Functions (used when
       VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set).
     • DemoBackend     — a clearly-labelled local store (localStorage) so
       the app is fully usable in this environment without credentials.

   Swapping backends never touches the UI. Row mapping between Postgres
   snake_case and the app's camelCase types lives here.
   ================================================================ */

import type {
  AppState,
  CheckIn,
  Client,
  Exercise,
  Goal,
  ClientStatus,
  ExerciseCategory,
  Meal,
  MealType,
  Payment,
  PaymentMethod,
  PaymentStatus,
  PlanItem,
  Session,
  SessionStatus,
  Subscription,
  SubscriptionPaymentStatus,
} from "../types";
import { todayISO, uuid } from "../lib";
import { isSupabaseConfigured, supabase } from "./supabase";

/* ---------------- role / session model ---------------- */

export interface RoleInfo {
  role: "coach" | "client";
  /** The Supabase auth user id (shared id space for coaches & clients). */
  userId: string;
  /** The owning coach's id — scopes every query. */
  coachId: string;
  name: string;
  email: string;
  /** Present only for the client role. */
  client?: Client;
}

export interface NewClientInput {
  username: string;
  password: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: "Male" | "Female" | "Other";
  age?: number;
  goal: Goal;
  status: ClientStatus;
  startDate: string;
  notes?: string;
  photo?: string;
}

export interface Backend {
  readonly kind: "supabase" | "demo";

  /* auth */
  getSessionUserId(): Promise<string | null>;
  onAuthChange(cb: (userId: string | null) => void): () => void;
  coachSignUp(email: string, password: string, name: string): Promise<void>;
  coachSignIn(email: string, password: string): Promise<void>;
  clientSignIn(username: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resolveRole(userId: string): Promise<RoleInfo | null>;

  /* data */
  load(): Promise<AppState>;
  insert(table: string, row: Record<string, unknown>): Promise<void>;
  update(table: string, id: string, row: Record<string, unknown>): Promise<void>;
  remove(table: string, id: string): Promise<void>;

  /* edge functions (client account lifecycle) */
  createClientAccount(input: NewClientInput): Promise<Client>;
  resetClientPassword(clientId: string, newPassword: string): Promise<void>;
  deleteClientAccount(clientId: string): Promise<void>;
}

/* ================================================================
   Row mappers — Postgres snake_case  ⇄  app camelCase
   ================================================================ */

type Row = Record<string, any>;

const clean = (row: Row): Row => {
  const out: Row = { ...row };
  delete out.id;
  delete out.coach_id;
  delete out.created_at;
  delete out.updated_at;
  return out;
};

export const clientToRow = (c: Client): Row => ({
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
  coach_notes: c.coachNotes ?? [],
  nutrition_targets: c.nutritionTargets ?? null,
});

export const rowToClient = (r: Row): Client => ({
  id: String(r.id),
  coachId: String(r.coach_id),
  username: String(r.username ?? ""),
  name: String(r.name ?? ""),
  email: String(r.email ?? ""),
  phone: String(r.phone ?? ""),
  gender: r.gender ?? undefined,
  age: r.age == null ? undefined : Number(r.age),
  goal: (r.goal as Goal) ?? "General fitness",
  startDate: String(r.start_date ?? todayISO()),
  status: (r.status as ClientStatus) ?? "Active",
  notes: String(r.notes ?? ""),
  photo: r.photo ?? undefined,
  followUpDays: r.follow_up_days == null ? undefined : Number(r.follow_up_days),
  lastFollowUp: r.last_follow_up ?? undefined,
  coachNotes: Array.isArray(r.coach_notes) ? r.coach_notes : [],
  nutritionTargets: r.nutrition_targets ?? undefined,
});

export const exerciseToRow = (e: Exercise): Row => ({
  id: e.id,
  coach_id: e.coachId,
  name: e.name,
  category: e.category,
  description: e.description,
  video_url: e.videoUrl,
  image: e.image ?? null,
});
export const rowToExercise = (r: Row): Exercise => ({
  id: String(r.id),
  coachId: String(r.coach_id),
  name: String(r.name ?? ""),
  category: (r.category as ExerciseCategory) ?? "Core",
  description: String(r.description ?? ""),
  videoUrl: String(r.video_url ?? ""),
  image: r.image ?? undefined,
});

export const planToRow = (p: PlanItem): Row => ({
  id: p.id,
  coach_id: p.coachId,
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
  coachId: String(r.coach_id),
  clientId: String(r.client_id),
  day: Number(r.day) || 1,
  exerciseId: String(r.exercise_id),
  sets: Number(r.sets) || 0,
  reps: Number(r.reps) || 0,
  rest: Number(r.rest) || 0,
  notes: String(r.notes ?? ""),
});

export const checkInToRow = (c: CheckIn): Row => ({
  id: c.id,
  coach_id: c.coachId,
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
  coachId: String(r.coach_id),
  clientId: String(r.client_id),
  date: String(r.date),
  ts: Number(r.ts) || 0,
  weight: Number(r.weight) || 0,
  waist: r.waist == null ? undefined : Number(r.waist),
  mood: Number(r.mood) || 3,
  water: Number(r.water) || 0,
  workoutDone: Boolean(r.workout_done),
  notes: r.notes ?? undefined,
  photo: r.photo ?? undefined,
});

export const mealToRow = (m: Meal): Row => ({
  id: m.id,
  coach_id: m.coachId,
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
  coachId: String(r.coach_id),
  clientId: String(r.client_id),
  type: (r.type as MealType) ?? "Snack",
  description: String(r.description ?? ""),
  calories: Number(r.calories) || 0,
  protein: Number(r.protein) || 0,
  carbs: Number(r.carbs) || 0,
  fats: Number(r.fats) || 0,
});

export const subscriptionToRow = (s: Subscription): Row => ({
  id: s.id,
  coach_id: s.coachId,
  client_id: s.clientId,
  plan_name: s.planName,
  start_date: s.startDate,
  end_date: s.endDate,
  price: s.price,
  payment_status: s.paymentStatus,
  created_at: new Date(s.createdAt).toISOString(),
});
export const rowToSubscription = (r: Row): Subscription => ({
  id: String(r.id),
  coachId: String(r.coach_id),
  clientId: String(r.client_id),
  planName: String(r.plan_name ?? "Monthly"),
  startDate: String(r.start_date ?? todayISO()),
  endDate: String(r.end_date ?? todayISO()),
  price: Number(r.price) || 0,
  paymentStatus: (r.payment_status as SubscriptionPaymentStatus) ?? "Pending",
  createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
});

export const paymentToRow = (p: Payment): Row => ({
  id: p.id,
  coach_id: p.coachId,
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
  coachId: String(r.coach_id),
  clientId: String(r.client_id),
  subscriptionId: r.subscription_id ?? undefined,
  amount: Number(r.amount) || 0,
  date: String(r.date ?? todayISO()),
  method: (r.method as PaymentMethod) ?? "Cash",
  status: (r.status as PaymentStatus) ?? "Paid",
  notes: String(r.notes ?? ""),
});

export const sessionToRow = (s: Session): Row => ({
  id: s.id,
  coach_id: s.coachId,
  client_id: s.clientId,
  date: s.date,
  time: s.time,
  type: s.type,
  status: s.status,
  notes: s.notes,
});
export const rowToSession = (r: Row): Session => ({
  id: String(r.id),
  coachId: String(r.coach_id),
  clientId: String(r.client_id),
  date: String(r.date ?? todayISO()),
  time: String(r.time ?? "18:00"),
  type: String(r.type ?? "Training"),
  status: (r.status as SessionStatus) ?? "Scheduled",
  notes: String(r.notes ?? ""),
});

/* ================================================================
   SupabaseBackend
   ================================================================ */

const SUPABASE_TABLES = [
  "clients",
  "exercises",
  "plan_items",
  "check_ins",
  "meals",
  "subscriptions",
  "payments",
  "sessions",
] as const;

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

  async coachSignUp(email: string, password: string, name: string): Promise<void> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "coach", name } },
    });
    if (error) throw new Error(friendly(error.message));
    if (data.session?.user) {
      // Ensure a coaches row exists for this auth user.
      await supabase.from("coaches").upsert({ id: data.session.user.id, name, email });
    }
  }

  async coachSignIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendly(error.message));
  }

  async clientSignIn(username: string, password: string): Promise<void> {
    // Username → synthetic email bridge (RPC), then standard password sign-in.
    const { data: email, error } = await supabase.rpc("client_login_email", {
      p_username: username.trim().toLowerCase(),
    });
    if (error) throw new Error("Invalid username or password.");
    if (!email) throw new Error("Invalid username or password.");
    const res = await supabase.auth.signInWithPassword({ email: String(email), password });
    if (res.error) throw new Error("Invalid username or password.");
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  async resolveRole(userId: string): Promise<RoleInfo | null> {
    const coach = await supabase.from("coaches").select("id,name,email").eq("id", userId).maybeSingle();
    if (coach.data) {
      return {
        role: "coach",
        userId,
        coachId: userId,
        name: coach.data.name ?? "Coach",
        email: coach.data.email ?? "",
      };
    }
    const client = await supabase.from("clients").select("*").eq("id", userId).maybeSingle();
    if (client.data) {
      const c = rowToClient(client.data);
      return { role: "client", userId, coachId: c.coachId, name: c.name, email: c.email, client: c };
    }
    return null;
  }

  async load(): Promise<AppState> {
    const [clients, exercises, plans, checkIns, meals, subscriptions, payments, sessions] = await Promise.all(
      SUPABASE_TABLES.map((t) => supabase.from(t).select("*")),
    );
    const err = [clients, exercises, plans, checkIns, meals, subscriptions, payments, sessions].find((r) => r.error);
    if (err?.error) throw new Error(friendly(err.error.message));
    return {
      clients: (clients.data ?? []).map(rowToClient),
      exercises: (exercises.data ?? []).map(rowToExercise),
      plans: (plans.data ?? []).map(rowToPlan),
      checkIns: (checkIns.data ?? []).map(rowToCheckIn),
      meals: (meals.data ?? []).map(rowToMeal),
      subscriptions: (subscriptions.data ?? []).map(rowToSubscription),
      payments: (payments.data ?? []).map(rowToPayment),
      sessions: (sessions.data ?? []).map(rowToSession),
    };
  }

  async insert(table: string, row: Row): Promise<void> {
    const { error } = await supabase.from(table).insert(row);
    if (error) throw new Error(friendly(error.message));
  }

  async update(table: string, id: string, row: Row): Promise<void> {
    const { error } = await supabase.from(table).update(clean(row)).eq("id", id);
    if (error) throw new Error(friendly(error.message));
  }

  async remove(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw new Error(friendly(error.message));
  }

  private edgeUrl(fn: string): string {
    const base = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
    return `${base}/functions/v1/${fn}`;
  }

  private async edgeCall(fn: string, body: unknown): Promise<any> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(this.edgeUrl(fn), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? `Edge function failed (${res.status})`);
    return json;
  }

  async createClientAccount(input: NewClientInput): Promise<Client> {
    const json = await this.edgeCall("create-client-account", { action: "create", ...input });
    return rowToClient(json.client ?? json);
  }

  async resetClientPassword(clientId: string, newPassword: string): Promise<void> {
    await this.edgeCall("create-client-account", { action: "reset-password", clientId, newPassword });
  }

  async deleteClientAccount(clientId: string): Promise<void> {
    await this.edgeCall("create-client-account", { action: "delete", clientId });
  }
}

function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Invalid email or password.";
  if (/already registered/i.test(msg)) return "That email is already registered — try signing in.";
  if (/at least 6 characters/i.test(msg)) return "Password must be at least 6 characters.";
  return msg;
}

/* ================================================================
   DemoBackend — local, clearly-labelled, for this environment.
   ================================================================ */

const DEMO_DATA_KEY = "forge-demo-data-v1";
const DEMO_SESSION_KEY = "forge-demo-session-v1";
const DEMO_COACH_ID = "11111111-1111-4111-8111-111111111111";
const DEMO_PASSWORD = "demo1234";

interface DemoClientAuth {
  password: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysAhead(n: number): string {
  return daysAgo(-n);
}

function seedData(): { state: AppState; auth: Record<string, DemoClientAuth> } {
  const coachId = DEMO_COACH_ID;
  const auth: Record<string, DemoClientAuth> = {};

  const mkClient = (
    id: string,
    username: string,
    name: string,
    goal: Goal,
    status: ClientStatus,
    startOffset: number,
    phone: string,
  ): Client => {
    auth[id] = { password: DEMO_PASSWORD };
    return {
      id,
      coachId,
      username,
      name,
      email: "",
      phone,
      gender: undefined,
      age: undefined,
      goal,
      startDate: daysAgo(startOffset),
      status,
      notes: "",
      coachNotes: [],
    };
  };

  const c1 = mkClient("21111111-1111-4111-8111-111111111111", "ahmed", "Ahmed Samir", "Lose weight", "Active", 60, "01012345678");
  const c2 = mkClient("22222222-2222-4222-8222-222222222222", "sara", "Sara Ali", "Build muscle", "Active", 45, "01098765432");
  const c3 = mkClient("23333333-3333-4333-8333-333333333333", "omar", "Omar Khaled", "General fitness", "Active", 30, "01155556666");

  const clients = [c1, c2, c3];

  const exercises: Exercise[] = [
    { id: uuid(), coachId, name: "Barbell Bench Press", category: "Chest", description: "Flat barbell press, shoulder blades pinned.", videoUrl: "https://www.youtube.com/results?search_query=barbell+bench+press" },
    { id: uuid(), coachId, name: "Pull-Up", category: "Back", description: "Dead hang to chin over bar.", videoUrl: "https://www.youtube.com/results?search_query=pull+up" },
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

  return {
    state: { clients, exercises, plans, checkIns, meals, subscriptions, payments, sessions },
    auth,
  };
}

interface DemoStore {
  state: AppState;
  auth: Record<string, DemoClientAuth>;
}

function readDemo(): DemoStore {
  try {
    const raw = localStorage.getItem(DEMO_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoStore;
      if (parsed?.state?.clients) return parsed;
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

class DemoBackend implements Backend {
  readonly kind = "demo" as const;
  private listeners = new Set<(userId: string | null) => void>();

  private session(): { userId: string; role: "coach" | "client" } | null {
    try {
      const raw = localStorage.getItem(DEMO_SESSION_KEY);
      return raw ? (JSON.parse(raw) as { userId: string; role: "coach" | "client" }) : null;
    } catch {
      return null;
    }
  }

  private setSession(userId: string | null, role: "coach" | "client" = "coach"): void {
    if (userId) localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ userId, role }));
    else localStorage.removeItem(DEMO_SESSION_KEY);
    this.listeners.forEach((cb) => cb(userId));
  }

  async getSessionUserId(): Promise<string | null> {
    return this.session()?.userId ?? null;
  }

  onAuthChange(cb: (userId: string | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async coachSignUp(_email: string, password: string, _name: string): Promise<void> {
    if (password !== DEMO_PASSWORD) throw new Error(`Demo mode: use password "${DEMO_PASSWORD}".`);
    this.setSession(DEMO_COACH_ID, "coach");
  }

  async coachSignIn(_email: string, password: string): Promise<void> {
    if (password !== DEMO_PASSWORD) throw new Error(`Demo mode: use password "${DEMO_PASSWORD}".`);
    this.setSession(DEMO_COACH_ID, "coach");
  }

  async clientSignIn(username: string, password: string): Promise<void> {
    const store = readDemo();
    const uname = username.trim().toLowerCase();
    const client = store.state.clients.find((c) => c.username.toLowerCase() === uname);
    if (!client || store.auth[client.id]?.password !== password) {
      throw new Error("Invalid username or password.");
    }
    this.setSession(client.id, "client");
  }

  async signOut(): Promise<void> {
    this.setSession(null);
  }

  async resolveRole(userId: string): Promise<RoleInfo | null> {
    if (userId === DEMO_COACH_ID) {
      return { role: "coach", userId, coachId: DEMO_COACH_ID, name: "Coach Dana", email: "coach@forge.demo" };
    }
    const store = readDemo();
    const client = store.state.clients.find((c) => c.id === userId);
    if (client) {
      return { role: "client", userId, coachId: client.coachId, name: client.name, email: client.email, client };
    }
    return null;
  }

  async load(): Promise<AppState> {
    const store = readDemo();
    const s = this.session();
    if (s?.role === "client") {
      // A client only ever sees their own slice.
      const id = s.userId;
      return {
        clients: store.state.clients.filter((c) => c.id === id),
        exercises: store.state.exercises,
        plans: store.state.plans.filter((p) => p.clientId === id),
        checkIns: store.state.checkIns.filter((c) => c.clientId === id),
        meals: store.state.meals.filter((m) => m.clientId === id),
        subscriptions: store.state.subscriptions.filter((x) => x.clientId === id),
        payments: store.state.payments.filter((x) => x.clientId === id),
        sessions: store.state.sessions.filter((x) => x.clientId === id),
      };
    }
    return JSON.parse(JSON.stringify(store.state)) as AppState;
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
      // Merge over the existing entity so immutable fields (coach_id,
      // username, created_at…) are preserved.
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
    store.auth[clientId] = { password: newPassword };
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
    });
    const fresh = readDemo();
    delete fresh.auth[clientId];
    writeDemo(fresh);
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
  };
  return map[table] ?? "clients";
}

/** Rebuild a typed entity from a raw snake_case row for the demo store. */
function rowFromTable(table: string, row: Row): unknown {
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
    default:
      return row;
  }
}

/** Convert a typed entity back to a full snake_case row (for demo merges). */
function entityToRow(table: string, entity: any): Row {
  switch (table) {
    case "clients":
      return { id: entity.id, coach_id: entity.coachId, username: entity.username, ...clientToRow(entity) };
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
    default:
      return entity;
  }
}

/* ---------------- singleton ---------------- */

export const backend: Backend = isSupabaseConfigured ? new SupabaseBackend() : new DemoBackend();
