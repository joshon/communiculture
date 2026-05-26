"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
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

// ─── comment bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
  name: string | null;
  comment: string | null;
  isSelf: boolean;
  positionFraction: number; // 0–1 position in the crowd for left/right placement
  bubbleTop: number;
  arrowCenterY: number;
  onCommentSubmit?: (text: string) => void;
}

function CommentBubble({ name, comment, isSelf, positionFraction, bubbleTop, arrowCenterY, onCommentSubmit }: BubbleProps) {
  const [draft, setDraft] = useState(comment ?? "");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anchorRight = positionFraction > 0.5;

  const handleChange = useCallback((text: string) => {
    setDraft(text);
    if (!onCommentSubmit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (text.trim()) onCommentSubmit(text.trim());
    }, 800);
  }, [onCommentSubmit]);

  return (
    <div
      style={{
        position: "absolute",
        top: bubbleTop,
        ...(anchorRight
          ? { right: `${(1 - positionFraction) * 100 + 4}%` }
          : { left: `${positionFraction * 100 + 4}%` }),
        zIndex: 10,
        width: 240,
        fontFamily: INTER,
      }}
    >
      <SpeechBubble anchorRight={anchorRight} arrowCenterY={arrowCenterY}>
        {!isSelf && name && (
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>
            {name}
          </div>
        )}

        {isSelf ? (
          <textarea
            rows={3}
            placeholder="Tell us why you placed yourself here"
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            style={{
              width: "100%", border: "none", outline: "none", resize: "none",
              fontFamily: INTER, fontSize: 13, color: "#1a1a1a",
              background: "transparent", lineHeight: 1.5,
            }}
          />
        ) : (
          <p style={{ fontSize: 13, color: comment ? "#1a1a1a" : "#aaa", margin: 0, lineHeight: 1.5 }}>
            {comment ?? "No comment yet"}
          </p>
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

  // Local X and Z for real-time drag feedback
  const [localPosition, setLocalPosition] = useState(
    () => participants.find((p) => p.userId === currentUserId)?.position ?? 50
  );
  const [localPositionZ, setLocalPositionZ] = useState(
    () => participants.find((p) => p.userId === currentUserId)?.positionZ ?? 50
  );

  // Head screen Y for speech bubble arrow positioning (CSS pixels from canvas top)
  const [headScreenY, setHeadScreenY] = useState(180);

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

  // ── share ──
  const handleShare = useCallback(() => {
    if (!continuum.shareToken) return;
    const url = `${window.location.origin}/continuum/${continuum.id}?token=${continuum.shareToken}`;
    navigator.clipboard.writeText(url);
  }, [continuum]);

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
  }, [handlePositionCommit]);

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
        <div style={{ position: "relative" }}>
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
            onHeadScreenY={setHeadScreenY}
          />

          {selectedParticipant && (() => {
            const bubbleTop = Math.max(8, headScreenY - 50);
            const arrowCenterY = Math.max(8, headScreenY - bubbleTop);
            return (
              <CommentBubble
                name={selectedParticipant.isSynthetic ? null : selectedParticipant.name}
                comment={selectedParticipant.comment}
                isSelf={selectedUserId === currentUserId}
                positionFraction={selectedParticipant.position / 100}
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
          {continuum.shareToken && (
            <PillButton variant="secondary" label="Share" onClick={handleShare} />
          )}
        </div>

      </main>
    </div>
  );
}
