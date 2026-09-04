/* ================================================================
   FORGE — Owner Analytics View: SaaS-level analytics.
   ================================================================ */

import { useMemo } from "react";
import { useApp } from "../store";
import { OwnerPageHeader } from "./OwnerShell";
import { Users, TrendingUp, Shield, DollarSign } from "lucide-react";

export function OwnerAnalyticsView() {
  const { state } = useApp();

  // Calculate real metrics from actual data
  const metrics = useMemo(() => {
    const totalCoaches = 1; // Demo has 1 coach
    const activeCoaches = 1;
    const pendingCoaches = 0;
    const suspendedCoaches = 0;

    const totalClients = state.clients.length;
    const activeClients = state.clients.filter((c) => c.status === "Active").length;
    const inactiveClients = totalClients - activeClients;
    const avgClientsPerCoach = totalCoaches > 0 ? (totalClients / totalCoaches).toFixed(1) : "0";

    const totalSubscriptions = state.subscriptions.length;
    const activeSubscriptions = state.subscriptions.filter((s) => s.paymentStatus === "Paid" && new Date(s.endDate) >= new Date()).length;
    const expiredSubscriptions = state.subscriptions.filter((s) => new Date(s.endDate) < new Date()).length;
    const pendingSubscriptions = state.subscriptions.filter((s) => s.paymentStatus === "Pending").length;

    // Plan distribution (from client subscriptions in demo mode)
    const planDistribution = state.subscriptions.reduce((acc, sub) => {
      acc[sub.planName] = (acc[sub.planName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Revenue from subscriptions
    const totalRevenue = state.subscriptions.reduce((sum, s) => sum + s.price, 0);
    const activeRevenue = state.subscriptions
      .filter((s) => s.paymentStatus === "Paid")
      .reduce((sum, s) => sum + s.price, 0);

    return {
      coaches: { total: totalCoaches, active: activeCoaches, pending: pendingCoaches, suspended: suspendedCoaches },
      clients: { total: totalClients, active: activeClients, inactive: inactiveClients, avgPerCoach: avgClientsPerCoach },
      subscriptions: { total: totalSubscriptions, active: activeSubscriptions, expired: expiredSubscriptions, pending: pendingSubscriptions },
      revenue: { total: totalRevenue, active: activeRevenue },
      planDistribution,
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
          Coach Growth
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCard(<Users className="h-5 w-5" />, "Total Coaches", metrics.coaches.total)}
          {statCard(<Users className="h-5 w-5" />, "Active Coaches", metrics.coaches.active, `${metrics.coaches.pending} pending`)}
          {statCard(<Users className="h-5 w-5" />, "Pending Coaches", metrics.coaches.pending)}
          {statCard(<Users className="h-5 w-5" />, "Suspended Coaches", metrics.coaches.suspended)}
        </div>
      </div>

      {/* Client Growth */}
      <div className="rise mt-8">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase text-mist-100">
          <TrendingUp className="h-5 w-5 text-sky-400" />
          Client Growth
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCard(<Users className="h-5 w-5" />, "Total Clients", metrics.clients.total)}
          {statCard(<Users className="h-5 w-5" />, "Active Clients", metrics.clients.active, `${metrics.clients.inactive} inactive`)}
          {statCard(<Users className="h-5 w-5" />, "Avg Clients/Coach", metrics.clients.avgPerCoach, "per coach")}
          {statCard(<Users className="h-5 w-5" />, "Client Retention", "N/A", "coming soon")}
        </div>
      </div>

      {/* Subscription Analytics */}
      <div className="rise mt-8">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase text-mist-100">
          <Shield className="h-5 w-5 text-moss-400" />
          Subscription Analytics
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCard(<Shield className="h-5 w-5" />, "Active Subscriptions", metrics.subscriptions.active)}
          {statCard(<Shield className="h-5 w-5" />, "Expired Subscriptions", metrics.subscriptions.expired)}
          {statCard(<Shield className="h-5 w-5" />, "Pending Subscriptions", metrics.subscriptions.pending)}
          {statCard(<Shield className="h-5 w-5" />, "Total Subscriptions", metrics.subscriptions.total)}
        </div>

        {/* Plan Distribution */}
        <div className="mt-6 rounded-2xl border border-night-700 bg-night-850/50 p-6 backdrop-blur-md">
          <h4 className="mb-4 font-display text-sm font-bold uppercase text-mist-100">Plan Distribution</h4>
          <div className="space-y-3">
            {Object.entries(metrics.planDistribution).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="text-sm text-mist-400">{plan}</span>
                <span className="font-bold text-mist-200">{count} subscription{count !== 1 ? "s" : ""}</span>
              </div>
            ))}
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
          {statCard(<DollarSign className="h-5 w-5" />, "Active Revenue", `$${metrics.revenue.active.toLocaleString()}`, "from paid subscriptions")}
          {statCard(<DollarSign className="h-5 w-5" />, "Avg per Coach", `$${(metrics.revenue.total / (metrics.coaches.total || 1)).toFixed(0)}`)}
          {statCard(<DollarSign className="h-5 w-5" />, "Avg per Client", `$${(metrics.revenue.total / (metrics.clients.total || 1)).toFixed(0)}`)}
        </div>
      </div>

      {/* Demo Mode Info */}
      <div className="rise mt-8 rounded-2xl border border-night-700 bg-night-850/30 p-5">
        <p className="text-xs text-mist-500">
          <span className="font-bold text-volt-300">Demo Mode:</span> Analytics are calculated from your current session data. In production with Supabase, this would show aggregated historical data across all coaches and clients.
        </p>
      </div>
    </>
  );
}
