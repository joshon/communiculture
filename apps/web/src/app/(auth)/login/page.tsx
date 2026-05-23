"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { OAuthButton } from "@/components/ui/OAuthButton";
import { PillButton } from "@/components/ui/PillButton";

const BLUE = "#0083FF";
const INTER = "Inter, sans-serif";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: INTER, fontSize: 22, fontWeight: 500, color: "#1a1a1a", marginBottom: 28 }}>
      {children}
    </div>
  );
}

function Rule() {
  return <div style={{ borderTop: "1px solid #D8D8D8", margin: "24px 0" }} />;
}

export default function LoginPage() {
  const params = useSearchParams();
  const router = useRouter();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [siEmail,    setSiEmail]    = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siError,    setSiError]    = useState("");
  const [siLoading,  setSiLoading]  = useState(false);

  const [mlEmail,   setMlEmail]   = useState("");
  const [mlLoading, setMlLoading] = useState(false);
  const [mlSent,    setMlSent]    = useState(false);
  const [mlError,   setMlError]   = useState("");

  const [suName,    setSuName]    = useState("");
  const [suEmail,   setSuEmail]   = useState("");
  const [suPass,    setSuPass]    = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suError,   setSuError]   = useState("");
  const [suLoading, setSuLoading] = useState(false);

  async function handleMagicLink() {
    setMlError(""); setMlLoading(true);
    try {
      const res = await signIn("email", { email: mlEmail, redirect: false, callbackUrl });
      if (res?.error) { setMlError("could not send link — try again"); return; }
      setMlSent(true);
    } catch {
      setMlError("could not send link — try again");
    } finally {
      setMlLoading(false);
    }
  }

  async function handleSignIn() {
    setSiError(""); setSiLoading(true);
    const res = await signIn("credentials", { email: siEmail, password: siPassword, redirect: false });
    setSiLoading(false);
    if (res?.error) { setSiError("invalid email or password"); return; }
    router.push(callbackUrl);
  }

  async function handleSignUp() {
    setSuError("");
    if (suPass !== suConfirm) { setSuError("passwords do not match"); return; }
    if (suPass.length < 8)    { setSuError("password must be at least 8 characters"); return; }
    setSuLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: suName, email: suEmail, password: suPass }),
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = "something went wrong";
      try { msg = JSON.parse(text).error ?? msg; } catch {}
      setSuError(msg); setSuLoading(false); return;
    }
    const r2 = await signIn("credentials", { email: suEmail, password: suPass, redirect: false });
    setSuLoading(false);
    if (r2?.error) { setSuError("account created — please sign in"); setMode("signin"); return; }
    router.push("/profile/avatar");
  }

  const isSignIn = mode === "signin";

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>

      {/* Logo — fixed top left */}
      <Link href="/" style={{ position: "fixed", top: 24, left: 32, zIndex: 10, display: "block" }}>
        <Image src="/logo.svg" alt="communi*culture" width={208} height={41}
          style={{ width: 208, height: "auto", display: "block" }} priority />
      </Link>

      {/* Two-column layout */}
      <main style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: 140,
        paddingBottom: 80,
        paddingLeft: 24,
        paddingRight: 24,
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1px 1fr",
          gap: "0 48px",
          width: "100%",
          maxWidth: 900,
        }}>

          {/* ── Left column: credentials + OAuth ── */}
          <div>
            <SectionHeader>{isSignIn ? "Log in" : "Sign up"}</SectionHeader>

            <form onSubmit={(e) => { e.preventDefault(); isSignIn ? handleSignIn() : handleSignUp(); }}>
              {!isSignIn && (
                <FormField label="Name" type="text" value={suName} onChange={setSuName} autoComplete="name" />
              )}
              <FormField
                label="Email" type="email"
                value={isSignIn ? siEmail : suEmail}
                onChange={isSignIn ? setSiEmail : setSuEmail}
                autoComplete="email"
              />
              <FormField
                label="Password" type="password"
                value={isSignIn ? siPassword : suPass}
                onChange={isSignIn ? setSiPassword : setSuPass}
                autoComplete={isSignIn ? "current-password" : "new-password"}
              />
              {!isSignIn && (
                <FormField
                  label="Confirm" type="password"
                  value={suConfirm} onChange={setSuConfirm}
                  autoComplete="new-password"
                />
              )}

              {(isSignIn ? siError : suError) && (
                <p style={{ fontFamily: INTER, color: "#c00", fontSize: 14, margin: "-8px 0 16px", paddingLeft: 130 }}>
                  {isSignIn ? siError : suError}
                </p>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setMode(isSignIn ? "signup" : "signin")}
                  style={{
                    fontFamily: INTER, fontSize: 16, fontWeight: 500, color: BLUE,
                    background: "none", border: "none", cursor: "pointer",
                    textDecoration: "underline", padding: 0,
                  }}
                >
                  {isSignIn ? "Create a new account" : "Existing account? Log in"}
                </button>
                <PillButton
                  type="submit" arrow variant="secondary"
                  label={isSignIn ? "Log in" : "Sign up"}
                  loading={isSignIn ? siLoading : suLoading}
                />
              </div>
            </form>

            <Rule />
            <SectionHeader>or log in with</SectionHeader>

            <OAuthButton onClick={() => signIn("google",   { callbackUrl })} icon={<GoogleIcon />}    label="Google" />
            <OAuthButton onClick={() => signIn("azure-ad", { callbackUrl })} icon={<MicrosoftIcon />} label="Microsoft" />
            <OAuthButton onClick={() => signIn("facebook", { callbackUrl })} icon={<FacebookIcon />}  label="Facebook" />
          </div>

          {/* ── Vertical divider ── */}
          <div style={{ background: "#D8D8D8" }} />

          {/* ── Right column: magic link ── */}
          <div>
            <SectionHeader>or sign in with email link</SectionHeader>

            {mlSent ? (
              <p style={{ fontFamily: INTER, color: BLUE, fontSize: 16, lineHeight: 1.6 }}>
                check your email — we sent a sign-in link to {mlEmail}
              </p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); void handleMagicLink(); }}>
                <FormField label="Email" type="email" value={mlEmail} onChange={setMlEmail} autoComplete="email" />
                {mlError && (
                  <p style={{ fontFamily: INTER, color: "#c00", fontSize: 14, margin: "-8px 0 16px", paddingLeft: 130 }}>
                    {mlError}
                  </p>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <PillButton type="submit" arrow label="Send link" loading={mlLoading} />
                </div>
              </form>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#f25022" d="M1 1h10v10H1z"/>
      <path fill="#00a4ef" d="M13 1h10v10H13z"/>
      <path fill="#7fba00" d="M1 13h10v10H1z"/>
      <path fill="#ffb900" d="M13 13h10v10H13z"/>
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
