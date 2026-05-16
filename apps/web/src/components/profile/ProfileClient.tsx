"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { signIn } from "next-auth/react";

const BLUE = "#0083FF";
const DARK_BLUE = "#3F58D0";
const PIXELIFY = "var(--font-pixelify)";
const PROLETARIAN = "var(--font-proletarian)";

function LineInput({ label, type = "text", value, onChange, readOnly }: {
  label: string; type?: string; value: string;
  onChange?: (v: string) => void; readOnly?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.9rem" }}>
      <span style={{ fontFamily: PIXELIFY, color: DARK_BLUE, fontSize: "clamp(10px,0.9vw,14px)", whiteSpace: "nowrap", minWidth: 90, textAlign: "right" }}>
        {label}
      </span>
      <input
        type={type} value={value} readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          flex: 1, border: "none", borderBottom: `1.5px solid ${DARK_BLUE}`,
          outline: "none", fontFamily: PROLETARIAN, fontSize: "clamp(10px,0.9vw,14px)",
          color: DARK_BLUE, background: "transparent", paddingBottom: 2,
          opacity: readOnly ? 0.5 : 1,
        }}
      />
    </div>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "google",
  facebook: "facebook",
  "azure-ad": "microsoft",
  zoom: "zoom",
};

const ALL_PROVIDERS = ["google", "azure-ad", "facebook"];

export function ProfileClient({ user }: {
  user: {
    name: string; email: string; slogan: string; url: string;
    avatarConfig: object; connectedProviders: string[]; hasPassword: boolean;
  };
}) {
  const [name, setName] = useState(user.name);
  const [slogan, setSlogan] = useState(user.slogan);
  const [url, setUrl] = useState(user.url);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(user.connectedProviders);

  async function handleUpdate() {
    setSaving(true); setSaved(false); setError("");
    const res = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slogan, url }),
    });
    setSaving(false);
    if (res.ok) setSaved(true); else setError("could not save");
  }

  async function handleDisconnect(provider: string) {
    const res = await fetch(`/api/users/accounts?provider=${provider}`, { method: "DELETE" });
    if (res.ok) setConnected((c) => c.filter((p) => p !== provider));
    else alert("cannot remove only auth method");
  }

  return (
    <div style={{ minHeight: "100vh", background: "white", display: "flex", fontFamily: PROLETARIAN }}>

      {/* ── Left nav ── */}
      <div style={{ width: "clamp(120px,12vw,200px)", flexShrink: 0, padding: "clamp(20px,3vw,48px) clamp(16px,2vw,32px)" }}>
        <Link href="/dashboard" style={{ display: "block", marginBottom: "clamp(12px,1.5vw,24px)" }}>
          <Image src="/logo.svg" alt="communi*culture" width={180} height={33}
            style={{ width: "clamp(90px,9vw,160px)", height: "auto" }} priority />
          <span style={{ display: "block", fontFamily: PIXELIFY, fontSize: "clamp(6px,0.5vw,9px)", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", whiteSpace: "nowrap", marginTop: 4 }}>
            a division of futurefarmers
          </span>
        </Link>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, color: BLUE, fontFamily: PIXELIFY, fontSize: "clamp(10px,0.9vw,14px)" }}>
          <Link href="/dashboard" className="hover:underline">continuums</Link>
          <Link href="/dashboard" className="hover:underline">view others</Link>
          <Link href="/profile" className="hover:underline" style={{ color: DARK_BLUE, fontWeight: "bold" }}>edit yourself</Link>
        </nav>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, padding: "clamp(32px,4vw,64px) clamp(24px,4vw,64px)", maxWidth: 680 }}>

        {/* Avatar preview + edit link */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "clamp(16px,2vw,32px)", marginBottom: "clamp(24px,3vw,48px)" }}>
          <div>
            <Link href="/profile/avatar">
              {/* Placeholder — replace with actual avatar thumbnail when available */}
              <div style={{
                width: "clamp(80px,8vw,130px)", height: "clamp(80px,8vw,130px)",
                background: "#f0f4ff", border: `1.5px solid ${DARK_BLUE}20`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <span style={{ fontFamily: PIXELIFY, color: `${DARK_BLUE}60`, fontSize: 11 }}>avatar</span>
              </div>
            </Link>
            <Link href="/profile/avatar" style={{ display: "block", marginTop: 6, fontFamily: PIXELIFY, color: DARK_BLUE, fontSize: "clamp(9px,0.75vw,12px)", textAlign: "center", textDecoration: "underline" }}>
              edit
            </Link>
          </div>

          {/* User info form */}
          <div style={{ flex: 1 }}>
            <LineInput label="name" value={name} onChange={setName} />
            <LineInput label="email" value={user.email} readOnly />
            <LineInput label="slogan" value={slogan} onChange={setSlogan} />
            <LineInput label="url" value={url} onChange={setUrl} />
            {error && <p style={{ color: "#c00", fontSize: 11, marginBottom: 6 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 4 }}>
              {saved && <span style={{ fontFamily: PIXELIFY, color: BLUE, fontSize: 11 }}>saved</span>}
              <button onClick={handleUpdate} disabled={saving} style={{
                fontFamily: PIXELIFY, color: DARK_BLUE, background: "none", border: "none",
                cursor: "pointer", fontSize: "clamp(10px,0.9vw,14px)", textDecoration: "underline",
              }}>
                {saving ? "saving..." : "update"}
              </button>
            </div>
          </div>
        </div>

        {/* Connected accounts */}
        <div style={{ borderTop: `1px solid ${DARK_BLUE}15`, paddingTop: "clamp(16px,2vw,32px)" }}>
          <h3 style={{ fontFamily: PIXELIFY, color: DARK_BLUE, fontSize: "clamp(11px,1vw,16px)", marginBottom: "clamp(10px,1.2vw,20px)", letterSpacing: "0.05em" }}>
            connected accounts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ALL_PROVIDERS.map((provider) => {
              const isConnected = connected.includes(provider);
              return (
                <div key={provider} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: PROLETARIAN, color: DARK_BLUE, fontSize: "clamp(10px,0.85vw,13px)", minWidth: 90 }}>
                    {PROVIDER_LABELS[provider] ?? provider}
                  </span>
                  {isConnected ? (
                    <button onClick={() => handleDisconnect(provider)} style={{
                      fontFamily: PIXELIFY, fontSize: "clamp(9px,0.7vw,11px)", color: `${DARK_BLUE}60`,
                      background: "none", border: "none", cursor: "pointer", textDecoration: "underline",
                    }}>
                      disconnect
                    </button>
                  ) : (
                    <button onClick={() => signIn(provider, { callbackUrl: "/profile" })} style={{
                      fontFamily: PIXELIFY, fontSize: "clamp(9px,0.7vw,11px)", color: BLUE,
                      background: "none", border: "none", cursor: "pointer", textDecoration: "underline",
                    }}>
                      connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
