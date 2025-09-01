import { useState } from 'react';
import confetti from 'canvas-confetti';
import { EnvelopeCard, EnvelopeSkin } from './EnvelopeCard';

interface EnvelopeOpeningDemoProps {
  sealedSkin?: EnvelopeSkin;
  openedSkin?: EnvelopeSkin;
  usdCents?: number;
  asset?: 'USDC' | 'XLM';
  toLabel?: string;
  fromLabel?: string;
}

export const EnvelopeOpeningDemo = ({
  sealedSkin,
  openedSkin,
  usdCents = 10000,
  asset = 'USDC',
  toLabel = 'GDEMO...RECIPIENT',
  fromLabel = 'You',
}: EnvelopeOpeningDemoProps) => {
  const [isOpening, setIsOpening] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Check for reduced motion preference
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const handleOpenDemo = () => {
    if (isOpening || isOpened) return;

    if (reduce) {
      // Skip animation for users who prefer reduced motion
      setIsOpened(true);
      triggerConfetti();
      return;
    }

    setIsOpening(true);
  };

  const handleOpeningComplete = () => {
    setIsOpening(false);
    setIsOpened(true);
    triggerConfetti();
  };

  const triggerConfetti = () => {
    // Trigger confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1D2BFF', '#4A5FFF', '#7B8CFF', '#2ECC71', '#F39C12'],
    });
  };

  const handleReset = () => {
    setIsResetting(true);
    setIsOpened(false);

    // Small delay to allow smooth transition
    setTimeout(() => {
      setIsResetting(false);
    }, 300);
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Envelope Animation Area */}
      <div className="relative">
        {!isOpened ? (
          <EnvelopeCard
            variant="sealed"
            skin={sealedSkin}
            amount="???" // Hide amount in sealed state for surprise
            asset={asset}
            toLabel={toLabel}
            fromLabel={fromLabel}
            openingFx={isOpening}
            onOpenFxDone={handleOpeningComplete}
            className={isResetting ? 'animate-fade-in' : ''}
          />
        ) : (
          <EnvelopeCard
            variant="opened"
            skin={openedSkin}
            usdCents={usdCents}
            asset={asset}
            toLabel={toLabel}
            fromLabel={fromLabel}
            animateAmount={true}
            className="animate-fade-in"
          />
        )}
      </div>

      {/* Demo Controls */}
      <div className="flex flex-col items-center space-y-4">
        {!isOpened ? (
          <button
            onClick={handleOpenDemo}
            disabled={isOpening}
            className="relative flex items-center justify-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 active:scale-95 transform overflow-hidden text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:animate-none"
            style={{
              background: `linear-gradient(
                135deg,
                #1d2bff 0%,
                #4a5fff 15%,
                #6366f1 25%,
                #8b5cf6 35%,
                #64748b 45%,
                #475569 55%,
                #7c3aed 65%,
                #3b82f6 75%,
                #1e40af 85%,
                #1d2bff 100%
              )`,
              backgroundSize: isOpening ? '100% 100%' : '200% 200%',
              animation: isOpening ? 'none' : 'granite-shift 4s ease-in-out infinite',
              boxShadow: `
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                0 4px 12px rgba(29, 43, 255, 0.3),
                0 2px 4px rgba(0, 0, 0, 0.2)
              `
            }}
          >
            {isOpening ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="font-semibold tracking-wide">Opening...</span>
              </>
            ) : (
              <>
                <span>🎁</span>
                <span className="font-semibold tracking-wide">Demo Opening</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-center space-y-3">
            <div className="text-sm text-brand-text/80 font-medium">
              <span className="gradient-text">🎉 Envelope Opened!</span>
            </div>
            <button onClick={handleReset} className="btn-secondary text-sm px-4 py-2">
              Reset Demo
            </button>
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-brand-text/60">
            {!isOpened
              ? 'See how your envelope will open'
              : 'This is what the recipient will experience'}
          </p>
        </div>
      </div>
    </div>
  );
};
