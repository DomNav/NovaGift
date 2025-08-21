import { create } from "zustand";

type RewardsState = {
  sendCount: number;
  totalUsdCents: number;
  recordSend: (usdCents: number) => { isNewSend: boolean; newTotal: number };
  hydrate: () => void;
};

export const useRewards = create<RewardsState>((set, get) => ({
  sendCount: 0,
  totalUsdCents: 0,
  
  recordSend: (usdCents: number) => {
    const state = get();
    const newSendCount = state.sendCount + 1;
    const newTotalUsdCents = state.totalUsdCents + Math.round(usdCents || 0);
    
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
