"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

const BLUE = "#0083FF";
const INTER = "Inter, sans-serif";

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  border: "1.5px solid #AAAAAA", borderRadius: 10,
  padding: "12px 16px",
  fontFamily: INTER, fontSize: "clamp(13px, 3vw, 16px)",
  color: "#1a1a1a", background: "white", outline: "none",
};

export function WelcomeClient({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) { setError("please choose a name"); return; }
    if (password && password.length < 8) { setError("password must be at least 8 characters"); return; }

    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (!res.ok) { setError("something went wrong — try again"); return; }

      if (password) {
        const pw = await fetch("/api/users/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!pw.ok) { setError("couldn't save your password — try a different one"); return; }
      }

      await update();  // refresh the session so the new name shows immediately
      router.push("/dashboard");
    } catch {
      setError("something went wrong — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <div style={{ position: "fixed", top: 24, left: "clamp(16px, 4vw, 32px)", zIndex: 10 }}>
        <Image src="/logo.svg" alt="communi*culture" width={208} height={41}
          style={{ width: "clamp(140px, 30vw, 208px)", height: "auto", display: "block" }} priority />
      </div>

      <main style={{
        display: "flex", justifyContent: "center", alignItems: "flex-start",
        paddingTop: "clamp(100px, 16vw, 140px)", paddingBottom: 80,
        paddingLeft: "clamp(16px, 5vw, 48px)", paddingRight: "clamp(16px, 5vw, 48px)",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ fontFamily: INTER, fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 500, color: "#1a1a1a", marginBottom: 8 }}>
            Welcome to communiculture
          </div>
          <p style={{ fontFamily: INTER, fontSize: 14, color: "#9a9a9a", margin: "0 0 28px" }}>
            Signed in as {email}. Pick a name to show on the continuums.
          </p>

          <form onSubmit={handleSubmit}>
            <label style={{ fontFamily: INTER, fontSize: 13, color: "#6b6b6b", display: "block", marginBottom: 6 }}>
              Your name
            </label>
            <input
              type="text"
              placeholder="e.g. Josh On"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
              style={{ ...inputStyle, marginBottom: 20 }}
            />

            {!hasPassword && (
              <>
                <label style={{ fontFamily: INTER, fontSize: 13, color: "#6b6b6b", display: "block", marginBottom: 6 }}>
                  Password <span style={{ color: "#aaa" }}>— optional</span>
                </label>
                <input
                  type="password"
                  placeholder="Set one to log in without email next time"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ ...inputStyle, marginBottom: 6 }}
                />
                <p style={{ fontFamily: INTER, fontSize: 12, lineHeight: 1.5, color: "#aaa", margin: "0 0 20px" }}>
                  Skip this and we&rsquo;ll always email you a sign-in link instead.
                </p>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", border: "none", borderRadius: 10, padding: "13px 20px",
                fontFamily: INTER, fontSize: "clamp(13px, 3vw, 16px)", fontWeight: 600,
                color: "white", background: BLUE,
                cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "…" : <>Continue <span aria-hidden>→</span></>}
            </button>

            {error && (
              <p style={{ fontFamily: INTER, color: "#c00", fontSize: 14, margin: "10px 0 0" }}>{error}</p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
