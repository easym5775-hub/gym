export type Goal = "Lose weight" | "Build muscle" | "General fitness";
export type ClientStatus = "Active" | "Paused" | "Completed";
export type ExerciseCategory = "Chest" | "Back" | "Legs" | "Arms" | "Core" | "Cardio";
export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
export type CoachView = "dashboard" | "clients" | "plans" | "meals" | "library" | "checkins";

/* ---------- tables ---------- */

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  goal: Goal;
  startDate: string; // ISO
  status: ClientStatus;
  notes: string;
  photo?: string; // data URL
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  description: string;
  videoUrl: string; // YouTube link
  image?: string;
}

export interface PlanItem {
  id: string;
  clientId: string;
  day: number; // 1..7 (Day 1 = Monday)
  exerciseId: string;
  sets: number;
  reps: number;
  rest: number; // seconds
  notes: string;
}

export interface CheckIn {
  id: string;
  clientId: string;
  date: string; // ISO
  ts: number; // insertion order
  weight: number; // kg
  waist?: number; // cm
  mood: number; // 1..5
  water: number; // liters
  workoutDone: boolean;
  notes?: string;
  photo?: string;
}

export interface Meal {
  id: string;
  clientId: string;
  type: MealType;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface AppState {
  clients: Client[];
  exercises: Exercise[];
  plans: PlanItem[];
  checkIns: CheckIn[];
  meals: Meal[];
}

/* ---------- constants ---------- */

export const GOALS: Goal[] = ["Lose weight", "Build muscle", "General fitness"];
export const STATUSES: ClientStatus[] = ["Active", "Paused", "Completed"];
export const CATEGORIES: ExerciseCategory[] = ["Chest", "Back", "Legs", "Arms", "Core", "Cardio"];
export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const WEEK_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const GOAL_META: Record<Goal, { chip: string; dot: string; bar: string }> = {
  "Lose weight": {
    chip: "border-warn-400/25 bg-warn-400/10 text-warn-300",
    dot: "bg-warn-400",
    bar: "bg-warn-400",
  },
  "Build muscle": {
    chip: "border-volt-400/25 bg-volt-400/10 text-volt-300",
    dot: "bg-volt-400",
    bar: "bg-volt-400",
  },
  "General fitness": {
    chip: "border-moss-400/25 bg-moss-400/10 text-moss-300",
    dot: "bg-moss-400",
    bar: "bg-moss-400",
  },
};

export const STATUS_META: Record<ClientStatus, { chip: string; dot: string }> = {
  Active: { chip: "border-volt-400/25 bg-volt-400/10 text-volt-300", dot: "bg-volt-400" },
  Paused: { chip: "border-warn-400/25 bg-warn-400/10 text-warn-300", dot: "bg-warn-400" },
  Completed: { chip: "border-night-500/50 bg-night-500/20 text-mist-300", dot: "bg-mist-400" },
};

export const CAT_META: Record<ExerciseCategory, { chip: string; dot: string }> = {
  Chest: { chip: "border-rose-400/25 bg-rose-400/10 text-rose-300", dot: "bg-rose-400" },
  Back: { chip: "border-sky-400/25 bg-sky-400/10 text-sky-300", dot: "bg-sky-400" },
  Legs: { chip: "border-amber-400/25 bg-amber-400/10 text-amber-300", dot: "bg-amber-400" },
  Arms: { chip: "border-orange-400/25 bg-orange-400/10 text-orange-300", dot: "bg-orange-400" },
  Core: { chip: "border-volt-400/25 bg-volt-400/10 text-volt-300", dot: "bg-volt-400" },
  Cardio: { chip: "border-red-400/25 bg-red-400/10 text-red-300", dot: "bg-red-400" },
};

export const MEAL_META: Record<MealType, { chip: string; dot: string }> = {
  Breakfast: { chip: "border-amber-400/25 bg-amber-400/10 text-amber-300", dot: "bg-amber-400" },
  Lunch: { chip: "border-volt-400/25 bg-volt-400/10 text-volt-300", dot: "bg-volt-400" },
  Dinner: { chip: "border-teal-400/25 bg-teal-400/10 text-teal-300", dot: "bg-teal-400" },
  Snack: { chip: "border-rose-400/25 bg-rose-400/10 text-rose-300", dot: "bg-rose-400" },
};
