import { memo } from 'react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import GradientShader from '@/components/skins/GradientShader';
import ProgressPills from '@/components/ui/ProgressPills';
import { useSkins, type Skin } from '@/store/skins';
import { useRewards } from '@/store/rewards';
import { progressForRule } from '@/utils/rewards';

interface SkinCatalogProps {
  onSelectSkin: (skinId: string) => void;
  selectedSkinId?: string | null;
}

function SkinThumbnail({
  skin,
  isUnlocked,
  isSelected,
  onClick,
}: {
  skin: Skin;
  isUnlocked: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { sendCount, totalUsdCents } = useRewards();
  const prog = progressForRule(skin.requires, { sendCount, totalUsdCents });

  return (
    <motion.div
      className={`relative rounded-xl cursor-pointer border-2 transition-all ${
        isSelected ? 'border-surface-border' : 'border-transparent hover:border-surface-border/50'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div className="p-3">
        <div className="relative h-24 w-32 rounded-xl overflow-hidden shadow-lg border border-surface-border">
          <GradientShader
            settings={skin.settings}
            animation={!isUnlocked ? 'none' : skin.animation}
            rounded="rounded-xl"
          />

          <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
            <div className="flex justify-between items-start">
              <span className="text-xs opacity-80">✉</span>
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-[8px]">🎁</span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm font-mono">$100</div>
              <div className="text-xs opacity-80">USDC</div>
            </div>
          </div>

          {!isUnlocked && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-white text-xs">
        {skin.name}
      </div>

      <div className="absolute top-2 right-2">
        {skin.requires ? (
          <Badge
            variant={isUnlocked ? 'default' : 'secondary'}
            className="text-[10px] px-1.5 py-0.5"
          >
            {isUnlocked ? 'Unlocked' : 'Locked'}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-800 border-green-200"
          >
            Free
          </Badge>
        )}
      </div>

      {!isUnlocked && skin.requires && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/70 backdrop-blur">
          <ProgressPills
            send={
              prog.sendReq
                ? {
                    current: prog.sendReq.current,
                    required: prog.sendReq.required,
                    ratio: prog.sendReq.ratio,
                  }
                : undefined
            }
            usdReq={
              prog.usdReq
                ? {
                    current: prog.usdReq.current,
                    required: prog.usdReq.required,
                    ratio: prog.usdReq.ratio,
                  }
                : undefined
            }
            className="justify-center"
          />
        </div>
      )}


    </motion.div>
  );
}

export const SkinCatalog = memo(({ onSelectSkin, selectedSkinId }: SkinCatalogProps) => {
  const { presets, unlocked } = useSkins();

  return (
    <div className="glass-card">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <span className="text-2xl font-semibold leading-none tracking-tight">
            All Skins ({presets.length})
          </span>
          <Badge variant="secondary" className="text-xs">
            {unlocked.length} Unlocked
          </Badge>
        </div>
      </div>
      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {presets.map((skin) => (
            <SkinThumbnail
              key={skin.id}
              skin={skin}
              isUnlocked={unlocked.includes(skin.id)}
              isSelected={selectedSkinId === skin.id}
              onClick={() => onSelectSkin(skin.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

SkinCatalog.displayName = 'SkinCatalog';