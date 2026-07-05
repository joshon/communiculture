"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import QRCode from "qrcode";
import { PixelBox } from "@/components/ui/PixelBox";
import { getSocket } from "@/lib/socket-client";
import { useContinuumStore } from "@/store/continuumStore";
import { ContinuumScene } from "./ContinuumScene";
import { AppHeader } from "@/components/ui/AppHeader";
import { PillButton } from "@/components/ui/PillButton";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { type AvatarConfig } from "@/store/avatarStore";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";

// ─── types ────────────────────────────────────────────────────────────────────

interface OwnerData {
  id: string;
  name: string | null;
  slogan: string | null;
  url: string | null;
  avatarThumbnail: string | null;
}

interface ContinuumData {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  ownerId: string;
  shareToken: string | null;
  visibility: string;
  createdAt: string;
  owner: OwnerData | null;
}

interface ParticipantData {
  userId: string;
  position: number;
  positionZ: number;
  comment: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    avatarConfig: AvatarConfig;
    isSynthetic: boolean;
    avatarThumbnail: string | null;
  };
}

interface MessageData {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
}

interface Props {
  continuum: ContinuumData;
  participants: ParticipantData[];
  messages: MessageData[];
  sessionToken: string;
  /** False for anonymous viewers — render read-only with an "add yourself" CTA. */
  authenticated?: boolean;
  currentUserAvatarConfig: AvatarConfig;
  seeding?: boolean;
}

// ─── share modal ─────────────────────────────────────────────────────────────

function ShareModal({ url, visibility, continuumId, isOwner, onClose }: { url: string; visibility: string; continuumId: string; isOwner: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Owner-only password reset (we can't show the old one — only set a new one).
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const savePw = async () => {
    if (!pw.trim()) return;
    setPwSaving(true); setPwSaved(false);
    try {
      const res = await fetch(`/api/continuums/${continuumId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) { setPwSaved(true); setPw(""); }
    } finally {
      setPwSaving(false);
    }
  };

  // Auto-copy link on open
  useEffect(() => {
    navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => {});
  }, [url]);

  const copyQRImage = async () => {
    const canvas = qrContainerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res));
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2000);
    } catch { /* unsupported browser */ }
  };

  const accessLabel =
    visibility === "PUBLIC_LINK" ? "Anyone with this link can view and participate." :
    visibility === "TEAM"        ? "Team members with this link can participate." :
    visibility === "PASSWORD"    ? "People with this link and the password can participate." :
                                   "People with this link can participate.";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, fontFamily: INTER }}>
        <PixelBox shadowDir="bottom-right" style={{ padding: "32px 28px 28px", position: "relative" }}>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 14, right: 16,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 22, lineHeight: 1, color: "#999", padding: 0,
            }}
          >
            ×
          </button>

          <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
            Share this continuum
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888" }}>
            {accessLabel}
          </p>

          {/* URL row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            border: "1.5px solid #1a1a1a", padding: "8px 12px",
            marginBottom: 20,
          }}>
            <span style={{
              flex: 1, fontSize: 12, color: "#555",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {url}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => {})}
              style={{
                fontFamily: INTER, fontSize: 12, fontWeight: 600,
                color: BLUE, background: "none", border: "none",
                cursor: "pointer", padding: "0 0 0 8px", flexShrink: 0,
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Owner password reset (PASSWORD continuums) */}
          {visibility === "PASSWORD" && isOwner && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>Password</div>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px", lineHeight: 1.5 }}>
                The current password can&rsquo;t be shown — set a new one here to share or rotate it.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="text"
                    name="continuum-access-code"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="New password"
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); setPwSaved(false); }}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      border: "1.5px solid #1a1a1a", padding: "8px 34px 8px 12px",
                      fontFamily: INTER, fontSize: 12, color: "#1a1a1a", background: "white", outline: "none",
                      ["WebkitTextSecurity" as keyof React.CSSProperties]: showPw ? "none" : "disc",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#888", display: "flex" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                      {showPw && <line x1="2" y1="2" x2="22" y2="22" />}
                    </svg>
                  </button>
                </div>
                <button
                  onClick={savePw}
                  disabled={pwSaving || !pw.trim()}
                  style={{ fontFamily: INTER, fontSize: 12, fontWeight: 600, color: BLUE, background: "none", border: "none", cursor: pw.trim() ? "pointer" : "default", padding: 0, opacity: pw.trim() ? 1 : 0.5, flexShrink: 0 }}
                >
                  {pwSaving ? "…" : pwSaved ? "Saved!" : "Save"}
                </button>
              </div>
            </div>
          )}

          {/* QR code */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div ref={qrContainerRef}>
              <QRCodeCanvas value={url} size={180} bgColor="#ffffff" fgColor={BLUE} />
            </div>
            <button
              onClick={copyQRImage}
              style={{
                fontFamily: INTER, fontSize: 13, fontWeight: 600,
                color: BLUE, background: "none", border: "none",
                cursor: "pointer", padding: 0,
              }}
            >
              {qrCopied ? "Copied!" : "Copy QR code"}
            </button>
          </div>
        </PixelBox>
      </div>
    </div>
  );
}

// ─── about modal ─────────────────────────────────────────────────────────────

function AboutModal({ continuum, onClose }: { continuum: ContinuumData; onClose: () => void }) {
  const { owner, createdAt } = continuum;
  const date = new Date(createdAt);
  const formatted = date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const visibilityLabel =
    continuum.visibility === "PUBLIC" ? "Publicly listed" :
    continuum.visibility === "PUBLIC_LINK" ? "Unlisted — link only" :
    continuum.visibility === "PASSWORD" ? "Password protected" :
    "Private";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, fontFamily: INTER }}>
        <PixelBox shadowDir="bottom-right" style={{ padding: "32px 28px 28px", position: "relative" }}>
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 14, right: 16,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 22, lineHeight: 1, color: "#999", padding: 0,
            }}
          >
            ×
          </button>

          <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
            About this continuum
          </h2>

          <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
            Created {formatted}
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 22,
            fontFamily: INTER, fontSize: 12, fontWeight: 600, color: "#0C447C",
            background: "#E6F1FB", padding: "5px 11px", borderRadius: 999,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {continuum.visibility === "PASSWORD" ? (
                <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>
              ) : continuum.visibility === "PUBLIC" ? (
                <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>
              ) : (
                <><path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 0 1 0 10h-2" /><line x1="8" y1="12" x2="16" y2="12" /></>
              )}
            </svg>
            {visibilityLabel}
          </div>

          {owner && (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {owner.avatarThumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={owner.avatarThumbnail}
                  alt=""
                  style={{ width: 52, height: 52, objectFit: "contain", flexShrink: 0 }}
                />
              )}
              <div>
                {owner.id ? (
                  <a
                    href={`/users/${owner.id}`}
                    style={{ fontFamily: INTER, fontSize: 15, fontWeight: 700, color: BLUE, textDecoration: "none" }}
                  >
                    {owner.name ?? "Anonymous"}
                  </a>
                ) : (
                  <p style={{ fontFamily: INTER, fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
                    {owner.name ?? "Anonymous"}
                  </p>
                )}
                {owner.slogan && (
                  <p style={{ fontFamily: INTER, fontSize: 13, color: "#555", margin: "4px 0 0" }}>
                    {owner.slogan}
                  </p>
                )}
                {owner.url && (
                  <a
                    href={owner.url.startsWith("http") ? owner.url : `https://${owner.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: INTER, fontSize: 12, color: BLUE, display: "block", marginTop: 4 }}
                  >
                    {owner.url}
                  </a>
                )}
              </div>
            </div>
          )}
        </PixelBox>
      </div>
    </div>
  );
}

// ─── export helpers ───────────────────────────────────────────────────────────

function exportCSV(continuum: ContinuumData, participants: ParticipantData[]) {
  const rows = [
    ["Name", "Position (%)", continuum.leftLabel, continuum.rightLabel, "Comment"],
    ...participants
      .filter(p => !p.user.isSynthetic)
      .map(p => [
        p.user.name ?? "Anonymous",
        p.position.toFixed(1),
        "",
        "",
        p.comment ?? "",
      ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${continuum.title.replace(/[^a-z0-9]/gi, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportPDF(continuum: ContinuumData, participants: ParticipantData[], withComments: boolean) {
  const { default: jsPDF } = await import("jspdf");

  const real = participants.filter(p => !p.user.isSynthetic && p.position != null);
  const sorted = [...real].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return;

  // Layout constants
  const ML = 18, MR = 18, MT_HDR = 36, SPEC_GAP = 5, BOT_MARGIN = 18;
  const HEAD_SZ = 16;  // square — thumbnails are 200×200px
  const NAME_H = 3;
  const ROW_GAP = 1;
  const SQ = 0.25;     // pixel-shadow square size (mm)
  const TILE = SQ * 2; // = 0.5mm
  const COMMENT_FONT = 8;
  const COMMENT_LINE = 3.5;
  const COMMENT_PAD = 2.5;
  const PAGE_W = 260;
  const USABLE_W = PAGE_W - ML - MR;
  const BOX_W = HEAD_SZ + 14; // 30mm comment box

  // Arrow: original SVG 44×18 pointing left → 90° CCW → 18×44 tip-at-bottom
  // → then 180° flip → 18×44 tip-at-top (tip overlaps box bottom border, body hangs down)
  const ARROW_U = 0.15;            // mm per SVG unit (half previous size)
  const ARROW_W_MM = 18 * ARROW_U; // 2.7mm
  const ARROW_H_MM = 44 * ARROW_U; // 6.6mm

  // Measure comment heights using throwaway doc
  const tmp = new jsPDF({ unit: "mm", format: "a4" });
  tmp.setFontSize(COMMENT_FONT);
  const commentHeights = sorted.map(p => {
    if (!withComments || !p.comment) return 0;
    const lines = tmp.splitTextToSize(p.comment, BOX_W - COMMENT_PAD * 2);
    return lines.length * COMMENT_LINE + COMMENT_PAD * 2;
  });

  const maxCommentH = withComments ? Math.max(0, ...commentHeights) : 0;
  // 5 pixel blocks (each 2 SVG units) of arrow sit inside the box border
  const ARROW_OVERLAP = 12 * ARROW_U; // mm — 6 pixel rows of taper inside box
  const HEAD_GAP = -3; // mm — negative means arrow/bubble overlaps into the head
  const commentSlot = withComments ? maxCommentH + (ARROW_H_MM - ARROW_OVERLAP) + HEAD_GAP : 0;
  const ROW_H = commentSlot + HEAD_SZ + NAME_H + ROW_GAP;

  // Stagger: assign each avatar to the lowest non-overlapping row
  const halfSlot = (withComments ? BOX_W : HEAD_SZ) / 2;
  const rowMaxX: number[] = [];
  const placed: Array<typeof sorted[0] & { row: number; xMm: number; commentH: number }> = [];

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const xMm = ML + (p.position / 100) * USABLE_W;
    let row = 0;
    while (row < rowMaxX.length && rowMaxX[row] !== undefined && rowMaxX[row] > xMm - halfSlot - 1) {
      row++;
    }
    rowMaxX[row] = xMm + halfSlot + 1;
    placed.push({ ...p, row, xMm, commentH: commentHeights[i] });
  }

  const maxRow = placed.reduce((m, p) => Math.max(m, p.row), 0);
  const SPECTRUM_Y = MT_HDR + (maxRow + 1) * ROW_H + SPEC_GAP;
  const PAGE_H = SPECTRUM_Y + 8 + BOT_MARGIN;

  const shareUrl = `${window.location.origin}/continuum/${continuum.id}${continuum.shareToken ? `?token=${continuum.shareToken}` : ""}`;
  const displayUrl = `${window.location.host}/continuum/${continuum.id}`;
  const dateStr = new Date(continuum.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // Load assets in parallel
  const loadSVGasPNG = (src: string, w: number, h: number): Promise<string> =>
    fetch(src).then(r => r.text()).then(svg => new Promise(res => {
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image(w * 4, h * 4);
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = w * 4; c.height = h * 4;
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(blobUrl);
        res(c.toDataURL("image/png"));
      };
      img.src = blobUrl;
    }));

  // Logo: 361×65 SVG → render at 360×65px for 2× quality
  const [logoDataUrl, qrDataUrl] = await Promise.all([
    loadSVGasPNG("/logo.svg", 360, 65),
    QRCode.toDataURL(shareUrl, { width: 200, margin: 1, color: { dark: "#0083FF", light: "#ffffff" } }),
  ]);

  const doc = new jsPDF({ unit: "mm", format: [PAGE_W, PAGE_H] });

  // ── pixel-box: white fill, blue border, bottom-right checkerboard shadow ──
  const drawPixelBox = (bx: number, by: number, bw: number, bh: number) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 131, 255);
    doc.setLineWidth(0.3);
    doc.rect(bx, by, bw, bh, "FD");
    doc.setFillColor(0, 131, 255);
    const bsW = Math.ceil((bw + TILE) / TILE) * TILE - SQ * 2;
    const bsLeft = bx + bw + TILE - bsW;
    for (let tx = bsLeft; tx < bsLeft + bsW; tx += TILE) {
      doc.rect(tx,      by + bh,      SQ, SQ, "F");
      doc.rect(tx + SQ, by + bh + SQ, SQ, SQ, "F");
    }
    const rsH = Math.max(0, Math.floor(bh / TILE) * TILE - SQ * 2);
    if (rsH > 0) {
      const rsTop = by + bh - rsH;
      for (let ty = rsTop; ty < rsTop + rsH; ty += TILE) {
        doc.rect(bx + bw,      ty,      SQ, SQ, "F");
        doc.rect(bx + bw + SQ, ty + SQ, SQ, SQ, "F");
      }
    }
  };

  // ── pixel arrow: tip-at-top (overlaps box bottom border), body hangs down ──
  // Rects are 180°-rotated versions of the 90°-CCW-rotated SVG.
  // 180° formula on 18×44 space: (x,y,w,h) → (18−x−w, 44−y−h, w, h)
  // arrowX = left edge of arrow in PDF coords
  // tipY   = y of the tip (= box bottom border; arrow hangs down from here)
  const drawPixelArrow = (arrowX: number, tipY: number) => {
    const ax = arrowX;
    const ay = tipY;
    const U = ARROW_U;
    const r = (x: number, y: number, w: number, h: number, c: [number, number, number]) => {
      doc.setFillColor(c[0], c[1], c[2]);
      doc.rect(ax + x * U, ay + y * U, w * U, h * U, "F");
    };
    const B: [number, number, number] = [0, 131, 255];
    const W: [number, number, number] = [255, 255, 255];
    const O: [number, number, number] = [218, 95, 68];

    // Blue outline — tip prongs at top, stepped outline widens, body bars, connector at bottom
    r( 6,  0,  2,  2, B); // tip right prong
    r(10,  0,  2,  2, B); // tip left prong
    r( 8,  2,  2,  2, B); // tip center step
    r( 6,  4,  2,  2, B); r(10,  4,  2,  2, B);
    r( 4,  6,  2,  2, B); r(12,  6,  2,  2, B);
    r( 2,  8,  2,  2, B); r(14,  8,  2,  2, B);
    r( 0, 10,  2,  2, B); r( 8, 10,  2,  2, B); r(16, 10,  2,  2, B);
    r( 6, 12,  2,  2, B); r(10, 12,  2,  2, B);
    r( 4, 14,  2,  2, B); r(12, 14,  2,  2, B);
    r( 2, 16,  2,  2, B); r(14, 16,  2,  2, B);
    r( 0, 18,  2, 24, B); // left body bar
    r(16, 18,  2, 24, B); // right body bar
    r( 2, 42, 14,  2, B); // bottom connector bar

    // White stepped edges (cover diagonal blue pixels at the taper)
    r( 0, 12,  2,  6, W); r( 2, 10,  2,  6, W); r( 4,  8,  2,  6, W);
    r( 6,  6,  2,  6, W); r( 8,  4,  2,  6, W); r(10,  6,  2,  6, W);
    r(12,  8,  2,  6, W); r(14, 10,  2,  6, W); r(16, 12,  2,  6, W);

    // White interior fills (overwrite blue inside body)
    r( 2, 18,  2, 24, W); r( 4, 16,  2, 26, W); r( 6, 14,  2, 28, W);
    r( 8, 12,  2, 30, W); r(10, 14,  2, 28, W); r(12, 16,  2, 26, W);
    r(14, 18,  2, 24, W);

    // Orange chevrons — two ^ shapes pointing toward tip (up)
    r( 4, 24,  2,  4, O); r( 6, 22,  2,  4, O); r( 8, 20,  2,  4, O);
    r(10, 22,  2,  4, O); r(12, 24,  2,  4, O);
    r( 4, 34,  2,  4, O); r( 6, 32,  2,  4, O); r( 8, 30,  2,  4, O);
    r(10, 32,  2,  4, O); r(12, 34,  2,  4, O);
  };

  // ── header: title (left) + logo + QR (right) ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(26, 26, 26);
  doc.text(continuum.title, ML, MT_HDR - 6);

  const LOGO_W = 40, LOGO_H = 40 * (65 / 361);
  doc.addImage(logoDataUrl, "PNG", ML, 5, LOGO_W, LOGO_H);

  // QR code: 0.8× (12.8mm), top right, brand blue
  const QR_SZ = 12.8;
  const qrX = PAGE_W - MR - QR_SZ;
  doc.addImage(qrDataUrl, "PNG", qrX, 5, QR_SZ, QR_SZ);

  // ── bottom-left: date | url ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 160, 160);
  doc.text(`${dateStr}  |  ${displayUrl}`, ML, PAGE_H - 5);

  // ── spectrum labels ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(26, 26, 26);
  doc.text(continuum.leftLabel,  ML,          SPECTRUM_Y + 7);
  doc.text(continuum.rightLabel, PAGE_W - MR, SPECTRUM_Y + 7, { align: "right" });

  // ── avatars ──
  for (const p of placed) {
    // row 0 is closest to bar; higher rows are further from bar (upward)
    const rowBaseY = SPECTRUM_Y - (p.row + 1) * ROW_H;
    // Head is always at the bottom of the commentSlot, so stagger rows align at head level
    const headY = rowBaseY + commentSlot;

    // Draw head first so bubble/arrow render on top of it
    if (p.user.avatarThumbnail) {
      try { doc.addImage(p.user.avatarThumbnail, "PNG", p.xMm - HEAD_SZ / 2, headY, HEAD_SZ, HEAD_SZ); }
      catch { /* skip */ }
    } else {
      doc.setFillColor(220, 220, 220);
      doc.rect(p.xMm - HEAD_SZ / 2, headY, HEAD_SZ, HEAD_SZ, "F");
    }

    // Name
    const firstName = (p.user.name ?? "?").split(" ")[0];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text(firstName, p.xMm, headY + HEAD_SZ + 2, { align: "center" });

    // Bubble + arrow on top of head
    if (withComments && p.comment && p.commentH > 0) {
      const tipY = headY - HEAD_GAP - ARROW_H_MM;
      const boxY = tipY + ARROW_OVERLAP - p.commentH;
      const boxX = p.xMm - BOX_W / 2;
      drawPixelBox(boxX, boxY, BOX_W, p.commentH);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(COMMENT_FONT);
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(p.comment, BOX_W - COMMENT_PAD * 2);
      doc.text(lines, boxX + COMMENT_PAD, boxY + COMMENT_PAD + COMMENT_LINE * 0.8);
      const arrowX = p.xMm - ARROW_W_MM / 2;
      drawPixelArrow(arrowX, tipY);
    }
  }

  doc.save(`${continuum.title.replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

// ─── export menu ─────────────────────────────────────────────────────────────

function ExportMenu({ continuum, participants, onClose }: {
  continuum: ContinuumData;
  participants: ParticipantData[];
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); onClose(); }
  };

  const items = [
    { key: "csv",          label: "CSV",                  fn: () => exportCSV(continuum, participants) },
    { key: "pdf-comments", label: "PDF — with comments",  fn: () => exportPDF(continuum, participants, true) },
    { key: "pdf-plain",    label: "PDF — without comments", fn: () => exportPDF(continuum, participants, false) },
  ];

  return (
    <div style={{ position: "relative", zIndex: 200 }}>
      <PixelBox shadowDir="bottom-right" style={{ overflow: "hidden", minWidth: 200 }}>
        {items.map(({ key, label, fn }) => (
          <button
            key={key}
            disabled={!!busy}
            onClick={() => run(key, fn)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              fontFamily: INTER, fontSize: 14, color: busy === key ? BLUE : "#1a1a1a",
              background: "none", border: "none", cursor: busy ? "default" : "pointer",
              padding: "10px 16px",
              borderBottom: key !== "pdf-plain" ? "1px solid #ebebeb" : "none",
            }}
          >
            {busy === key ? "Exporting…" : label}
          </button>
        ))}
      </PixelBox>
    </div>
  );
}

// ─── comment bubble ───────────────────────────────────────────────────────────

const BUBBLE_W = 240;
// Gap between bubble edge and avatar: arrow length (17 tiles) + avatar half-width (~22px)
const BUBBLE_GAP = "calc(var(--tile, 3px) * 17 + 12px)";

interface BubbleProps {
  userId: string | null;
  name: string | null;
  comment: string | null;
  isSelf: boolean;
  positionFraction: number;
  headScreenX: number;
  bubbleTop: number;
  arrowCenterY: number;
  onCommentSubmit?: (text: string) => void;
  onRemove?: () => void;
  canModerate?: boolean;
  onDeleteComment?: () => void;
}

function CommentBubble({ userId, name, comment, isSelf, positionFraction, headScreenX, bubbleTop, arrowCenterY, onCommentSubmit, onRemove, canModerate, onDeleteComment }: BubbleProps) {
  const [draft, setDraft] = useState(comment ?? "");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  // Lazy-init from the real viewport so the centred mobile layout applies on the
  // first render (this bubble only mounts on selection, so it's client-only).
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const anchorRight = positionFraction > 0.5;

  // Auto-resize textarea to fit content
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  useEffect(() => { adjustHeight(); }, [draft, adjustHeight]);

  // Auto-focus textarea when self-bubble first opens
  useEffect(() => {
    if (isSelf) textareaRef.current?.focus();
  }, [isSelf]);

  const handleChange = useCallback((text: string) => {
    setDraft(text);
    if (!onCommentSubmit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (text.trim()) onCommentSubmit(text.trim());
    }, 800);
  }, [onCommentSubmit]);

  const leftStyle = anchorRight
    ? `calc(${headScreenX}px - ${BUBBLE_GAP} - ${BUBBLE_W}px)`
    : `calc(${headScreenX}px + ${BUBBLE_GAP})`;

  // On mobile the side-anchored bubble runs off-screen — centre it horizontally
  // and sit it below the avatar with the arrow pointing up toward it.
  const headScreenY = bubbleTop + arrowCenterY; // reconstruct the avatar head Y
  // Mobile: centre the box under the avatar but clamp it inside the canvas
  // container; the up-arrow then points at the avatar's actual X (shifting within
  // the box only when clamped). headScreenX is container-relative, so clamp to the
  // container width (viewport minus the main's horizontal padding).
  const vw = typeof window !== "undefined" ? window.innerWidth : 412;
  const pad = Math.min(48, Math.max(16, vw * 0.04));
  const containerW = vw - 2 * pad;
  const boxW = Math.min(240, containerW);
  const boxLeft = Math.max(0, Math.min(containerW - boxW, headScreenX - boxW / 2));
  const arrowX = Math.max(18, Math.min(boxW - 18, headScreenX - boxLeft));
  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: "absolute",
        top: headScreenY + 22,
        left: boxLeft,
        zIndex: 10,
        width: boxW,
        fontFamily: INTER,
      }
    : {
        position: "absolute",
        top: bubbleTop,
        left: leftStyle,
        zIndex: 10,
        width: BUBBLE_W,
        fontFamily: INTER,
      };

  return (
    <div style={containerStyle}>
      <SpeechBubble anchorRight={anchorRight} arrowCenterY={arrowCenterY} arrowUp={isMobile} arrowX={isMobile ? arrowX : undefined}>
        {isSelf ? (
          // Self bubble: name (link) at top, editable comment below
          <div onClick={() => textareaRef.current?.focus()}>
            {name && (
              <button
                onClick={(e) => { e.stopPropagation(); router.push("/dashboard?tab=standing"); }}
                style={{
                  display: "block", width: "100%", textAlign: "right",
                  fontSize: 12, fontWeight: 600, color: BLUE,
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: INTER, padding: 0, marginBottom: 6,
                }}
              >
                {name} →
              </button>
            )}
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Tell us why you placed yourself here"
              value={draft}
              onChange={(e) => handleChange(e.target.value)}
              onInput={adjustHeight}
              style={{
                width: "100%", border: "none", outline: "none", resize: "none",
                fontFamily: INTER, fontSize: 13, color: "#1a1a1a",
                background: "transparent", lineHeight: 1.5,
                overflow: "hidden", minHeight: "3.5em", display: "block",
              }}
            />
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                style={{
                  display: "block", marginTop: 4,
                  fontFamily: INTER, fontSize: 11, color: "#aaa",
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, textDecoration: "underline",
                }}
              >
                Remove from continuum
              </button>
            )}
          </div>
        ) : (
          // Other person's bubble: comment text, name (link) at bottom right
          <>
            <p style={{ fontSize: 13, color: comment ? "#1a1a1a" : "#aaa", margin: "0 0 8px", lineHeight: 1.5 }}>
              {comment ?? "No comment yet"}
            </p>
            {name && userId && (
              <button
                onClick={() => router.push(`/users/${userId}`)}
                style={{
                  display: "block", width: "100%", textAlign: "right",
                  fontSize: 12, color: BLUE,
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: INTER, padding: 0,
                }}
              >
                — {name}
              </button>
            )}
            {name && !userId && (
              <div style={{ fontSize: 12, color: "#888", textAlign: "right" }}>— {name}</div>
            )}
            {canModerate && comment && onDeleteComment && (
              <div style={{ marginTop: 8, borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
                <button
                  onClick={onDeleteComment}
                  style={{ fontFamily: INTER, fontSize: 11, color: "#c00", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >Delete this comment</button>
              </div>
            )}
          </>
        )}
      </SpeechBubble>
    </div>
  );
}

// ─── main view ────────────────────────────────────────────────────────────────

export function ContinuumView({ continuum, participants, messages, sessionToken, authenticated = true, currentUserAvatarConfig, seeding: initialSeeding }: Props) {
  const { data: session } = useSession();
  // Share token to prove access on data/write calls for link- and password-gated
  // continuums (the API re-checks access; a bare id is no longer enough). Empty
  // for PUBLIC continuums.
  const tokenQ = continuum.shareToken ? `?token=${encodeURIComponent(continuum.shareToken)}` : "";
  // Anonymous viewers (server says not authenticated, or no client session):
  // read-only view with an "add yourself" CTA, no socket, no placement.
  const isAnon = !authenticated;
  const {
    setParticipants, setConnected, updatePositionXZ, updateComment,
    addParticipant, removeParticipant, setContinuumId, participants: storeParticipants,
  } = useContinuumStore();

  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeParticipantsRef = useRef(storeParticipants);
  storeParticipantsRef.current = storeParticipants;
  const currentUserId = session?.user?.id ?? "";
  // Always-current id for the socket handlers, whose effect only runs once
  // (deps [continuum.id]) — the closed-over currentUserId would otherwise be the
  // empty first-render value before the session resolved.
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  // Seeding placeholders — trigger seed endpoint then poll until 5 bots arrive.
  // If the bots are already here (e.g. a refresh with ?seeding=1 still in the
  // URL), don't show the placeholders at all.
  const [isSeeding, setIsSeeding] = useState(
    !!initialSeeding && !participants.some((p) => p.user.isSynthetic)
  );
  useEffect(() => {
    if (!isSeeding) return;

    // Kick off seeding server-side (this request stays open until Anthropic responds)
    fetch(`/api/continuums/${continuum.id}/seed`, { method: "POST" })
      .catch(() => { /* non-fatal */ });

    // Poll every 2s for bots appearing
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/continuums/${continuum.id}${tokenQ}`);
        const data = await res.json();
        const bots = (data.participants ?? []).filter((p: any) => p.user?.isSynthetic);
        if (bots.length >= 5) {
          bots.forEach((p: any) => {
            addParticipant({
              userId: p.userId,
              name: p.user.name,
              image: p.user.image ?? null,
              avatarConfig: p.user.avatarConfig ?? {},
              isSynthetic: true,
              position: p.position ?? 50,
              positionZ: p.positionZ ?? 50,
              comment: p.comment ?? null,
            });
          });
          setIsSeeding(false);
          clearInterval(poll);
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(poll);
  }, [isSeeding, continuum.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Local X and Z for real-time drag feedback.
  // Initialized to 50; corrected in useEffect once session (and thus currentUserId) is known.
  const [localPosition, setLocalPosition] = useState(50);
  const [localPositionZ, setLocalPositionZ] = useState(50);
  const positionInitialized = useRef(false);
  useEffect(() => {
    if (!currentUserId || positionInitialized.current) return;
    const mine = participants.find((p) => p.userId === currentUserId);
    if (mine) {
      setLocalPosition(mine.position ?? 50);
      setLocalPositionZ((mine as any).positionZ ?? 50);
      positionInitialized.current = true;
    }
  }, [currentUserId, participants]);

  // Avatar head screen position for speech bubble (CSS pixels from canvas top-left)
  const [headPos, setHeadPos] = useState({ x: 700, y: 180 });
  const handleHeadScreen = useCallback((x: number, y: number) => setHeadPos({ x, y }), []);

  // Selected avatar for comment bubble
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedParticipant = selectedUserId ? storeParticipants[selectedUserId] : null;

  // The continuum's owner can delete (hide) other people's comments. Site
  // admins can too; everyone else relies on the automatic AI moderation.
  const canModerate =
    continuum.ownerId === currentUserId ||
    !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  // Owners opt into moderation explicitly (off by default). Only then do the
  // delete affordances appear.
  const [moderationMode, setModerationMode] = useState(false);
  // userId whose comment is pending a delete confirmation (drives the modal).
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Styling for users who are *connected* but haven't placed themselves yet.
  // We remember their avatar config here (from join/presence) but DON'T render
  // them — an avatar only appears once it's actually placed (DB load or a live
  // position broadcast). This is then used to render them fully-styled the
  // moment they drag in.
  const connectedUsersRef = useRef<Record<string, { name: string | null; image: string | null; avatarConfig: AvatarConfig }>>({});

  // ── socket setup ──
  useEffect(() => {
    setContinuumId(continuum.id);
    setParticipants(
      participants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        image: p.user.image,
        avatarConfig: (p.user.avatarConfig ?? {}) as any,
        isSynthetic: p.user.isSynthetic ?? false,
        position: p.position ?? 50,
        positionZ: (p as any).positionZ ?? 50,
        comment: p.comment,
      }))
    );

    // Anonymous viewers get a read-only snapshot — no socket (they can't auth).
    if (!sessionToken) return;

    const socket = getSocket(sessionToken);

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join:continuum", { continuumId: continuum.id, token: continuum.shareToken ?? undefined });
    });
    socket.on("disconnect", () => setConnected(false));
    // A live position broadcast means the user is *placed*. If we already render
    // them (DB-loaded or placed earlier this session) just move them; otherwise
    // this is their first placement — promote them into the scene now, fully
    // styled from the avatar config we cached on join/presence.
    socket.on("position:broadcast", ({ userId, position, positionZ }: { userId: string; position: number; positionZ: number }) => {
      if (!userId || userId === currentUserIdRef.current) return;
      if (useContinuumStore.getState().participants[userId]) {
        updatePositionXZ(userId, position, positionZ ?? 50);
        return;
      }
      const info = connectedUsersRef.current[userId];
      addParticipant({
        userId,
        name: info?.name ?? null,
        image: info?.image ?? null,
        avatarConfig: (info?.avatarConfig ?? {}) as AvatarConfig,
        isSynthetic: false,
        position,
        positionZ: positionZ ?? 50,
        comment: null,
      });
    });
    // Someone connected — remember their styling but DON'T render them. They
    // only appear once they actually place themselves (position:broadcast).
    socket.on("user:join", (data: { userId: string; userName: string; userImage: string; avatarConfig?: AvatarConfig }) => {
      if (!data.userId || data.userId === currentUserIdRef.current) return;
      connectedUsersRef.current[data.userId] = {
        name: data.userName ?? null,
        image: data.userImage ?? null,
        avatarConfig: (data.avatarConfig ?? {}) as AvatarConfig,
      };
    });
    // Someone disconnected. Leave their placed avatar in the scene — their
    // placement lives in the DB and other viewers loaded it from there; a closed
    // tab shouldn't make a placed avatar vanish. Just drop the cached styling.
    socket.on("user:leave", ({ userId }: { userId: string }) => {
      delete connectedUsersRef.current[userId];
    });
    // Roster of who was already connected when we joined — cache styling only.
    socket.on("presence:sync", ({ users }: { users: Array<{ userId: string; userName: string; userImage: string; avatarConfig?: AvatarConfig }> }) => {
      users.forEach((u) => {
        if (!u.userId || u.userId === currentUserIdRef.current) return;
        connectedUsersRef.current[u.userId] = {
          name: u.userName ?? null,
          image: u.userImage ?? null,
          avatarConfig: (u.avatarConfig ?? {}) as AvatarConfig,
        };
      });
    });
    // Live comments — show others' comments as they're written, no refresh. Only
    // applies to already-placed avatars (a comment without a placement is a
    // no-op until they appear).
    socket.on("comment:broadcast", ({ userId, comment }: { userId: string; comment: string }) => {
      if (!userId || userId === currentUserIdRef.current) return;
      updateComment(userId, comment);
    });
    // Someone removed themselves from the continuum — drop their avatar live.
    // Keep their cached styling though: they're still connected and may place
    // again, and re-placement carries no avatar config of its own.
    socket.on("participant:removed", ({ userId }: { userId: string }) => {
      if (!userId || userId === currentUserIdRef.current) return;
      removeParticipant(userId);
    });

    return () => {
      socket.emit("leave:continuum", continuum.id);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("position:broadcast");
      socket.off("user:join");
      socket.off("user:leave");
      socket.off("presence:sync");
      socket.off("comment:broadcast");
      socket.off("participant:removed");
    };
  }, [continuum.id]);

  // ── position handlers ──
  const handlePositionChange = useCallback(
    (posX: number, posZ: number) => {
      setLocalPosition(posX);
      setLocalPositionZ(posZ);
      updatePositionXZ(currentUserId, posX, posZ);
      const socket = getSocket(sessionToken);
      socket.emit("position:update", { continuumId: continuum.id, position: posX, positionZ: posZ });
    },
    [continuum.id, sessionToken, currentUserId, updatePositionXZ]
  );

  const handlePositionCommit = useCallback(
    (posX: number, posZ: number) => {
      // Broadcast the placement immediately. This is the ONLY live signal others
      // get for a first-time placement: the pre-join drag commits through here
      // and never fires onPositionChange (which is what emits during later
      // moves). Without this, dragging yourself in is invisible to other tabs.
      getSocket(sessionToken).emit("position:update", { continuumId: continuum.id, position: posX, positionZ: posZ });
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(async () => {
        await fetch(`/api/continuums/${continuum.id}/position${tokenQ}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: posX, positionZ: posZ }),
        });
        if (currentUserId && !storeParticipantsRef.current[currentUserId]) {
          addParticipant({
            userId: currentUserId,
            name: session?.user?.name ?? null,
            image: session?.user?.image ?? null,
            avatarConfig: currentUserAvatarConfig,
            isSynthetic: false,
            position: posX,
            positionZ: posZ,
            comment: null,
          });
        }
      }, 300);
    },
    [continuum.id, tokenQ, sessionToken, currentUserId, addParticipant, session, currentUserAvatarConfig]
  );

  // ── comment handler ──
  const handleCommentSubmit = useCallback(
    async (comment: string) => {
      updateComment(currentUserId, comment);
      // Broadcast live so others see it without refreshing.
      getSocket(sessionToken).emit("comment:update", { continuumId: continuum.id, comment });
      await fetch(`/api/continuums/${continuum.id}/comment${tokenQ}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
    },
    [continuum.id, tokenQ, currentUserId, sessionToken]
  );

  // ── leave continuum: remove the current user's own participation ──
  const handleRemoveSelf = useCallback(async () => {
    // Cancel any pending placement commit — otherwise its debounced timer fires
    // after we remove and re-adds us (locally and via a position upsert), so the
    // avatar snaps back into the continuum instead of returning to the platform.
    if (commitTimer.current) { clearTimeout(commitTimer.current); commitTimer.current = null; }
    setSelectedUserId(null);
    removeParticipant(currentUserId);
    positionInitialized.current = false;
    setLocalPosition(50);
    setLocalPositionZ(50);
    // Broadcast the removal so other viewers drop the avatar without refreshing.
    getSocket(sessionToken).emit("participant:remove", continuum.id);
    await fetch(`/api/continuums/${continuum.id}/position`, { method: "DELETE" });
  }, [continuum.id, sessionToken, currentUserId, removeParticipant]);

  // ── owner/admin: delete (hide) someone else's comment on this continuum ──
  const handleDeleteComment = useCallback(async (targetUserId: string) => {
    // Optimistically clear it locally; the server hides it (commentHidden) so it
    // stays gone for everyone on reload.
    updateComment(targetUserId, null);
    await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hide_comment", continuumId: continuum.id, userId: targetUserId }),
    }).catch(() => { /* non-fatal — local clear already applied */ });
  }, [continuum.id, updateComment]);

  // ── share modal ── anyone can share. A publicly-listed continuum shares its
  // plain URL; otherwise include the share token so the recipient can view.
  const [showShareModal, setShowShareModal] = useState(false);
  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl =
    continuum.visibility === "PUBLIC"
      ? `${shareOrigin}/continuum/${continuum.id}`
      : `${shareOrigin}/continuum/${continuum.id}${continuum.shareToken ? `?token=${continuum.shareToken}` : ""}`;

  // ── export menu ──
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);

  // ── about modal ──
  const [showAbout, setShowAbout] = useState(false);

  // ── avatar click → show bubble ──
  const handleSelectUser = useCallback((uid: string | null) => {
    setSelectedUserId(uid);
    // When selecting self, make sure the bubble shows current comment from store
  }, []);

  const isInCrowd = !!storeParticipants[currentUserId];

  const handlePreJoinCommit = useCallback((posX: number, posZ: number) => {
    setLocalPosition(posX);
    setLocalPositionZ(posZ);
    handlePositionCommit(posX, posZ);
    setSelectedUserId(currentUserId); // open comment bubble automatically
  }, [handlePositionCommit, currentUserId]);

  // Authenticated pages wait for the client session to load; anonymous viewers
  // render immediately (their session is null by design).
  if (!isAnon && !session) return null;

  const breadcrumbs = [
    { label: "home", href: "/dashboard" },
    { label: "continuums", href: "/dashboard" },
    { label: "continuum" },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "white", display: "flex", flexDirection: "column" }}>
      <AppHeader breadcrumbs={breadcrumbs} authenticated={!isAnon} />

      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        paddingTop: "clamp(24px, 4vh, 56px)",
        paddingBottom: "clamp(24px, 4vh, 56px)",
        paddingLeft: "clamp(16px, 4vw, 48px)",
        paddingRight: "clamp(16px, 4vw, 48px)",
      }}>

        {/* Title */}
        <h1 style={{
          fontFamily: INTER,
          fontSize: "clamp(24px, 4vw, 36px)",
          fontWeight: 700,
          color: "#1a1a1a",
          margin: 0,
          lineHeight: 1.25,
        }}>
          {continuum.title}
        </h1>

        {/* Crowd + comment bubble — flex-grows to fill, so the page fits the
            viewport and the share row stays on screen (canvas shrinks if needed) */}
        <div style={{ position: "relative", marginTop: "clamp(16px, 3vh, 40px)", flex: 1, minHeight: 220, maxHeight: 860 }}>
          <ContinuumScene
            currentUserId={currentUserId}
            currentUserAvatarConfig={currentUserAvatarConfig}
            localPosition={localPosition}
            localPositionZ={localPositionZ}
            selectedUserId={selectedUserId}
            onSelectUser={handleSelectUser}
            isInCrowd={isInCrowd}
            readOnly={isAnon}
            onPreJoinCommit={handlePreJoinCommit}
            onPositionChange={handlePositionChange}
            onPositionCommit={handlePositionCommit}
            onHeadScreen={handleHeadScreen}
            isSeeding={isSeeding}
          />

          {selectedParticipant && (() => {
            const bubbleTop = Math.max(8, headPos.y - 65);
            const arrowCenterY = Math.max(8, headPos.y - bubbleTop);
            return (
              <CommentBubble
                userId={selectedParticipant.isSynthetic ? null : (selectedUserId ?? null)}
                name={selectedParticipant.isSynthetic ? null : selectedParticipant.name}
                comment={selectedParticipant.comment}
                isSelf={selectedUserId === currentUserId}
                positionFraction={selectedParticipant.position / 100}
                headScreenX={headPos.x}
                bubbleTop={bubbleTop}
                arrowCenterY={arrowCenterY}
                onCommentSubmit={selectedUserId === currentUserId ? handleCommentSubmit : undefined}
                onRemove={selectedUserId === currentUserId ? handleRemoveSelf : undefined}
                canModerate={canModerate && moderationMode && selectedUserId !== currentUserId}
                onDeleteComment={selectedUserId && selectedUserId !== currentUserId ? () => setConfirmDeleteUserId(selectedUserId) : undefined}
              />
            );
          })()}
        </div>

        {/* Position labels */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          gap: 16, marginTop: 16,
        }}>
          <span style={{ fontFamily: INTER, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, color: "#1a1a1a", textAlign: "left", flex: 1 }}>
            {continuum.leftLabel}
          </span>
          <span style={{ fontFamily: INTER, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, color: "#1a1a1a", textAlign: "right", flex: 1 }}>
            {continuum.rightLabel}
          </span>
        </div>

        {/* Action bar — anonymous viewers just get a centered "Join" CTA; signed-in
            viewers get the full controls (wrapping on narrow screens). */}
        <div style={{
          display: "flex", flexWrap: "wrap",
          justifyContent: isAnon ? "center" : "flex-end", alignItems: "center",
          columnGap: 24, rowGap: 12, marginTop: "clamp(16px, 2vh, 32px)",
        }}>
          {isAnon ? (
            <PillButton
              variant="primary"
              label="Add your answer"
              onClick={() => {
                const back =
                  typeof window !== "undefined"
                    ? window.location.pathname + window.location.search
                    : `/continuum/${continuum.id}`;
                window.location.href = `/login?callbackUrl=${encodeURIComponent(back)}`;
              }}
            />
          ) : (
            <>
              {/* Moderation toggle — owners/admins only, off by default. When on,
                  a "Delete this comment" action appears on others' bubbles. */}
              {canModerate && (
                <button
                  onClick={() => setModerationMode((v) => !v)}
                  style={{
                    fontFamily: INTER, fontSize: 16, marginRight: "auto",
                    color: moderationMode ? "#c00" : "#999",
                    fontWeight: moderationMode ? 600 : 400,
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                  }}
                  title="When on, you can delete comments on this continuum"
                >
                  Moderation: {moderationMode ? "on" : "off"}
                </button>
              )}

              {/* Export button + dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  ref={exportBtnRef}
                  onClick={() => setShowExportMenu(v => !v)}
                  style={{
                    fontFamily: INTER, fontSize: 16, color: BLUE,
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                  }}
                >
                  Export
                </button>
                {showExportMenu && (
                  <>
                    {/* Click-outside backdrop */}
                    <div
                      onClick={() => setShowExportMenu(false)}
                      style={{ position: "fixed", inset: 0, zIndex: 199 }}
                    />
                    <div style={{ position: "absolute", bottom: "calc(100% + 10px)", right: 0, zIndex: 200 }}>
                      <ExportMenu
                        continuum={continuum}
                        participants={participants}
                        onClose={() => setShowExportMenu(false)}
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowAbout(true)}
                style={{
                  fontFamily: INTER, fontSize: 16, color: BLUE,
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                }}
              >
                About this continuum
              </button>

              <PillButton variant="secondary" label="Share" onClick={() => setShowShareModal(true)} />
            </>
          )}
        </div>

      </main>

      {showShareModal && shareUrl && (
        <ShareModal
          url={shareUrl}
          visibility={continuum.visibility}
          continuumId={continuum.id}
          isOwner={continuum.ownerId === currentUserId}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showAbout && (
        <AboutModal continuum={continuum} onClose={() => setShowAbout(false)} />
      )}

      {confirmDeleteUserId && (
        <div
          onClick={() => setConfirmDeleteUserId(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, fontFamily: INTER }}>
            <PixelBox shadowDir="bottom-right" style={{ padding: "30px 28px 26px" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
                Delete this comment?
              </h2>
              <p style={{ margin: "0 0 22px", fontSize: 14, color: "#555", lineHeight: 1.5 }}>
                It will be removed for everyone.
              </p>
              <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setConfirmDeleteUserId(null)}
                  style={{
                    fontFamily: INTER, fontSize: 15, color: "#888",
                    background: "none", border: "none", cursor: "pointer", padding: "8px 4px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const uid = confirmDeleteUserId;
                    setConfirmDeleteUserId(null);
                    if (uid) handleDeleteComment(uid);
                  }}
                  style={{
                    fontFamily: INTER, fontSize: 15, fontWeight: 600, color: "white",
                    background: "#D62A2A", border: "none", borderRadius: 999,
                    padding: "9px 22px", cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </PixelBox>
          </div>
        </div>
      )}
    </div>
  );
}
