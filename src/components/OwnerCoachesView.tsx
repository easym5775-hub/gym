/* ================================================================
   FORGE — Owner Coaches Management View.
   ================================================================ */

import { useState, useMemo } from "react";
import { useApp } from "../store";
import { OwnerPageHeader } from "./OwnerShell";

import { Search, Filter, MoreVertical, CheckCircle, XCircle, Clock, Shield, Users } from "lucide-react";
import { Avatar, btnPrimary } from "./ui";

export function OwnerCoachesView() {
  
  const { state, me } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "suspended">("all");
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);

  // In demo mode, we have one coach. In production, this would fetch all coaches.
  // For now, we'll show the demo coach with simulated data.
  const coaches = useMemo(() => {
    // Get unique coaches from the state (in demo mode, there's one)
    const coachIds = new Set(state.clients.map((c) => c.coachId));
    
    // Create coach entries (in production, this comes from backend)
    const coachList = Array.from(coachIds).map((coachId) => {
      const coachClients = state.clients.filter((c) => c.coachId === coachId);
      return {
        id: coachId,
        name: me?.role === "coach" ? me.name : "Demo Coach",
        email: me?.role === "coach" ? me.email : "coach@forge.fit",
        status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING",
        subscriptionPlan: "Pro",
        subscriptionStatus: "ACTIVE" as "ACTIVE" | "EXPIRED" | "PENDING" | "CANCELLED",
        subscriptionEnd: "2025-12-31",
        clientCount: coachClients.length,
        activeClients: coachClients.filter((c) => c.status === "Active").length,
        createdAt: "2024-01-01",
        lastActivity: new Date().toISOString().split("T")[0],
      };
    });

    // If no coaches found (edge case), add a placeholder
    if (coachList.length === 0) {
      coachList.push({
        id: "demo-coach",
        name: "Demo Coach",
        email: "coach@forge.fit",
        status: "ACTIVE",
        subscriptionPlan: "Pro",
        subscriptionStatus: "ACTIVE",
        subscriptionEnd: "2025-12-31",
        clientCount: state.clients.length,
        activeClients: state.clients.filter((c) => c.status === "Active").length,
        createdAt: "2024-01-01",
        lastActivity: new Date().toISOString().split("T")[0],
      });
    }

    return coachList;
  }, [state.clients, me]);

  // Filter coaches
  const filteredCoaches = useMemo(() => {
    return coaches.filter((coach) => {
      const matchesSearch =
        searchQuery === "" ||
        coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coach.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || coach.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [coaches, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-moss-400/10 text-moss-300 border-moss-400/20",
      INACTIVE: "bg-night-600/30 text-mist-400 border-night-500/40",
      SUSPENDED: "bg-danger-500/10 text-danger-300 border-danger-500/20",
      PENDING: "bg-warn-400/10 text-warn-300 border-warn-400/20",
    };
    const icons: Record<string, React.ReactNode> = {
      ACTIVE: <CheckCircle className="h-3 w-3" />,
      INACTIVE: <Clock className="h-3 w-3" />,
      SUSPENDED: <XCircle className="h-3 w-3" />,
      PENDING: <Clock className="h-3 w-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status] || styles.INACTIVE}`}>
        {icons[status] || <Clock className="h-3 w-3" />}
        {status}
      </span>
    );
  };

  const getSubStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-volt-400/10 text-volt-300 border-volt-400/20",
      EXPIRED: "bg-danger-500/10 text-danger-300 border-danger-500/20",
      PENDING: "bg-warn-400/10 text-warn-300 border-warn-400/20",
      CANCELLED: "bg-night-600/30 text-mist-400 border-night-500/40",
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status] || styles.PENDING}`}>
        {status}
      </span>
    );
  };

  return (
    <>
      <OwnerPageHeader
        title="Coaches"
        sub="Manage coach accounts and subscriptions"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-mist-500">{filteredCoaches.length} coach{filteredCoaches.length !== 1 ? "es" : ""}</span>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="rise mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" />
          <input
            className="w-full rounded-xl border border-night-600 bg-night-850 py-2 pl-9 pr-3 text-sm text-mist-200 placeholder:text-mist-500 focus:border-volt-400/40 focus:outline-none focus:ring-1 focus:ring-volt-400/20"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-mist-500" />
          <select
            className="rounded-xl border border-night-600 bg-night-850 px-3 py-2 text-sm text-mist-200 focus:border-volt-400/40 focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Coaches Table */}
      <div className="rise mt-4 overflow-hidden rounded-2xl border border-night-700 bg-night-850/50 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-night-700 bg-night-800/50">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-mist-500">Coach</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-mist-500">Account Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-mist-500">Subscription</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-mist-500">Clients</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-mist-500">Last Activity</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-mist-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoaches.map((coach) => (
                <tr key={coach.id} className="border-b border-night-800 transition-colors hover:bg-night-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={coach.name} className="h-9 w-9 text-xs" />
                      <div>
                        <p className="text-sm font-bold text-mist-100">{coach.name}</p>
                        <p className="text-xs text-mist-500">{coach.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(coach.status)}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3 text-mist-500" />
                        <span className="text-xs text-mist-300">{coach.subscriptionPlan}</span>
                      </div>
                      <div>{getSubStatusBadge(coach.subscriptionStatus)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-mist-500" />
                      <span className="text-sm text-mist-300">
                        {coach.activeClients}/{coach.clientCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-mist-400">{coach.lastActivity}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="cursor-pointer rounded-lg p-1.5 text-mist-400 transition hover:bg-night-700 hover:text-mist-100">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCoaches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <p className="text-sm text-mist-500">No coaches found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coach Details Panel (when selected) */}
      {selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-night-950/80 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-2xl border border-night-700 bg-night-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold uppercase text-mist-100">Coach Details</h3>
              <button onClick={() => setSelectedCoach(null)} className="cursor-pointer rounded-lg p-2 text-mist-400 transition hover:bg-night-800 hover:text-mist-100">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            {/* Details content would go here */}
            <p className="text-sm text-mist-400">Coach details panel - implement full details view</p>
          </div>
        </div>
      )}
    </>
  );
}
