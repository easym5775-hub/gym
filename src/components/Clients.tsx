import { useMemo, useState } from "react";
import type { Client, ClientStatus, CoachView } from "../types";
import { GOAL_META, STATUSES, STATUS_META } from "../types";
import { fmtDate, relDay } from "../lib";
import { useApp } from "../store";
import { Avatar, Badge, ConfirmModal, EmptyState, SectionCard, btnGhost, btnVolt, inputCls } from "./ui";
import { ClientFormModal } from "./modals";
import { IconClipboard, IconPencil, IconPlus, IconSearch, IconTrash, IconUser, IconUsers, IconUtensils } from "../icons";

export function ClientsView({ go }: { go: (v: CoachView, id?: string) => void }) {
  const { state, deleteClient } = useApp();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "All">("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.clients
      .filter((c) => (statusFilter === "All" ? true : c.status === statusFilter))
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle) || c.phone.includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.clients, q, statusFilter]);

  const lastCheckIn = (id: string) =>
    state.checkIns
      .filter((c) => c.clientId === id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts)[0];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight text-mist-100 sm:text-5xl">
            Clients
          </h1>
          <p className="mt-2 text-sm text-mist-400">
            {state.clients.length} on the roster · {state.clients.filter((c) => c.status === "Active").length} active
          </p>
        </div>
        <button
          className={`${btnVolt} h-11`}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <IconPlus className="h-4 w-4" strokeWidth={2.4} />
          Add client
        </button>
      </header>

      <div className="rise mt-5 flex flex-wrap items-center gap-3" style={{ animationDelay: "80ms" }}>
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <IconSearch className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" />
          <input
            className={`${inputCls} ps-9!`}
            placeholder="Search name, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(["All", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                statusFilter === s ? "bg-volt-400 text-night-950" : "bg-night-800 text-mist-400 hover:text-mist-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <SectionCard title={`Roster (${filtered.length})`} icon={<IconUsers className="h-5 w-5" />} className="mt-4" delay={140} bodyCls="p-0">
        {filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<IconUsers className="h-6 w-6" />} title="No clients match" sub={q ? `Nothing found for "${q}" — try another search.` : "Add your first client to start programming."}>
              {!q && (
                <button className={`${btnVolt} mt-2`} onClick={() => { setEditing(null); setFormOpen(true); }}>
                  <IconPlus className="h-4 w-4" strokeWidth={2.4} />
                  Add client
                </button>
              )}
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-night-700 bg-night-800/50 text-[11px] font-bold uppercase tracking-wider text-mist-500">
                  <th className="px-5 py-3 text-start">Client</th>
                  <th className="px-4 py-3 text-start">Goal</th>
                  <th className="px-4 py-3 text-start">Status</th>
                  <th className="px-4 py-3 text-start">Started</th>
                  <th className="px-4 py-3 text-start">Last check-in</th>
                  <th className="px-4 py-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const last = lastCheckIn(c.id);
                  return (
                    <tr key={c.id} className="group border-b border-night-700/60 transition last:border-0 hover:bg-night-800/50">
                      <td className="px-5 py-3">
                        <button
                          className="flex w-full cursor-pointer items-center gap-3 rounded-lg text-start transition hover:opacity-80"
                          onClick={() => go("client", c.id)}
                          title="Open client profile"
                        >
                          <Avatar name={c.name} photo={c.photo} className="h-10 w-10 text-xs" />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-mist-100 group-hover:text-volt-300">{c.name}</p>
                            <p className="truncate text-[11px] text-mist-500">{c.email || c.phone || "—"}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={GOAL_META[c.goal].chip}>
                          <span className={`h-1.5 w-1.5 rounded-full ${GOAL_META[c.goal].dot}`} />
                          {c.goal}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_META[c.status].chip}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[c.status].dot} ${c.status === "Active" ? "tick-pulse" : ""}`} />
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-mist-300">{fmtDate(c.startDate)}</td>
                      <td className="px-4 py-3">
                        {last ? (
                          <span className="text-mist-200">
                            {last.weight} kg
                            <span className="ms-2 text-[11px] text-mist-500">{relDay(last.date)}</span>
                          </span>
                        ) : (
                          <span className="text-mist-500">none yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                          <button
                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-mist-400 transition hover:bg-night-700 hover:text-volt-300"
                            title="Open profile"
                            onClick={() => go("client", c.id)}
                          >
                            <IconUser className="h-4 w-4" />
                          </button>
                          <button
                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-mist-400 transition hover:bg-night-700 hover:text-volt-300"
                            title="Workout plan"
                            onClick={() => go("plans", c.id)}
                          >
                            <IconClipboard className="h-4 w-4" />
                          </button>
                          <button
                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-mist-400 transition hover:bg-night-700 hover:text-volt-300"
                            title="Meal plan"
                            onClick={() => go("meals", c.id)}
                          >
                            <IconUtensils className="h-4 w-4" />
                          </button>
                          <button
                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-mist-400 transition hover:bg-night-700 hover:text-mist-100"
                            title="Edit"
                            onClick={() => {
                              setEditing(c);
                              setFormOpen(true);
                            }}
                          >
                            <IconPencil className="h-4 w-4" />
                          </button>
                          <button
                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-mist-400 transition hover:bg-danger-500/15 hover:text-danger-300"
                            title="Delete"
                            onClick={() => setDeleting(c)}
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ClientFormModal open={formOpen} initial={editing} onClose={() => setFormOpen(false)} />
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete client?"
        message={
          <>
            <strong className="text-mist-100">{deleting?.name}</strong> will be removed along with their workout plan,
            meals and every check-in. This cannot be undone.
          </>
        }
        confirmLabel="Delete permanently"
        onConfirm={() => deleting && deleteClient(deleting.id)}
      />
    </div>
  );
}
