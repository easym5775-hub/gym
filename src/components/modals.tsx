import { useEffect, useState } from "react";
import type { Client, Goal, SessionType } from "../types";
import { GOALS, PLANS, SESSION_TYPES } from "../types";
import { addDays, daysLeft, fmtDate, latestWeight, todayISO, uid } from "../lib";
import { useApp } from "../store";
import { btnGhost, btnVolt, inputCls, labelCls, Modal } from "./ui";

/* ================= Client add / edit ================= */

interface FormState {
  name: string;
  phone: string;
  gender: "ذكر" | "أنثى";
  age: string;
  goal: Goal;
  startWeight: string;
  targetWeight: string;
  height: string;
  plan: string;
  subEnd: string;
  notes: string;
}

const blank: FormState = {
  name: "",
  phone: "",
  gender: "ذكر",
  age: "26",
  goal: "خسارة وزن",
  startWeight: "80",
  targetWeight: "70",
  height: "175",
  plan: "شهر",
  subEnd: addDays(todayISO(), 30),
  notes: "",
};

export function ClientFormModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Client | null;
  onClose: () => void;
  onSaved?: (c: Client) => void;
}) {
  const { addClient, updateClient } = useApp();
  const [f, setF] = useState<FormState>(blank);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (initial) {
      setF({
        name: initial.name,
        phone: initial.phone,
        gender: initial.gender,
        age: String(initial.age),
        goal: initial.goal,
        startWeight: String(initial.startWeight),
        targetWeight: String(initial.targetWeight),
        height: String(initial.height),
        plan: initial.plan,
        subEnd: initial.subEnd,
        notes: initial.notes,
      });
    } else {
      setF(blank);
    }
  }, [open, initial]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const pickPlan = (name: string) => {
    const plan = PLANS.find((p) => p.name === name) ?? PLANS[0];
    setF((s) => ({ ...s, plan: plan.name, subEnd: initial ? s.subEnd : addDays(todayISO(), plan.days) }));
  };

  const submit = () => {
    const name = f.name.trim();
    const phone = f.phone.trim();
    const sw = parseFloat(f.startWeight);
    const tw = parseFloat(f.targetWeight);
    if (!name || phone.replace(/\D/g, "").length < 11 || !(sw > 0) || !(tw > 0)) {
      setErr("كمّل البيانات: الاسم، رقم موبايل 11 رقم، ووزن بداية وهدف صحيحين.");
      return;
    }
    const plan = PLANS.find((p) => p.name === f.plan) ?? PLANS[0];
    const common = {
      name,
      phone,
      gender: f.gender,
      age: parseInt(f.age) || 0,
      goal: f.goal,
      startWeight: sw,
      targetWeight: tw,
      height: parseInt(f.height) || 0,
      plan: plan.name,
      planPrice: plan.price,
      subEnd: f.subEnd,
      notes: f.notes.trim(),
    };
    if (initial) {
      updateClient({ ...initial, ...common });
    } else {
      const created = addClient({
        ...common,
        joinDate: todayISO(),
        weights: [{ id: uid(), date: todayISO(), kg: sw }],
      });
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "تعديل بيانات العميل" : "عميل جديد"} wide>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>الاسم بالكامل *</label>
          <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: كريم حسن" />
        </div>
        <div>
          <label className={labelCls}>رقم الواتساب *</label>
          <input className={inputCls} dir="ltr" style={{ textAlign: "right" }} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01xxxxxxxxx" />
        </div>
        <div>
          <label className={labelCls}>النوع</label>
          <select className={inputCls} value={f.gender} onChange={(e) => set("gender", e.target.value as "ذكر" | "أنثى")}>
            <option>ذكر</option>
            <option>أنثى</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>السن</label>
          <input type="number" className={inputCls} value={f.age} onChange={(e) => set("age", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>الطول (سم)</label>
          <input type="number" className={inputCls} value={f.height} onChange={(e) => set("height", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>الهدف</label>
          <select className={inputCls} value={f.goal} onChange={(e) => set("goal", e.target.value as Goal)}>
            {GOALS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>وزن البداية (كجم)</label>
          <input type="number" step="0.1" className={inputCls} value={f.startWeight} onChange={(e) => set("startWeight", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>الوزن المستهدف (كجم)</label>
          <input type="number" step="0.1" className={inputCls} value={f.targetWeight} onChange={(e) => set("targetWeight", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>خطة الاشتراك</label>
          <select className={inputCls} value={f.plan} onChange={(e) => pickPlan(e.target.value)}>
            {PLANS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} — {p.price} ج.م
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>نهاية الاشتراك</label>
          <input type="date" className={inputCls} value={f.subEnd} onChange={(e) => set("subEnd", e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>ملاحظات (نظام الأكل، إصابات، تعليمات…)</label>
          <textarea rows={3} className={inputCls} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="أي حاجة مهمة تفتكرها عن العميل" />
        </div>
      </div>

      {err && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {err}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button className={`${btnVolt} flex-1`} onClick={submit}>
          {initial ? "حفظ التعديلات" : "إضافة العميل"}
        </button>
        <button className={btnGhost} onClick={onClose}>
          إلغاء
        </button>
      </div>
    </Modal>
  );
}

/* ================= Log weight ================= */

export function WeightModal({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const { logWeight, toast } = useApp();
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (client) {
      const last = latestWeight(client);
      setKg(last ? String(last.kg) : "");
      setDate(todayISO());
    }
  }, [client]);

  const last = client ? latestWeight(client) : undefined;

  const submit = () => {
    if (!client) return;
    const v = parseFloat(kg);
    if (!(v > 0) || v > 400) {
      toast("اكتب وزن صحيح الأول", "warn");
      return;
    }
    logWeight(client.id, v, date);
    onClose();
  };

  return (
    <Modal open={!!client} onClose={onClose} title={`تسجيل وزن ${client?.name ?? ""}`}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>الوزن (كجم)</label>
          <input
            type="number"
            step="0.1"
            autoFocus
            className={`${inputCls} font-display text-xl font-bold`}
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <div>
          <label className={labelCls}>التاريخ</label>
          <input type="date" className={inputCls} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      {last && (
        <p className="mt-3 text-xs text-pine-500">
          آخر وزن مسجّل: <span className="font-display font-bold text-pine-800">{last.kg} كجم</span>
        </p>
      )}
      <div className="mt-5 flex gap-2">
        <button className={`${btnVolt} flex-1`} onClick={submit}>
          تسجيل الوزن
        </button>
        <button className={btnGhost} onClick={onClose}>
          إلغاء
        </button>
      </div>
    </Modal>
  );
}

/* ================= Book a session ================= */

export function SessionModal({
  open,
  presetClient,
  presetDate,
  onClose,
}: {
  open: boolean;
  presetClient: Client | null;
  presetDate?: string;
  onClose: () => void;
}) {
  const { state, addSession, toast } = useApp();
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("18:00");
  const [type, setType] = useState<SessionType>("قوة");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setClientId(presetClient?.id ?? state.clients[0]?.id ?? "");
    setDate(presetDate ?? todayISO());
    setTime("18:00");
    setType("قوة");
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetClient, presetDate]);

  const submit = () => {
    if (!clientId || !date || !time) {
      toast("اختار العميل والموعد الأول", "warn");
      return;
    }
    addSession({ clientId, date, time, type, note: note.trim() || undefined });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="حجز جلسة جديدة">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>العميل</label>
          <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={!!presetClient}>
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>اليوم</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>الوقت</label>
          <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>نوع الجلسة</label>
          <div className="flex flex-wrap gap-1.5">
            {SESSION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  type === t
                    ? "border-pine-700 bg-pine-800 text-volt-300"
                    : "border-pine-200 bg-white text-pine-700 hover:border-pine-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>ملاحظة (اختياري)</label>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: نكمل برنامج الرجل" />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button className={`${btnVolt} flex-1`} onClick={submit}>
          حجز الجلسة
        </button>
        <button className={btnGhost} onClick={onClose}>
          إلغاء
        </button>
      </div>
    </Modal>
  );
}

/* ================= Renew subscription ================= */

export function RenewModal({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const { renew } = useApp();
  const [plan, setPlan] = useState(PLANS[0].name);

  useEffect(() => {
    if (client) setPlan(PLANS[0].name);
  }, [client]);

  if (!client) return null;
  const chosen = PLANS.find((p) => p.name === plan) ?? PLANS[0];
  const base = daysLeft(client.subEnd) > 0 ? client.subEnd : todayISO();
  const newEnd = addDays(base, chosen.days);

  return (
    <Modal open onClose={onClose} title={`تجديد اشتراك ${client.name}`}>
      <p className="mb-3 text-xs text-pine-500">
        الاشتراك الحالي: <span className="font-semibold text-pine-800">{client.plan}</span> — {daysLeft(client.subEnd) >= 0 ? `بينتهي ${fmtDate(client.subEnd)}` : `انتهى ${fmtDate(client.subEnd)}`}
      </p>
      <div className="grid gap-2">
        {PLANS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setPlan(p.name)}
            className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 text-start transition ${
              plan === p.name
                ? "border-volt-500 bg-volt-100/60"
                : "border-pine-100 bg-white hover:border-pine-300"
            }`}
          >
            <span>
              <span className="block font-display text-base font-bold text-pine-950">{p.name}</span>
              <span className="text-[11px] text-pine-500">{p.days} يوم تدريب ومتابعة</span>
            </span>
            <span className="font-display text-lg font-bold text-pine-700">{p.price} ج.م</span>
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-pine-50 px-3 py-2 text-xs font-semibold text-pine-700">
        الاشتراك الجديد هيمتد حتى <span className="font-display text-pine-950">{fmtDate(newEnd)}</span>
        {daysLeft(client.subEnd) > 0 && " (مكمل من نهاية الحالي)"}
      </p>
      <div className="mt-4 flex gap-2">
        <button
          className={`${btnVolt} flex-1`}
          onClick={() => {
            renew(client.id, plan);
            onClose();
          }}
        >
          تأكيد التجديد — {chosen.price} ج.م
        </button>
        <button className={btnGhost} onClick={onClose}>
          إلغاء
        </button>
      </div>
    </Modal>
  );
}
