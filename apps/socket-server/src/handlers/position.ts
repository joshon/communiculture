import type { Server, Socket } from "socket.io";

export function registerPositionHandlers(io: Server, socket: Socket) {
  socket.on("join:continuum", (continuumId: string) => {
    socket.join(continuumId);
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
