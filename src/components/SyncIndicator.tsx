import { useState } from "react";
import { useApp } from "../store";
import { IconDatabase, IconExternal, IconSettings } from "../icons";

function fmtSync(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SyncIndicator({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { sync, lastSync, conn, syncNow } = useApp();
  const [open, setOpen] = useState(false);

  const isLocal = !conn;
  const label = isLocal
    ? "Local"
    : sync.status === "syncing"
      ? sync.pending > 0
        ? `Syncing ${sync.pending}…`
        : "Syncing…"
      : sync.status === "error"
        ? sync.pending > 0
          ? `${sync.pending} waiting`
          : "Sync error"
        : "Synced";

  const dotCls = isLocal
    ? "bg-mist-500"
    : sync.status === "syncing"
      ? "bg-sky-400 tick-pulse"
      : sync.status === "error"
        ? "bg-danger-400"
        : "bg-volt-400";

  const statusWord = isLocal ? "Not Connected" : sync.status === "error" ? "Connection Error" : "Connected";
  const health = isLocal ? "Local only" : sync.status === "error" ? "Unreachable" : "Healthy";

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Sync status"
        className="fixed bottom-4 left-4 z-50 flex cursor-pointer items-center gap-2 rounded-full border border-night-600 bg-night-800/95 py-1.5 pl-2.5 pr-3.5 text-xs font-bold text-mist-200 shadow-lg backdrop-blur transition hover:border-night-500 hover:text-mist-100"
      >
        <span className={`h-2 w-2 rounded-full ${dotCls}`} />
        <IconDatabase className="h-4 w-4 text-mist-400" />
        {label}
      </button>

      {open && (
        <>
          <div className="animate-fade fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="animate-pop fixed bottom-16 left-4 z-50 w-72 rounded-xl border border-night-600 bg-night-850 p-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <IconDatabase className="h-5 w-5 text-volt-400" />
              <p className="font-display text-lg font-semibold uppercase tracking-wide text-mist-100">
                Google Sheets
              </p>
            </div>

            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-mist-500">Status</dt>
                <dd className={`flex items-center gap-1.5 font-bold ${isLocal ? "text-mist-300" : sync.status === "error" ? "text-danger-300" : "text-volt-300"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
                  {statusWord}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-mist-500">Last Sync</dt>
                <dd className="font-semibold text-mist-200">{fmtSync(lastSync)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-mist-500">Pending Changes</dt>
                <dd className={`font-display text-base font-bold ${sync.pending > 0 ? "text-warn-300" : "text-mist-200"}`}>
                  {sync.pending}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-mist-500">Connection</dt>
                <dd className="font-semibold text-mist-200">{health}</dd>
              </div>
            </dl>

            {sync.error && (
              <p className="mt-3 rounded-lg border border-danger-500/25 bg-danger-500/10 p-2.5 text-[11px] leading-4 text-danger-300">
                {sync.error}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => void syncNow()}
                disabled={!conn || sync.status === "syncing"}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-volt-400 px-3 py-2 text-xs font-bold text-night-950 transition hover:bg-volt-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sync Now
              </button>
              {conn?.sheetUrl ? (
                <a
                  href={conn.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-night-600 px-3 py-2 text-xs font-bold text-mist-200 transition hover:border-night-500 hover:bg-night-700"
                >
                  <IconExternal className="h-3.5 w-3.5" />
                  Open Sheet
                </a>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    onOpenSettings();
                  }}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-night-600 px-3 py-2 text-xs font-bold text-mist-200 transition hover:border-night-500 hover:bg-night-700"
                >
                  <IconSettings className="h-3.5 w-3.5" />
                  Connect
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
