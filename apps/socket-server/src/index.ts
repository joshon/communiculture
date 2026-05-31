import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { prisma } from "@communiculture/db";
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
  const pubClient = new Redis(REDIS_URL);
  const subClient = new Redis(REDIS_URL);
  io.adapter(createAdapter(pubClient, subClient));
  console.log("[socket] Redis adapter connected");
}

// ─── Auth middleware ─────────────────────────────────────────────────────────
// Validates the NextAuth session token by looking it up in the database.
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error("unauthorized"));

  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    if (!session || session.expires < new Date()) return next(new Error("unauthorized"));
    socket.data.userId = session.user.id;
    socket.data.userName = session.user.name ?? "";
    socket.data.userImage = session.user.image ?? "";
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
