"use client";

import { useState } from "react";
import type { PLANS } from "@/lib/stripe";

interface Props {
  currentPlan: string;
  hasSubscription: boolean;
  plans: typeof PLANS;
}

export function BillingClient({ currentPlan, hasSubscription, plans }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: string) => {
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    setLoading("manage");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Free tier */}
      <div className={`border p-5 ${currentPlan === "FREE" ? "border-comm-blue" : "border-gray-200"}`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium lowercase">free</p>
            <p className="text-sm text-gray-400 lowercase mt-1">$0/mo</p>
            <ul className="text-xs text-gray-500 lowercase mt-2 space-y-1">
              <li>3 continuums</li>
              <li>participate in invited continuums</li>
              <li>1 team</li>
            </ul>
          </div>
          {currentPlan === "FREE" && (
            <span className="text-xs text-comm-blue lowercase">current plan</span>
          )}
        </div>
      </div>

      {Object.entries(plans).map(([key, plan]) => (
        <div
          key={key}
          className={`border p-5 ${currentPlan === key ? "border-comm-blue" : "border-gray-200"}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium lowercase">{plan.name.toLowerCase()}</p>
              <p className="text-sm text-gray-400 lowercase mt-1">{plan.price}</p>
              <ul className="text-xs text-gray-500 lowercase mt-2 space-y-1">
                {plan.features.map((f) => (
                  <li key={f}>{f.toLowerCase()}</li>
                ))}
              </ul>
            </div>
            <div>
              {currentPlan === key ? (
                <span className="text-xs text-comm-blue lowercase">current plan</span>
              ) : (
                <button
                  onClick={() => handleUpgrade(key)}
                  disabled={!!loading}
                  className="bg-comm-blue text-white px-4 py-2 text-xs lowercase hover:bg-blue-800 disabled:opacity-50"
                >
                  {loading === key ? "loading..." : `upgrade to ${plan.name.toLowerCase()}`}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {hasSubscription && (
        <button
          onClick={handleManage}
          disabled={!!loading}
          className="text-xs text-gray-400 lowercase underline hover:text-gray-600 disabled:opacity-50"
        >
          {loading === "manage" ? "loading..." : "manage subscription"}
        </button>
      )}
    </div>
  );
}
