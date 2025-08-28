import { useState } from 'react';
import { motion } from 'motion/react';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useSkins, type Skin } from '../store/skins';
import { useRewards } from '../store/rewards';
import { progressForRule, ruleLabel } from '../utils/rewards';
import ProgressPills from '../components/ui/ProgressPills';
import GradientShader from '../components/skins/GradientShader';
import { Store, Unlock, Lock, ArrowRight } from 'lucide-react';

// Mock envelope card component using GradientShader
function SkinEnvelopeCard({
  skin,
  locked = false,
  size = 'md',
}: {
  skin: Skin;
  locked?: boolean;
  size?: 'sm' | 'md';
}) {
  const cardClass = size === 'sm' ? 'h-24 w-32' : 'h-32 w-48';

  return (
    <div
      className={`relative ${cardClass} rounded-xl overflow-hidden shadow-lg border-2 border-white/20`}
    >
      <GradientShader
        settings={skin.settings}
        animation={locked ? 'none' : skin.animation}
        rounded="rounded-xl"
      />

      {/* Mock envelope content */}
      <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
        <div className="flex justify-between items-start">
          <Unlock className="w-4 h-4 opacity-80" />
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-xs">🎁</span>
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-mono">$100</div>
          <div className="text-xs opacity-80">USDC</div>
        </div>
      </div>

      {locked && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <Lock className="w-6 h-6 text-white/70" />
        </div>
      )}
    </div>
  );
}

export default function SkinStore() {
  const { presets, selectedId, unlocked, setSelected } = useSkins();
  const { sendCount, totalUsdCents } = useRewards();
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);

  const handleApplySkin = (skin: Skin) => {
    const prog = progressForRule(skin.requires, { sendCount, totalUsdCents });

    if (!prog.eligible) {
      toast.error(prog.tooltip);
      return;
    }

    setSelected(skin.id);
    toast.success(`Applied ${skin.name} to all new envelopes!`, {
      duration: 3000,
    });
  };

  const handleGoToFund = () => {
    // This would navigate to the fund page
    toast.info('Redirecting to Fund page...');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader title="Skin Store" description="Unlock new envelope skins by sending gifts" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left and Center - Skin Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Skins ({presets.length})</span>
                <Badge variant="secondary" className="text-xs">
                  {unlocked.length} Unlocked
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {presets.map((skin) => {
                  const isUnlocked = unlocked.includes(skin.id);
                  const prog = progressForRule(skin.requires, { sendCount, totalUsdCents });
                  const isSelected = selectedSkin?.id === skin.id;

                  return (
                    <motion.div
                      key={skin.id}
                      className={`relative rounded-xl cursor-pointer border-2 transition-all ${
                        isSelected ? 'border-white/20' : 'border-transparent hover:border-white/10'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedSkin(skin)}
                    >
                      {/* Skin preview */}
                      <div className="p-3">
                        <SkinEnvelopeCard skin={skin} locked={!isUnlocked} size="sm" />
                      </div>

                      {/* Name chip */}
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-white text-xs">
                        {skin.name}
                      </div>

                      {/* Status badge */}
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

                      {/* Progress pills for locked skins */}
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
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right - Selection Panel */}
        <div className="space-y-6">
          {selectedSkin ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedSkin.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Large preview */}
                <div className="flex justify-center">
                  <SkinEnvelopeCard skin={selectedSkin} size="md" />
                </div>

                {/* Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Animation:</span>
                    <span className="capitalize">{selectedSkin.animation || 'None'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span>
                      {unlocked.includes(selectedSkin.id) ? (
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

                  {selectedSkin.requires && (
                    <div className="space-y-2">
                      <div className="text-muted-foreground">Requirements:</div>
                      <div className="text-xs bg-muted p-2 rounded">
                        {ruleLabel(selectedSkin.requires)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="space-y-2 pt-4">
                  {(() => {
                    const prog = progressForRule(selectedSkin.requires, {
                      sendCount,
                      totalUsdCents,
                    });
                    const isUnlocked = unlocked.includes(selectedSkin.id);

                    if (isUnlocked) {
                      return (
                        <Button
                          onClick={() => handleApplySkin(selectedSkin)}
                          className="w-full"
                          variant={selectedId === selectedSkin.id ? 'secondary' : 'default'}
                        >
                          {selectedId === selectedSkin.id
                            ? 'Currently Applied'
                            : 'Apply to All Envelopes'}
                        </Button>
                      );
                    } else {
                      return (
                        <>
                          <Button
                            disabled
                            className="w-full opacity-60 cursor-not-allowed"
                            title={prog.tooltip}
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            {prog.tooltip}
                          </Button>

                          {prog.usdReq && prog.usdReq.remainingCents > 0 && (
                            <Button onClick={handleGoToFund} variant="outline" className="w-full">
                              <ArrowRight className="w-4 h-4 mr-2" />
                              Go to Fund
                            </Button>
                          )}
                        </>
                      );
                    }
                  })()}
                </div>

                {/* Progress display for locked skins */}
                {!unlocked.includes(selectedSkin.id) && selectedSkin.requires && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">Progress:</div>
                    {(() => {
                      const prog = progressForRule(selectedSkin.requires, {
                        sendCount,
                        totalUsdCents,
                      });
                      return (
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
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a skin to view details</p>
              </CardContent>
            </Card>
          )}

          {/* Stats card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Sends:</span>
                <span className="font-mono">{sendCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Sent:</span>
                <span className="font-mono">${(totalUsdCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unlocked Skins:</span>
                <span className="font-mono">
                  {unlocked.length}/{presets.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
