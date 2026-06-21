"use client";

import { useState } from "react";

const BLUE = "#0083FF";
const INTER = "Inter, sans-serif";

export interface ReportTarget {
  targetType: "CONTINUUM" | "USER" | "COMMENT";
  targetId: string;
  continuumId?: string | null;
  label: string; // human description shown in the modal header
}

const CATEGORIES = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "HATE", label: "Hate / discrimination" },
  { value: "MISINFORMATION", label: "Misinformation" },
  { value: "OTHER", label: "Other" },
];

export function ReportModal({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!category) { setError("Please pick a reason"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: target.targetType,
          targetId: target.targetId,
          continuumId: target.continuumId ?? null,
          category,
          note: note.trim() || undefined,
        }),
      });
      if (res.ok) setDone(true);
      else if (res.status === 429) setError("You've reported a lot recently — try again later.");
      else if (res.status === 401) setError("Please sign in to report.");
      else setError("Something went wrong — try again.");
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 12, maxWidth: 420, width: "100%", padding: 24, fontFamily: INTER }}>
        {done ? (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>Thanks for the report</h2>
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 20px" }}>
              Our team will review it. You won&rsquo;t see a change immediately.
            </p>
            <button onClick={onClose} style={primaryBtn}>Done</button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Report</h2>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px", lineHeight: 1.5 }}>{target.label}</p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {CATEGORIES.map((c) => {
                const active = category === c.value;
                return (
                  <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                    style={{ fontFamily: INTER, fontSize: 13, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                      border: `1.5px solid ${active ? BLUE : "#ddd"}`, background: active ? BLUE : "white", color: active ? "white" : "#555", fontWeight: active ? 600 : 400 }}>
                    {c.label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any details (optional)"
              rows={3}
              maxLength={2000}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontFamily: INTER, fontSize: 14, color: "#1a1a1a", border: "1.5px solid #ccc", borderRadius: 8, outline: "none", resize: "vertical", marginBottom: 16 }}
            />

            {error && <p style={{ color: "#c00", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={textBtn}>Cancel</button>
              <button onClick={submit} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>{loading ? "…" : "Submit report"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = { fontFamily: INTER, fontSize: 15, fontWeight: 600, color: "white", background: BLUE, border: "none", borderRadius: 999, padding: "9px 20px", cursor: "pointer" };
const textBtn: React.CSSProperties = { fontFamily: INTER, fontSize: 15, color: "#666", background: "none", border: "none", cursor: "pointer", padding: "9px 4px" };
