import { create } from "zustand";
import type { ShaderSettings } from "../components/skins/GradientShader";

export type SkinId =
  | "silver"
  | "holoBlue"
  | "emerald"
  | "sunset"
  | "amethyst"
  | "obsidian"
  | "auroraUnique"
  | "cameo"
  | "starlight"
  | "lumenBeam"
  | "vaporwave"
  | "coral"
  | "iceglass"
  | "solarFlare"
  | "pixelMint";

export type UnlockRule = { minSends?: number; minUsdCents?: number };
export type AnimationKind = "none" | "shimmer" | "stars" | "pulse" | "camo";

export type Skin = {
  id: SkinId;
  name: string;
  settings: ShaderSettings;
  animation?: AnimationKind;
  requires?: UnlockRule;
};

// --- presets (15 skins with exact settings) ---
export const PRESET_SKINS: Skin[] = [
  // Free starters
  {
    id: "silver",
    name: "Silver",
    settings: { angle: 35, noise: 0.10, stops: ["#EEEFF3", "#D5D8E0", "#B8BEC9", "#F7F9FF"] },
    animation: "none",
  },
  {
    id: "amethyst",
    name: "Amethyst",
    settings: { angle: 24, noise: 0.10, stops: ["#B980FF", "#8733FF", "#6C28CC", "#E0C2FF"] },
    animation: "none",
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    settings: { angle: 18, noise: 0.12, stops: ["#00E5E5", "#8A2BE2", "#FF66CC", "#00BBF9"] },
    animation: "none",
  },
  {
    id: "coral",
    name: "Coral",
    settings: { angle: 22, noise: 0.08, stops: ["#FF7A59", "#FF9E80", "#FF6F91", "#FFC3A0"] },
    animation: "none",
  },
  {
    id: "iceglass",
    name: "Iceglass",
    settings: { angle: 16, noise: 0.06, stops: ["#E6F2FF", "#CFE8FF", "#B3DAFF", "#EAF3FF"] },
    animation: "none",
  },
  {
    id: "pixelMint",
    name: "Pixel Mint",
    settings: { angle: 12, noise: 0.14, stops: ["#D1FFF3", "#A1FFE0", "#6FFFD9", "#E1FFF8"] },
    animation: "none",
  },

  // Usage unlocks
  {
    id: "holoBlue",
    name: "Holo Blue",
    settings: { angle: 28, noise: 0.08, stops: ["#1E2FFF", "#4E6BFF", "#7AA2FF", "#C1D3FF"] },
    animation: "shimmer",
    requires: { minSends: 1 },
  },
  {
    id: "cameo",
    name: "Cameo",
    settings: { angle: 20, noise: 0.12, stops: ["#606C38", "#283618", "#B7B78A", "#3A5A40"] },
    animation: "camo",
    requires: { minSends: 3 },
  },
  {
    id: "emerald",
    name: "Emerald",
    settings: { angle: 20, noise: 0.10, stops: ["#00D49A", "#00B37E", "#089E78", "#34F2B3"] },
    animation: "none",
    requires: { minSends: 5 },
  },
  {
    id: "sunset",
    name: "Sunset",
    settings: { angle: 15, noise: 0.12, stops: ["#FF9A1A", "#FF6A00", "#FF3D6E", "#8A64FF"] },
    animation: "pulse",
    requires: { minSends: 5 },
  },
  {
    id: "starlight",
    name: "Starlight",
    settings: { angle: 14, noise: 0.06, stops: ["#0A1433", "#162447", "#1F4068", "#1B1B2F"] },
    animation: "stars",
    requires: { minSends: 7 },
  },
  {
    id: "auroraUnique",
    name: "Aurora (Unique)",
    settings: { angle: 18, noise: 0.08, stops: ["#7F5BFF", "#FF6EC7", "#FFD166", "#4BC0C8"] },
    animation: "pulse",
    requires: { minSends: 10 },
  },

  // Spend unlocks
  {
    id: "lumenBeam",
    name: "Lumen Beam",
    settings: { angle: 30, noise: 0.08, stops: ["#1D2BFF", "#3F5CFF", "#7AA2FF", "#E6EEFF"] },
    animation: "shimmer",
    requires: { minUsdCents: 5000 }, // $50 total
  },
  {
    id: "solarFlare",
    name: "Solar Flare",
    settings: { angle: 26, noise: 0.10, stops: ["#FFB703", "#FD632F", "#FF3D00", "#FFE5A5"] },
    animation: "pulse",
    requires: { minUsdCents: 2500 }, // $25 total
  },
  {
    id: "obsidian",
    name: "Obsidian",
    settings: { angle: 12, noise: 0.06, stops: ["#151923", "#2B3142", "#111722", "#2E3445"] },
    animation: "none",
    requires: { minUsdCents: 10000 }, // $100 total
  },
];

export const DEFAULT_SKIN: SkinId = "holoBlue";

type SkinState = {
  presets: Skin[];
  selectedId: SkinId;
  unlocked: SkinId[];
  setSelected: (id: SkinId) => void;
  unlock: (id: SkinId) => void;
  unlockMany: (ids: SkinId[]) => void;
  hydrate: () => void;
};

export const useSkins = create<SkinState>((set) => ({
  presets: PRESET_SKINS,
  selectedId: "holoBlue",
  unlocked: ["silver", "amethyst", "vaporwave", "coral", "iceglass", "pixelMint"],
  setSelected: (id) => {
    set({ selectedId: id });
    localStorage.setItem("soro.selectedSkin", id);
  },
  unlock: (id) => {
    set((state) => {
      if (!state.unlocked.includes(id)) {
        const newUnlocked = [...state.unlocked, id];
        localStorage.setItem("soro.unlockedSkins", JSON.stringify(newUnlocked));
        return { unlocked: newUnlocked };
      }
      return state;
    });
  },
  unlockMany: (ids) => {
    set((state) => {
      const newIds = ids.filter(id => !state.unlocked.includes(id));
      if (newIds.length > 0) {
        const newUnlocked = [...state.unlocked, ...newIds];
        localStorage.setItem("soro.unlockedSkins", JSON.stringify(newUnlocked));
        return { unlocked: newUnlocked };
      }
      return state;
    });
  },
  hydrate: () => {
    const sel = localStorage.getItem("soro.selectedSkin") as SkinId | null;
    const unlocked = JSON.parse(localStorage.getItem("soro.unlockedSkins") || '[]') as SkinId[];
    // Ensure free skins are always unlocked
    const freeSkinsAlwaysUnlocked = ["silver", "amethyst", "vaporwave", "coral", "iceglass", "pixelMint"];
    const mergedUnlocked = [...new Set([...freeSkinsAlwaysUnlocked, ...unlocked])];
    set({ 
      selectedId: sel ?? "holoBlue",
      unlocked: mergedUnlocked as SkinId[]
    });
  }
}));