"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket-client";
import { useContinuumStore } from "@/store/continuumStore";
import { ContinuumScene } from "./ContinuumScene";
import { AppHeader } from "@/components/ui/AppHeader";
import { PillButton } from "@/components/ui/PillButton";
import type { AvatarConfig } from "@/store/avatarStore";

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

// ─── drag bar ─────────────────────────────────────────────────────────────────

function DragBar({
  onPositionChange,
  onPositionCommit,
}: {
  onPositionChange: (p: number) => void;
  onPositionCommit: (p: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const getPos = useCallback((clientX: number) => {
    if (!ref.current) return 0.5;
    const rect = ref.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      onPositionChange(getPos(e.clientX));
    },
    [getPos, onPositionChange]
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      onPositionChange(getPos(e.clientX));
    },
    [getPos, onPositionChange]
  );

  const onUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      onPositionCommit(getPos(e.clientX));
    },
    [getPos, onPositionCommit]
  );

  return (
    <div
      ref={ref}
      style={{ cursor: "ew-resize", userSelect: "none", touchAction: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <svg
        width="100%"
        viewBox="0 0 523 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
        preserveAspectRatio="none"
      >
        <g filter="url(#filter0_d_144_20184)">
          <rect width="30.2" height="28.8968" fill="#DA5F44"/>
          <path d="M9.5231 15.8142V12.2554H13.0818V15.8142H9.5231ZM13.0818 12.2554V8.6967H16.6406V12.2554H13.0818ZM13.0818 19.3729V15.8142H16.6406V19.3729H13.0818ZM16.6406 8.6967V5.13797H20.1993V8.6967H16.6406ZM16.6406 22.9316V19.3729H20.1993V22.9316H16.6406Z" fill="white"/>
        </g>
        <g filter="url(#filter1_d_144_20184)">
          <rect width="435.725" height="28.8968" transform="translate(41)" fill="#DA5F44"/>
          <path d="M54.2858 22.9316V5.13797H57.8445V22.9316H54.2858ZM54.2858 8.6967V5.13797H61.4033V8.6967H54.2858ZM54.2858 22.9316V19.3729H61.4033V22.9316H54.2858ZM61.4033 19.3729V8.6967H64.962V19.3729H61.4033ZM67.8048 22.9316V5.13797H71.3636V22.9316H67.8048ZM67.8048 8.6967V5.13797H78.481V8.6967H67.8048ZM67.8048 15.8142V12.2554H74.9223V15.8142H67.8048ZM74.9223 12.2554V5.13797H78.481V12.2554H74.9223ZM74.9223 22.9316V15.8142H78.481V22.9316H74.9223ZM81.3238 22.9316V5.13797H84.8826V22.9316H81.3238ZM81.3238 8.6967V5.13797H92V8.6967H81.3238ZM81.3238 15.8142V12.2554H92V15.8142H81.3238ZM88.4413 22.9316V5.13797H92V22.9316H88.4413ZM94.8429 19.3729V8.6967H98.4016V19.3729H94.8429ZM98.4016 8.6967V5.13797H105.519V8.6967H98.4016ZM98.4016 22.9316V19.3729H105.519V22.9316H98.4016ZM101.96 22.9316V15.8142H105.519V22.9316H101.96ZM118.319 15.8142V5.13797H121.877V15.8142H118.319ZM118.319 15.8142V12.2554H128.995V15.8142H118.319ZM121.877 22.9316V15.8142H125.436V22.9316H121.877ZM125.436 15.8142V5.13797H128.995V15.8142H125.436ZM131.838 19.3729V8.6967H135.396V19.3729H131.838ZM135.396 8.6967V5.13797H138.955V8.6967H135.396ZM135.396 22.9316V19.3729H138.955V22.9316H135.396ZM138.955 19.3729V8.6967H142.514V19.3729H138.955ZM145.357 22.9316V5.13797H148.915V22.9316H145.357ZM145.357 22.9316V19.3729H156.033V22.9316H145.357ZM152.474 22.9316V5.13797H156.033V22.9316H152.474ZM158.876 22.9316V5.13797H162.434V22.9316H158.876ZM158.876 8.6967V5.13797H169.552V8.6967H158.876ZM158.876 15.8142V12.2554H165.993V15.8142H158.876ZM165.993 12.2554V5.13797H169.552V12.2554H165.993ZM165.993 22.9316V15.8142H169.552V22.9316H165.993ZM172.395 8.6967V5.13797H183.071V8.6967H172.395ZM172.395 15.8142V5.13797H175.954V15.8142H172.395ZM172.395 15.8142V12.2554H183.071V15.8142H172.395ZM172.395 22.9316V19.3729H183.071V22.9316H172.395ZM179.512 22.9316V12.2554H183.071V22.9316H179.512ZM185.914 22.9316V5.13797H189.473V22.9316H185.914ZM185.914 8.6967V5.13797H196.59V8.6967H185.914ZM185.914 15.8142V12.2554H196.59V15.8142H185.914ZM185.914 22.9316V19.3729H196.59V22.9316H185.914ZM199.433 22.9316V5.13797H202.992V22.9316H199.433ZM199.433 22.9316V19.3729H210.109V22.9316H199.433ZM212.952 22.9316V5.13797H216.511V22.9316H212.952ZM212.952 8.6967V5.13797H223.628V8.6967H212.952ZM212.952 15.8142V12.2554H223.628V15.8142H212.952ZM236.428 22.9316V5.13797H239.986V22.9316H236.428ZM242.84 22.9316V5.13797H246.398V22.9316H242.84ZM242.84 8.6967V5.13797H253.516V8.6967H242.84ZM249.957 22.9316V5.13797H253.516V22.9316H249.957ZM256.359 8.6967V5.13797H267.035V8.6967H256.359ZM259.917 22.9316V5.13797H263.476V22.9316H259.917ZM269.878 19.3729V8.6967H273.436V19.3729H269.878ZM273.436 8.6967V5.13797H276.995V8.6967H273.436ZM273.436 22.9316V19.3729H276.995V22.9316H273.436ZM276.995 19.3729V8.6967H280.554V19.3729H276.995ZM293.354 8.6967V5.13797H304.03V8.6967H293.354ZM296.912 22.9316V5.13797H300.471V22.9316H296.912ZM306.873 22.9316V5.13797H310.431V22.9316H306.873ZM306.873 15.8142V12.2554H317.549V15.8142H306.873ZM313.99 22.9316V5.13797H317.549V22.9316H313.99ZM320.392 22.9316V5.13797H323.95V22.9316H320.392ZM320.392 8.6967V5.13797H331.068V8.6967H320.392ZM320.392 15.8142V12.2554H331.068V15.8142H320.392ZM320.392 22.9316V19.3729H331.068V22.9316H320.392ZM343.867 19.3729V8.6967H347.426V19.3729H343.867ZM347.426 8.6967V5.13797H354.544V8.6967H347.426ZM347.426 22.9316V19.3729H354.544V22.9316H347.426ZM357.386 19.3729V8.6967H360.945V19.3729H357.386ZM360.945 8.6967V5.13797H364.504V8.6967H360.945ZM360.945 22.9316V19.3729H364.504V22.9316H360.945ZM364.504 19.3729V8.6967H368.063V19.3729H364.504ZM370.905 22.9316V5.13797H374.464V22.9316H370.905ZM370.905 8.6967V5.13797H381.582V8.6967H370.905ZM378.023 22.9316V5.13797H381.582V22.9316H378.023ZM384.425 8.6967V5.13797H395.101V8.6967H384.425ZM387.983 22.9316V5.13797H391.542V22.9316H387.983ZM397.944 22.9316V5.13797H401.502V22.9316H397.944ZM404.356 22.9316V5.13797H407.914V22.9316H404.356ZM404.356 8.6967V5.13797H415.032V8.6967H404.356ZM411.473 22.9316V5.13797H415.032V22.9316H411.473ZM417.875 22.9316V5.13797H421.433V22.9316H417.875ZM417.875 22.9316V19.3729H428.551V22.9316H417.875ZM424.992 22.9316V5.13797H428.551V22.9316H424.992ZM431.394 22.9316V5.13797H434.952V22.9316H431.394ZM431.394 22.9316V19.3729H442.07V22.9316H431.394ZM438.511 22.9316V5.13797H442.07V22.9316H438.511ZM444.913 22.9316V5.13797H448.471V22.9316H444.913ZM444.913 8.6967V5.13797H462.706V8.6967H444.913ZM452.03 22.9316V5.13797H455.589V22.9316H452.03ZM459.147 22.9316V5.13797H462.706V22.9316H459.147Z" fill="white"/>
        </g>
        <g filter="url(#filter2_d_144_20184)">
          <rect width="30.2" height="28.8968" transform="translate(487.525)" fill="#DA5F44"/>
          <path d="M497.048 8.6967V5.13797H500.607V8.6967H497.048ZM497.048 22.9316V19.3729H500.607V22.9316H497.048ZM500.607 12.2554V8.6967H504.166V12.2554H500.607ZM500.607 19.3729V15.8142H504.166V19.3729H500.607ZM504.166 15.8142V12.2554H507.725V15.8142H504.166Z" fill="white"/>
        </g>
        <defs>
          <filter id="filter0_d_144_20184" x="0" y="0" width="34.6486" height="33.3449" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dx="4.44842" dy="4.44842"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0.423529 0 0 0 0 0.145098 0 0 0 0 0.0666667 0 0 0 1 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_144_20184"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_144_20184" result="shape"/>
          </filter>
          <filter id="filter1_d_144_20184" x="41" y="0" width="440.173" height="33.3449" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dx="4.44842" dy="4.44842"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0.423529 0 0 0 0 0.145098 0 0 0 0 0.0666667 0 0 0 1 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_144_20184"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_144_20184" result="shape"/>
          </filter>
          <filter id="filter2_d_144_20184" x="487.525" y="0" width="34.6486" height="33.3449" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dx="4.44842" dy="4.44842"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0.423529 0 0 0 0 0.145098 0 0 0 0 0.0666667 0 0 0 1 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_144_20184"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_144_20184" result="shape"/>
          </filter>
        </defs>
      </svg>
    </div>
  );
}

// ─── comment bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
  name: string | null;
  comment: string | null;
  isSelf: boolean;
  positionFraction: number; // 0–1 position in the crowd for left/right placement
  onCommentSubmit?: (text: string) => void;
  onClose: () => void;
}

function CommentBubble({ name, comment, isSelf, positionFraction, onCommentSubmit, onClose }: BubbleProps) {
  const [draft, setDraft] = useState(comment ?? "");
  const [saving, setSaving] = useState(false);

  // Place bubble to the left if avatar is in right half, right if in left half
  const anchorRight = positionFraction > 0.5;

  const handleSave = useCallback(async () => {
    if (!onCommentSubmit || !draft.trim()) return;
    setSaving(true);
    await onCommentSubmit(draft.trim());
    setSaving(false);
  }, [draft, onCommentSubmit]);

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        ...(anchorRight ? { right: `${(1 - positionFraction) * 100 + 4}%` } : { left: `${positionFraction * 100 + 4}%` }),
        zIndex: 10,
        width: 240,
        background: "white",
        border: `2px solid ${BLUE}`,
        padding: "12px 14px",
        fontFamily: INTER,
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 16, lineHeight: 1 }}
      >
        ×
      </button>

      {!isSelf && name && (
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>
          {name}
        </div>
      )}

      {isSelf ? (
        <>
          <textarea
            rows={3}
            placeholder="Tell us why you placed yourself here"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              width: "100%", border: "none", outline: "none", resize: "none",
              fontFamily: INTER, fontSize: 13, color: "#1a1a1a",
              background: "transparent", lineHeight: 1.5,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <PillButton
              label="Save"
              fontSize="13px"
              loading={saving}
              onClick={handleSave}
              style={!draft.trim() ? { opacity: 0.4, cursor: "default" } : undefined}
            />
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: comment ? "#1a1a1a" : "#aaa", margin: 0, lineHeight: 1.5 }}>
          {comment ?? "No comment yet"}
        </p>
      )}
    </div>
  );
}

// ─── main view ────────────────────────────────────────────────────────────────

export function ContinuumView({ continuum, participants, messages, sessionToken, currentUserAvatarConfig }: Props) {
  const { data: session } = useSession();
  const {
    setParticipants, setConnected, updatePosition, updateComment,
    addParticipant, removeParticipant, setContinuumId, participants: storeParticipants,
  } = useContinuumStore();

  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserId = session?.user?.id ?? "";

  // Local position for real-time drag feedback
  const [localPosition, setLocalPosition] = useState(
    () => participants.find((p) => p.userId === currentUserId)?.position ?? 0.5
  );

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
        avatarConfig: p.user.avatarConfig,
        isSynthetic: p.user.isSynthetic,
        position: p.position,
        comment: p.comment,
      }))
    );

    const socket = getSocket(sessionToken);

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join:continuum", continuum.id);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("position:broadcast", ({ userId, position }: { userId: string; position: number }) => {
      updatePosition(userId, position);
    });
    socket.on("user:join", (data: { userId: string; userName: string; userImage: string }) => {
      addParticipant({
        userId: data.userId,
        name: data.userName,
        image: data.userImage,
        avatarConfig: {} as AvatarConfig,
        isSynthetic: false,
        position: 0.5,
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
    (position: number) => {
      setLocalPosition(position);
      updatePosition(currentUserId, position);
      const socket = getSocket(sessionToken);
      socket.emit("position:update", { continuumId: continuum.id, position });
    },
    [continuum.id, sessionToken, currentUserId]
  );

  const handlePositionCommit = useCallback(
    (position: number) => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(async () => {
        await fetch(`/api/continuums/${continuum.id}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position }),
        });
        // Add self to the store with full data so the crowd renders correctly this session
        if (currentUserId && !storeParticipants[currentUserId]) {
          addParticipant({
            userId: currentUserId,
            name: session?.user?.name ?? null,
            image: session?.user?.image ?? null,
            avatarConfig: currentUserAvatarConfig,
            isSynthetic: false,
            position,
            comment: null,
          });
        }
      }, 300);
    },
    [continuum.id, currentUserId, storeParticipants, addParticipant, session, currentUserAvatarConfig]
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
          margin: "0 0 clamp(24px, 4vh, 40px)",
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
            selectedUserId={selectedUserId}
            onSelectUser={handleSelectUser}
          />

          {selectedParticipant && (
            <CommentBubble
              name={selectedParticipant.isSynthetic ? null : selectedParticipant.name}
              comment={selectedParticipant.comment}
              isSelf={selectedUserId === currentUserId}
              positionFraction={selectedParticipant.position}
              onCommentSubmit={selectedUserId === currentUserId ? handleCommentSubmit : undefined}
              onClose={() => setSelectedUserId(null)}
            />
          )}
        </div>

        {/* Drag bar */}
        <div style={{ marginTop: 12 }}>
          <DragBar
            onPositionChange={handlePositionChange}
            onPositionCommit={handlePositionCommit}
          />
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
