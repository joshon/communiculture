import type { Server, Socket } from "socket.io";

export function registerPositionHandlers(io: Server, socket: Socket) {
  // Client joins a continuum room
  socket.on("join:continuum", (continuumId: string) => {
    socket.join(continuumId);
    // Announce presence to others in the room
    socket.to(continuumId).emit("user:join", {
      userId: socket.data.userId,
      userName: socket.data.userName,
      userImage: socket.data.userImage,
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

  // Live drag position update — broadcast only, DB write handled by Next.js API
  socket.on(
    "position:update",
    (payload: { continuumId: string; position: number }) => {
      const { continuumId, position } = payload;
      // Clamp to [0, 1]
      const clamped = Math.min(1, Math.max(0, position));
      socket.to(continuumId).emit("position:broadcast", {
        userId: socket.data.userId,
        continuumId,
        position: clamped,
      });
    }
  );
}
