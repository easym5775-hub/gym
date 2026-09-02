/* ================================================================
   FORGE — small pure helpers (dates, ids, phones, images)
   ================================================================ */

import { v4 as uuidv4 } from "uuid";

/** RFC-4122 uuid — Postgres `uuid` columns require this shape. */
export const uuid = (): string => uuidv4();

/** Short local id for notes etc. (never used as a Postgres PK). */
export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fromISO = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export const todayISO = (): string => toISO(new Date());

export const addDays = (iso: string, n: number): string => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const fmtDate = (iso: string): string => {
  if (!iso) return "—";
  return fromISO(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

export const fmtShort = (iso: string): string => {
  if (!iso) return "—";
  return fromISO(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const relDay = (iso: string): string => {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return fmtDate(iso);
};

/** Monday = 1 ... Sunday = 7 */
export const dayNum = (d: Date = new Date()): number => ((d.getDay() + 6) % 7) + 1;

/** Whole days from `fromIso` to `toIso` (positive when `toIso` is later). */
export const diffDays = (fromIso: string, toIso: string): number =>
  Math.round((fromISO(toIso).getTime() - fromISO(fromIso).getTime()) / 86_400_000);

export const fmtTime = (t: string): string => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const hr = ((h ?? 0) + 11) % 12 + 1;
  const ap = (h ?? 0) >= 12 ? "PM" : "AM";
  return `${String(hr).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")} ${ap}`;
};

export const fmtMoney = (n: number): string => n.toLocaleString("en-US");

export const round1 = (n: number): number => Math.round(n * 10) / 10;

export const signed = (n: number): string => `${n > 0 ? "+" : ""}${round1(n)}`;

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export const hueOf = (s: string): number => {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

/**
 * Normalise a phone number for wa.me — supports Egyptian local formats
 * (01xxxxxxxxx, 201xxxxxxxxx, +201xxxxxxxxx, 00201xxxxxxxxx) as well as
 * international numbers. Returns null when nothing usable remains.
 */
export function normalizePhone(raw?: string): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = `2${digits}`; // Egypt local → intl
  if (digits.length < 7) return null;
  return digits;
}

export function waHref(raw?: string): string | null {
  const digits = normalizePhone(raw);
  return digits ? `https://wa.me/${digits}` : null;
}

/** Read + downscale an image file to a compact JPEG data URL. */
export function fileToDataUrl(file: File, max = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext("2d");
      if (!ctx) {
        resolve(url);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === "string" ? e : "Something went wrong";

/** A random human-friendly password for new client accounts. */
export function randomPassword(): string {
  const words = ["forge", "lift", "iron", "pulse", "core", "surge", "grit", "peak"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `${w}-${n}-Go`;
}

export const isValidUsername = (u: string): boolean => /^[a-z0-9_.-]{3,24}$/.test(u.toLowerCase());
