import type { CheckIn, Client, Exercise, Meal, PlanItem } from "../types";
import type { ConnectionConfig, DataProvider, EntityOp, RemoteData } from "./dataProvider";
import {
  getMetadata,
  initTabs,
  readRecords,
  removeRow,
  removeWhere,
  spreadsheetIdFrom,
  upsertRow,
  type Row,
} from "./googleSheetsApi";

/**
 * GoogleSheetsProvider
 * --------------------
 * Talks to Google Sheets through the Sheets API v4 using the coach's OAuth
 * access token (obtained via the "Link with Google" consent flow). No secret
 * ever reaches the frontend — the OAuth client id is public by design and the
 * access token is short-lived, scoped and granted by the coach.
 *
 * Every record carries a `coach_id`; reads and writes here are always scoped to
 * the connected coach, so one coach can never touch another coach's data.
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
/* Provider implementation (OAuth + Sheets API v4).                    */
/* ------------------------------------------------------------------ */

export const googleSheetsProvider: DataProvider = {
  kind: "google-sheets",

  async ping(cfg) {
    // A successful metadata read proves the token works and the sheet is reachable.
    await getMetadata(cfg);
  },

  async init(cfg) {
    return initTabs(cfg, SCHEMA);
  },

  async load(cfg) {
    const [clients, exercises, plans, checkIns, meals] = await Promise.all([
      readRecords(cfg, "Clients"),
      readRecords(cfg, "Exercises"),
      readRecords(cfg, "WorkoutPlans"),
      readRecords(cfg, "CheckIns"),
      readRecords(cfg, "Meals"),
    ]);
    return {
      clients: clients.map(rowToClient),
      exercises: exercises.map(rowToExercise),
      plans: plans.map(rowToPlan),
      checkIns: checkIns.map(rowToCheckIn),
      meals: meals.map(rowToMeal),
    } satisfies RemoteData;
  },

  async apply(cfg, ops) {
    for (const op of ops) {
      const sheet = ENTITY_SHEET[op.entity];
      if (op.type === "upsert") {
        await upsertRow(cfg, sheet, toUpsertRow(op));
      } else if (op.type === "remove") {
        await removeRow(cfg, sheet, op.id);
      } else {
        await removeWhere(cfg, sheet, FIELD_MAP[op.field] ?? op.field, op.value);
      }
    }
  },
};

/** Derive a stable spreadsheet id from a sheet URL or bare id. */
export function spreadsheetId(sheetUrl: string): string | null {
  return spreadsheetIdFrom(sheetUrl);
}
