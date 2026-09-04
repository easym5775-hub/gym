/* ================================================================
   FORGE — Owner Subscriptions Management View.
   ================================================================ */

import { useState, useMemo } from "react";
import { useApp } from "../store";
import { OwnerPageHeader } from "./OwnerShell";
import { Shield, Calendar, DollarSign, MoreVertical, CheckCircle, Clock, XCircle, Users } from "lucide-react";
import backend from "../services/backend";
import { toast } from "../components/ui";

export function OwnerSubscriptionsView() {
  const { state, refresh } = useApp();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "pending">("all");
  const [loading, setLoading] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);

  // Calculate subscription data from coach_subscriptions
  const subscriptions = useMemo(() => {
    // In Supabase mode, this comes from coach_subscriptions table
    // In Demo mode, we derive from demo data
    
    const coachIds = new Set(state.coaches.map((c) => c.id));
    
    const subList = Array.from(coachIds).map((coachId) => {
      const coach = state.coaches.find((c) => c.id === coachId);
      if (!coach) return null;
      
      const coachSubs = state.coachSubscriptions.filter((s) => s.coachId === coachId);
      
      // Get the primary/active subscription for this coach
      const primarySub = coachSubs.find((s) => s.status === "active") || coachSubs[0];
      
      if (!primarySub) {
        // No subscription found - create a placeholder showing no subscription
        return {
          id: `sub-${coachId}`,
          coachId,
          coachName: coach.name || "Unknown Coach",
          coachEmail: coach.email || "No email",
          planName: "No Plan",
          status: "PENDING" as const,
          startDate: null,
          endDate: null,
          price: 0,
          autoRenew: false,
          clientCount: state.clients.filter((c) => c.coachId === coachId).length,
          activeClientSubscriptions: 0,
          daysRemaining: 0,
        };
      }
      
      const endDate = primarySub.endDate ? new Date(primarySub.endDate) : null;
      const daysRemaining = endDate ? Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      let status: "ACTIVE" | "EXPIRED" | "PENDING" = "PENDING";
      if (primarySub.status === "active") {
        if (endDate && endDate >= new Date()) {
          status = "ACTIVE";
        } else if (endDate) {
          status = "EXPIRED";
        }
      } else if (primarySub.status === "pending") {
        status = "PENDING";
      } else if (primarySub.status === "cancelled" || primarySub.status === "expired") {
        status = "EXPIRED";
      }
      
      return {
        id: primarySub.id,
        coachId,
        coachName: coach.name || "Unknown Coach",
        coachEmail: coach.email || "No email",
        planName: primarySub.planName || "No Plan",
        status,
        startDate: primarySub.startDate,
        endDate: primarySub.endDate,
        price: primarySub.price || 0,
        autoRenew: primarySub.autoRenew || false,
        clientCount: state.clients.filter((c) => c.coachId === coachId).length,
        activeClientSubscriptions: coachSubs.filter((s) => s.status === "active").length,
        daysRemaining: Math.max(0, daysRemaining),
      };
    }).filter(Boolean);

    return subList as any[];
  }, [state.coaches, state.coachSubscriptions, state.clients]);

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

  const handleExtendSubscription = async (subscriptionId: string, days: number) => {
    setLoading(true);
    try {
      // In production, this would call backend API to extend subscription
      // For now, show a message that this requires backend integration
      toast.info(`Extension by ${days} days - backend integration required`);
    } catch (error) {
      console.error("Failed to extend subscription:", error);
      toast.error("Failed to extend subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = (subscriptionId: string) => {
    setSelectedSubscription(subscriptionId);
    setPlanModalOpen(true);
  };

  const handlePlanChange = async (planName: string, price: number) => {
    if (!selectedSubscription) return;
    
    setLoading(true);
    try {
      // In production, this would call backend API to change plan
      toast.success(`Plan changed to ${planName} - backend integration required`);
      setPlanModalOpen(false);
      setSelectedSubscription(null);
    } catch (error) {
      console.error("Failed to change plan:", error);
      toast.error("Failed to change plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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

              {sub.endDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-mist-500" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-mist-500">End Date</span>
                      <span className="text-mist-300">{sub.endDate}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-mist-500" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-mist-500">Price</span>
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
              {sub.daysRemaining > 0 && (
                <div className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${
                  sub.daysRemaining <= 7 
                    ? "bg-warn-400/10 text-warn-300" 
                    : sub.daysRemaining <= 30 
                      ? "bg-sky-400/10 text-sky-300"
                      : "bg-moss-400/10 text-moss-300"
                }`}>
                  {sub.daysRemaining} days remaining
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleExtendSubscription(sub.id, 30)}
                disabled={loading}
                className="flex-1 cursor-pointer rounded-xl border border-night-600 bg-night-800 py-2 text-xs font-bold text-mist-400 transition-all duration-200 hover:border-volt-400/40 hover:bg-volt-400/10 hover:text-volt-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +30 Days
              </button>
              <button
                onClick={() => handleChangePlan(sub.id)}
                disabled={loading}
                className="flex-1 cursor-pointer rounded-xl border border-night-600 bg-night-800 py-2 text-xs font-bold text-mist-400 transition-all duration-200 hover:border-volt-400/40 hover:bg-volt-400/10 hover:text-volt-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
      {subscriptions.some((s) => s.daysRemaining <= 7 && s.daysRemaining > 0 && s.status === "ACTIVE") && (
        <div className="rise mt-6 rounded-2xl border border-warn-400/20 bg-warn-400/5 p-5">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 shrink-0 text-warn-400" />
            <div>
              <h4 className="font-display text-sm font-bold uppercase text-warn-300">Expiring Soon</h4>
              <p className="mt-1 text-xs text-mist-400">
                {subscriptions.filter((s) => s.daysRemaining <= 7 && s.daysRemaining > 0 && s.status === "ACTIVE").length} subscription(s) expiring within 7 days. Consider reaching out to coaches for renewal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Change Modal */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-night-700 bg-night-900 p-6">
            <h3 className="font-display text-xl font-bold uppercase text-mist-100">Change Subscription Plan</h3>
            <p className="mt-2 text-sm text-mist-400">Select a new plan for this coach:</p>
            
            <div className="mt-4 space-y-3">
              <button
                onClick={() => handlePlanChange("Free", 0)}
                className="w-full rounded-xl border border-night-600 bg-night-800 p-4 text-left transition-all duration-200 hover:border-volt-400/40 hover:bg-volt-400/10"
              >
                <p className="font-bold text-mist-200">Free Plan</p>
                <p className="text-xs text-mist-500">$0/month - Basic features</p>
              </button>
              <button
                onClick={() => handlePlanChange("Pro", 29)}
                className="w-full rounded-xl border border-night-600 bg-night-800 p-4 text-left transition-all duration-200 hover:border-volt-400/40 hover:bg-volt-400/10"
              >
                <p className="font-bold text-mist-200">Pro Plan</p>
                <p className="text-xs text-mist-500">$29/month - All features</p>
              </button>
              <button
                onClick={() => handlePlanChange("Enterprise", 99)}
                className="w-full rounded-xl border border-night-600 bg-night-800 p-4 text-left transition-all duration-200 hover:border-volt-400/40 hover:bg-volt-400/10"
              >
                <p className="font-bold text-mist-200">Enterprise Plan</p>
                <p className="text-xs text-mist-500">$99/month - Custom features</p>
              </button>
            </div>

            <button
              onClick={() => setPlanModalOpen(false)}
              className="mt-4 w-full cursor-pointer rounded-xl border border-night-600 bg-night-800 py-2 text-xs font-bold text-mist-400 transition-all duration-200 hover:border-mist-400/40 hover:bg-mist-400/10 hover:text-mist-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
