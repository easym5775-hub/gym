/* ================================================================
   FORGE — shared UI primitives.
   ================================================================ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Check, Star, X } from "lucide-react";
import { hueOf, initials } from "../lib";
import { useApp } from "../store";

/* ---------------- class recipes ---------------- */

export const inputCls =
  "h-10 w-full rounded-lg border border-night-600 bg-night-800 px-3 text-sm text-mist-100 placeholder:text-mist-500 outline-none transition focus:border-volt-400";

export const textareaCls =
  "w-full min-h-20 resize-y rounded-lg border border-night-600 bg-night-800 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 outline-none transition focus:border-volt-400";

export const labelCls = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-mist-400";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-volt-400 px-4 py-2 text-sm font-bold text-night-950 shadow-[0_8px_24px_-10px_rgba(205,241,75,0.6)] transition hover:bg-volt-300 active:scale-[0.98] cursor-pointer disabled:pointer-events-none disabled:opacity-40";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-night-600 bg-night-800 px-4 py-2 text-sm font-semibold text-mist-100 transition hover:border-night-500 hover:bg-night-700 active:scale-[0.98] cursor-pointer disabled:pointer-events-none disabled:opacity-40";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-2 text-sm font-semibold text-danger-300 transition hover:border-danger-500/60 hover:bg-danger-500/20 active:scale-[0.98] cursor-pointer";

export const btnSm = "!px-3 !py-1.5 !text-xs";

export const chip =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold leading-5";

/* ---------------- hooks ---------------- */

export function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    if (from === target) {
      setVal(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ---------------- primitives ---------------- */

export function Badge({ className = "", children }: { className?: string; children: ReactNode }) {
  return <span className={`${chip} ${className}`}>{children}</span>;
}

export function Avatar({
  name,
  photo,
  className = "h-10 w-10 text-xs",
}: {
  name: string;
  photo?: string;
  className?: string;
}) {
  const h = hueOf(name);
  if (photo) {
    return <img src={photo} alt={name} className={`shrink-0 rounded-lg object-cover ring-1 ring-night-600 ${className}`} />;
  }
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-lg font-display font-bold ${className}`}
      style={{ background: `hsl(${h} 32% 18%)`, color: `hsl(${h} 65% 72%)` }}
    >
      {initials(name)}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-mist-200"
      aria-pressed={checked}
    >
      <span
        className={`relative h-5 w-10 rounded-full border transition-colors duration-200 ${
          checked ? "border-volt-500 bg-volt-400/90" : "border-night-500 bg-night-700"
        }`}
      >
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full shadow transition-all duration-200 ${
            checked ? "start-[calc(100%-1.1rem)] bg-night-950" : "start-0.5 bg-mist-400"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export function MoodDots({ mood }: { mood: number }) {
  const color = mood >= 4 ? "bg-volt-400" : mood === 3 ? "bg-warn-400" : "bg-danger-400";
  return (
    <span className="inline-flex items-center gap-1" title={`Mood ${mood}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= mood ? color : "bg-night-600"}`} />
      ))}
    </span>
  );
}

export function MoodPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labels = ["Rough", "Meh", "Okay", "Good", "Great"];
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= value;
        const tone = value >= 4 ? "text-volt-400" : value === 3 ? "text-warn-400" : "text-danger-400";
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            aria-label={`Mood ${i}`}
            className={`cursor-pointer rounded-md p-1 transition-transform hover:scale-110 active:scale-95 ${on ? tone : "text-night-500"}`}
          >
            <Star className="h-6 w-6" fill={on ? "currentColor" : "none"} />
          </button>
        );
      })}
      <span className="ms-2 text-xs font-bold text-mist-300">{labels[value - 1]}</span>
    </div>
  );
}

export function SectionCard({
  title,
  icon,
  action,
  children,
  className = "",
  bodyCls = "p-5",
  delay = 0,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyCls?: string;
  delay?: number;
}) {
  return (
    <section
      className={`rise rounded-xl border border-night-700 bg-night-850 shadow-sm ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-night-700 px-5 py-3.5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-mist-100">
          {icon && <span className="text-volt-400">{icon}</span>}
          {title}
        </h2>
        {action}
      </header>
      <div className={bodyCls}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  sub,
  children,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-night-600 bg-night-800/40 px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-night-800 text-volt-400 ring-1 ring-night-600">{icon}</div>
      <p className="font-display text-lg font-semibold text-mist-100">{title}</p>
      {sub && <p className="max-w-xs text-xs leading-5 text-mist-400">{sub}</p>}
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div className="animate-fade absolute inset-0 bg-night-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`animate-pop relative max-h-[90vh] w-full overflow-y-auto rounded-xl border border-night-600 bg-night-850 shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-night-700 bg-night-850 px-5 py-3.5">
          <div>
            <h3 className="font-display text-xl font-semibold uppercase tracking-wide text-mist-100">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-mist-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-mist-400 transition hover:bg-night-700 hover:text-mist-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm leading-6 text-mist-300">{message}</div>
      <div className="mt-5 flex gap-2">
        <button
          className={`${btnDanger} flex-1`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
        <button className={`${btnSecondary} flex-1`} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:left-auto sm:right-5 sm:translate-x-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-toast pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur ${
            t.kind === "ok"
              ? "border-volt-400/30 bg-night-800/95 text-mist-100"
              : "border-warn-400/30 bg-night-800/95 text-warn-300"
          }`}
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
              t.kind === "ok" ? "bg-volt-400 text-night-950" : "bg-warn-400 text-night-950"
            }`}
          >
            {t.kind === "ok" ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> : <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.2} />}
          </span>
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => dismiss(t.id)} className="cursor-pointer text-mist-500 transition hover:text-mist-100" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
