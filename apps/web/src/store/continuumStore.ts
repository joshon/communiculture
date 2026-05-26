import { create } from "zustand";
import type { AvatarConfig } from "./avatarStore";

export interface Participant {
  userId: string;
  name: string | null;
  image: string | null;
  avatarConfig: AvatarConfig;
  isSynthetic: boolean;
  position: number;  // X, 0–100
  positionZ: number; // Z/depth, 0–100
  comment: string | null;
}

interface ContinuumStore {
  continuumId: string | null;
  participants: Record<string, Participant>;
  connected: boolean;

  setContinuumId: (id: string) => void;
  setParticipants: (participants: Participant[]) => void;
  updatePositionXZ: (userId: string, position: number, positionZ: number) => void;
  updateComment: (userId: string, comment: string | null) => void;
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

  updatePositionXZ: (userId, position, positionZ) =>
    set((state) => {
      if (!state.participants[userId]) return state;
      return {
        participants: {
          ...state.participants,
          [userId]: { ...state.participants[userId], position, positionZ },
        },
      };
    }),

  updateComment: (userId, comment) =>
    set((state) => {
      if (!state.participants[userId]) return state;
      return {
        participants: {
          ...state.participants,
          [userId]: { ...state.participants[userId], comment },
        },
      };
    }),

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
