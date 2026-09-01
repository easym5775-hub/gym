import type { Client } from "./types";
import { PLANS } from "./types";

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const toISO = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export const todayISO = () => toISO(new Date());

// noon avoids timezone off-by-one issues
export const fromISO = (iso: string) => new Date(`${iso}T12:00:00`);

export const addDays = (iso: string, days: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
};

export const daysBetween = (a: string, b: string) =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);

export const daysLeft = (iso: string) => daysBetween(todayISO(), iso);

const num = "ar-EG-u-nu-latn";

export const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat(num, { day: "numeric", month: "long" }).format(fromISO(iso));

export const fmtDateShort = (iso: string) =>
  new Intl.DateTimeFormat(num, { day: "numeric", month: "short" }).format(fromISO(iso));

export const fmtFullToday = () =>
  new Intl.DateTimeFormat(num, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

export const fmtWeekday = (iso: string) =>
  new Intl.DateTimeFormat(num, { weekday: "long" }).format(fromISO(iso));

export const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "ص" : "م"}`;
};

export const fmtMoney = (n: number) => `${n.toLocaleString("en-US")} ج.م`;

export type SubState = "active" | "soon" | "expired";

export const subState = (c: Client): SubState => {
  const d = daysLeft(c.subEnd);
  if (d < 0) return "expired";
  if (d <= 7) return "soon";
  return "active";
};

export const SUB_META: Record<SubState, { label: string; badge: string; dot: string; text: string }> = {
  active: {
    label: "نشط",
    badge: "bg-pine-100 text-pine-800 border-pine-200",
    dot: "bg-pine-500",
    text: "text-pine-700",
  },
  soon: {
    label: "ينتهي قريبًا",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  expired: {
    label: "منتهي",
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    text: "text-red-600",
  },
};

export const subDaysLabel = (c: Client) => {
  const d = daysLeft(c.subEnd);
  if (d < 0) return `منتهي من ${Math.abs(d) === 1 ? "يوم" : `${Math.abs(d)} أيام`}`;
  if (d === 0) return "بينتهي النهارده";
  if (d === 1) return "باقي يوم واحد";
  return `باقي ${d} يوم`;
};

export const planDaysOf = (c: Client) =>
  PLANS.find((p) => p.name === c.plan)?.days ?? 30;

export const subProgress = (c: Client) => {
  const total = planDaysOf(c);
  const left = Math.max(0, daysLeft(c.subEnd));
  return Math.min(100, Math.max(0, Math.round((left / total) * 100)));
};

export const latestWeight = (c: Client) =>
  c.weights.length
    ? c.weights.reduce((a, b) => (a.date > b.date ? a : b))
    : undefined;

export const weightDelta = (c: Client) => {
  const last = latestWeight(c);
  return last ? +(last.kg - c.startWeight).toFixed(1) : 0;
};

export const goalIsGain = (c: Client) => c.goal === "زيادة عضلية";

export const waLink = (phone: string, msg?: string) =>
  `https://wa.me/2${phone.replace(/\D/g, "")}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

/* ---- week helpers (Egyptian week starts Saturday) ---- */

export const WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export const weekDates = (anchor: Date): string[] => {
  const d = new Date(anchor);
  const back = (d.getDay() + 1) % 7; // days since Saturday
  d.setDate(d.getDate() - back);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(x.getDate() + i);
    return toISO(x);
  });
};

export const monthKey = (iso: string) => iso.slice(0, 7);

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
