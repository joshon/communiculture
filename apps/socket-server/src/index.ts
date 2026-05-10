import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { registerPositionHandlers } from "./handlers/position";
import { registerChatHandlers } from "./handlers/chat";

const PORT = parseInt(process.env.SOCKET_PORT ?? "3001", 10);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: [NEXTAUTH_URL, "http://localhost:3000"],
    credentials: true,
  },
});

// Redis adapter for horizontal scaling (production)
if (process.env.NODE_ENV === "production" && REDIS_URL) {
  const pubClient = createClient({ host: REDIS_URL });
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  console.log("[socket] Redis adapter connected");
}

// ─── Auth middleware ─────────────────────────────────────────────────────────
// Validates the NextAuth session token passed in socket handshake auth
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error("unauthorized"));
  }
  // Token is the NextAuth session token (JWT or DB session token).
  // We attach userId to the socket for use in handlers.
  // Full JWT verification happens here in production using NEXTAUTH_SECRET.
  try {
    const { getToken } = await import("next-auth/jwt");
    const decoded = await getToken({
      req: { headers: { cookie: `next-auth.session-token=${token}` } } as any,
      secret: process.env.NEXTAUTH_SECRET!,
    });
    if (!decoded?.sub) return next(new Error("unauthorized"));
    socket.data.userId = decoded.sub;
    socket.data.userName = decoded.name as string;
    socket.data.userImage = decoded.picture as string;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

// ─── Connection ──────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id} (user: ${socket.data.userId})`);

  registerPositionHandlers(io, socket);
  registerChatHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id}`);
    // Notify rooms this user was in
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit("user:leave", {
          userId: socket.data.userId,
          continuumId: room,
        });
      }
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] server listening on port ${PORT}`);
});
