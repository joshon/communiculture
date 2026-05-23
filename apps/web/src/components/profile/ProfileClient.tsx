"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { DashboardAvatarHead } from "@/components/dashboard/DashboardAvatarHead";
import { PillButton } from "@/components/ui/PillButton";
import { PageTitle } from "@/components/ui/PageTitle";
import { U } from "@/lib/scale";

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
    avatarConfig: object; avatarThumbnail: string | null;
    connectedProviders: string[]; hasPassword: boolean;
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

  const pagePadTop  = `clamp(12px, ${U(50)}, 60px)`;
  const pageLeftPad = `clamp(16px, ${U(38)}, 48px)`;
  const logoW       = `clamp(180px, ${U(475)}, 600px)`;
  const logoMb      = `clamp(14px, ${U(32)}, 48px)`;
  const titleMb     = `clamp(20px, ${U(40)}, 56px)`;
  const avatarSize  = `clamp(60px, ${U(100)}, 130px)`;
  const contentGap  = `clamp(32px, ${U(80)}, 120px)`;

  return (
    <div style={{ minHeight: "100vh", background: "white", fontFamily: PROLETARIAN }}>
      <main style={{
        paddingTop: pagePadTop,
        paddingLeft: pageLeftPad,
        paddingRight: pageLeftPad,
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Row 1: Logo (left) + Avatar head (right) */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: logoMb, flexShrink: 0 }}>
          <Link href="/dashboard" style={{ display: "block" }}>
            <Image src="/logo.svg" alt="communi*culture" width={361} height={65}
              style={{ width: logoW, height: "auto" }} priority />
          </Link>
          <DashboardAvatarHead thumbnailUrl={user.avatarThumbnail} size={avatarSize} />
        </div>

        {/* Row 2: back + title */}
        <div style={{ display: "flex", alignItems: "center", gap: `clamp(10px, ${U(20)}, 28px)`, marginBottom: titleMb, flexShrink: 0 }}>
          <PillButton href="/dashboard" label="← home" fontSize="clamp(11px, 0.85vw, 14px)" />
          <PageTitle>profile</PageTitle>
        </div>

        {/* Content: form left, avatar preview right */}
        <div style={{ display: "flex", gap: contentGap, alignItems: "flex-start" }}>

          {/* Left: form */}
          <div style={{ flex: 1, maxWidth: 480 }}>
            <LineInput label="name" value={name} onChange={setName} />
            <LineInput label="email" value={user.email} readOnly />
            {error && <p style={{ color: "#c00", fontSize: 11, marginBottom: 6 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 4, marginBottom: "clamp(16px,2vw,32px)" }}>
              {saved && <span style={{ fontFamily: PIXELIFY, color: BLUE, fontSize: 11 }}>saved</span>}
              <button onClick={handleUpdate} disabled={saving} style={{
                fontFamily: PIXELIFY, color: DARK_BLUE, background: "none", border: "none",
                cursor: "pointer", fontSize: "clamp(10px,0.9vw,14px)", textDecoration: "underline",
              }}>
                {saving ? "saving..." : "update"}
              </button>
            </div>

            {/* Connected accounts */}
            <div style={{ borderTop: `1px solid ${DARK_BLUE}15`, paddingTop: "clamp(16px,2vw,32px)", marginBottom: "clamp(16px,2vw,32px)" }}>
              <h3 style={{ fontFamily: PIXELIFY, color: DARK_BLUE, fontSize: "clamp(11px,1vw,16px)", marginBottom: "clamp(10px,1.2vw,20px)", letterSpacing: "0.05em" }}>
                accounts
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ALL_PROVIDERS.map((provider) => {
                  const isConnected = connected.includes(provider);
                  return (
                    <div key={provider} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: PIXELIFY, color: DARK_BLUE, fontSize: "clamp(10px,0.85vw,13px)", minWidth: 90 }}>
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

            {/* Details */}
            <div style={{ borderTop: `1px solid ${DARK_BLUE}15`, paddingTop: "clamp(16px,2vw,32px)" }}>
              <h3 style={{ fontFamily: PIXELIFY, color: DARK_BLUE, fontSize: "clamp(11px,1vw,16px)", marginBottom: "clamp(10px,1.2vw,20px)", letterSpacing: "0.05em" }}>
                details
              </h3>
              <LineInput label="slogan" value={slogan} onChange={setSlogan} />
              <LineInput label="url" value={url} onChange={setUrl} />
            </div>

          </div>

          {/* Right: avatar preview */}
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Link href="/profile/avatar" style={{ display: "block" }}>
              {user.avatarThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarThumbnail}
                  alt="your avatar"
                  style={{ width: `clamp(80px, ${U(180)}, 240px)`, height: "auto", display: "block" }}
                />
              ) : (
                <div style={{
                  width: `clamp(80px, ${U(180)}, 240px)`, height: `clamp(80px, ${U(180)}, 240px)`,
                  background: "#f0f4ff", border: `1.5px solid ${DARK_BLUE}20`,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <span style={{ fontFamily: PIXELIFY, color: `${DARK_BLUE}60`, fontSize: 11 }}>avatar</span>
                </div>
              )}
            </Link>
            <PillButton href="/profile/avatar" label="✎ edit" fontSize="clamp(10px, 0.8vw, 13px)" />
          </div>

        </div>
      </main>
    </div>
  );
}
