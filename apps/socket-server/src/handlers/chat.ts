import type { Server, Socket } from "socket.io";
import { prisma } from "@communiculture/db";
import { enqueueMessage } from "../lib/moderation";

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on(
    "chat:send",
    async (payload: { continuumId: string; body: string }) => {
      const { continuumId, body } = payload;
      const trimmed = body.trim();
      if (!trimmed || trimmed.length > 1000) return;

      try {
        const message = await prisma.message.create({
          data: {
            continuumId,
            userId: socket.data.userId,
            body: trimmed,
          },
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        });

        // Broadcast immediately (optimistic — moderation will retract if rejected)
        io.to(continuumId).emit("chat:message", {
          id: message.id,
          continuumId,
          body: message.body,
          createdAt: message.createdAt,
          user: message.user,
        });

        enqueueMessage({
          id: `msg:${message.id}`,
          messageId: message.id,
          continuumId,
          content: trimmed,
        });
      } catch (err) {
        console.error("[chat] failed to save message:", err);
        socket.emit("chat:error", { message: "failed to send" });
      }
    }
  );
}
