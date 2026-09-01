import type { CheckIn } from "../types";
import { fmtShort } from "../lib";

/* ---------- weight line (dark theme) ---------- */

export function WeightLine({ entries }: { entries: CheckIn[] }) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
  if (sorted.length < 2) {
    return (
      <div className="grid h-44 place-items-center rounded-lg border border-night-700 bg-night-800/50 text-xs text-mist-500">
        Log at least two check-ins to draw your trend
      </div>
    );
  }

  const W = 620;
  const H = 240;
  const padT = 18;
  const padB = 30;
  const padL = 16;
  const padR = 46;
  const ws = sorted.map((e) => e.weight);
  const min = Math.min(...ws) - 1.2;
  const max = Math.max(...ws) + 1.2;
  const n = sorted.length;
  const x = (i: number) => padL + (W - padL - padR) * (1 - i / (n - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));

  const pts = sorted.map((e, i) => `${x(i).toFixed(1)},${y(e.weight).toFixed(1)}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${x(n - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;
  const last = sorted[n - 1];
  const mid = sorted[Math.floor((n - 1) / 2)];
  const gridFr = [0, 1 / 3, 2 / 3, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weight trend">
      <defs>
        <linearGradient id="wgArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cdf14b" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#cdf14b" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridFr.map((f) => {
        const v = min + (max - min) * f;
        const gy = y(v);
        return (
          <g key={f}>
            <line x1={padL} x2={W - padR + 6} y1={gy} y2={gy} stroke="#1a251d" strokeWidth="1" />
            <text x={W - padR + 12} y={gy + 4} fontSize="11" fill="#7c9486" fontFamily="var(--font-display)">
              {v.toFixed(1)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#wgArea)" />
      <path d={line} fill="none" stroke="#cdf14b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {sorted.map((e, i) =>
        i === n - 1 ? null : (
          <circle key={e.id} cx={x(i)} cy={y(e.weight)} r="3" fill="#0f1611" stroke="#cdf14b" strokeWidth="2" />
        ),
      )}
      <circle cx={x(n - 1)} cy={y(last.weight)} r="11" fill="#cdf14b" opacity="0.2" className="ring-pulse" />
      <circle cx={x(n - 1)} cy={y(last.weight)} r="5" fill="#cdf14b" stroke="#0f1611" strokeWidth="2.4" />
      <text
        x={x(n - 1)}
        y={y(last.weight) - 12}
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="#dcf770"
        fontFamily="var(--font-display)"
      >
        {last.weight}
      </text>
      <text x={x(0)} y={H - 8} textAnchor="middle" fontSize="11" fill="#7c9486">
        {fmtShort(sorted[0].date)}
      </text>
      <text x={x(Math.floor((n - 1) / 2))} y={H - 8} textAnchor="middle" fontSize="11" fill="#7c9486">
        {fmtShort(mid.date)}
      </text>
      <text x={x(n - 1)} y={H - 8} textAnchor="middle" fontSize="11" fill="#7c9486">
        {fmtShort(last.date)}
      </text>
    </svg>
  );
}

/* ---------- bars for the last 7 days ---------- */

export function WeekBars({ data }: { data: { label: string; value: number; isToday: boolean }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2">
      {data.map((d, i) => (
        <div key={d.label + i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className={`font-display text-sm font-bold ${d.value > 0 ? "text-volt-300" : "text-night-500"}`}>
            {d.value > 0 ? d.value : ""}
          </span>
          <div className="flex h-24 w-full items-end">
            <div
              className={`bar-grow w-full rounded-t-[4px] ${
                d.isToday
                  ? "bg-volt-400 shadow-[0_0_18px_-4px_rgba(205,241,75,0.7)]"
                  : d.value > 0
                    ? "bg-moss-600"
                    : "bg-night-700"
              }`}
              style={{
                height: d.value > 0 ? `${Math.max(10, (d.value / max) * 100)}%` : "4px",
                animationDelay: `${i * 60}ms`,
              }}
            />
          </div>
          <span className={`text-[10px] font-bold uppercase ${d.isToday ? "text-volt-300" : "text-mist-500"}`}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- tiny sparkline ---------- */

export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 88;
  const H = 26;
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
    <svg viewBox={`0 0 ${W} ${H}`} className="h-6 w-22" aria-hidden>
      <polyline points={pts} fill="none" stroke="#63bd8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
