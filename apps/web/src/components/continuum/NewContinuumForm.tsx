"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { PillButton } from "@/components/ui/PillButton";
import Link from "next/link";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";

const BREADCRUMBS = [
  { label: "home", href: "/dashboard" },
  { label: "new continuum" },
];

type Visibility = "PRIVATE" | "TEAM" | "PUBLIC_LINK";

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderBottom: "1.5px solid #AAAAAA",
  outline: "none",
  fontFamily: INTER,
  fontSize: 16,
  color: "#1a1a1a",
  background: "transparent",
  paddingBottom: 4,
  resize: "none",
  overflow: "hidden",
  lineHeight: 1.5,
  display: "block",
};

function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline",
      gap: "clamp(8px, 2vw, 16px)",
      marginBottom: "clamp(20px, 3vh, 28px)",
    }}>
      <label style={{
        fontFamily: INTER, fontSize: 16, fontWeight: 500, color: "#1a1a1a",
        width: "clamp(84px, 12vw, 110px)", flexShrink: 0,
        textAlign: "right", lineHeight: 1,
      }}>
        {label}
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

export function NewContinuumForm({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [title, setTitle]           = useState("");
  const [leftLabel, setLeftLabel]   = useState("");
  const [rightLabel, setRightLabel] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PRIVATE");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const ready = title.trim() && leftLabel.trim() && rightLabel.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/continuums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, leftLabel, rightLabel, visibility, description: "" }),
      });
      if (res.status === 402) {
        setError("You've reached the free limit (3 continuums). Upgrade to create more.");
        return;
      }
      if (!res.ok) { setError("Something went wrong. Try again."); return; }
      const continuum = await res.json();
      router.push(`/continuum/${continuum.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <AppHeader breadcrumbs={BREADCRUMBS} />

      <main style={{
        paddingTop: "clamp(40px, 8vh, 80px)",
        paddingBottom: 80,
        paddingLeft: "clamp(16px, 5vw, 48px)",
        paddingRight: "clamp(16px, 5vw, 48px)",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>

          <h1 style={{
            fontFamily: INTER, fontSize: "clamp(24px, 4vw, 32px)",
            fontWeight: 600, color: "#1a1a1a",
            margin: "0 0 12px",
          }}>
            New continuum
          </h1>
          <p style={{
            fontFamily: INTER, fontSize: 16, color: "#888",
            margin: "0 0 clamp(32px, 5vh, 48px)", lineHeight: 1.5,
          }}>
            Write a question that can be answered along a spectrum between two positions
          </p>

          {!canCreate ? (
            <p style={{ fontFamily: INTER, fontSize: 16, color: "#888" }}>
              You&apos;ve reached the free limit of 3 continuums.{" "}
              <Link href="/billing" style={{ color: BLUE, textDecoration: "underline" }}>Upgrade</Link>{" "}
              to create more.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <Field label="Question">
                <textarea
                  required
                  rows={1}
                  placeholder="e.g. which do you prefer?"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); autoGrow(e.target); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  style={inputStyle}
                />
              </Field>

              <Field label="Position 1">
                <textarea
                  required
                  rows={1}
                  placeholder="e.g. cats"
                  value={leftLabel}
                  onChange={(e) => { setLeftLabel(e.target.value); autoGrow(e.target); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  style={inputStyle}
                />
              </Field>

              <Field label="Position 2">
                <textarea
                  required
                  rows={1}
                  placeholder="e.g. dogs"
                  value={rightLabel}
                  onChange={(e) => { setRightLabel(e.target.value); autoGrow(e.target); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  style={inputStyle}
                />
              </Field>

              <Field label="Visibility">
                <div style={{ position: "relative" }}>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as Visibility)}
                    style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: 28, cursor: "pointer" }}
                  >
                    <option value="PRIVATE">unlisted</option>
                    <option value="TEAM">team</option>
                    <option value="PUBLIC_LINK">public link</option>
                  </select>
                  <svg style={{ position: "absolute", right: 4, bottom: 7, pointerEvents: "none" }}
                    width="16" height="10" viewBox="0 0 16 10" fill="none">
                    <path d="M1 1l7 7 7-7" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Field>

              {error && (
                <p style={{ fontFamily: INTER, fontSize: 14, color: "#c00", marginBottom: 16, textAlign: "right" }}>
                  {error}
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <PillButton
                  type="submit"
                  arrow
                  label="Create"
                  loading={loading}
                  style={!ready ? { opacity: 0.4, cursor: "default" } : undefined}
                />
              </div>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}
