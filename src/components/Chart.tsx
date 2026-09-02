/* ================================================================
   FORGE — hand-rolled SVG charts (no chart lib dependency).
   ================================================================ */

import type { CheckIn } from "../types";
import { fmtShort } from "../lib";

/* ---------- weight line ---------- */

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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weight trend">
      <defs>
        <linearGradient id="wgArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cdf14b" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#cdf14b" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1 / 3, 2 / 3, 1].map((f) => {
        const v = min + (max - min) * f;
        const gy = y(v);
        return (
          <g key={f}>
            <line x1={padL} x2={W - padR + 6} y1={gy} y2={gy} stroke="#1a251d" strokeWidth="1" />
            <text x={W - padR + 12} y={gy + 4} fontSize="11" fill="#71897b" fontFamily="var(--font-display)">
              {v.toFixed(1)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#wgArea)" />
      <path d={line} fill="none" stroke="#cdf14b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {sorted.map((e, i) =>
        i === n - 1 ? null : <circle key={e.id} cx={x(i)} cy={y(e.weight)} r="3" fill="#0f1611" stroke="#cdf14b" strokeWidth="2" />,
      )}
      <circle cx={x(n - 1)} cy={y(last.weight)} r="11" fill="#cdf14b" opacity="0.2" className="ring-pulse" />
      <circle cx={x(n - 1)} cy={y(last.weight)} r="5" fill="#cdf14b" stroke="#0f1611" strokeWidth="2.4" />
      <text x={x(n - 1)} y={y(last.weight) - 12} textAnchor="middle" fontSize="14" fontWeight="700" fill="#dcf770" fontFamily="var(--font-display)">
        {last.weight}
      </text>
      <text x={x(0)} y={H - 8} textAnchor="middle" fontSize="11" fill="#71897b">
        {fmtShort(sorted[0].date)}
      </text>
      <text x={x(Math.floor((n - 1) / 2))} y={H - 8} textAnchor="middle" fontSize="11" fill="#71897b">
        {fmtShort(mid.date)}
      </text>
      <text x={x(n - 1)} y={H - 8} textAnchor="middle" fontSize="11" fill="#71897b">
        {fmtShort(last.date)}
      </text>
    </svg>
  );
}

/* ---------- macro split bar ---------- */

export function MacroSplit({ protein, carbs, fats }: { protein: number; carbs: number; fats: number }) {
  const kcal = protein * 4 + carbs * 4 + fats * 9;
  const seg = (g: number, per: number) => (kcal > 0 ? (g * per * 100) / kcal : 0);
  const pPct = seg(protein, 4);
  const cPct = seg(carbs, 4);
  const fPct = seg(fats, 9);
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-night-700">
        <div className="grow-x bg-volt-400" style={{ width: `${pPct}%` }} />
        <div className="grow-x bg-sky-400" style={{ width: `${cPct}%`, animationDelay: "120ms" }} />
        <div className="grow-x bg-warn-400" style={{ width: `${fPct}%`, animationDelay: "240ms" }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold">
        <span className="inline-flex items-center gap-1.5 text-volt-300">
          <span className="h-2 w-2 rounded-sm bg-volt-400" /> Protein {protein}g
        </span>
        <span className="inline-flex items-center gap-1.5 text-sky-300">
          <span className="h-2 w-2 rounded-sm bg-sky-400" /> Carbs {carbs}g
        </span>
        <span className="inline-flex items-center gap-1.5 text-warn-300">
          <span className="h-2 w-2 rounded-sm bg-warn-400" /> Fats {fats}g
        </span>
      </div>
    </div>
  );
}

/* ---------- attendance ring ---------- */

export function AttendanceRing({ pct, completed, countable }: { pct: number; completed: number; countable: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  const tone = pct >= 80 ? "#63bd8c" : pct >= 50 ? "#f2c063" : "#f58a7e";
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 84 84" className="h-21 w-21 shrink-0" role="img" aria-label={`Attendance ${pct}%`}>
        <circle cx="42" cy="42" r={r} fill="none" stroke="#1a251d" strokeWidth="8" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          transform="rotate(-90 42 42)"
        />
        <text x="42" y="47" textAnchor="middle" fontSize="19" fontWeight="700" fill="#e6eee8" fontFamily="var(--font-display)">
          {pct}%
        </text>
      </svg>
      <div>
        <p className="font-display text-lg font-semibold text-mist-100">
          {completed} / {countable}
        </p>
        <p className="text-[11px] font-semibold text-mist-500">sessions attended (cancelled excluded)</p>
      </div>
    </div>
  );
}
