"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket-client";
import { useChatStore, type ChatMessage } from "@/store/chatStore";
import Image from "next/image";

interface Props {
  continuumId: string;
  sessionToken: string;
  initialMessages: ChatMessage[];
  /** Share token for link/password continuums, so the server can authorize sends. */
  token?: string | null;
}

export function ChatPanel({ continuumId, sessionToken, initialMessages, token }: Props) {
  const { data: session } = useSession();
  const { messages, unread, panelOpen, setMessages, addMessage, openPanel, closePanel } = useChatStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, []);

  useEffect(() => {
    const socket = getSocket(sessionToken);

    socket.on("chat:message", (msg: ChatMessage & { createdAt: string }) => {
      addMessage({ ...msg, createdAt: new Date(msg.createdAt) });
    });

    return () => {
      socket.off("chat:message");
    };
  }, [sessionToken]);

  useEffect(() => {
    if (panelOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, panelOpen]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const socket = getSocket(sessionToken);
    socket.emit("chat:send", { continuumId, body: trimmed, token: token ?? undefined });
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="border-t border-gray-100">
      {/* Toggle */}
      <button
        onClick={panelOpen ? closePanel : openPanel}
        className="w-full px-6 py-3 text-xs text-gray-400 lowercase hover:text-comm-blue flex items-center gap-2"
      >
        <span>{panelOpen ? "▼" : "▶"}</span>
        chat
        {unread > 0 && !panelOpen && (
          <span className="bg-comm-red text-white rounded-full px-1.5 py-0.5 text-[10px]">
            {unread}
          </span>
        )}
      </button>

      {panelOpen && (
        <div className="border-t border-gray-100">
          {/* Message list */}
          <div className="h-48 overflow-y-auto px-6 py-3 space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-2 text-sm">
                {msg.user.image && (
                  <Image
                    src={msg.user.image}
                    alt={msg.user.name ?? ""}
                    width={20}
                    height={20}
                    className="rounded-none mt-0.5 flex-shrink-0"
                  />
                )}
                <div>
                  <span className="text-xs text-gray-400 lowercase mr-1">
                    {msg.user.name ?? "anon"}
                  </span>
                  <span className="text-gray-700">{msg.body}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 flex items-center px-6 py-2 gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="say something..."
              className="flex-1 text-sm outline-none py-1 lowercase placeholder:text-gray-300"
              maxLength={1000}
            />
            <button
              onClick={sendMessage}
              className="text-xs text-comm-blue lowercase hover:underline"
            >
              send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
