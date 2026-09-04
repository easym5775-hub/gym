/* ================================================================
   FORGE — Owner Subscriptions Management View.
   ================================================================ */

import { useState, useMemo } from "react";
import { useApp } from "../store";
import { OwnerShell, OwnerPageHeader } from "./OwnerShell";
import { signOut } from "../services/auth";
import type { OwnerView } from "./OwnerShell";
import { Shield, Calendar, DollarSign, MoreVertical, CheckCircle, Clock, XCircle } from "lucide-react";

export function OwnerSubscriptionsView() {
  const [view, setView] = useState<OwnerView>("subscriptions");
  const { state } = useApp();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "pending">("all");

  // Calculate subscription data from client subscriptions (in demo mode)
  // In production, this would come from coach_subscriptions table
  const subscriptions = useMemo(() => {
    // Group subscriptions by coach
    const coachIds = new Set(state.clients.map((c) => c.coachId));
    
    const subList = Array.from(coachIds).map((coachId, index) => {
      const coachClients = state.clients.filter((c) => c.coachId === coachId);
      const coachSubs = state.subscriptions.filter((s) => 
        coachClients.some((c) => c.id === s.clientId)
      );
      
      const totalRevenue = coachSubs.reduce((sum, s) => sum + s.price, 0);
      const activeCount = coachSubs.filter((s) => s.paymentStatus === "Paid").length;
      
      // Determine overall subscription status for this coach
      const hasActive = coachSubs.some((s) => {
        const endDate = new Date(s.endDate);
        return s.paymentStatus === "Paid" && endDate >= new Date();
      });
      const hasExpired = coachSubs.some((s) => new Date(s.endDate) < new Date());
      
      let status: "ACTIVE" | "EXPIRED" | "PENDING" = "PENDING";
      if (hasActive) status = "ACTIVE";
      else if (hasExpired) status = "EXPIRED";
      
      // Find the latest ending subscription
      const latestEnd = coachSubs.length > 0 
        ? new Date(Math.max(...coachSubs.map((s) => new Date(s.endDate).getTime())))
        : new Date();
      
      const daysRemaining = Math.ceil((latestEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: `sub-${coachId}`,
        coachId,
        coachName: `Coach ${index + 1}`,
        coachEmail: "coach@forge.fit",
        planName: "Pro Plan",
        status,
        startDate: "2024-01-01",
        endDate: latestEnd.toISOString().split("T")[0],
        price: totalRevenue,
        autoRenew: false,
        clientCount: coachClients.length,
        activeClientSubscriptions: activeCount,
        daysRemaining: Math.max(0, daysRemaining),
      };
    });

    // If no subscriptions found, add a placeholder
    if (subList.length === 0) {
      subList.push({
        id: "sub-demo",
        coachId: "demo-coach",
        coachName: "Demo Coach",
        coachEmail: "coach@forge.fit",
        planName: "Pro Plan",
        status: "ACTIVE" as const,
        startDate: "2024-01-01",
        endDate: "2025-12-31",
        price: state.subscriptions.reduce((sum, s) => sum + s.price, 0),
        autoRenew: false,
        clientCount: state.clients.length,
        activeClientSubscriptions: state.subscriptions.filter((s) => s.paymentStatus === "Paid").length,
        daysRemaining: 365,
      });
    }

    return subList;
  }, [state.clients, state.subscriptions]);

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (statusFilter === "all") return true;
      return sub.status.toLowerCase() === statusFilter;
    });
  }, [subscriptions, statusFilter]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-moss-400/10 text-moss-300 border-moss-400/20",
      EXPIRED: "bg-danger-500/10 text-danger-300 border-danger-500/20",
      PENDING: "bg-warn-400/10 text-warn-300 border-warn-400/20",
    };
    const icons: Record<string, React.ReactNode> = {
      ACTIVE: <CheckCircle className="h-3 w-3" />,
      EXPIRED: <XCircle className="h-3 w-3" />,
      PENDING: <Clock className="h-3 w-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status] || styles.PENDING}`}>
        {icons[status] || <Clock className="h-3 w-3" />}
        {status}
      </span>
    );
  };

  const handleExtendSubscription = (subscriptionId: string, days: number) => {
    // In production, this would call backend API to extend subscription
    console.log(`Extending subscription ${subscriptionId} by ${days} days`);
    alert(`Subscription extension by ${days} days - implement backend integration`);
  };

  const handleChangePlan = (subscriptionId: string) => {
    // In production, this would open a modal to change plan
    console.log(`Changing plan for subscription ${subscriptionId}`);
    alert("Change plan - implement modal with plan options");
  };

  return (
    <OwnerShell view={view} setView={setView} onLogout={() => void signOut()}>
      <OwnerPageHeader
        title="Subscriptions"
        sub="Manage coach subscriptions and billing"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-mist-500">
              {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? "s" : ""}
            </span>
          </div>
        }
      />

      {/* Filters */}
      <div className="rise mt-6 flex items-center gap-2">
        <Shield className="h-4 w-4 text-mist-500" />
        <select
          className="rounded-xl border border-night-600 bg-night-850 px-3 py-2 text-sm text-mist-200 focus:border-volt-400/40 focus:outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Subscriptions Grid */}
      <div className="rise mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubscriptions.map((sub) => (
          <div
            key={sub.id}
            className="group relative overflow-hidden rounded-2xl border border-night-700 bg-night-850/50 p-5 backdrop-blur-md transition-all duration-200 hover:border-volt-400/30 hover:bg-night-800/60"
          >
            {/* Status Indicator */}
            <div className="absolute end-4 top-4">{getStatusBadge(sub.status)}</div>

            {/* Coach Info */}
            <div className="mb-4">
              <h3 className="font-display text-lg font-bold uppercase text-mist-100">{sub.coachName}</h3>
              <p className="text-xs text-mist-500">{sub.coachEmail}</p>
            </div>

            {/* Plan Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-volt-400" />
                <span className="text-sm font-semibold text-mist-300">{sub.planName}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-mist-500" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-mist-500">End Date</span>
                    <span className="text-mist-300">{sub.endDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-mist-500" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-mist-500">Total Revenue</span>
                    <span className="font-bold text-mist-300">${sub.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-mist-500" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-mist-500">Clients</span>
                    <span className="text-mist-300">{sub.clientCount} total</span>
                  </div>
                </div>
              </div>

              {/* Days Remaining */}
              <div className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${
                sub.daysRemaining <= 7 
                  ? "bg-warn-400/10 text-warn-300" 
                  : sub.daysRemaining <= 30 
                    ? "bg-sky-400/10 text-sky-300"
                    : "bg-moss-400/10 text-moss-300"
              }`}>
                {sub.daysRemaining} days remaining
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleExtendSubscription(sub.id, 30)}
                className="flex-1 cursor-pointer rounded-xl border border-night-600 bg-night-800 py-2 text-xs font-bold text-mist-400 transition-all duration-200 hover:border-volt-400/40 hover:bg-volt-400/10 hover:text-volt-300"
              >
                +30 Days
              </button>
              <button
                onClick={() => handleChangePlan(sub.id)}
                className="flex-1 cursor-pointer rounded-xl border border-night-600 bg-night-800 py-2 text-xs font-bold text-mist-400 transition-all duration-200 hover:border-volt-400/40 hover:bg-volt-400/10 hover:text-volt-300"
              >
                Change Plan
              </button>
              <button className="cursor-pointer rounded-xl border border-night-600 bg-night-800 p-2 text-mist-400 transition-all duration-200 hover:border-danger-500/40 hover:bg-danger-500/10 hover:text-danger-300">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredSubscriptions.length === 0 && (
          <div className="col-span-full rounded-2xl border border-night-700 bg-night-850/30 p-8 text-center">
            <Shield className="mx-auto h-12 w-12 text-mist-600" />
            <p className="mt-3 text-sm font-bold text-mist-500">No subscriptions found</p>
            <p className="mt-1 text-xs text-mist-600">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Expiring Soon Alert */}
      {subscriptions.some((s) => s.daysRemaining <= 7 && s.status === "ACTIVE") && (
        <div className="rise mt-6 rounded-2xl border border-warn-400/20 bg-warn-400/5 p-5">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 shrink-0 text-warn-400" />
            <div>
              <h4 className="font-display text-sm font-bold uppercase text-warn-300">Expiring Soon</h4>
              <p className="mt-1 text-xs text-mist-400">
                {subscriptions.filter((s) => s.daysRemaining <= 7 && s.status === "ACTIVE").length} subscription(s) expiring within 7 days. Consider reaching out to coaches for renewal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rise mt-6 rounded-2xl border border-night-700 bg-night-850/30 p-5">
        <p className="text-xs text-mist-500">
          <span className="font-bold text-volt-300">Demo Mode:</span> Subscription data is derived from client subscriptions. In production, coach_subscriptions table provides dedicated SaaS subscription management.
        </p>
      </div>
    </OwnerShell>
  );
}
