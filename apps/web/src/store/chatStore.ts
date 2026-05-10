import { create } from "zustand";

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface ChatStore {
  messages: ChatMessage[];
  unread: number;
  panelOpen: boolean;

  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  openPanel: () => void;
  closePanel: () => void;
  clearUnread: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  unread: 0,
  panelOpen: false,

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      unread: state.panelOpen ? 0 : state.unread + 1,
    })),

  openPanel: () => set({ panelOpen: true, unread: 0 }),
  closePanel: () => set({ panelOpen: false }),
  clearUnread: () => set({ unread: 0 }),
}));
