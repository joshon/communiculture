"use client";

import { useState } from "react";
import type { PACKS } from "@/lib/stripe";
import Link from "next/link";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";

interface Props {
  totalOwned: number;
  allowed: number | null; // null = lifetime
  continuumCredits: number;
  packs: typeof PACKS;
  justPurchased?: boolean;
}

export function BillingClient({ totalOwned, allowed, continuumCredits, packs, justPurchased }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleBuy = async (pack: string) => {
    setLoading(pack);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(null);
    }
  };

  const isLifetime = allowed === null;
  const used = totalOwned;
  const remaining = isLifetime ? null : Math.max(0, (allowed ?? 0) - used);

  return (
    <div>
      {/* Usage summary */}
      <div style={{ background: "#f8f8f8", padding: "16px 20px", marginBottom: 32, fontFamily: INTER }}>
        {isLifetime ? (
          <p style={{ margin: 0, fontSize: 15, color: "#1a1a1a" }}>
            <strong>Lifetime access</strong> — unlimited continuums
            <span style={{ fontSize: 13, color: "#888", marginLeft: 8 }}>({used} created)</span>
          </p>
        ) : (
          <>
            <p style={{ margin: "0 0 4px", fontSize: 15, color: "#1a1a1a" }}>
              <strong>{used}</strong> of <strong>{allowed}</strong> continuums used
              {remaining === 0 && (
                <span style={{ color: "#cc2222", marginLeft: 8, fontSize: 13 }}>— limit reached</span>
              )}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
              5 free + {continuumCredits} purchased
              {remaining !== null && remaining > 0 && ` — ${remaining} remaining`}
            </p>
          </>
        )}
      </div>

      {/* After a purchase: encourage creating, not buying again */}
      {justPurchased && (
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontFamily: INTER, fontSize: 15, color: "#1a1a1a", margin: "0 0 16px" }}>
            {remaining !== null && remaining > 0
              ? `You've got ${remaining} continuum${remaining === 1 ? "" : "s"} ready — go make one.`
              : "All set — go make a continuum."}
          </p>
          <Link
            href="/continuum/new"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: BLUE, color: "white", textDecoration: "none",
              fontFamily: INTER, fontSize: 16, fontWeight: 700,
              padding: "12px 24px", borderRadius: 999,
            }}
          >
            New continuum
          </Link>
        </div>
      )}

      {/* Pack cards */}
      {!isLifetime && !justPurchased && (
        <>
          <p style={{ fontFamily: INTER, fontSize: 14, color: "#555", marginBottom: 16 }}>
            Buy more continuums — one-time purchase, never expires.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
            {Object.entries(packs).map(([key, pack]) => (
              <div
                key={key}
                style={{
                  border: "1.5px solid #1a1a1a",
                  padding: "20px 24px",
                  minWidth: 180,
                  flex: 1,
                  fontFamily: INTER,
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{pack.price}</p>
                <p style={{ margin: "0 0 16px", fontSize: 14, color: "#555" }}>{pack.credits} continuums</p>
                <button
                  onClick={() => handleBuy(key)}
                  disabled={!!loading}
                  style={{
                    background: BLUE,
                    color: "white",
                    border: "none",
                    padding: "8px 18px",
                    fontFamily: INTER,
                    fontSize: 14,
                    cursor: "pointer",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading === key ? "Loading…" : "Buy"}
                </button>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: INTER, fontSize: 12, color: "#aaa" }}>
            Deleting a continuum moves it to your archive but does not free up a slot — your count reflects all continuums ever created.
          </p>
        </>
      )}
    </div>
  );
}
