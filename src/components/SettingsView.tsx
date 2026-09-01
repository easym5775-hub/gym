import { useState } from "react";
import { useApp } from "../store";
import { errorMessage } from "../services/dataProvider";
import { TAB_NAMES } from "../services/googleSheets";
import { Avatar, ConfirmModal, SectionCard, btnDanger, btnGhost, btnVolt, inputCls, labelCls } from "./ui";
import { IconDatabase, IconExternal, IconLink, IconRefresh, IconChevronLeft } from "../icons";

const fmtSync = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

const DRAFT_KEY = "forge-oauth-draft-v1";

interface Draft {
  clientId: string;
  coachId: string;
  mode: "new" | "existing";
  sheetUrl: string;
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<Draft>;
      return {
        clientId: d.clientId ?? "",
        coachId: d.coachId ?? "coach-dana",
        mode: d.mode === "existing" ? "existing" : "new",
        sheetUrl: d.sheetUrl ?? "",
      };
    }
  } catch {
    /* ignore */
  }
  return { clientId: "", coachId: "coach-dana", mode: "new", sheetUrl: "" };
}

function GoogleG({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

export function SettingsView() {
  const { conn, sync, lastSync, linkGoogle, disconnect, testConnection, syncNow, toast } = useApp();

  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [busy, setBusy] = useState<"link" | "test" | null>(null);
  const [inlineError, setInlineError] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const connected = !!conn;

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        /* non-fatal */
      }
      return next;
    });
  };

  const statusWord = !conn ? "Not Connected" : sync.status === "error" ? "Connection Error" : "Connected";
  const dotCls = !conn
    ? "bg-mist-500"
    : sync.status === "error"
      ? "bg-danger-400"
      : sync.status === "syncing"
        ? "bg-sky-400 tick-pulse"
        : "bg-volt-400";

  const validate = (): string => {
    if (!draft.clientId.trim())
      return "Enter your Google OAuth Client ID first (one-time setup — see “How it works” below).";
    if (!/\.apps\.googleusercontent\.com$/.test(draft.clientId.trim()))
      return "That doesn't look like an OAuth Client ID (it ends in .apps.googleusercontent.com).";
    if (!draft.coachId.trim()) return "Enter a Coach ID — it isolates your data from other coaches.";
    if (draft.mode === "existing" && !draft.sheetUrl.trim())
      return "Paste the Google Sheet URL, or switch to “Create a new sheet”.";
    return "";
  };

  const handleLink = async () => {
    const err = validate();
    if (err) {
      setInlineError(err);
      return;
    }
    setInlineError("");
    setBusy("link");
    try {
      await linkGoogle({
        clientId: draft.clientId.trim(),
        coachId: draft.coachId.trim(),
        createNew: draft.mode === "new",
        sheetUrl: draft.sheetUrl,
      });
    } catch (e) {
      setInlineError(errorMessage(e));
      toast(errorMessage(e), "warn");
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    setInlineError("");
    setBusy("test");
    try {
      await testConnection();
      toast("Connection OK — Google Sheets is reachable");
    } catch (e) {
      setInlineError(errorMessage(e));
      toast(errorMessage(e), "warn");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <header>
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight text-mist-100 sm:text-5xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-mist-400">Your profile and where your data lives</p>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* Profile */}
        <SectionCard title="Coach profile" delay={60} className="lg:col-span-1" bodyCls="p-5">
          <div className="flex items-center gap-3">
            <Avatar name="Coach Dana" className="h-12 w-12 text-sm" />
            <div>
              <p className="font-bold text-mist-100">Coach Dana</p>
              <p className="text-xs text-mist-500">Head Coach</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-mist-500">Coach ID</dt>
              <dd className="font-mono text-xs text-mist-200">{conn?.coachId ?? draft.coachId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mist-500">Storage</dt>
              <dd className="font-semibold text-mist-200">{connected ? "Google Sheets" : "This device"}</dd>
            </div>
          </dl>
        </SectionCard>

        {/* Google Sheets Database */}
        <SectionCard
          title="Google Sheets Database"
          icon={<IconDatabase className="h-5 w-5" />}
          delay={120}
          className="lg:col-span-2"
          bodyCls="p-5"
        >
          {/* status line */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${dotCls}`} />
            <span
              className={`font-display text-xl font-semibold uppercase tracking-wide ${
                !conn ? "text-mist-300" : sync.status === "error" ? "text-danger-300" : "text-volt-300"
              }`}
            >
              {statusWord}
            </span>
            <span className="text-xs font-semibold text-mist-500">
              {sync.status === "syncing"
                ? "Syncing…"
                : sync.pending > 0
                  ? `${sync.pending} change${sync.pending > 1 ? "s" : ""} waiting to sync`
                  : connected
                    ? "All changes saved"
                    : "Data is stored on this device only"}
            </span>
          </div>

          {connected && conn ? (
            <div className="mt-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-night-700 bg-night-800 p-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-mist-500">Spreadsheet</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <a
                      href={conn.sheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm font-semibold text-volt-300 hover:underline"
                    >
                      My Gym Database
                    </a>
                    <IconExternal className="h-3.5 w-3.5 shrink-0 text-mist-500" />
                  </dd>
                  <p className="mt-1 truncate font-mono text-[10px] text-mist-500">ID: {conn.spreadsheetId}</p>
                </div>
                <div className="rounded-lg border border-night-700 bg-night-800 p-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-mist-500">Last Sync</dt>
                  <dd className="mt-1 text-sm font-semibold text-mist-200">{fmtSync(lastSync)}</dd>
                  <p className="mt-1 text-[10px] text-mist-500">{TAB_NAMES.length} tabs managed</p>
                </div>
              </dl>

              {sync.error && (
                <p className="mt-3 rounded-lg border border-danger-500/25 bg-danger-500/10 p-3 text-xs leading-5 text-danger-300">
                  {sync.error}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button className={`${btnGhost} px-3! py-2! text-xs`} onClick={handleTest} disabled={busy === "test"}>
                  <IconLink className="h-4 w-4" />
                  {busy === "test" ? "Testing…" : "Test Connection"}
                </button>
                <button
                  className={`${btnVolt} px-3! py-2! text-xs`}
                  onClick={() => void syncNow()}
                  disabled={sync.status === "syncing"}
                >
                  <IconRefresh className="h-4 w-4" />
                  {sync.status === "syncing" ? "Syncing…" : "Sync Now"}
                </button>
                <a href={conn.sheetUrl} target="_blank" rel="noreferrer" className={`${btnGhost} px-3! py-2! text-xs`}>
                  <IconExternal className="h-4 w-4" />
                  Open Google Sheet
                </a>
                <button className={`${btnDanger} px-3! py-2! text-xs`} onClick={() => setConfirmDisconnect(true)}>
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {/* The one-time prerequisite */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Google OAuth Client ID *</label>
                  <input
                    className={inputCls}
                    placeholder="….apps.googleusercontent.com"
                    value={draft.clientId}
                    onChange={(e) => set({ clientId: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Coach ID *</label>
                  <input className={inputCls} value={draft.coachId} onChange={(e) => set({ coachId: e.target.value })} />
                </div>
              </div>

              {/* Which sheet to use */}
              <div>
                <label className={labelCls}>Spreadsheet</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => set({ mode: "new" })}
                    className={`cursor-pointer rounded-lg border p-3 text-start transition ${
                      draft.mode === "new"
                        ? "border-volt-400 bg-volt-400/10"
                        : "border-night-600 bg-night-800 hover:border-night-500"
                    }`}
                  >
                    <span className={`block text-sm font-bold ${draft.mode === "new" ? "text-volt-300" : "text-mist-200"}`}>
                      Create a new sheet
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-mist-500">
                      A fresh “FORGE — Gym Database” spreadsheet is created and set up automatically.
                    </span>
                  </button>
                  <button
                    onClick={() => set({ mode: "existing" })}
                    className={`cursor-pointer rounded-lg border p-3 text-start transition ${
                      draft.mode === "existing"
                        ? "border-volt-400 bg-volt-400/10"
                        : "border-night-600 bg-night-800 hover:border-night-500"
                    }`}
                  >
                    <span className={`block text-sm font-bold ${draft.mode === "existing" ? "text-volt-300" : "text-mist-200"}`}>
                      Use an existing sheet
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-mist-500">
                      Point the database at a spreadsheet you already own.
                    </span>
                  </button>
                </div>
                {draft.mode === "existing" && (
                  <input
                    className={`${inputCls} mt-2`}
                    placeholder="https://docs.google.com/spreadsheets/d/…"
                    value={draft.sheetUrl}
                    onChange={(e) => set({ sheetUrl: e.target.value })}
                  />
                )}
              </div>

              {inlineError && (
                <p className="rounded-lg border border-danger-500/25 bg-danger-500/10 p-3 text-xs leading-5 text-danger-300">
                  {inlineError}
                </p>
              )}

              {/* The OAuth button */}
              <button
                onClick={handleLink}
                disabled={busy === "link"}
                className="inline-flex h-12 cursor-pointer items-center justify-center gap-3 rounded-lg bg-white px-5 text-sm font-bold text-night-900 shadow-sm transition hover:bg-mist-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleG />
                {busy === "link" ? "Waiting for Google…" : "Link with Google"}
              </button>
              <p className="-mt-2 text-[11px] leading-4 text-mist-500">
                Google will ask you to sign in and allow FORGE to read &amp; write <em>your</em> spreadsheets. Nothing is
                shared publicly and you can revoke access any time from your Google account.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* How it works */}
      <SectionCard
        title="How it works"
        icon={<IconLink className="h-5 w-5" />}
        delay={180}
        className="mt-4"
        bodyCls="p-5"
        action={
          <button className={`${btnGhost} px-3! py-1.5! text-xs`} onClick={() => setHelpOpen((v) => !v)}>
            <IconChevronLeft className={`h-3.5 w-3.5 transition-transform ${helpOpen ? "-rotate-90" : "rotate-90"}`} />
            {helpOpen ? "Hide" : "Show"}
          </button>
        }
      >
        {helpOpen && (
          <div className="animate-fade grid gap-4 lg:grid-cols-2">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 text-mist-300">
              <li>
                In <strong className="text-mist-100">Google Cloud Console</strong>, create a project, enable the{" "}
                <strong className="text-mist-100">Google Sheets API</strong>, then create an{" "}
                <strong className="text-mist-100">OAuth client ID</strong> (type: Web application).
              </li>
              <li>
                Add this site's address to the client's <strong className="text-mist-100">Authorised JavaScript origins</strong>.
              </li>
              <li>Copy the Client ID into the field above, pick a Coach ID, then press{" "}
                <strong className="text-mist-100">Link with Google</strong> and approve the consent screen.</li>
              <li>
                The 16 database tabs are created automatically (existing data is never touched) and your data syncs both
                ways from then on.
              </li>
            </ol>
            <div className="rounded-lg border border-night-700 bg-night-800 p-4 text-xs leading-5 text-mist-400">
              <p className="font-bold text-mist-200">Security</p>
              <p className="mt-1.5">
                No API key, service-account key or OAuth secret ever lives in this app. A Client ID is public by design;
                the access token is short-lived, scoped to your spreadsheets, granted by you, and revocable from{" "}
                <span className="text-mist-200">Google → Security → Third-party access</span>.
              </p>
              <p className="mt-2">
                Every record carries your <span className="text-mist-200">Coach ID</span>, so one coach can never read or
                write another coach's clients or data.
              </p>
            </div>
          </div>
        )}
      </SectionCard>

      <ConfirmModal
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        title="Disconnect Google Sheets?"
        message="New changes will only be saved on this device until you link again. Your spreadsheet is left untouched."
        confirmLabel="Disconnect"
        onConfirm={disconnect}
      />
    </div>
  );
}
