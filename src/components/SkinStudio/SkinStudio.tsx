import { useCallback } from 'react';
import { SkinStudioProvider, useSkinStudio } from './SkinStudioContext';
import { SkinCatalog } from './SkinCatalog';
import { SkinPreviewPane } from './SkinPreviewPane';
import StudioInsightsCard from '@/components/studio/StudioInsightsCard';
import { PageHeader } from '@/components/PageHeader';
import { useSkins } from '@/store/skins';
import { useRewards } from '@/store/rewards';

function SkinStudioContent() {
  const { presets, unlocked, getById } = useSkins();
  const { sendCount, totalUsdCents } = useRewards();
  const { selectedSkin, setSelectedSkin } = useSkinStudio();

  const handleSelectSkin = useCallback((skinId: string) => {
    const skin = getById(skinId as any);
    if (skin) {
      setSelectedSkin(skin);
    }
  }, [getById, setSelectedSkin]);

  const handleGuide = () => {
    window.open('/guide', '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader 
        title="Skin Studio" 
        description="Browse and customize envelope skins and track your progress" 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="space-y-6">
            <SkinCatalog 
              onSelectSkin={handleSelectSkin} 
              selectedSkinId={selectedSkin?.id}
            />

            <StudioInsightsCard onGuide={handleGuide} />
          </div>
        </div>

        <div className="space-y-6">
          {selectedSkin ? (
            <SkinPreviewPane 
              skin={selectedSkin}
            />
          ) : (
            <div className="glass-card">
              <div className="p-8 text-center text-brand-text/60">
                <div className="w-12 h-12 mx-auto mb-4 opacity-50">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <p>Select a skin to view details</p>
              </div>
            </div>
          )}

          <div className="glass-card">
            <div className="p-6">
              <h3 className="text-lg font-semibold leading-none tracking-tight mb-6">Your Progress</h3>
            </div>
            <div className="px-6 pb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-brand-text/70">Total Sends:</span>
                <span className="font-mono">{sendCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-text/70">Total Sent:</span>
                <span className="font-mono">${(totalUsdCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-text/70">Unlocked Skins:</span>
                <span className="font-mono">
                  {unlocked.length}/{presets.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SkinStudio() {
  return (
    <SkinStudioProvider>
      <SkinStudioContent />
    </SkinStudioProvider>
  );
}