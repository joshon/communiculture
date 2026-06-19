"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const BLUE = "#0083FF";
const INTER = "Inter, sans-serif";

export function ContinuumPasswordGate({
  continuumId, token, title,
}: {
  continuumId: string;
  token: string;
  title: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setError("enter the password"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch(`/api/continuums/${continuumId}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) { router.refresh(); return; }
      setError(res.status === 401 ? "incorrect password" : "this link is no longer valid");
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
            This continuum is password-protected
          </div>
          <p style={{ fontFamily: INTER, fontSize: 14, color: "#9a9a9a", margin: "0 0 28px" }}>
            “{title}” — enter the password you were given to view it.
          </p>

          <form onSubmit={submit}>
            <div style={{ position: "relative", marginBottom: 6 }}>
              <input
                type={show ? "text" : "password"}
                name="continuumSharePassword"
                autoComplete="off"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1.5px solid #AAAAAA", borderRadius: 10,
                  padding: "12px 44px 12px 16px",
                  fontFamily: INTER, fontSize: "clamp(13px, 3vw, 16px)",
                  color: "#1a1a1a", background: "white", outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  color: "#888", display: "flex", alignItems: "center",
                }}
              >
                {show ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.12 9.12 0 0 0 5.39-1.61" />
                    <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", border: "none", borderRadius: 10, padding: "13px 20px", marginTop: 14,
                fontFamily: INTER, fontSize: "clamp(13px, 3vw, 16px)", fontWeight: 600,
                color: "white", background: BLUE,
                cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "…" : <>View continuum <span aria-hidden>→</span></>}
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
