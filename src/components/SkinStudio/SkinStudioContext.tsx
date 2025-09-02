import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Skin } from '@/store/skins';

interface SkinStudioContextValue {
  selectedSkin: Skin | null;
  setSelectedSkin: (skin: Skin | null) => void;
}

const SkinStudioContext = createContext<SkinStudioContextValue | null>(null);

export function SkinStudioProvider({ children }: { children: ReactNode }) {
  const [selectedSkin, setSelectedSkinState] = useState<Skin | null>(null);

  const setSelectedSkin = useCallback((skin: Skin | null) => {
    setSelectedSkinState(skin);
  }, []);

  return (
    <SkinStudioContext.Provider
      value={{
        selectedSkin,
        setSelectedSkin,
      }}
    >
      {children}
    </SkinStudioContext.Provider>
  );
}

export function useSkinStudio() {
  const context = useContext(SkinStudioContext);
  if (!context) {
    throw new Error('useSkinStudio must be used within SkinStudioProvider');
  }
  return context;
}