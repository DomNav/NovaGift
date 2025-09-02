import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { EnvelopePreview } from '@/components/Preview/EnvelopePreview';
import { toast } from 'sonner';
import { useSkins, type Skin } from '@/store/skins';
import { useRewards } from '@/store/rewards';
import { progressForRule, ruleLabel } from '@/utils/rewards';

interface SkinPreviewPaneProps {
  skin: Skin;
}

export const SkinPreviewPane = memo(({ skin }: SkinPreviewPaneProps) => {
  const { selectedId, unlocked, setSelected } = useSkins();
  const { sendCount, totalUsdCents } = useRewards();
  
  const isUnlocked = unlocked.includes(skin.id);
  const isCurrentlyApplied = selectedId === skin.id;
  const prog = progressForRule(skin.requires, { sendCount, totalUsdCents });

  const handleApplySkin = () => {
    if (!isUnlocked && !prog.eligible) {
      toast.error(prog.tooltip);
      return;
    }

    setSelected(skin.id);
    toast.success(`Applied ${skin.name} to all new envelopes!`, {
      duration: 3000,
    });
  };

  const handleGoToFund = () => {
    window.location.href = '/fund';
  };

  return (
    <div className="glass-card">
      <div className="p-6">
        <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">{skin.name}</h3>
      </div>
      <div className="px-6 pb-6 space-y-6">
        <div className="space-y-4">
          <div className="text-sm text-brand-text/70 mb-2">Sealed State</div>
          <div className="flex justify-center">
            <div className="max-w-full overflow-hidden">
              <EnvelopePreview
                skinId={skin.id}
                settings={skin.settings}
                animation="none"
                opened={false}
                locked={!isUnlocked}
                amount="100"
                from="GDEMO...SENDER"
                to="GDEMO...RECIPIENT"
              />
            </div>
          </div>
          
          <div className="text-sm text-brand-text/70 mb-2 mt-6">Opened State</div>
          <div className="flex justify-center">
            <div className="max-w-full overflow-hidden">
              <EnvelopePreview
                skinId={skin.id}
                settings={skin.settings}
                animation="none"
                opened={true}
                locked={!isUnlocked}
                amount="100"
                from="GDEMO...SENDER"
                to="GDEMO...RECIPIENT"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-text/70">Status:</span>
            <span>
              {isUnlocked ? (
                <Badge variant="default" className="text-xs">
                  Unlocked
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Locked
                </Badge>
              )}
            </span>
          </div>

          {skin.requires && (
            <div className="space-y-2">
              <div className="text-brand-text/70">Requirements:</div>
              <div className="text-xs bg-brand-surface/50 p-2 rounded border border-surface-border">
                {ruleLabel(skin.requires)}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-4">
          {isUnlocked ? (
            <button
              onClick={handleApplySkin}
              className={`w-full rounded-full px-6 py-3 font-medium transition-colors duration-200 ${
                isCurrentlyApplied
                  ? 'btn-secondary'
                  : 'btn-granite-primary'
              }`}
            >
              {isCurrentlyApplied
                ? 'Currently Applied'
                : 'Apply to My Envelopes'}
            </button>
          ) : (
            <>
              <button
                disabled
                className="w-full rounded-full px-6 py-3 font-medium opacity-60 cursor-not-allowed bg-brand-surface/50 text-brand-text/50 border border-surface-border"
                title={prog.tooltip}
              >
                <svg className="w-4 h-4 mr-2 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                {prog.tooltip}
              </button>

              {prog.usdReq && prog.usdReq.remainingCents > 0 && (
                <button 
                  onClick={handleGoToFund} 
                  className="w-full btn-secondary rounded-full"
                >
                  <svg className="w-4 h-4 mr-2 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                  Unlock ${(prog.usdReq.remainingCents / 100).toFixed(0)}
                </button>
              )}
            </>
          )}
        </div>

        {!isUnlocked && skin.requires && (
          <div className="pt-4 border-t">
            <div className="text-sm text-brand-text/70 mb-2">Progress:</div>
            <div className="space-y-2">
              {prog.sendReq && (
                <div className="flex justify-between text-xs">
                  <span>Sends:</span>
                  <span>
                    {prog.sendReq.current}/{prog.sendReq.required}
                  </span>
                </div>
              )}
              {prog.usdReq && (
                <div className="flex justify-between text-xs">
                  <span>Total Sent:</span>
                  <span>
                    ${(prog.usdReq.current / 100).toFixed(0)}/$
                    {(prog.usdReq.required / 100).toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SkinPreviewPane.displayName = 'SkinPreviewPane';