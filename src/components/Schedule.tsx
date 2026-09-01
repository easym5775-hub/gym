import { useState } from "react";
import type { View } from "../types";
import { SESSION_TYPE_META } from "../types";
import { addDays, fmtDate, fmtTime, fromISO, toISO, todayISO, WEEKDAYS, weekDates } from "../lib";
import { useApp } from "../store";
import { btnVolt } from "./ui";
import { SessionModal } from "./modals";
import { IconCheck, IconChevronLeft, IconChevronRight, IconPlus, IconX } from "../icons";

export function Schedule({ go }: { go: (v: View, id?: string) => void }) {
  const { state, toggleSession, deleteSession } = useApp();
  const [anchor, setAnchor] = useState(() => new Date());
  const [sessionOpen, setSessionOpen] = useState(false);
  const [presetDate, setPresetDate] = useState<string | undefined>(undefined);

  const days = weekDates(anchor);
  const today = todayISO();
  const weekSessions = state.sessions.filter((s) => days.includes(s.date));
  const doneCount = weekSessions.filter((s) => s.done).length;

  const shift = (dir: number) => setAnchor((a) => fromISO(addDays(toISO(a), dir * 7)));
  const isThisWeek = days.includes(today);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-pine-950">جدول الجلسات</h1>
          <p className="mt-1 text-sm text-pine-500">
            الأسبوع من <span className="font-semibold text-pine-800">{fmtDate(days[0])}</span> إلى{" "}
            <span className="font-semibold text-pine-800">{fmtDate(days[6])}</span> — {weekSessions.length} جلسة، خلص منهم {doneCount}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-pine-200 bg-white">
            <button onClick={() => shift(-1)} aria-label="الأسبوع السابق" className="grid h-9 w-9 cursor-pointer place-items-center rounded-s-lg text-pine-500 transition hover:bg-pine-50 hover:text-pine-800">
              <IconChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className={`h-9 cursor-pointer border-x border-pine-100 px-3 text-xs font-bold transition ${
                isThisWeek ? "text-pine-300" : "text-pine-700 hover:bg-pine-50"
              }`}
            >
              النهارده
            </button>
            <button onClick={() => shift(1)} aria-label="الأسبوع القادم" className="grid h-9 w-9 cursor-pointer place-items-center rounded-e-lg text-pine-500 transition hover:bg-pine-50 hover:text-pine-800">
              <IconChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <button
            className={`${btnVolt} h-11`}
            onClick={() => {
              setPresetDate(today);
              setSessionOpen(true);
            }}
          >
            <IconPlus className="h-4 w-4" strokeWidth={2.4} />
            حجز جلسة
          </button>
        </div>
      </header>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="grid min-w-[1000px] grid-cols-7 gap-2">
          {days.map((date, i) => {
            const isToday = date === today;
            const list = state.sessions.filter((s) => s.date === date).sort((a, b) => a.time.localeCompare(b.time));
            return (
              <div
                key={date}
                className={`rise flex flex-col rounded-xl border bg-white shadow-sm ${
                  isToday ? "border-volt-500 ring-2 ring-volt-400/40" : "border-pine-100"
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className={`rounded-t-xl border-b px-3 py-2.5 text-center ${isToday ? "border-volt-500/40 bg-volt-300/40" : "border-pine-100/70 bg-pine-50/50"}`}>
                  <p className="font-display text-[13px] font-bold leading-4 text-pine-950">{WEEKDAYS[i]}</p>
                  <p className={`text-[10.5px] font-semibold ${isToday ? "text-pine-800" : "text-pine-400"}`}>
                    {isToday ? "النهارده" : fmtDate(date)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPresetDate(date);
                    setSessionOpen(true);
                  }}
                  className="flex cursor-pointer items-center justify-center gap-1 border-b border-dashed border-pine-100 py-1.5 text-[10.5px] font-bold text-pine-300 transition hover:bg-pine-50 hover:text-pine-700"
                >
                  <IconPlus className="h-3 w-3" strokeWidth={2.6} />
                  إضافة
                </button>
                <div className="flex min-h-[92px] flex-1 flex-col gap-1.5 p-1.5">
                  {list.length === 0 && (
                    <p className="flex flex-1 items-center justify-center text-[10.5px] font-medium text-pine-200">
                      مفيش جلسات
                    </p>
                  )}
                  {list.map((s) => {
                    const c = state.clients.find((x) => x.id === s.clientId);
                    const tm = SESSION_TYPE_META[s.type];
                    return (
                      <div
                        key={s.id}
                        className={`group rounded-lg border border-pine-100 bg-white p-2 shadow-sm transition hover:border-pine-300 hover:shadow ${
                          s.done ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-display text-[13px] font-bold leading-4 text-pine-900">{fmtTime(s.time)}</span>
                          <button
                            onClick={() => toggleSession(s.id)}
                            aria-label="تمت الجلسة؟"
                            className={`ms-auto grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full border-2 transition ${
                              s.done ? "border-pine-600 bg-pine-600 text-white" : "border-pine-200 text-transparent hover:border-pine-500"
                            }`}
                          >
                            <IconCheck className="h-3 w-3" strokeWidth={3.2} />
                          </button>
                          <button
                            onClick={() => deleteSession(s.id)}
                            aria-label="إلغاء الجلسة"
                            className="grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full text-pine-200 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                          >
                            <IconX className="h-3 w-3" strokeWidth={2.6} />
                          </button>
                        </div>
                        <button
                          onClick={() => c && go("client", c.id)}
                          className="mt-0.5 block w-full cursor-pointer truncate text-start text-[11.5px] font-bold text-pine-800 hover:text-pine-600 hover:underline"
                        >
                          {c?.name ?? "عميل"}
                        </button>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-pine-400">
                          <span className={`h-1.5 w-1.5 rounded-full ${tm.dot}`} />
                          {s.type}
                          {s.note && <span className="truncate font-medium"> — {s.note}</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SessionModal open={sessionOpen} presetDate={presetDate} presetClient={null} onClose={() => setSessionOpen(false)} />
    </div>
  );
}
