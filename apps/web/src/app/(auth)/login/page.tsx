"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const BLUE = "#0083FF";
const DARK_BLUE = "#3F58D0";
const PIXELIFY = "var(--font-pixelify)";
const PROLETARIAN = "var(--font-proletarian)";

// ─── underlined input (matching original site style) ─────────────────────────
function LineInput({
  label, type, value, onChange, placeholder,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.75rem" }}>
      <span style={{ fontFamily: PIXELIFY, color: DARK_BLUE, fontSize: "clamp(11px,1vw,15px)", whiteSpace: "nowrap", minWidth: 120, textAlign: "right" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, border: "none", borderBottom: `1.5px solid ${DARK_BLUE}`,
          outline: "none", fontFamily: PROLETARIAN, fontSize: "clamp(11px,1vw,15px)",
          color: DARK_BLUE, background: "transparent", paddingBottom: 2,
        }}
      />
    </div>
  );
}

// ─── pixel-press submit button ────────────────────────────────────────────────
function EnterButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
      <div style={{ position: "relative", paddingRight: 4, paddingBottom: 4 }}>
        <div style={{ position: "absolute", top: 4, left: 4, right: 0, bottom: 0, background: "#1A2B6E" }} />
        <button
          disabled={loading}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => { setPressed(false); onClick(); }}
          onMouseLeave={() => setPressed(false)}
          style={{
            position: "relative", zIndex: 1, background: DARK_BLUE, color: "white",
            fontFamily: PIXELIFY, fontSize: "clamp(9px,0.8vw,13px)", fontWeight: "bold",
            textTransform: "uppercase", letterSpacing: "0.2em",
            paddingLeft: 14, paddingRight: 14, paddingTop: 5, paddingBottom: 5,
            border: "none", cursor: loading ? "default" : "pointer",
            transform: pressed ? "translate(4px,4px)" : "none",
          }}
        >
          {loading ? "..." : "enter"}
        </button>
      </div>
    </div>
  );
}

// ─── divider ──────────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0" }}>
      <div style={{ flex: 1, borderTop: `1px solid ${DARK_BLUE}40` }} />
      <span style={{ fontFamily: PIXELIFY, fontSize: "clamp(9px,0.7vw,11px)", color: `${DARK_BLUE}80`, letterSpacing: "0.15em" }}>{label}</span>
      <div style={{ flex: 1, borderTop: `1px solid ${DARK_BLUE}40` }} />
    </div>
  );
}

// ─── OAuth button ─────────────────────────────────────────────────────────────
function OAuthButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center",
      width: "100%", border: `1px solid ${DARK_BLUE}30`, padding: "0.5rem",
      fontFamily: PROLETARIAN, fontSize: "clamp(10px,0.85vw,13px)", color: DARK_BLUE,
      background: "transparent", cursor: "pointer", marginBottom: "0.4rem",
    }}>
      {icon}
      {label}
    </button>
  );
}

export default function LoginPage() {
  const params = useSearchParams();
  const router = useRouter();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // sign-in state
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siError, setSiError] = useState("");
  const [siLoading, setSiLoading] = useState(false);

  // sign-up state
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suError, setSuError] = useState("");
  const [suLoading, setSuLoading] = useState(false);

  async function handleSignIn() {
    setSiError(""); setSiLoading(true);
    const res = await signIn("credentials", { email: siEmail, password: siPassword, redirect: false });
    setSiLoading(false);
    if (res?.error) { setSiError("invalid email or password"); return; }
    router.push(callbackUrl);
  }

  async function handleSignUp() {
    setSuError("");
    if (suPassword !== suConfirm) { setSuError("passwords do not match"); return; }
    if (suPassword.length < 8) { setSuError("password must be at least 8 characters"); return; }
    setSuLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: suName, email: suEmail, password: suPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      setSuError(data.error ?? "something went wrong");
      setSuLoading(false);
      return;
    }
    // Auto sign in after sign up
    const signInRes = await signIn("credentials", { email: suEmail, password: suPassword, redirect: false });
    setSuLoading(false);
    if (signInRes?.error) { setSuError("account created — please sign in"); setTab("signin"); return; }
    router.push("/profile/avatar"); // new users go straight to avatar setup
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: PIXELIFY,
    fontSize: "clamp(12px,1.1vw,18px)",
    color: active ? DARK_BLUE : `${DARK_BLUE}50`,
    background: "none",
    border: "none",
    cursor: "pointer",
    paddingBottom: 4,
    borderBottom: active ? `2px solid ${DARK_BLUE}` : "2px solid transparent",
    letterSpacing: "0.05em",
    marginRight: "1.5rem",
  });

  return (
    <main style={{ minHeight: "100vh", background: "white", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "flex-start", padding: "clamp(24px,4vw,60px)" }}>
      {/* Logo top-right */}
      <Link href="/" style={{ display: "block", marginBottom: "clamp(40px,6vw,100px)" }}>
        <Image src="/logo.svg" alt="communi*culture" width={361} height={65}
          style={{ width: "clamp(140px,14vw,220px)", height: "auto" }} priority />
      </Link>

      {/* Form panel */}
      <div style={{ width: "clamp(280px,36vw,480px)" }}>
        {/* Tabs */}
        <div style={{ marginBottom: "1.5rem" }}>
          <button style={tabStyle(tab === "signup")} onClick={() => setTab("signup")}>sign up</button>
          <button style={tabStyle(tab === "signin")} onClick={() => setTab("signin")}>log in</button>
        </div>

        {tab === "signup" && (
          <>
            <LineInput label="name" type="text" value={suName} onChange={setSuName} />
            <LineInput label="email" type="email" value={suEmail} onChange={setSuEmail} />
            <LineInput label="password" type="password" value={suPassword} onChange={setSuPassword} />
            <LineInput label="confirm password" type="password" value={suConfirm} onChange={setSuConfirm} />
            {suError && <p style={{ fontFamily: PROLETARIAN, color: "#c00", fontSize: 12, marginBottom: 8 }}>{suError}</p>}
            <EnterButton onClick={handleSignUp} loading={suLoading} />
            <Divider label="or sign up with" />
          </>
        )}

        {tab === "signin" && (
          <>
            <LineInput label="email" type="email" value={siEmail} onChange={setSiEmail} />
            <LineInput label="password" type="password" value={siPassword} onChange={setSiPassword} />
            {siError && <p style={{ fontFamily: PROLETARIAN, color: "#c00", fontSize: 12, marginBottom: 8 }}>{siError}</p>}
            <EnterButton onClick={handleSignIn} loading={siLoading} />
            <Divider label="or log in with" />
          </>
        )}

        {/* OAuth buttons */}
        <OAuthButton onClick={() => signIn("google", { callbackUrl })} label="google" icon={<GoogleIcon />} />
        <OAuthButton onClick={() => signIn("facebook", { callbackUrl })} label="facebook" icon={<FacebookIcon />} />
        <OAuthButton onClick={() => signIn("azure-ad", { callbackUrl })} label="microsoft" icon={<MicrosoftIcon />} />

        <p style={{ fontFamily: PROLETARIAN, fontSize: "clamp(9px,0.7vw,11px)", color: `${DARK_BLUE}60`, marginTop: "1.5rem" }}>
          by signing in you agree to our <Link href="/terms" style={{ textDecoration: "underline" }}>terms</Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>;
}
function FacebookIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
}
function MicrosoftIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#00a4ef" d="M13 1h10v10H13z"/><path fill="#7fba00" d="M1 13h10v10H1z"/><path fill="#ffb900" d="M13 13h10v10H13z"/></svg>;
}
