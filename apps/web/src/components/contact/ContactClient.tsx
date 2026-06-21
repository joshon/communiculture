"use client";

import { useState } from "react";
import Link from "next/link";

const BLUE = "#0083FF";
const INTER = "Inter, sans-serif";

const TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "BUG", label: "Bug" },
  { value: "IDEA", label: "Idea" },
  { value: "OTHER", label: "Other" },
];

export function ContactClient({ loggedIn }: { loggedIn: boolean }) {
  const [type, setType] = useState("GENERAL");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { setError("please add a message"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, email: email.trim() || undefined }),
      });
      if (res.ok) { setSent(true); return; }
      if (res.status === 429) setError("you've sent a few already — please try again later");
      else setError("something went wrong — please try again");
    } catch {
      setError("something went wrong — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      maxWidth: 560, margin: "0 auto",
      padding: "clamp(40px, 8vw, 72px) clamp(20px, 5vw, 48px)",
    }}>
      <h1 style={{ fontFamily: INTER, fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 600, color: "#1a1a1a", margin: "0 0 8px" }}>
        Contact
      </h1>
      <p style={{ fontFamily: INTER, fontSize: 15, color: "#888", margin: "0 0 28px", lineHeight: 1.6 }}>
        A bug, an idea, or anything else — drop it here. It&rsquo;s a small team, so we
        can&rsquo;t promise we&rsquo;ll read or reply to everything.
      </p>

      {sent ? (
        <div style={{ border: `1.5px solid ${BLUE}`, borderRadius: 10, padding: "18px 20px" }}>
          <p style={{ fontFamily: INTER, color: BLUE, fontSize: 15, lineHeight: 1.6, margin: "0 0 10px" }}>
            Thanks — got it.{email.trim() ? " If we follow up, it'll be to that email." : ""}
          </p>
          <Link href="/dashboard" style={{ fontFamily: INTER, fontSize: 14, color: BLUE, textDecoration: "underline" }}>
            Back to communiculture
          </Link>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label style={{ fontFamily: INTER, fontSize: 13, color: "#6b6b6b", display: "block", marginBottom: 8 }}>
            What&rsquo;s this about?
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {TYPES.map((t) => {
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  aria-pressed={active}
                  style={{
                    fontFamily: INTER, fontSize: 14, padding: "6px 14px", borderRadius: 999,
                    border: `1.5px solid ${active ? BLUE : "#ddd"}`,
                    background: active ? BLUE : "white",
                    color: active ? "white" : "#555",
                    fontWeight: active ? 600 : 400, cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <label style={{ fontFamily: INTER, fontSize: 13, color: "#6b6b6b", display: "block", marginBottom: 6 }}>
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's on your mind…"
            rows={6}
            maxLength={4000}
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box", padding: "12px 14px",
              fontFamily: INTER, fontSize: 15, color: "#1a1a1a",
              border: "1.5px solid #AAAAAA", borderRadius: 10, outline: "none",
              resize: "vertical", marginBottom: 20,
            }}
          />

          <label style={{ fontFamily: INTER, fontSize: 13, color: "#6b6b6b", display: "block", marginBottom: 6 }}>
            Email <span style={{ color: "#aaa" }}>— optional. Leave it if you&rsquo;d like the chance of a reply (no promises).</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={{
              width: "100%", boxSizing: "border-box", padding: "12px 14px",
              fontFamily: INTER, fontSize: 15, color: "#1a1a1a",
              border: "1.5px solid #AAAAAA", borderRadius: 10, outline: "none", marginBottom: 20,
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              border: "none", borderRadius: 999, padding: "12px 24px",
              fontFamily: INTER, fontSize: 16, fontWeight: 600, color: "white", background: BLUE,
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "…" : "Send"}
          </button>

          {error && (
            <p style={{ fontFamily: INTER, color: "#c00", fontSize: 14, margin: "12px 0 0" }}>{error}</p>
          )}
        </form>
      )}
    </main>
  );
}
