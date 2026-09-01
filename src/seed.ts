import type { AppState, Client, Payment, Session, SessionType, WeightEntry } from "./types";
import { addDays, todayISO, uid, weekDates } from "./lib";

/** deterministic weekly weight series from `start` toward `end` */
function series(start: number, end: number, n: number, wob: number[]): WeightEntry[] {
  const out: WeightEntry[] = [];
  const t0 = addDays(todayISO(), -(n - 1) * 7);
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const kg = +(start + (end - start) * p + wob[i % wob.length] * Math.sin(i * 2.3)).toFixed(1);
    out.push({ id: uid(), date: addDays(t0, i * 7), kg });
  }
  return out;
}

const c = (
  name: string,
  phone: string,
  gender: "ذكر" | "أنثى",
  age: number,
  goal: Client["goal"],
  startWeight: number,
  targetWeight: number,
  height: number,
  plan: string,
  planPrice: number,
  subEndIn: number,
  joinedAgo: number,
  color: string,
  notes: string,
  weights: WeightEntry[],
): Client => ({
  id: uid(),
  name,
  phone,
  gender,
  age,
  goal,
  startWeight,
  targetWeight,
  height,
  plan,
  planPrice,
  subEnd: addDays(todayISO(), subEndIn),
  joinDate: addDays(todayISO(), -joinedAgo),
  notes,
  color,
  weights,
});

export function makeSeed(): AppState {
  const clients: Client[] = [
    c("أحمد الشناوي", "01012457836", "ذكر", 29, "خسارة وزن", 96, 82, 181, "شهر", 1200, 12, 75, "pine",
      "بيتمرن 4 أيام في الأسبوع. شغل مكتبي طويل — يحتاج كارديو خفيف بعد كل جلسة حديد.",
      series(96, 89.4, 11, [0.35, -0.25, 0.15, 0.3])),
    c("سارة محمد", "01098224571", "أنثى", 26, "شد وقوام", 74, 65, 165, "شهر", 1200, 3, 60, "plum",
      "تركيز على البطن والأرجل. تفضل تمارين المقاومة الخفيفة بمرات عالية.",
      series(74, 69.8, 9, [0.25, -0.2, 0.3, -0.15])),
    c("محمود عادل", "01066123984", "ذكر", 24, "زيادة عضلية", 70, 78, 176, "3 شهور", 3000, 25, 80, "teal",
      "بيزنس على وجبات زيادة السعرات. راحة يومين فقط في الأسبوع.",
      series(70, 74.6, 11, [0.2, 0.3, -0.15, 0.25])),
    c("ياسمين علي", "01123789450", "أنثى", 31, "خسارة وزن", 88, 72, 168, "شهر", 1200, -2, 95, "orange",
      "محتاجة متابعة أكتر في الدايت — آخر أسبوعين كان في خروج عن النظام. جددي الاشتراك أول ما تتواصلي.",
      series(88, 80.2, 12, [0.4, -0.3, 0.2, -0.2])),
    c("عمر خالد", "01033871265", "ذكر", 35, "لياقة عامة", 82, 75, 178, "6 أسابيع", 1600, 41, 40, "slate",
      "بيجري 5ك مرتين في الأسبوع من نفسه. الجلسة معاه تركيز على القوة والمرونة.",
      series(82, 78.1, 6, [0.3, -0.25, 0.2, 0.15])),
    c("نورهان أحمد", "01287650943", "أنثى", 28, "خسارة وزن", 79, 68, 162, "شهر", 1200, 5, 55, "amber",
      "التزام ممتاز في الدايت. نزود كثافة الكارديو الفترة الجاية.",
      series(79, 72.5, 8, [0.3, -0.2, 0.25, -0.3])),
    c("مصطفى إبراهيم", "01045612378", "ذكر", 22, "زيادة عضلية", 64, 72, 174, "3 شهور", 3000, 60, 30, "teal",
      "مبتدئ — شغال على أساسيات الحركات الكبيرة (سكوات، ديدلفت، بنش).",
      series(64, 67.9, 5, [0.15, 0.25, -0.1, 0.2])),
    c("هبة سامي", "01156782340", "أنثى", 33, "لياقة عامة", 70, 63, 160, "شهر", 1200, 18, 50, "orange",
      "بعد إصابة قديمة في الركبة — نتجنب القفزات العالية ونركز على التقوية.",
      series(70, 67.3, 8, [0.2, -0.3, 0.15, -0.2])),
  ];

  const [c1, c2, c3, c4, c5, c6, c7, c8] = clients;
  const today = todayISO();
  const wd = weekDates(new Date());

  const s = (cl: Client, date: string, time: string, type: SessionType, done = false): Session => ({
    id: uid(),
    clientId: cl.id,
    date,
    time,
    type,
    done,
  });

  const sessions: Session[] = [
    // earlier in the week (done)
    s(c1, wd[0], "18:00", "قوة", wd[0] < today),
    s(c2, wd[0], "19:30", "كارديو", wd[0] < today),
    s(c3, wd[1], "07:30", "قوة", wd[1] < today),
    s(c4, wd[1], "18:00", "HIIT", wd[1] < today),
    s(c6, wd[2], "20:00", "قياسات", wd[2] < today),
    s(c5, wd[2], "08:00", "كارديو", wd[2] < today),
    s(c2, wd[3], "19:30", "قوة", wd[3] < today),
    // today
    s(c1, today, "07:00", "قوة", true),
    s(c6, today, "18:30", "قوة"),
    s(c8, today, "20:00", "مرونة"),
    // rest of the week
    s(c3, addDays(today, 1), "07:30", "قوة"),
    s(c2, addDays(today, 1), "19:30", "HIIT"),
    s(c7, addDays(today, 2), "18:00", "قوة"),
    s(c8, addDays(today, 2), "09:00", "كارديو"),
    s(c5, wd[6], "10:00", "HIIT"),
    s(c1, wd[6], "18:00", "كارديو"),
    // history for client profiles
    s(c1, addDays(today, -9), "18:00", "قوة", true),
    s(c1, addDays(today, -12), "18:00", "كارديو", true),
    s(c2, addDays(today, -8), "19:30", "مرونة", true),
    s(c4, addDays(today, -10), "18:00", "قوة", true),
    s(c3, addDays(today, -11), "07:30", "قياسات", true),
  ].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const p = (cl: Client, ago: number, amount: number, plan: string): Payment => ({
    id: uid(),
    clientId: cl.id,
    date: addDays(todayISO(), -ago),
    amount,
    plan,
  });

  const payments: Payment[] = [
    p(c1, 75, 1200, "شهر"), p(c1, 45, 1200, "شهر"), p(c1, 18, 1200, "شهر"), p(c1, 105, 1200, "شهر"),
    p(c2, 60, 1200, "شهر"), p(c2, 27, 1200, "شهر"), p(c2, 90, 1200, "شهر"),
    p(c3, 80, 1200, "شهر"), p(c3, 65, 3000, "3 شهور"),
    p(c4, 95, 1200, "شهر"), p(c4, 64, 1200, "شهر"), p(c4, 32, 1200, "شهر"), p(c4, 126, 1200, "شهر"),
    p(c5, 40, 1600, "6 أسابيع"), p(c5, 4, 1600, "6 أسابيع"), p(c5, 85, 1600, "6 أسابيع"),
    p(c6, 55, 1200, "شهر"), p(c6, 25, 1200, "شهر"), p(c6, 86, 1200, "شهر"),
    p(c7, 30, 3000, "3 شهور"),
    p(c8, 50, 1200, "شهر"), p(c8, 12, 1200, "شهر"), p(c8, 81, 1200, "شهر"),
  ];

  return { clients, sessions, payments };
}
