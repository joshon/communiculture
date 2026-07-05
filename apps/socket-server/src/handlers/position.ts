import type { Server, Socket } from "socket.io";
import { canAccessContinuum } from "../lib/access";

export function registerPositionHandlers(io: Server, socket: Socket) {
  // Rooms this socket has legitimately joined (passed the access check). The
  // broadcast-only events below are gated on membership so a client can't inject
  // fake presence/positions into a room it was never allowed into.
  const joined: Set<string> = (socket.data.joinedRooms ??= new Set<string>());

  // Accept either a bare id (legacy) or { continuumId, token }.
  socket.on("join:continuum", async (arg: string | { continuumId: string; token?: string }) => {
    const continuumId = typeof arg === "string" ? arg : arg?.continuumId;
    const token = typeof arg === "string" ? undefined : arg?.token;
    if (!continuumId) return;
    if (!(await canAccessContinuum(socket.data.userId, continuumId, token))) return;

    socket.join(continuumId);
    joined.add(continuumId);

    // Sync the joiner with everyone already connected here so the crowd matches
    // regardless of who opened first (deduped by user — multiple tabs collapse).
    try {
      const sockets = await io.in(continuumId).fetchSockets();
      const seen = new Set<string>();
      const users = sockets
        .filter((s) => s.id !== socket.id && s.data.userId && !seen.has(s.data.userId) && seen.add(s.data.userId))
        .map((s) => ({
          userId: s.data.userId,
          userName: s.data.userName,
          userImage: s.data.userImage,
          avatarConfig: s.data.avatarConfig ?? {},
        }));
      socket.emit("presence:sync", { continuumId, users });
    } catch {
      /* non-fatal */
    }

    socket.to(continuumId).emit("user:join", {
      userId: socket.data.userId,
      userName: socket.data.userName,
      userImage: socket.data.userImage,
      avatarConfig: socket.data.avatarConfig ?? {},
      continuumId,
    });
    console.log(`[position] ${socket.data.userId} joined room ${continuumId}`);
  });

  socket.on("leave:continuum", (continuumId: string) => {
    joined.delete(continuumId);
    socket.leave(continuumId);
    socket.to(continuumId).emit("user:leave", {
      userId: socket.data.userId,
      continuumId,
    });
  });

  // Live drag — broadcast only, DB write handled by Next.js API
  socket.on(
    "position:update",
    (payload: { continuumId: string; position: number; positionZ?: number }) => {
      const { continuumId, position, positionZ } = payload;
      if (!joined.has(continuumId)) return; // must have joined this room first
      socket.to(continuumId).emit("position:broadcast", {
        userId: socket.data.userId,
        continuumId,
        position: Math.min(100, Math.max(0, position)),
        positionZ: Math.min(100, Math.max(0, positionZ ?? 50)),
      });
    }
  );

  // User removed themselves from the continuum — relay so other viewers drop
  // their avatar live. Uses the authenticated socket's userId (own removal only).
  socket.on("participant:remove", (continuumId: string) => {
    if (!continuumId || !joined.has(continuumId)) return;
    socket.to(continuumId).emit("participant:removed", {
      userId: socket.data.userId,
      continuumId,
    });
  });

  // Live comment — broadcast only (DB write handled by the Next.js API). Uses
  // the authenticated socket's userId so a client can only update its own.
  socket.on("comment:update", (payload: { continuumId: string; comment: string }) => {
    const continuumId = payload?.continuumId;
    if (!continuumId || !joined.has(continuumId)) return;
    socket.to(continuumId).emit("comment:broadcast", {
      userId: socket.data.userId,
      continuumId,
      comment: typeof payload?.comment === "string" ? payload.comment.slice(0, 2000) : "",
    });
  });
}
