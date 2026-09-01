export type View = "dashboard" | "clients" | "client" | "schedule" | "payments";

export type Goal = "خسارة وزن" | "زيادة عضلية" | "لياقة عامة" | "شد وقوام";

export type SessionType = "قوة" | "كارديو" | "HIIT" | "مرونة" | "قياسات";

export interface WeightEntry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  kg: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  gender: "ذكر" | "أنثى";
  age: number;
  goal: Goal;
  startWeight: number;
  targetWeight: number;
  height: number; // سم
  plan: string;
  planPrice: number;
  subEnd: string; // ISO
  joinDate: string; // ISO
  notes: string;
  color: string; // avatar palette key
  weights: WeightEntry[];
}

export interface Session {
  id: string;
  clientId: string;
  date: string; // ISO
  time: string; // HH:mm
  type: SessionType;
  done: boolean;
  note?: string;
}

export interface Payment {
  id: string;
  clientId: string;
  date: string; // ISO
  amount: number;
  plan: string;
}

export interface AppState {
  clients: Client[];
  sessions: Session[];
  payments: Payment[];
}

export const GOALS: Goal[] = ["خسارة وزن", "زيادة عضلية", "لياقة عامة", "شد وقوام"];

export const SESSION_TYPES: SessionType[] = ["قوة", "كارديو", "HIIT", "مرونة", "قياسات"];

export interface Plan {
  name: string;
  days: number;
  price: number;
}

export const PLANS: Plan[] = [
  { name: "شهر", days: 30, price: 1200 },
  { name: "6 أسابيع", days: 45, price: 1600 },
  { name: "3 شهور", days: 90, price: 3000 },
];

export const GOAL_META: Record<Goal, { badge: string }> = {
  "خسارة وزن": { badge: "bg-teal-100 text-teal-800 border-teal-200" },
  "زيادة عضلية": { badge: "bg-orange-100 text-orange-800 border-orange-200" },
  "لياقة عامة": { badge: "bg-sky-100 text-sky-800 border-sky-200" },
  "شد وقوام": { badge: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" },
};

export const SESSION_TYPE_META: Record<SessionType, { chip: string; dot: string }> = {
  قوة: { chip: "bg-pine-100 text-pine-800", dot: "bg-pine-600" },
  كارديو: { chip: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  HIIT: { chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  مرونة: { chip: "bg-teal-100 text-teal-800", dot: "bg-teal-500" },
  قياسات: { chip: "bg-fuchsia-100 text-fuchsia-800", dot: "bg-fuchsia-500" },
};

export const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  pine: { bg: "bg-pine-700", text: "text-volt-300" },
  teal: { bg: "bg-teal-700", text: "text-teal-50" },
  orange: { bg: "bg-orange-600", text: "text-orange-50" },
  plum: { bg: "bg-fuchsia-800", text: "text-fuchsia-50" },
  slate: { bg: "bg-slate-700", text: "text-slate-50" },
  amber: { bg: "bg-amber-600", text: "text-amber-50" },
};
