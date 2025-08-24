import { create } from "zustand";
import { PRESET_SKINS, type SkinId } from "./skins";
import { progressForRule } from "@/utils/rewards";

type RewardsState = {
  sendCount: number;
  totalUsdCents: number;
  recordSend: (usdCents: number) => { 
    isNewSend: boolean; 
    newTotal: number;
    newlyUnlocked: SkinId[];
    kmGained: number;
    totalKM: number;
  };
  hydrate: () => void;
};

export const useRewards = create<RewardsState>((set, get) => ({
  sendCount: 0,
  totalUsdCents: 0,
  
  recordSend: (usdCents: number) => {
    const state = get();
    const oldSendCount = state.sendCount;
    const oldTotalUsdCents = state.totalUsdCents;
    const newSendCount = state.sendCount + 1;
    const newTotalUsdCents = state.totalUsdCents + Math.round(usdCents || 0);
    
    // Check which skins become newly unlocked
    const oldRewards = { sendCount: oldSendCount, totalUsdCents: oldTotalUsdCents };
    const newRewards = { sendCount: newSendCount, totalUsdCents: newTotalUsdCents };
    
    const newlyUnlocked: SkinId[] = [];
    PRESET_SKINS.forEach(skin => {
      const wasEligible = progressForRule(skin.requires, oldRewards).eligible;
      const nowEligible = progressForRule(skin.requires, newRewards).eligible;
      if (!wasEligible && nowEligible) {
        newlyUnlocked.push(skin.id);
      }
    });
    
    set({
      sendCount: newSendCount,
      totalUsdCents: newTotalUsdCents,
    });
    
    // Persist to localStorage
    localStorage.setItem("soro.sendCount", newSendCount.toString());
    localStorage.setItem("soro.totalUsdCents", newTotalUsdCents.toString());
    
    return {
      isNewSend: true,
      newTotal: newTotalUsdCents,
      newlyUnlocked,
      kmGained: 1, // Each send gives 1 KM point
      totalKM: newSendCount,
    };
  },
  
  hydrate: () => {
    const sendCount = parseInt(localStorage.getItem("soro.sendCount") || "0");
    const totalUsdCents = parseInt(localStorage.getItem("soro.totalUsdCents") || "0");
    
    set({
      sendCount: Math.max(0, sendCount),
      totalUsdCents: Math.max(0, totalUsdCents),
    });
  },
}));

// Selector helpers
export const getProgress = () => {
  const { sendCount, totalUsdCents } = useRewards.getState();
  return { sendCount, totalUsdCents };
};

// Alias for backward compatibility and user preference
export const useKaleometers = useRewards;
