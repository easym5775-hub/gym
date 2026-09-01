import type { Payment, WeightEntry } from "../types";
import { fmtDateShort, monthKey } from "../lib";

/* ---------- weight progress line chart (RTL: old → right, new → left) ---------- */

export function WeightChart({
  entries,
  target,
  start,
}: {
  entries: WeightEntry[];
  target: number;
  start: number;
}) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) {
    return (
      <div className="grid h-44 place-items-center rounded-lg bg-pine-50/60 text-xs text-pine-400">
        سجّل وزنين على الأقل علشان يظهر منحنى التقدّم
      </div>
    );
  }

  const W = 620;
  const H = 250;
  const padT = 16;
  const padB = 32;
  const padR = 44; // labels side (start side in RTL)
  const padL = 14;
  const kgs = sorted.map((e) => e.kg);
  const min = Math.min(target, ...kgs) - 1.4;
  const max = Math.max(target, start, ...kgs) + 1.4;
  const n = sorted.length;
  const x = (i: number) => padL + (W - padL - padR) * (1 - i / (n - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));

  const pts = sorted.map((e, i) => `${x(i).toFixed(1)},${y(e.kg).toFixed(1)}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${x(n - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;
  const yTarget = y(target);
  const last = sorted[n - 1];
  const mid = sorted[Math.floor((n - 1) / 2)];

  const gridFr = [0, 1 / 3, 2 / 3, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="منحنى الوزن">
      <defs>
        <linearGradient id="wArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f8360" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#3f8360" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {gridFr.map((f) => {
        const v = min + (max - min) * f;
        const gy = y(v);
        return (
          <g key={f}>
            <line x1={padL} x2={W - padR + 8} y1={gy} y2={gy} stroke="#dcebe1" strokeWidth="1" />
            <text x={W - padR + 14} y={gy + 4} fontSize="11" fill="#7d9185" fontFamily="var(--font-display)">
              {Math.round(v)}
            </text>
          </g>
        );
      })}

      {/* target line */}
      <line
        x1={padL}
        x2={W - padR + 8}
        y1={yTarget}
        y2={yTarget}
        stroke="#d9a514"
        strokeWidth="1.4"
        strokeDasharray="6 5"
      />
      <text x={padL + 2} y={yTarget - 7} fontSize="11" fontWeight="700" fill="#b7890a">
        الهدف {target} كجم
      </text>

      <path d={area} fill="url(#wArea)" />
      <path d={line} fill="none" stroke="#256b4b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />

      {sorted.map((e, i) =>
        i === n - 1 ? null : (
          <circle key={e.id} cx={x(i)} cy={y(e.kg)} r="3.4" fill="#fff" stroke="#256b4b" strokeWidth="2" />
        ),
      )}

      {/* pulsing latest point */}
      <circle cx={x(n - 1)} cy={y(last.kg)} r="11" fill="#3f8360" opacity="0.25" className="ring-pulse" />
      <circle cx={x(n - 1)} cy={y(last.kg)} r="5" fill="#d8f24b" stroke="#17573b" strokeWidth="2.4" />
      <text
        x={x(n - 1)}
        y={y(last.kg) - 12}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#10452e"
        fontFamily="var(--font-display)"
      >
        {last.kg}
      </text>

      {/* date labels */}
      <text x={x(0)} y={H - 10} textAnchor="middle" fontSize="11" fill="#7d9185">
        {fmtDateShort(sorted[0].date)}
      </text>
      <text x={x(Math.floor((n - 1) / 2))} y={H - 10} textAnchor="middle" fontSize="11" fill="#7d9185">
        {fmtDateShort(mid.date)}
      </text>
      <text x={x(n - 1)} y={H - 10} textAnchor="middle" fontSize="11" fill="#7d9185">
        {fmtDateShort(last.date)}
      </text>
    </svg>
  );
}

/* ---------- small sparkline ---------- */

export function Sparkline({ values, stroke = "#3f8360" }: { values: number[]; stroke?: string }) {
  if (values.length < 2) return null;
  const W = 96;
  const H = 30;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - min) / span) * (H - 6)).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-24" aria-hidden>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(W).toFixed(1)}
        cy={(H - 3 - ((values[values.length - 1] - min) / span) * (H - 6)).toFixed(1)}
        r="2.6"
        fill={stroke}
      />
    </svg>
  );
}

/* ---------- revenue bars, last 6 months ---------- */

export function RevenueBars({ payments }: { payments: Payment[] }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { month: "short" }).format(d);
    return { key, label, total: 0, current: i === 5 };
  });
  for (const p of payments) {
    const m = months.find((x) => x.key === monthKey(p.date));
    if (m) m.total += p.amount;
  }
  const max = Math.max(...months.map((m) => m.total), 1);

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {months.map((m, i) => (
        <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span
            className={`font-display text-[11px] font-semibold ${
              m.total > 0 ? "text-pine-800" : "text-pine-200"
            }`}
          >
            {m.total > 0 ? m.total.toLocaleString("en-US") : ""}
          </span>
          <div className="flex h-32 w-full items-end sm:h-36" title={`${m.label}: ${m.total} ج.م`}>
            <div
              className={`bar-grow w-full rounded-t-md ${
                m.current
                  ? "border border-volt-600/50 bg-volt-400"
                  : m.total > 0
                    ? "bg-gradient-to-b from-pine-400 to-pine-700"
                    : "bg-pine-100"
              }`}
              style={{
                height: m.total > 0 ? `${Math.max(6, (m.total / max) * 100)}%` : "4px",
                animationDelay: `${i * 70}ms`,
              }}
            />
          </div>
          <span
            className={`text-[11px] ${m.current ? "font-bold text-pine-950" : "text-pine-500"}`}
          >
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
}
