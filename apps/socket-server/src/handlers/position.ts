import type { Server, Socket } from "socket.io";

export function registerPositionHandlers(io: Server, socket: Socket) {
  socket.on("join:continuum", async (continuumId: string) => {
    socket.join(continuumId);

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
    if (!continuumId) return;
    socket.to(continuumId).emit("participant:removed", {
      userId: socket.data.userId,
      continuumId,
    });
  });

  // Live comment — broadcast only (DB write handled by the Next.js API). Uses
  // the authenticated socket's userId so a client can only update its own.
  socket.on("comment:update", (payload: { continuumId: string; comment: string }) => {
    const continuumId = payload?.continuumId;
    if (!continuumId) return;
    socket.to(continuumId).emit("comment:broadcast", {
      userId: socket.data.userId,
      continuumId,
      comment: typeof payload?.comment === "string" ? payload.comment.slice(0, 2000) : "",
    });
  });
}
