import { useCallback, useEffect, useState } from "react";
import { useApp } from "../store";
import { spreadsheetId } from "../services/googleSheets";
import { errorMessage, type ConnectionConfig } from "../services/dataProvider";
import { TAB_NAMES } from "../services/googleSheets";
import {
  Avatar,
  ConfirmModal,
  SectionCard,
  btnDanger,
  btnGhost,
  btnVolt,
  inputCls,
  labelCls,
} from "./ui";
import {
  IconCheck,
  IconCopy,
  IconDatabase,
  IconExternal,
  IconLink,
  IconRefresh,
} from "../icons";

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

export function SettingsView() {
  const { conn, sync, lastSync, connect, disconnect, testConnection, syncNow, toast } = useApp();

  const [webAppUrl, setWebAppUrl] = useState(conn?.webAppUrl ?? "");
  const [sheetUrl, setSheetUrl] = useState(conn?.sheetUrl ?? "");
  const [coachId, setCoachId] = useState(conn?.coachId ?? "coach-dana");
  const [token, setToken] = useState(conn?.token ?? "");
  const [busy, setBusy] = useState<"connect" | "test" | null>(null);
  const [inlineError, setInlineError] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const [guideOpen, setGuideOpen] = useState(false);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const connected = !!conn;
  const statusWord = !conn
    ? "Not Connected"
    : sync.status === "error"
      ? "Connection Error"
      : "Connected";
  const dotCls = !conn
    ? "bg-mist-500"
    : sync.status === "error"
      ? "bg-danger-400"
      : sync.status === "syncing"
        ? "bg-sky-400 tick-pulse"
        : "bg-volt-400";

  const buildConfig = (): ConnectionConfig => ({
    webAppUrl: webAppUrl.trim(),
    sheetUrl: sheetUrl.trim(),
    coachId: coachId.trim(),
    token: token.trim() || undefined,
  });

  const validate = (): string => {
    if (!webAppUrl.trim()) return "Paste the Apps Script Web App URL (ends in /exec).";
    if (!/^https:\/\/script\.google(usercontent)?\.com\//i.test(webAppUrl.trim()))
      return "That doesn't look like an Apps Script Web App URL.";
    if (!coachId.trim()) return "Enter a Coach ID — it isolates your data.";
    return "";
  };

  const handleConnect = async () => {
    const err = validate();
    if (err) {
      setInlineError(err);
      return;
    }
    setInlineError("");
    setBusy("connect");
    try {
      await connect(buildConfig());
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
      await testConnection(connected ? undefined : buildConfig());
      toast("Connection OK — Google Sheets is reachable");
    } catch (e) {
      setInlineError(errorMessage(e));
      toast(errorMessage(e), "warn");
    } finally {
      setBusy(null);
    }
  };

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Couldn't copy — select the code manually", "warn");
    }
  }, [code, toast]);

  // Load the Code.gs artifact when the guide is opened.
  useEffect(() => {
    if (!guideOpen || code) return;
    let alive = true;
    fetch("/apps-script/Code.gs")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not found"))))
      .then((t) => alive && setCode(t))
      .catch(() => alive && setCode("// Could not load Code.gs — it lives at public/apps-script/Code.gs"));
    return () => {
      alive = false;
    };
  }, [guideOpen, code]);

  const sheetId = conn ? spreadsheetId(conn.sheetUrl) : null;

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
              <dd className="font-mono text-xs text-mist-200">{conn?.coachId ?? coachId}</dd>
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
            <span className={`font-display text-xl font-semibold uppercase tracking-wide ${!conn ? "text-mist-300" : sync.status === "error" ? "text-danger-300" : "text-volt-300"}`}>
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

          {connected ? (
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
                  {sheetId && <p className="mt-1 truncate font-mono text-[10px] text-mist-500">ID: {sheetId}</p>}
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
                <button className={`${btnVolt} px-3! py-2! text-xs`} onClick={() => void syncNow()} disabled={sync.status === "syncing"}>
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
              <div>
                <label className={labelCls}>Apps Script Web App URL *</label>
                <input
                  className={inputCls}
                  placeholder="https://script.google.com/macros/s/…/exec"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-mist-500">The secure API layer deployed on your sheet — never a Google key.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Google Sheet URL *</label>
                  <input
                    className={inputCls}
                    placeholder="https://docs.google.com/spreadsheets/d/…"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Coach ID *</label>
                  <input className={inputCls} value={coachId} onChange={(e) => setCoachId(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Access token (optional)</label>
                <input
                  className={inputCls}
                  placeholder="Only if you set ACCESS_TOKEN in Script Properties"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>

              {inlineError && (
                <p className="rounded-lg border border-danger-500/25 bg-danger-500/10 p-3 text-xs leading-5 text-danger-300">
                  {inlineError}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button className={`${btnVolt}`} onClick={handleConnect} disabled={busy === "connect"}>
                  <IconDatabase className="h-4 w-4" />
                  {busy === "connect" ? "Connecting…" : "Connect Google Sheet"}
                </button>
                <button className={btnGhost} onClick={handleTest} disabled={busy === "test"}>
                  <IconLink className="h-4 w-4" />
                  {busy === "test" ? "Testing…" : "Test Connection"}
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Setup guide */}
      <SectionCard
        title="Setup guide"
        icon={<IconDatabase className="h-5 w-5" />}
        delay={180}
        className="mt-4"
        bodyCls="p-5"
        action={
          <button className={`${btnGhost} px-3! py-1.5! text-xs`} onClick={() => setGuideOpen((v) => !v)}>
            {guideOpen ? "Hide" : "Show"} guide
          </button>
        }
      >
        {guideOpen && (
          <div className="animate-fade">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 text-mist-300">
              <li>Create (or open) the Google Sheet you want to use as the database.</li>
              <li>Go to <strong className="text-mist-100">Extensions → Apps Script</strong>, delete the placeholder, paste the code below.</li>
              <li>
                <strong className="text-mist-100">Deploy → New deployment → Web app</strong>: “Execute as: Me”, “Who has access: Anyone”. Copy the <em>/exec</em> URL.
              </li>
              <li>Paste that URL and the sheet URL above, pick a Coach ID, then <strong className="text-mist-100">Connect</strong>. The 16 tabs are created automatically without touching existing data.</li>
            </ol>
            <div className="mt-4 overflow-hidden rounded-lg border border-night-700">
              <div className="flex items-center justify-between border-b border-night-700 bg-night-800 px-3 py-2">
                <span className="font-mono text-xs text-mist-400">apps-script/Code.gs</span>
                <div className="flex items-center gap-2">
                  <a href="/apps-script/Code.gs" download className="text-[11px] font-bold text-volt-300 hover:underline">
                    Download
                  </a>
                  <button onClick={copyCode} className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-night-700 px-2 py-1 text-[11px] font-bold text-mist-200 transition hover:bg-night-600">
                    {copied ? <IconCheck className="h-3.5 w-3.5 text-volt-300" /> : <IconCopy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <pre className="max-h-72 overflow-auto bg-night-900 p-4 font-mono text-[11px] leading-5 text-mist-300">
                {code || "// Loading Code.gs…"}
              </pre>
            </div>
          </div>
        )}
      </SectionCard>

      <ConfirmModal
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        title="Disconnect Google Sheets?"
        message="New changes will only be saved on this device until you reconnect. Your spreadsheet is left untouched."
        confirmLabel="Disconnect"
        onConfirm={disconnect}
      />
    </div>
  );
}
