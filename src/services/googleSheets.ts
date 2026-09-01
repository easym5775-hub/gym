import type { CheckIn, Client, Exercise, Meal, PlanItem } from "../types";
import type {
  ConnectionConfig,
  DataProvider,
  EntityOp,
  RemoteData,
} from "./dataProvider";

/**
 * GoogleSheetsProvider
 * --------------------
 * React never talks to Google directly. Every request goes to a Google Apps
 * Script Web App (the secure API layer the coach deploys on their sheet), which
 * in turn reads/writes the spreadsheet. No Google credentials, API keys or
 * private keys ever reach the frontend — only the Web App URL the coach pastes.
 */

/* ------------------------------------------------------------------ */
/* Database schema — the 16 required tabs.                             */
/* init() creates any tab that is missing (with headers) and leaves    */
/* existing tabs and their data untouched.                             */
/* ------------------------------------------------------------------ */

const COMMON = ["id", "coach_id", "created_at", "updated_at"];

export const SCHEMA: Record<string, string[]> = {
  Coaches: ["id", "name", "email", "created_at", "updated_at"],
  Clients: [...COMMON, "name", "phone", "email", "gender", "age", "goal", "status", "join_date", "notes", "photo"],
  Subscriptions: [...COMMON, "client_id", "plan_name", "start_date", "end_date", "price", "status"],
  Payments: [...COMMON, "client_id", "subscription_id", "amount", "payment_date", "payment_method", "status", "notes"],
  Sessions: [...COMMON, "client_id", "date", "time", "type", "status", "notes"],
  CheckIns: [...COMMON, "client_id", "date", "ts", "weight", "waist", "mood", "water", "workout_completed", "notes", "photo"],
  Measurements: [...COMMON, "client_id", "date", "weight", "body_fat", "waist", "chest", "arm", "thigh", "hips", "notes"],
  ProgressPhotos: [...COMMON, "client_id", "date", "photo", "notes"],
  WorkoutPlans: [...COMMON, "client_id", "day", "exercise_id", "sets", "reps", "rest", "notes"],
  WorkoutExercises: [...COMMON, "workout_id", "exercise_id", "sets", "reps", "rest", "order"],
  Exercises: [...COMMON, "name", "category", "description", "video_url", "image"],
  NutritionPlans: [...COMMON, "client_id", "name", "start_date", "end_date", "notes"],
  Meals: [...COMMON, "client_id", "type", "description", "calories", "protein", "carbs", "fats"],
  FollowUps: [...COMMON, "client_id", "date", "channel", "message", "status"],
  Notifications: [...COMMON, "client_id", "title", "body", "read"],
  Settings: ["coach_id", "key", "value", "updated_at"],
};

export const TAB_NAMES = Object.keys(SCHEMA);

/** The five collections the UI reads/writes, mapped to their tabs. */
const ENTITY_SHEET: Record<EntityOp["entity"], string> = {
  client: "Clients",
  exercise: "Exercises",
  plan: "WorkoutPlans",
  checkin: "CheckIns",
  meal: "Meals",
};

/* ------------------------------------------------------------------ */
/* Mappers: app entity <-> sheet row (adds coach_id + audit fields).   */
/* ------------------------------------------------------------------ */

type Row = Record<string, string | number | boolean>;

/** Sheets cells cap at 50k chars; drop oversized base64 photos so a write never fails. */
const safePhoto = (p?: string) => (p && p.length < 45000 ? p : "");

const clientToRow = (c: Client): Row => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  email: c.email,
  goal: c.goal,
  status: c.status,
  join_date: c.startDate,
  notes: c.notes,
  photo: safePhoto(c.photo),
});

const rowToClient = (r: Row): Client => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  phone: String(r.phone ?? ""),
  email: String(r.email ?? ""),
  goal: (r.goal as Client["goal"]) || "General fitness",
  status: (r.status as Client["status"]) || "Active",
  startDate: String(r.join_date ?? ""),
  notes: String(r.notes ?? ""),
  photo: r.photo ? String(r.photo) : undefined,
});

const exerciseToRow = (e: Exercise): Row => ({
  id: e.id,
  name: e.name,
  category: e.category,
  description: e.description,
  video_url: e.videoUrl,
  image: safePhoto(e.image),
});

const rowToExercise = (r: Row): Exercise => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  category: (r.category as Exercise["category"]) || "Chest",
  description: String(r.description ?? ""),
  videoUrl: String(r.video_url ?? ""),
  image: r.image ? String(r.image) : undefined,
});

const planToRow = (p: PlanItem): Row => ({
  id: p.id,
  client_id: p.clientId,
  day: p.day,
  exercise_id: p.exerciseId,
  sets: p.sets,
  reps: p.reps,
  rest: p.rest,
  notes: p.notes,
});

const rowToPlan = (r: Row): PlanItem => ({
  id: String(r.id),
  clientId: String(r.client_id ?? ""),
  day: Number(r.day) || 1,
  exerciseId: String(r.exercise_id ?? ""),
  sets: Number(r.sets) || 1,
  reps: Number(r.reps) || 1,
  rest: Number(r.rest) || 0,
  notes: String(r.notes ?? ""),
});

const checkInToRow = (c: CheckIn): Row => ({
  id: c.id,
  client_id: c.clientId,
  date: c.date,
  ts: c.ts,
  weight: c.weight,
  waist: c.waist ?? "",
  mood: c.mood,
  water: c.water,
  workout_completed: c.workoutDone,
  notes: c.notes ?? "",
  photo: safePhoto(c.photo),
});

const rowToCheckIn = (r: Row): CheckIn => ({
  id: String(r.id),
  clientId: String(r.client_id ?? ""),
  date: String(r.date ?? ""),
  ts: Number(r.ts) || 0,
  weight: Number(r.weight) || 0,
  waist: r.waist === "" || r.waist === undefined ? undefined : Number(r.waist),
  mood: Number(r.mood) || 3,
  water: Number(r.water) || 0,
  workoutDone: r.workout_completed === true || r.workout_completed === "TRUE" || r.workout_completed === "true",
  notes: r.notes ? String(r.notes) : undefined,
  photo: r.photo ? String(r.photo) : undefined,
});

const mealToRow = (m: Meal): Row => ({
  id: m.id,
  client_id: m.clientId,
  type: m.type,
  description: m.description,
  calories: m.calories,
  protein: m.protein,
  carbs: m.carbs,
  fats: m.fats,
});

const rowToMeal = (r: Row): Meal => ({
  id: String(r.id),
  clientId: String(r.client_id ?? ""),
  type: (r.type as Meal["type"]) || "Snack",
  description: String(r.description ?? ""),
  calories: Number(r.calories) || 0,
  protein: Number(r.protein) || 0,
  carbs: Number(r.carbs) || 0,
  fats: Number(r.fats) || 0,
});

const FIELD_MAP: Record<string, string> = { clientId: "client_id", exerciseId: "exercise_id" };

const toUpsertRow = (op: Extract<EntityOp, { type: "upsert" }>): Row => {
  switch (op.entity) {
    case "client":
      return clientToRow(op.record);
    case "exercise":
      return exerciseToRow(op.record);
    case "plan":
      return planToRow(op.record);
    case "checkin":
      return checkInToRow(op.record);
    case "meal":
      return mealToRow(op.record);
  }
};

/* ------------------------------------------------------------------ */
/* Transport — call the Apps Script Web App.                           */
/* ------------------------------------------------------------------ */

function endpoint(cfg: ConnectionConfig): string {
  return cfg.webAppUrl.trim().replace(/\/$/, "");
}

async function get(cfg: ConnectionConfig, params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams({ coach: cfg.coachId, ...(cfg.token ? { token: cfg.token } : {}), ...params });
  const res = await fetch(`${endpoint(cfg)}?${qs.toString()}`, { redirect: "follow" });
  return parse(res);
}

async function post(cfg: ConnectionConfig, payload: Record<string, unknown>): Promise<unknown> {
  const body = JSON.stringify({ coach: cfg.coachId, token: cfg.token ?? "", ...payload });
  // text/plain avoids a CORS preflight, which Apps Script does not answer.
  const res = await fetch(endpoint(cfg), {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  return parse(res);
}

async function parse(res: Response): Promise<unknown> {
  if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
  let json: { ok?: boolean; error?: string } & Record<string, unknown>;
  try {
    json = (await res.json()) as { ok?: boolean; error?: string } & Record<string, unknown>;
  } catch {
    throw new Error("The endpoint did not return JSON. Check the Web App URL.");
  }
  if (!json.ok) throw new Error(String(json.error ?? "Google Sheets request failed"));
  return json;
}

/* ------------------------------------------------------------------ */
/* Provider implementation.                                            */
/* ------------------------------------------------------------------ */

export const googleSheetsProvider: DataProvider = {
  kind: "google-sheets",

  async ping(cfg) {
    await get(cfg, { action: "ping" });
  },

  async init(cfg) {
    const json = (await get(cfg, { action: "init" })) as { sheets?: string[] };
    return json.sheets ?? TAB_NAMES;
  },

  async load(cfg) {
    const json = (await get(cfg, { action: "load" })) as { data?: Record<string, Row[]> };
    const d = json.data ?? {};
    const rows = (sheet: string) => d[sheet] ?? [];
    return {
      clients: rows("Clients").map(rowToClient),
      exercises: rows("Exercises").map(rowToExercise),
      plans: rows("WorkoutPlans").map(rowToPlan),
      checkIns: rows("CheckIns").map(rowToCheckIn),
      meals: rows("Meals").map(rowToMeal),
    } satisfies RemoteData;
  },

  async apply(cfg, ops) {
    if (ops.length === 0) return;
    const wire = ops.map((op) => {
      const sheet = ENTITY_SHEET[op.entity];
      if (op.type === "upsert") return { type: "upsert", sheet, row: toUpsertRow(op) };
      if (op.type === "remove") return { type: "remove", sheet, id: op.id };
      return { type: "removeWhere", sheet, field: FIELD_MAP[op.field] ?? op.field, value: op.value };
    });
    await post(cfg, { action: "apply", ops: wire });
  },
};

/** Derive a stable spreadsheet id from the sheet URL (for display / deep links). */
export function spreadsheetId(sheetUrl: string): string | null {
  const m = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}
