export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const todayISO = () => toISO(new Date());

export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const fmtDate = (iso: string) =>
  fromISO(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export const fmtShort = (iso: string) =>
  fromISO(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Monday = 1 ... Sunday = 7 */
export const dayNum = (d: Date = new Date()) => ((d.getDay() + 6) % 7) + 1;

export const relDay = (iso: string) => {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return fmtDate(iso);
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export const hueOf = (s: string) => {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

export const round1 = (n: number) => Math.round(n * 10) / 10;

export const fmtKg = (n: number) => `${round1(n)}`;

export const signed = (n: number) => `${n > 0 ? "+" : ""}${round1(n)}`;

/** Read + downscale an image file to a compact JPEG data URL (safe for localStorage). */
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
