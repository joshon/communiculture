// Must be the very first import: loads the root .env into process.env BEFORE
// any env-dependent module (@communiculture/db, next-auth) is evaluated.
import "./load-env";
import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { decode } from "next-auth/jwt";
import { prisma } from "@communiculture/db";
import { registerPositionHandlers } from "./handlers/position";
import { registerChatHandlers } from "./handlers/chat";
import { initModerationServer } from "./lib/moderation";

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
  const pubClient = new Redis(REDIS_URL);
  const subClient = new Redis(REDIS_URL);
  io.adapter(createAdapter(pubClient, subClient));
  console.log("[socket] Redis adapter connected");
}

// ─── Auth middleware ─────────────────────────────────────────────────────────
// The app uses JWT sessions (no DB Session rows), so we decode the NextAuth
// session-token cookie (a JWE) with NEXTAUTH_SECRET and look the user up by id.
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error("unauthorized"));

  try {
    const decoded = await decode({ token, secret: process.env.NEXTAUTH_SECRET! });
    const userId = ((decoded as { id?: string } | null)?.id ?? decoded?.sub) as string | undefined;
    if (!userId) return next(new Error("unauthorized"));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true, avatarConfig: true },
    });
    if (!user) return next(new Error("unauthorized"));

    socket.data.userId = user.id;
    socket.data.userName = user.name ?? "";
    socket.data.userImage = user.image ?? "";
    socket.data.avatarConfig = user.avatarConfig ?? {};
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

initModerationServer(io);

// ─── Connection ──────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id} (user: ${socket.data.userId})`);

  registerPositionHandlers(io, socket);
  registerChatHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id}`);
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
