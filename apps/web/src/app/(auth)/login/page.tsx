"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { OAuthButton } from "@/components/ui/OAuthButton";

const BLUE = "#0083FF";
const INTER = "Inter, sans-serif";

// Don't let a hung SMTP send (or slow API) leave the button spinning forever
// with no feedback — surface an error after this long.
const SEND_TIMEOUT_MS = 20_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  border: "1.5px solid #AAAAAA", borderRadius: 0,
  padding: "12px 16px",
  fontFamily: INTER, fontSize: "clamp(13px, 3vw, 16px)",
  color: "#1a1a1a", background: "white", outline: "none",
  marginBottom: 10,
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: INTER, fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 500, color: "#1a1a1a", marginBottom: 28 }}>
      {children}
    </div>
  );
}

function LoginPageInner({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();

  // Progressive email flow: "email" → ("password" for returning users with a
  // password) OR ("sent" — magic link emailed, for new/passwordless accounts).
  const [step, setStep]       = useState<"email" | "password" | "sent">("email");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // sessionStorage survives NextAuth soft-navigations within the same tab
  useEffect(() => {
    if (sessionStorage.getItem("mlSent") === "1") {
      setEmail(sessionStorage.getItem("mlSentTo") ?? "");
      setStep("sent");
    }
    return () => {
      sessionStorage.removeItem("mlSent");
      sessionStorage.removeItem("mlSentTo");
    };
  }, []);

  function markSent(e: string) {
    sessionStorage.setItem("mlSent", "1");
    sessionStorage.setItem("mlSentTo", e);
    setStep("sent");
  }

  function resetToEmail() {
    sessionStorage.removeItem("mlSent");
    sessionStorage.removeItem("mlSentTo");
    setPassword("");
    setError("");
    setStep("email");
  }

  async function sendMagicLink(e: string) {
    setError(""); setLoading(true);
    try {
      const res = await withTimeout(signIn("email", { email: e, redirect: false, callbackUrl }), SEND_TIMEOUT_MS);
      if (res?.error) { setError("could not send link — try again"); return; }
      markSent(e);
    } catch {
      setError("the sign-in email is taking too long to send — try again, or use Google");
    } finally {
      setLoading(false);
    }
  }

  // Step 1: look up the email. Has a password → ask for it; otherwise email a link.
  async function handleEmailContinue() {
    const e = email.trim();
    if (!e) { setError("enter your email"); return; }
    setError(""); setLoading(true);
    try {
      const res = await withTimeout(fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      }), SEND_TIMEOUT_MS);
      const data = await res.json().catch(() => ({}));
      if (data?.hasPassword) {
        setStep("password");
      } else {
        const r = await withTimeout(signIn("email", { email: e, redirect: false, callbackUrl }), SEND_TIMEOUT_MS);
        if (r?.error) setError("could not send link — try again");
        else markSent(e);
      }
    } catch {
      setError("the sign-in email is taking too long to send — try again, or use Google");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 (returning, has password): credentials login.
  async function handlePasswordLogin() {
    if (!password) { setError("enter your password"); return; }
    setError(""); setLoading(true);
    const res = await signIn("credentials", { email: email.trim(), password, redirect: false });
    setLoading(false);
    if (res?.error) { setError("incorrect password"); return; }
    router.push(callbackUrl);
  }

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>

      {/* Logo — fixed top left */}
      <Link href="/" style={{ position: "fixed", top: 24, left: "clamp(16px, 4vw, 32px)", zIndex: 10, display: "block" }}>
        <Image src="/logo.svg" alt="communi*culture" width={208} height={41}
          style={{ width: "clamp(140px, 30vw, 208px)", height: "auto", display: "block" }} priority />
      </Link>

      <main style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "clamp(100px, 16vw, 140px)",
        paddingBottom: 80,
        paddingLeft: "clamp(16px, 5vw, 48px)",
        paddingRight: "clamp(16px, 5vw, 48px)",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          <SectionHeader>Log in or sign up</SectionHeader>

          {/* ── Step: enter email ── */}
          {step === "email" && (
            <>
              <form onSubmit={(e) => { e.preventDefault(); void handleEmailContinue(); }}>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={inputStyle}
                />
                <WideButton type="submit" loading={loading} label="Continue with email" />
                {error && (
                  <p style={{ fontFamily: INTER, color: "#c00", fontSize: 14, margin: "8px 0 0" }}>{error}</p>
                )}
                <p style={{ fontFamily: INTER, fontSize: 13, lineHeight: 1.5, color: "#9a9a9a", margin: "10px 0 0" }}>
                  We&rsquo;ll email you a sign-in link, or ask for your password if your account has one.
                </p>
              </form>

              {/* Google — works for new + existing */}
              <div style={{ marginTop: 16 }}>
                <OAuthButton onClick={() => signIn("google", { callbackUrl })} icon={<GoogleIcon />} label="Continue with Google" />
              </div>
            </>
          )}

          {/* ── Step: enter password (returning user) ── */}
          {step === "password" && (
            <form onSubmit={(e) => { e.preventDefault(); void handlePasswordLogin(); }}>
              <p style={{ fontFamily: INTER, fontSize: 14, color: "#6b6b6b", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{email.trim()}</span>
                <button
                  type="button"
                  onClick={resetToEmail}
                  style={{
                    fontFamily: INTER, fontSize: 14, fontWeight: 500, color: BLUE,
                    background: "none", border: "none", cursor: "pointer",
                    textDecoration: "underline", padding: 0,
                  }}
                >
                  Use a different email
                </button>
              </p>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                style={inputStyle}
              />
              <WideButton type="submit" loading={loading} label="Log in" />
              {error && (
                <p style={{ fontFamily: INTER, color: "#c00", fontSize: 14, margin: "8px 0 0" }}>{error}</p>
              )}
              <button
                type="button"
                onClick={() => void sendMagicLink(email.trim())}
                style={{
                  fontFamily: INTER, fontSize: 14, fontWeight: 500, color: BLUE,
                  background: "none", border: "none", cursor: "pointer",
                  textDecoration: "underline", padding: 0, marginTop: 14,
                }}
              >
                Email me a sign-in link instead
              </button>
            </form>
          )}

          {/* ── Step: magic link sent ── */}
          {step === "sent" && (
            <div style={{ border: `1.5px solid ${BLUE}`, borderRadius: 0, padding: "16px 18px" }}>
              <p style={{ fontFamily: INTER, color: BLUE, fontSize: 15, lineHeight: 1.6, margin: "0 0 10px" }}>
                Check your email — we sent a sign-in link to {email.trim()}
              </p>
              <button
                onClick={resetToEmail}
                style={{
                  fontFamily: INTER, fontSize: 14, fontWeight: 500, color: BLUE,
                  background: "none", border: "none", cursor: "pointer",
                  textDecoration: "underline", padding: 0,
                }}
              >
                Try another email
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function WideButton({ label, loading, type = "button", onClick }: {
  label: string; loading?: boolean; type?: "button" | "submit"; onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", border: "none", borderRadius: 0,
        padding: "13px 20px",
        fontFamily: INTER, fontSize: "clamp(13px, 3vw, 16px)", fontWeight: 600,
        color: "white", background: BLUE,
        cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? "…" : <>{label} <span aria-hidden>→</span></>}
    </button>
  );
}

function CallbackUrlReader({ children }: { children: (callbackUrl: string) => React.ReactNode }) {
  const params = useSearchParams();
  return <>{children(params.get("callbackUrl") ?? "/dashboard")}</>;
}

export default function LoginPage() {
  return (
    <Suspense>
      <CallbackUrlReader>
        {(callbackUrl) => <LoginPageInner callbackUrl={callbackUrl} />}
      </CallbackUrlReader>
    </Suspense>
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
