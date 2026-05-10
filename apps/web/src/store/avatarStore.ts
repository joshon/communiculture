import { create } from "zustand";

export type AvatarPart = "hair" | "head" | "face" | "neck" | "arms" | "body" | "pants" | "legs" | "shoes";

export interface AvatarConfig {
  hair: string;
  head: string;
  face: string;
  neck: string;
  arms: string;
  body: string;
  pants: string;
  legs: string;
  shoes: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  hair: "#3d2b1f",
  head: "#f5c5a3",
  face: "#1a1a1a",
  neck: "#f5c5a3",
  arms: "#4a9e6b",
  body: "#4a9e6b",
  pants: "#3b6bcc",
  legs: "#3b6bcc",
  shoes: "#555555",
};

// Color palette matching original site's asterisk grid
export const COLOR_PALETTE = [
  "#cc3300", "#cc6600", "#ccaa00", "#aacc00", "#66cc00", "#00cc33",
  "#00ccaa", "#0066cc", "#3300cc", "#aa00cc", "#cc0066", "#cc0000",
  "#3d2b1f", "#6b4c3b", "#9e7a5f", "#c9a882", "#f5c5a3", "#ffffff",
  "#cccccc", "#999999", "#666666", "#333333", "#000000", "#4a9e6b",
  "#3b6bcc", "#cc3b6b", "#cc9b3b", "#6bcc3b", "#3bcccc", "#9b3bcc",
];

interface AvatarStore {
  config: AvatarConfig;
  selectedPart: AvatarPart | null;
  setColor: (part: AvatarPart, color: string) => void;
  setSelectedPart: (part: AvatarPart | null) => void;
  setConfig: (config: AvatarConfig) => void;
  randomize: () => void;
}

export const useAvatarStore = create<AvatarStore>((set) => ({
  config: DEFAULT_AVATAR,
  selectedPart: null,

  setColor: (part, color) =>
    set((state) => ({ config: { ...state.config, [part]: color } })),

  setSelectedPart: (part) => set({ selectedPart: part }),

  setConfig: (config) => set({ config }),

  randomize: () =>
    set({
      config: {
        hair: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        head: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        face: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        neck: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        arms: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        body: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        pants: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        legs: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        shoes: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
      },
    }),
}));
