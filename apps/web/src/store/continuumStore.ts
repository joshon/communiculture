import { create } from "zustand";
import type { AvatarConfig } from "./avatarStore";

export interface Participant {
  userId: string;
  name: string | null;
  image: string | null;
  avatarConfig: AvatarConfig;
  position: number; // 0.0 to 1.0
}

interface ContinuumStore {
  continuumId: string | null;
  participants: Record<string, Participant>;
  connected: boolean;

  setContinuumId: (id: string) => void;
  setParticipants: (participants: Participant[]) => void;
  updatePosition: (userId: string, position: number) => void;
  addParticipant: (p: Participant) => void;
  removeParticipant: (userId: string) => void;
  setConnected: (v: boolean) => void;
}

export const useContinuumStore = create<ContinuumStore>((set) => ({
  continuumId: null,
  participants: {},
  connected: false,

  setContinuumId: (id) => set({ continuumId: id }),

  setParticipants: (participants) =>
    set({
      participants: Object.fromEntries(participants.map((p) => [p.userId, p])),
    }),

  updatePosition: (userId, position) =>
    set((state) => ({
      participants: {
        ...state.participants,
        [userId]: { ...state.participants[userId], position },
      },
    })),

  addParticipant: (p) =>
    set((state) => ({
      participants: { ...state.participants, [p.userId]: p },
    })),

  removeParticipant: (userId) =>
    set((state) => {
      const next = { ...state.participants };
      delete next[userId];
      return { participants: next };
    }),

  setConnected: (connected) => set({ connected }),
}));
