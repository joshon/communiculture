"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/ui/AppHeader";

const BLUE = "#0083FF";
const INTER = "Inter, sans-serif";

interface Feedback {
  id: string; type: string; message: string; status: string;
  email: string | null; userName: string | null; userEmail: string | null; createdAt: string;
}
interface Report {
  id: string; targetType: string; targetId: string; continuumId: string | null;
  category: string; note: string | null; snapshot: string | null; status: string;
  reporterName: string | null; reporterEmail: string | null; resolvedBy: string | null; createdAt: string;
}
interface Action {
  id: string; adminEmail: string; action: string; targetType: string; targetId: string;
  detail: string | null; createdAt: string;
}

const CAT_COLOR: Record<string, string> = {
  HATE: "#c00", HARASSMENT: "#e0561c", SPAM: "#888", MISINFORMATION: "#a06b00", OTHER: "#666",
};

function fmt(d: string) { return new Date(d).toLocaleString(); }

export function AdminClient({ feedback, reports, actions }: { feedback: Feedback[]; reports: Report[]; actions: Action[] }) {
  const [tab, setTab] = useState<"reports" | "feedback" | "audit">("reports");
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function act(key: string, payload: Record<string, unknown>) {
    setBusy(key);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) alert(`Action failed (${res.status})`);
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const openReports = reports.filter((r) => r.status === "OPEN" || r.status === "REVIEWING").length;
  const newFeedback = feedback.filter((f) => f.status === "NEW").length;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: INTER, fontSize: 15, fontWeight: active ? 700 : 500,
    color: active ? "#1a1a1a" : "#888", background: "none", border: "none",
    borderBottom: active ? `2px solid ${BLUE}` : "2px solid transparent",
    padding: "8px 4px", cursor: "pointer",
  });

  return (
    <div style={{ minHeight: "100dvh", background: "white" }}>
      <AppHeader breadcrumbs={[{ label: "home", href: "/dashboard" }, { label: "admin" }]} />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
        <h1 style={{ fontFamily: INTER, fontSize: 28, fontWeight: 700, color: "#1a1a1a", margin: "0 0 20px" }}>Admin</h1>

        <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #eee", marginBottom: 24 }}>
          <button style={tabStyle(tab === "reports")} onClick={() => setTab("reports")}>
            Reports{openReports ? ` (${openReports})` : ""}
          </button>
          <button style={tabStyle(tab === "feedback")} onClick={() => setTab("feedback")}>
            Feedback{newFeedback ? ` (${newFeedback})` : ""}
          </button>
          <button style={tabStyle(tab === "audit")} onClick={() => setTab("audit")}>Audit log</button>
        </div>

        {tab === "reports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {reports.length === 0 && <Empty>No reports yet.</Empty>}
            {reports.map((r) => {
              const resolved = r.status === "ACTIONED" || r.status === "DISMISSED";
              return (
                <Card key={r.id} dim={resolved}>
                  <Row>
                    <Badge color={CAT_COLOR[r.category] ?? "#666"}>{r.category}</Badge>
                    <span style={meta}>{r.targetType}</span>
                    <span style={{ ...meta, marginLeft: "auto" }}>{r.status}</span>
                  </Row>
                  <p style={body}>{r.snapshot ?? <em style={{ color: "#aaa" }}>(content unavailable)</em>}</p>
                  {r.note && <p style={{ ...body, color: "#666" }}>“{r.note}”</p>}
                  <p style={subtle}>by {r.reporterName ?? r.reporterEmail ?? "?"} · {fmt(r.createdAt)}{r.resolvedBy ? ` · resolved by ${r.resolvedBy}` : ""}</p>
                  <Row>
                    {r.continuumId && <Link href={`/continuum/${r.continuumId}`} style={linkBtn}>open continuum →</Link>}
                    {r.targetType === "COMMENT" && r.continuumId && (
                      <Btn busy={busy === `hide-${r.id}`} onClick={() => act(`hide-${r.id}`, { action: "hide_comment", continuumId: r.continuumId, userId: r.targetId })}>Hide comment</Btn>
                    )}
                    {r.targetType === "USER" && (
                      <Btn danger busy={busy === `ban-${r.id}`} onClick={() => { if (confirm("Site-ban this user?")) act(`ban-${r.id}`, { action: "ban_user", userId: r.targetId, reason: `report ${r.id}` }); }}>Site ban</Btn>
                    )}
                    {!resolved && <Btn busy={busy === `rev-${r.id}`} onClick={() => act(`rev-${r.id}`, { action: "resolve_report", reportId: r.id, status: "REVIEWING" })}>Reviewing</Btn>}
                    <Btn busy={busy === `act-${r.id}`} onClick={() => act(`act-${r.id}`, { action: "resolve_report", reportId: r.id, status: "ACTIONED" })}>Actioned</Btn>
                    <Btn busy={busy === `dis-${r.id}`} onClick={() => act(`dis-${r.id}`, { action: "resolve_report", reportId: r.id, status: "DISMISSED" })}>Dismiss</Btn>
                  </Row>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "feedback" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {feedback.length === 0 && <Empty>No feedback yet.</Empty>}
            {feedback.map((f) => (
              <Card key={f.id} dim={f.status === "RESOLVED"}>
                <Row>
                  <Badge color="#666">{f.type}</Badge>
                  <span style={{ ...meta, marginLeft: "auto" }}>{f.status}</span>
                </Row>
                <p style={body}>{f.message}</p>
                <p style={subtle}>from {f.userName ?? f.userEmail ?? f.email ?? "anonymous"} · {fmt(f.createdAt)}</p>
                <Row>
                  {f.status === "NEW" && <Btn busy={busy === `fr-${f.id}`} onClick={() => act(`fr-${f.id}`, { action: "feedback_status", feedbackId: f.id, status: "READ" })}>Mark read</Btn>}
                  {f.status !== "RESOLVED" && <Btn busy={busy === `fres-${f.id}`} onClick={() => act(`fres-${f.id}`, { action: "feedback_status", feedbackId: f.id, status: "RESOLVED" })}>Resolve</Btn>}
                </Row>
              </Card>
            ))}
          </div>
        )}

        {tab === "audit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {actions.length === 0 && <Empty>No actions logged yet.</Empty>}
            {actions.map((a) => (
              <div key={a.id} style={{ fontFamily: INTER, fontSize: 13, color: "#555", padding: "8px 0", borderBottom: "1px solid #f2f2f2" }}>
                <b>{a.action}</b> · {a.targetType} {a.targetId.slice(0, 8)}… {a.detail ? `· ${a.detail}` : ""}<br />
                <span style={{ color: "#aaa" }}>{a.adminEmail} · {fmt(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const meta: React.CSSProperties = { fontFamily: INTER, fontSize: 12, color: "#999", textTransform: "uppercase", letterSpacing: "0.04em" };
const body: React.CSSProperties = { fontFamily: INTER, fontSize: 14, color: "#1a1a1a", margin: "8px 0 4px", lineHeight: 1.5, whiteSpace: "pre-wrap" };
const subtle: React.CSSProperties = { fontFamily: INTER, fontSize: 12, color: "#aaa", margin: "4px 0 10px" };
const linkBtn: React.CSSProperties = { fontFamily: INTER, fontSize: 13, color: BLUE, textDecoration: "underline" };

function Card({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return <div style={{ border: "1px solid #eee", borderRadius: 10, padding: "14px 16px", opacity: dim ? 0.55 : 1 }}>{children}</div>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{children}</div>;
}
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 700, color: "white", background: color, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.03em" }}>{children}</span>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: INTER, fontSize: 14, color: "#aaa", padding: "32px 0", textAlign: "center" }}>{children}</p>;
}
function Btn({ children, onClick, busy, danger }: { children: React.ReactNode; onClick: () => void; busy?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} style={{
      fontFamily: INTER, fontSize: 13, fontWeight: 600,
      color: danger ? "#c00" : BLUE, background: "white",
      border: `1.5px solid ${danger ? "#c00" : BLUE}`, borderRadius: 999,
      padding: "5px 12px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1,
    }}>{busy ? "…" : children}</button>
  );
}
