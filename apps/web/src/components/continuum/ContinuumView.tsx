"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket-client";
import { useContinuumStore } from "@/store/continuumStore";
import { ContinuumScene } from "./ContinuumScene";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { AvatarConfig } from "@/store/avatarStore";

interface ContinuumData {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  ownerId: string;
  shareToken: string | null;
}

interface ParticipantData {
  userId: string;
  position: number;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    avatarConfig: AvatarConfig;
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
}

export function ContinuumView({ continuum, participants, messages, sessionToken }: Props) {
  const { data: session } = useSession();
  const { setParticipants, setConnected, updatePosition, addParticipant, removeParticipant, setContinuumId } =
    useContinuumStore();
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserAvatarConfig = (session?.user as any)?.avatarConfig ?? {};

  useEffect(() => {
    setContinuumId(continuum.id);

    // Hydrate store with initial participants
    setParticipants(
      participants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        image: p.user.image,
        avatarConfig: p.user.avatarConfig,
        position: p.position,
      }))
    );

    // Connect socket
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
        position: 0.5,
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

  const handlePositionChange = useCallback(
    (position: number) => {
      const socket = getSocket(sessionToken);
      socket.emit("position:update", { continuumId: continuum.id, position });
    },
    [continuum.id, sessionToken]
  );

  const handlePositionCommit = useCallback(
    (position: number) => {
      // Debounce DB writes: only persist after user stops dragging for 300ms
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(async () => {
        await fetch(`/api/continuums/${continuum.id}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position }),
        });
      }, 300);
    },
    [continuum.id]
  );

  if (!session) return null;

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-comm-blue lowercase font-bold text-xl">
            which is more {continuum.title}?
          </h2>
          <p className="text-gray-400 text-xs lowercase mt-0.5">
            drag yourself into the continuum
          </p>
        </div>
        {continuum.shareToken && (
          <ShareButton shareToken={continuum.shareToken} />
        )}
      </div>

      {/* 3D Scene */}
      <ContinuumScene
        continuumId={continuum.id}
        leftLabel={continuum.leftLabel}
        rightLabel={continuum.rightLabel}
        currentUserId={session.user.id}
        currentUserAvatarConfig={currentUserAvatarConfig}
        onPositionChange={handlePositionChange}
        onPositionCommit={handlePositionCommit}
      />

      {/* Bottom bar matching original nav arrows */}
      <div className="border-t border-gray-100 flex items-center justify-between px-6 py-3 bg-white">
        <span className="text-comm-blue lowercase font-bold text-lg">{continuum.leftLabel}</span>
        <div className="flex gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="text-comm-blue text-sm">&lt;</span>
          ))}
          <span className="mx-2 text-xs text-gray-500 lowercase uppercase">drag yourself into the continuum</span>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="text-comm-blue text-sm">&gt;</span>
          ))}
        </div>
        <span className="text-comm-blue lowercase font-bold text-lg">{continuum.rightLabel}</span>
      </div>

      {/* Chat */}
      <ChatPanel
        continuumId={continuum.id}
        sessionToken={sessionToken}
        initialMessages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: new Date(m.createdAt),
          user: m.user,
        }))}
      />
    </div>
  );
}

function ShareButton({ shareToken }: { shareToken: string }) {
  const url = `${window.location.origin}/continuum/${window.location.pathname.split("/")[2]}?token=${shareToken}`;
  const handleCopy = () => navigator.clipboard.writeText(url);
  return (
    <button
      onClick={handleCopy}
      className="text-xs text-gray-400 lowercase border border-gray-200 px-3 py-1 hover:border-comm-blue hover:text-comm-blue"
    >
      copy link
    </button>
  );
}
