import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconX } from "../icons";
import { AVATAR_COLORS } from "../types";
import { initials } from "../lib";

/* ---------- shared class recipes ---------- */

export const inputCls =
  "w-full rounded-lg border border-pine-200 bg-pine-50/60 px-3 py-2 text-sm text-ink placeholder:text-pine-300 outline-none transition focus:border-pine-500 focus:bg-white focus:ring-2 focus:ring-volt-400/50";

export const labelCls = "mb-1 block text-xs font-semibold text-pine-800";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-pine-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-pine-700 active:scale-[0.98] cursor-pointer";

export const btnVolt =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-volt-400 px-4 py-2 text-sm font-bold text-pine-950 shadow-sm transition hover:bg-volt-300 active:scale-[0.98] cursor-pointer";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-pine-200 bg-white px-4 py-2 text-sm font-semibold text-pine-800 transition hover:border-pine-400 hover:bg-pine-50 active:scale-[0.98] cursor-pointer";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50 active:scale-[0.98] cursor-pointer";

/* ---------- hooks ---------- */

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

/* ---------- primitives ---------- */

export function Badge({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-5 ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  trackCls = "bg-pine-100",
  barCls = "bg-pine-600",
  className = "",
}: {
  value: number;
  trackCls?: string;
  barCls?: string;
  className?: string;
}) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full ${trackCls} ${className}`}>
      <div
        className={`h-full rounded-full ${barCls} transition-all duration-700 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Avatar({
  name,
  color,
  className = "h-10 w-10 text-sm",
}: {
  name: string;
  color: string;
  className?: string;
}) {
  const pal = AVATAR_COLORS[color] ?? AVATAR_COLORS.pine;
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-xl font-display font-bold ${pal.bg} ${pal.text} ${className}`}
    >
      {initials(name)}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
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
      <div className="animate-fade absolute inset-0 bg-pine-950/65" onClick={onClose} />
      <div
        className={`animate-pop relative max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-pine-100 bg-white px-5 py-3.5">
          <h3 className="font-display text-lg font-semibold text-pine-950">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-pine-400 transition hover:bg-pine-50 hover:text-pine-800"
            aria-label="إغلاق"
          >
            <IconX className="h-5 w-5" />
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
  confirmLabel = "تأكيد",
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
      <div className="text-sm leading-7 text-pine-700">{message}</div>
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
        <button className={`${btnGhost} flex-1`} onClick={onClose}>
          تراجع
        </button>
      </div>
    </Modal>
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
      className={`rise rounded-xl border border-pine-100 bg-white shadow-sm ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-pine-100/70 px-5 py-3.5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-pine-950">
          {icon && <span className="text-pine-500">{icon}</span>}
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
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-pine-200 bg-pine-50/40 px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-white text-pine-400 shadow-sm">
        {icon}
      </div>
      <p className="font-display font-semibold text-pine-900">{title}</p>
      {sub && <p className="max-w-xs text-xs leading-5 text-pine-500">{sub}</p>}
      {children}
    </div>
  );
}
