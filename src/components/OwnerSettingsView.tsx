/* ================================================================
   FORGE — Owner Settings View: SaaS configuration.
   ================================================================ */

import { useState } from "react";
import { useApp } from "../store";
import { OwnerPageHeader } from "./OwnerShell";
import { Settings as SettingsIcon, User, Shield, CreditCard, CheckCircle } from "lucide-react";

export function OwnerSettingsView() {
  const { me, toast } = useApp();
  const [activeTab, setActiveTab] = useState<"profile" | "saas">("profile");
  const [defaultDuration, setDefaultDuration] = useState("30");
  const [autoRenew, setAutoRenew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Plan configuration - in production this would come from database
  const [plans, setPlans] = useState([
    { id: "free", name: "Free", price: 0, features: "Basic features", active: true },
    { id: "pro", name: "Pro", price: 29, features: "All features", active: true },
    { id: "enterprise", name: "Enterprise", price: 99, features: "Custom features", active: true },
  ]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // In production, persist to backend
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const togglePlanActive = (planId: string) => {
    setPlans(plans.map((p) => (p.id === planId ? { ...p, active: !p.active } : p)));
    toast.success("Plan status updated");
  };

  return (
    <>
      <OwnerPageHeader title="Settings" sub="Owner account and SaaS configuration" />

      {/* Tabs */}
      <div className="rise mt-6 flex gap-2 border-b border-night-700 pb-1">
        <button
          onClick={() => setActiveTab("profile")}
          className={`rounded-t-xl px-4 py-2 text-sm font-bold transition-all duration-200 ${
            activeTab === "profile"
              ? "bg-volt-400/10 text-volt-300 border-b-2 border-volt-400"
              : "text-mist-400 hover:text-mist-200"
          }`}
        >
          <User className="mr-2 inline h-4 w-4" />
          Owner Profile
        </button>
        <button
          onClick={() => setActiveTab("saas")}
          className={`rounded-t-xl px-4 py-2 text-sm font-bold transition-all duration-200 ${
            activeTab === "saas"
              ? "bg-volt-400/10 text-volt-300 border-b-2 border-volt-400"
              : "text-mist-400 hover:text-mist-200"
          }`}
        >
          <Shield className="mr-2 inline h-4 w-4" />
          SaaS Settings
        </button>
      </div>

      {/* Content */}
      <div className="rise mt-6">
        {activeTab === "profile" && (
          <div className="rounded-2xl border border-night-700 bg-night-850/50 p-6 backdrop-blur-md">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase text-mist-100">
              <User className="h-5 w-5 text-volt-400" />
              Owner Profile
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-mist-500">Name</label>
                <p className="mt-1 text-sm text-mist-200">{me?.name ?? "Not available"}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-mist-500">Email</label>
                <p className="mt-1 text-sm text-mist-200">{me?.email ?? "Not available"}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-mist-500">Role</label>
                <p className="mt-1 text-sm text-mist-200 capitalize">{me?.role ?? "Not available"}</p>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-warn-400/20 bg-warn-400/5 p-4">
              <p className="text-xs text-mist-400">
                <span className="font-bold text-warn-300">Note:</span> Owner profile settings are managed through your authentication provider. Contact your system administrator to update your profile information.
              </p>
            </div>
          </div>
        )}

        {activeTab === "saas" && (
          <div className="space-y-6">
            {/* Subscription Plans */}
            <div className="rounded-2xl border border-night-700 bg-night-850/50 p-6 backdrop-blur-md">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase text-mist-100">
                <CreditCard className="h-5 w-5 text-volt-400" />
                Subscription Plans
              </h3>
              <p className="mb-4 text-sm text-mist-400">Configure available subscription plans for coaches.</p>
              
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between rounded-xl border border-night-600 bg-night-800/50 p-4">
                    <div>
                      <p className="font-bold text-mist-200">{plan.name} Plan</p>
                      <p className="text-xs text-mist-500">${plan.price}/month - {plan.features}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        plan.active 
                          ? "bg-moss-400/10 text-moss-300" 
                          : "bg-night-700 text-mist-400"
                      }`}>
                        {plan.active ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={() => togglePlanActive(plan.id)}
                        className="cursor-pointer rounded-lg border border-night-600 bg-night-800 px-3 py-1 text-xs font-bold text-mist-400 transition-all duration-200 hover:border-volt-400/40 hover:bg-volt-400/10 hover:text-volt-300"
                      >
                        {plan.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button className="mt-4 cursor-pointer rounded-xl border border-night-600 bg-night-800 px-4 py-2 text-xs font-bold text-mist-400 transition-all duration-200 hover:border-volt-400/40 hover:bg-volt-400/10 hover:text-volt-300">
                + Add New Plan
              </button>
            </div>

            {/* Default Settings */}
            <div className="rounded-2xl border border-night-700 bg-night-850/50 p-6 backdrop-blur-md">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase text-mist-100">
                <SettingsIcon className="h-5 w-5 text-volt-400" />
                Default Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-mist-500">Default Subscription Duration</label>
                  <select 
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-night-600 bg-night-800 px-3 py-2 text-sm text-mist-200 focus:border-volt-400/40 focus:outline-none"
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">365 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-mist-500">Auto-renew Default</label>
                  <select 
                    value={autoRenew ? "true" : "false"}
                    onChange={(e) => setAutoRenew(e.target.value === "true")}
                    className="mt-1 w-full rounded-xl border border-night-600 bg-night-800 px-3 py-2 text-sm text-mist-200 focus:border-volt-400/40 focus:outline-none"
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="mt-4 flex items-center gap-2 cursor-pointer rounded-xl border border-volt-400/40 bg-volt-400/10 px-4 py-2 text-xs font-bold text-volt-300 transition-all duration-200 hover:bg-volt-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>

            {/* Info Box */}
            <div className="rounded-2xl border border-night-700 bg-night-850/30 p-5">
              <p className="text-xs text-mist-500">
                <span className="font-bold text-volt-300">Configuration:</span> These settings control default values for new coach subscriptions. Changes will apply to new subscriptions created after saving.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
