"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
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

interface ContinuumData {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  ownerId: string;
  shareToken: string | null;
  visibility: string;
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
  currentUserAvatarConfig: AvatarConfig;
}

// ─── share modal ─────────────────────────────────────────────────────────────

function ShareModal({ url, visibility, onClose }: { url: string; visibility: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  // Auto-copy on open
  useEffect(() => {
    navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => {});
  }, [url]);

  const accessLabel =
    visibility === "PUBLIC_LINK" ? "Anyone with this link can view and participate." :
    visibility === "TEAM"        ? "Team members with this link can participate." :
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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          width: "100%", maxWidth: 420,
          padding: "32px 28px 28px",
          fontFamily: INTER,
          position: "relative",
        }}
      >
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

        {/* QR code */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <QRCodeSVG value={url} size={180} bgColor="#ffffff" fgColor="#1a1a1a" />
        </div>
      </div>
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
}

function CommentBubble({ userId, name, comment, isSelf, positionFraction, headScreenX, bubbleTop, arrowCenterY, onCommentSubmit }: BubbleProps) {
  const [draft, setDraft] = useState(comment ?? "");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

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

  return (
    <div
      style={{
        position: "absolute",
        top: bubbleTop,
        left: leftStyle,
        zIndex: 10,
        width: BUBBLE_W,
        fontFamily: INTER,
      }}
    >
      <SpeechBubble anchorRight={anchorRight} arrowCenterY={arrowCenterY}>
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
          </>
        )}
      </SpeechBubble>
    </div>
  );
}

// ─── main view ────────────────────────────────────────────────────────────────

export function ContinuumView({ continuum, participants, messages, sessionToken, currentUserAvatarConfig }: Props) {
  const { data: session } = useSession();
  const {
    setParticipants, setConnected, updatePositionXZ, updateComment,
    addParticipant, removeParticipant, setContinuumId, participants: storeParticipants,
  } = useContinuumStore();

  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeParticipantsRef = useRef(storeParticipants);
  storeParticipantsRef.current = storeParticipants;
  const currentUserId = session?.user?.id ?? "";

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

    const socket = getSocket(sessionToken);

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join:continuum", continuum.id);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("position:broadcast", ({ userId, position, positionZ }: { userId: string; position: number; positionZ: number }) => {
      updatePositionXZ(userId, position, positionZ ?? 50);
    });
    socket.on("user:join", (data: { userId: string; userName: string; userImage: string }) => {
      addParticipant({
        userId: data.userId,
        name: data.userName,
        image: data.userImage,
        avatarConfig: {} as AvatarConfig,
        isSynthetic: false,
        position: 50,
        positionZ: 50,
        comment: null,
      });
    });
    socket.on("user:leave", ({ userId }: { userId: string }) => {
      removeParticipant(userId);
    });

    return () => {
      socket.emit("leave:continuum", continuum.id);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("position:broadcast");
      socket.off("user:join");
      socket.off("user:leave");
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
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(async () => {
        await fetch(`/api/continuums/${continuum.id}/position`, {
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
    [continuum.id, currentUserId, addParticipant, session, currentUserAvatarConfig]
  );

  // ── comment handler ──
  const handleCommentSubmit = useCallback(
    async (comment: string) => {
      await fetch(`/api/continuums/${continuum.id}/comment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      updateComment(currentUserId, comment);
    },
    [continuum.id, currentUserId]
  );

  // ── share modal ──
  const [showShareModal, setShowShareModal] = useState(false);
  const shareUrl = continuum.shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/continuum/${continuum.id}?token=${continuum.shareToken}`
    : null;

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

  if (!session) return null;

  const breadcrumbs = [
    { label: "home", href: "/dashboard" },
    { label: "continuums", href: "/dashboard" },
    { label: "continuum" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <AppHeader breadcrumbs={breadcrumbs} />

      <main style={{
        paddingTop: "clamp(32px, 5vh, 56px)",
        paddingBottom: 64,
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

        {/* Crowd + comment bubble */}
        <div style={{ position: "relative", marginTop: "clamp(24px, 4vh, 56px)" }}>
          <ContinuumScene
            currentUserId={currentUserId}
            currentUserAvatarConfig={currentUserAvatarConfig}
            localPosition={localPosition}
            localPositionZ={localPositionZ}
            selectedUserId={selectedUserId}
            onSelectUser={handleSelectUser}
            isInCrowd={isInCrowd}
            onPreJoinCommit={handlePreJoinCommit}
            onPositionChange={handlePositionChange}
            onPositionCommit={handlePositionCommit}
            onHeadScreen={handleHeadScreen}
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
              />
            );
          })()}
        </div>

        {/* Position labels */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 16,
        }}>
          <span style={{ fontFamily: INTER, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, color: "#1a1a1a" }}>
            {continuum.leftLabel}
          </span>
          <span style={{ fontFamily: INTER, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, color: "#1a1a1a" }}>
            {continuum.rightLabel}
          </span>
        </div>

        {/* Action bar */}
        <div style={{
          display: "flex", justifyContent: "flex-end", alignItems: "center",
          gap: 24, marginTop: 32,
        }}>
          <button style={{
            fontFamily: INTER, fontSize: 16, color: BLUE,
            background: "none", border: "none", cursor: "pointer", padding: 0,
          }}>
            Export
          </button>
          <button style={{
            fontFamily: INTER, fontSize: 16, color: BLUE,
            background: "none", border: "none", cursor: "pointer", padding: 0,
          }}>
            About this continuum
          </button>
          {shareUrl && (
            <PillButton variant="secondary" label="Share" onClick={() => setShowShareModal(true)} />
          )}
        </div>

      </main>

      {showShareModal && shareUrl && (
        <ShareModal
          url={shareUrl}
          visibility={continuum.visibility}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
