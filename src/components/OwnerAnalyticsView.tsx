/* ================================================================
   FORGE — Owner Analytics View: SaaS-level analytics.
   ================================================================ */

import { useMemo } from "react";
import { useApp } from "../store";
import { OwnerPageHeader } from "./OwnerShell";
import { Users, TrendingUp, Shield, DollarSign, Activity } from "lucide-react";

export function OwnerAnalyticsView() {
  const { state } = useApp();

  // Calculate real metrics from actual data
  const metrics = useMemo(() => {
    // Coach metrics from actual coaches data
    const totalCoaches = state.coaches.length;
    const activeCoaches = state.coaches.filter((c) => c.accountStatus === "active").length;
    const pendingCoaches = state.coaches.filter((c) => c.accountStatus === "pending").length;
    const suspendedCoaches = state.coaches.filter((c) => c.accountStatus === "suspended").length;
    const inactiveCoaches = state.coaches.filter((c) => c.accountStatus === "inactive").length;

    // Client metrics
    const totalClients = state.clients.length;
    const activeClients = state.clients.filter((c) => c.status === "Active").length;
    const inactiveClients = totalClients - activeClients;
    const avgClientsPerCoach = totalCoaches > 0 ? (totalClients / totalCoaches).toFixed(1) : "0";

    // Subscription metrics from coach_subscriptions
    const totalSubscriptions = state.coachSubscriptions.length;
    const activeSubscriptions = state.coachSubscriptions.filter((s) => {
      const endDate = s.endDate ? new Date(s.endDate) : null;
      return s.status === "active" && (!endDate || endDate >= new Date());
    }).length;
    const expiredSubscriptions = state.coachSubscriptions.filter((s) => {
      const endDate = s.endDate ? new Date(s.endDate) : null;
      return s.status !== "active" || (endDate && endDate < new Date());
    }).length;
    const pendingSubscriptions = state.coachSubscriptions.filter((s) => s.status === "pending").length;
    const expiringSoon = state.coachSubscriptions.filter((s) => {
      if (s.status !== "active" || !s.endDate) return false;
      const endDate = new Date(s.endDate);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    }).length;

    // Plan distribution from coach subscriptions
    const planDistribution = state.coachSubscriptions.reduce((acc, sub) => {
      const plan = sub.planName || "No Plan";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Revenue from coach subscriptions
    const totalRevenue = state.coachSubscriptions.reduce((sum, s) => sum + (s.price || 0), 0);
    const activeRevenue = state.coachSubscriptions
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + (s.price || 0), 0);

    // Coach status distribution for chart
    const coachStatusDistribution = {
      active: activeCoaches,
      pending: pendingCoaches,
      suspended: suspendedCoaches,
      inactive: inactiveCoaches,
    };

    return {
      coaches: { total: totalCoaches, active: activeCoaches, pending: pendingCoaches, suspended: suspendedCoaches, inactive: inactiveCoaches },
      clients: { total: totalClients, active: activeClients, inactive: inactiveClients, avgPerCoach: avgClientsPerCoach },
      subscriptions: { total: totalSubscriptions, active: activeSubscriptions, expired: expiredSubscriptions, pending: pendingSubscriptions, expiringSoon },
      revenue: { total: totalRevenue, active: activeRevenue },
      planDistribution,
      coachStatusDistribution,
    };
  }, [state]);

  const statCard = (icon: React.ReactNode, label: string, value: string | number, sub?: string) => (
    <div className="rounded-2xl border border-night-700 bg-night-850/50 p-5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-volt-400/10 text-volt-300">{icon}</div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-mist-500">{label}</p>
          <p className="font-display text-2xl font-bold leading-none text-mist-100">{value}</p>
          {sub && <p className="mt-0.5 text-[10px] text-mist-400">{sub}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <OwnerPageHeader title="Analytics" sub="SaaS performance insights" />

      {/* Coach Growth */}
      <div className="rise mt-8">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase text-mist-100">
          <Users className="h-5 w-5 text-volt-400" />
          Coach Overview
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCard(<Users className="h-5 w-5" />, "Total Coaches", metrics.coaches.total)}
          {statCard(<Users className="h-5 w-5" />, "Active", metrics.coaches.active)}
          {statCard(<Users className="h-5 w-5" />, "Pending", metrics.coaches.pending)}
          {statCard(<Users className="h-5 w-5" />, "Suspended", metrics.coaches.suspended)}
          {statCard(<Users className="h-5 w-5" />, "Inactive", metrics.coaches.inactive)}
        </div>

        {/* Coach Status Distribution Chart */}
        <div className="mt-6 rounded-2xl border border-night-700 bg-night-850/50 p-6 backdrop-blur-md">
          <h4 className="mb-4 font-display text-sm font-bold uppercase text-mist-100">Coach Status Distribution</h4>
          <div className="space-y-3">
            {Object.entries(metrics.coachStatusDistribution).map(([status, count]) => {
              const percentage = metrics.coaches.total > 0 ? ((count / metrics.coaches.total) * 100).toFixed(1) : "0";
              const colors: Record<string, string> = {
                active: "bg-moss-400",
                pending: "bg-warn-400",
                suspended: "bg-danger-500",
                inactive: "bg-mist-600",
              };
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-bold uppercase text-mist-400">{status}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-night-700">
                    <div
                      className={`h-2.5 rounded-full ${colors[status] || "bg-mist-600"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs font-bold text-mist-300">{count} ({percentage}%)</span>
                </div>
              );
            })}
            {metrics.coaches.total === 0 && (
              <p className="text-sm text-mist-500">No coach data available yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Client Growth */}
      <div className="rise mt-8">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase text-mist-100">
          <TrendingUp className="h-5 w-5 text-sky-400" />
          Client Metrics
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCard(<Users className="h-5 w-5" />, "Total Clients", metrics.clients.total)}
          {statCard(<Users className="h-5 w-5" />, "Active Clients", metrics.clients.active, `${metrics.clients.inactive} inactive`)}
          {statCard(<Activity className="h-5 w-5" />, "Avg Clients/Coach", metrics.clients.avgPerCoach, "per coach")}
          {statCard(<Users className="h-5 w-5" />, "Client Retention", "N/A", "coming soon")}
        </div>
      </div>

      {/* Subscription Analytics */}
      <div className="rise mt-8">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase text-mist-100">
          <Shield className="h-5 w-5 text-moss-400" />
          Subscription Analytics
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCard(<Shield className="h-5 w-5" />, "Active", metrics.subscriptions.active)}
          {statCard(<Shield className="h-5 w-5" />, "Expired", metrics.subscriptions.expired)}
          {statCard(<Shield className="h-5 w-5" />, "Pending", metrics.subscriptions.pending)}
          {statCard(<Shield className="h-5 w-5" />, "Expiring Soon", metrics.subscriptions.expiringSoon, "within 7 days")}
          {statCard(<Shield className="h-5 w-5" />, "Total", metrics.subscriptions.total)}
        </div>

        {/* Plan Distribution */}
        <div className="mt-6 rounded-2xl border border-night-700 bg-night-850/50 p-6 backdrop-blur-md">
          <h4 className="mb-4 font-display text-sm font-bold uppercase text-mist-100">Plan Distribution</h4>
          <div className="space-y-3">
            {Object.entries(metrics.planDistribution).map(([plan, count]) => {
              const percentage = metrics.subscriptions.total > 0 ? ((count / metrics.subscriptions.total) * 100).toFixed(1) : "0";
              return (
                <div key={plan} className="flex items-center gap-3">
                  <span className="w-24 truncate text-sm font-bold text-mist-300">{plan}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-night-700">
                    <div
                      className="h-2.5 rounded-full bg-volt-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs font-bold text-mist-400">{count} ({percentage}%)</span>
                </div>
              );
            })}
            {Object.keys(metrics.planDistribution).length === 0 && (
              <p className="text-sm text-mist-500">No subscription data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div className="rise mt-8">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase text-mist-100">
          <DollarSign className="h-5 w-5 text-warn-400" />
          Revenue Overview
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCard(<DollarSign className="h-5 w-5" />, "Total Revenue", `$${metrics.revenue.total.toLocaleString()}`)}
          {statCard(<DollarSign className="h-5 w-5" />, "Active Revenue", `$${metrics.revenue.active.toLocaleString()}`, "from active subscriptions")}
          {statCard(<DollarSign className="h-5 w-5" />, "Avg per Coach", `$${(metrics.revenue.total / (metrics.coaches.total || 1)).toFixed(0)}`)}
          {statCard(<DollarSign className="h-5 w-5" />, "Avg per Client", `$${(metrics.revenue.total / (metrics.clients.total || 1)).toFixed(0)}`)}
        </div>
      </div>

      {/* Empty State Info */}
      {metrics.coaches.total === 0 && (
        <div className="rise mt-8 rounded-2xl border border-night-700 bg-night-850/30 p-5">
          <p className="text-xs text-mist-500">
            <span className="font-bold text-volt-300">Note:</span> No coaches registered yet. Analytics will populate as coaches join the platform.
          </p>
        </div>
      )}
    </>
  );
}
