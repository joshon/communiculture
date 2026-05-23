"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { DashboardAvatarHead } from "@/components/dashboard/DashboardAvatarHead";
import { OAuthButton } from "@/components/ui/OAuthButton";
import { PillButton } from "@/components/ui/PillButton";
import { PageTitle } from "@/components/ui/PageTitle";
import { U } from "@/lib/scale";

const BLUE = "#0083FF";
const DARK_BLUE = "#3F58D0";
const PRO = "Proletarian, sans-serif";
const INTER = "var(--font-inter), Inter, sans-serif";

// Match dashboard sizing exactly
const pagePadTop  = `clamp(12px, ${U(50)}, 60px)`;
const pageLeftPad = `clamp(16px, ${U(38)}, 48px)`;
const logoW       = `clamp(180px, ${U(475)}, 600px)`;
const titleFs     = `clamp(11px, ${U(41)}, 56px)`;
const logoMb      = `clamp(14px, ${U(32)}, 48px)`;
const titleMb     = `clamp(20px, ${U(40)}, 56px)`;
const avatarSize  = `clamp(60px, ${U(100)}, 130px)`;
const btnFs       = `clamp(10px, ${U(18)}, 9999px)`;
const btnPad      = { paddingTop: U(7), paddingBottom: U(7), paddingLeft: U(20), paddingRight: U(20) };

const labelStyle: React.CSSProperties = {
  fontFamily: PRO,
  color: DARK_BLUE,
  fontSize: "clamp(10px, 0.9vw, 14px)",
  whiteSpace: "nowrap" as const,
  minWidth: 80,
  textAlign: "right" as const,
};

function LineInput({ label, type = "text", value, onChange, readOnly }: {
  label: string; type?: string; value: string;
  onChange?: (v: string) => void; readOnly?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.9rem" }}>
      <span style={labelStyle}>{label}</span>
      <input
        type={type} value={value} readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          flex: 1, border: "none", borderBottom: `1.5px solid ${DARK_BLUE}`,
          outline: "none", fontFamily: INTER, fontSize: "clamp(10px, 0.9vw, 14px)",
          color: DARK_BLUE, background: "transparent", paddingBottom: 2,
          opacity: readOnly ? 0.5 : 1,
        }}
      />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: PRO, color: DARK_BLUE,
      fontSize: "clamp(11px, 1vw, 16px)",
      marginBottom: "clamp(10px, 1.2vw, 20px)",
      letterSpacing: "0.05em",
    }}>
      {children}
    </h3>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#f25022" d="M1 1h10v10H1z"/>
      <path fill="#00a4ef" d="M13 1h10v10H13z"/>
      <path fill="#7fba00" d="M1 13h10v10H1z"/>
      <path fill="#ffb900" d="M13 13h10v10H13z"/>
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  google:    <GoogleIcon />,
  "azure-ad": <MicrosoftIcon />,
  facebook:  <FacebookIcon />,
};
const PROVIDER_LABELS: Record<string, string> = {
  google:    "google",
  "azure-ad": "microsoft",
  facebook:  "facebook",
};
const ALL_PROVIDERS = ["google", "azure-ad", "facebook"];

export function ProfileClient({ user }: {
  user: {
    name: string; email: string; slogan: string; url: string;
    avatarConfig: object; avatarThumbnail: string | null;
    connectedProviders: string[]; hasPassword: boolean;
  };
}) {
  const params = useSearchParams();
  const [name, setName]       = useState(user.name);
  const [slogan, setSlogan]   = useState(user.slogan);
  const [url, setUrl]         = useState(user.url);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const [connected, setConnected] = useState(user.connectedProviders);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  useEffect(() => {
    const linked = params?.get("linked");
    const reauth = params?.get("reauth");
    const err = params?.get("link_error");
    if (linked) {
      if (reauth) setLinkMsg("Account linked! Sign in again to continue with your main account.");
      else setLinkMsg("Account linked successfully.");
    }
    if (err) {
      const msgs: Record<string, string> = {
        expired: "Link request expired. Please try again.",
        already_linked: "That account is already linked.",
        invalid: "Invalid link token.",
        no_session: "Session expired during linking. Please try again.",
      };
      setLinkMsg(msgs[err] ?? "Could not link account. Please try again.");
    }
  }, [params]);

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
    else alert("cannot remove your only sign-in method");
  }

  async function handleConnect(provider: string) {
    // Start a link session so the OAuth result is attached to THIS user,
    // even if the provider uses a different email address.
    const res = await fetch("/api/users/accounts/link-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    if (!res.ok) { setLinkMsg("Could not start linking. Please try again."); return; }
    const { token } = await res.json();
    const callbackUrl = `/api/users/accounts/link-complete?t=${token}`;
    signIn(provider, { callbackUrl });
  }

  return (
    <div style={{ minHeight: "100vh", background: "white", display: "flex", flexDirection: "column" }}>
      <main style={{
        flex: 1,
        paddingTop: pagePadTop,
        paddingLeft: pageLeftPad,
        paddingRight: pageLeftPad,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Row 1: Logo + Avatar head */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: logoMb, flexShrink: 0 }}>
          <Link href="/dashboard" style={{ display: "block" }}>
            <Image src="/logo.svg" alt="communi*culture" width={208} height={41}
              style={{ width: logoW, height: "auto" }} priority />
          </Link>
          <DashboardAvatarHead thumbnailUrl={user.avatarThumbnail} size={avatarSize} />
        </div>

        {/* Row 2: back button + title */}
        <div style={{ display: "flex", alignItems: "center", gap: `clamp(10px, ${U(20)}, 28px)`, marginBottom: titleMb, flexShrink: 0 }}>
          <PillButton href="/dashboard" label="← home" fontSize={btnFs} style={btnPad} />
          <PageTitle fontSize={titleFs}>profile</PageTitle>
        </div>

        {/* Scrollable content row */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", gap: `clamp(32px, ${U(80)}, 120px)`, alignItems: "flex-start", paddingBottom: `clamp(24px, ${U(40)}, 60px)` }}>

          {/* Left: form — 1/3 width */}
          <div style={{ width: "33%", minWidth: 260, maxWidth: 480, flexShrink: 0 }}>

            <LineInput label="name"  value={name}       onChange={setName} />
            <LineInput label="email" value={user.email} readOnly />

            {error && <p style={{ color: "#c00", fontSize: 11, marginBottom: 6 }}>{error}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 4, marginBottom: `clamp(16px, 2vw, 32px)` }}>
              {saved && <span style={{ fontFamily: PRO, color: BLUE, fontSize: 11 }}>saved</span>}
              <PillButton onClick={handleUpdate} loading={saving} fontSize={btnFs} style={btnPad}>
                update
              </PillButton>
            </div>

            {/* Accounts */}
            <div style={{ borderTop: `1px solid ${DARK_BLUE}15`, paddingTop: "clamp(16px, 2vw, 32px)", marginBottom: "clamp(16px, 2vw, 32px)" }}>
              <SectionHeading>accounts</SectionHeading>
              {linkMsg && (
                <p style={{ fontFamily: PRO, fontSize: 11, color: linkMsg.includes("successfully") || linkMsg.includes("linked!") ? BLUE : "#c00", marginBottom: 12 }}>
                  {linkMsg}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ALL_PROVIDERS.map((provider) => {
                  const isConnected = connected.includes(provider);
                  return isConnected ? (
                    <div key={provider} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `1.5px solid ${BLUE}`, borderRadius: 10 }}>
                      <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                        {PROVIDER_ICONS[provider]}
                      </span>
                      <span style={{ fontFamily: INTER, fontSize: "clamp(10px, 0.85vw, 13px)", color: "#1a1a1a", flex: 1 }}>
                        {user.name || user.email}
                      </span>
                      <button
                        onClick={() => handleDisconnect(provider)}
                        title={`disconnect ${PROVIDER_LABELS[provider]}`}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 20, height: 20, borderRadius: "50%",
                          background: `${DARK_BLUE}20`, border: "none", cursor: "pointer",
                          color: DARK_BLUE, fontSize: 12, fontWeight: "bold", lineHeight: 1,
                          flexShrink: 0,
                        }}
                      >×</button>
                    </div>
                  ) : (
                    <OAuthButton
                      key={provider}
                      onClick={() => handleConnect(provider)}
                      icon={PROVIDER_ICONS[provider]}
                      label={PROVIDER_LABELS[provider]}
                    />
                  );
                })}
              </div>
            </div>

            {/* Details */}
            <div style={{ borderTop: `1px solid ${DARK_BLUE}15`, paddingTop: "clamp(16px, 2vw, 32px)" }}>
              <SectionHeading>details</SectionHeading>
              <LineInput label="slogan" value={slogan} onChange={setSlogan} />
              <LineInput label="url"    value={url}    onChange={setUrl} />
            </div>

          </div>

          {/* Right: full avatar */}
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: `clamp(8px, ${U(12)}, 18px)` }}>
            <Link href="/profile/avatar" style={{ display: "block" }}>
              {user.avatarThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarThumbnail}
                  alt="your avatar"
                  style={{ width: `clamp(120px, ${U(220)}, 300px)`, height: "auto", display: "block" }}
                />
              ) : (
                <div style={{
                  width: `clamp(120px, ${U(220)}, 300px)`, height: `clamp(120px, ${U(220)}, 300px)`,
                  background: "#f0f4ff", border: `1.5px solid ${DARK_BLUE}20`,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <span style={{ fontFamily: PRO, color: `${DARK_BLUE}60`, fontSize: 11 }}>avatar</span>
                </div>
              )}
            </Link>
            <PillButton href="/profile/avatar" label="✎ edit" fontSize={btnFs} style={btnPad} />
          </div>

        </div>
      </main>
    </div>
  );
}
