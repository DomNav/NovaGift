import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { EnvelopeCard } from '@/components/ui/EnvelopeCard';
import { useToast } from '@/hooks/useToast';
import { useSkins } from '@/store/skins';
import { isPasskeySupported, claimWithPasskey, ensurePasskeyWallet } from '@/passkey/client';
import { AppShell } from '@/components/layout/AppShell';

export const Open = () => {
  const { addToast } = useToast();
  const { selectedSealedId, selectedOpenedId, getById, hydrate } = useSkins();
  const [envelopeId, setEnvelopeId] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [isOpeningPasskey, setIsOpeningPasskey] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [envelopeData] = useState({
    amount: '250',
    sender: 'GDEMO...SENDER',
    recipient: 'GDEMO...WALLET',
  });

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const sealedSkin = getById(selectedSealedId);
  const openedSkin = getById(selectedOpenedId);

  useEffect(() => {
    hydrate();
  }, []);

  const handleOpen = () => {
    if (!envelopeId) {
      addToast('Please enter an envelope ID', 'error');
      return;
    }

    if (reduce) {
      setIsOpened(true);
      addToast('Unsealed. Funds delivered.', 'success');
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.7 },
      });
      return;
    }

    setIsOpening(true);
  };

  const handlePasskeyClaim = async () => {
    if (!envelopeId) {
      addToast('Please enter an envelope ID', 'error');
      return;
    }

    setIsOpeningPasskey(true);
    try {
      // Step 1: Ensure passkey wallet exists
      addToast('Connecting to passkey wallet...', 'info');
      const wallet = await ensurePasskeyWallet();
      
      // Step 2: Create claim XDR (would come from backend normally)
      // For demo, we'll use a placeholder
      const claimXdr = 'placeholder-xdr-' + envelopeId;
      
      // Step 3: Sign and submit claim
      addToast('Processing claim...', 'info');
      const result = await claimWithPasskey(claimXdr);
      
      if (result.success) {
        setIsOpened(true);
        addToast('Envelope claimed successfully with passkey!', 'success');
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.7 },
        });
      } else {
        addToast(result.error || 'Failed to claim with passkey', 'error');
      }
    } catch (error) {
      console.error('Passkey claim error:', error);
      addToast(
        error instanceof Error ? error.message : 'Failed to claim with passkey',
        'error'
      );
    } finally {
      setIsOpeningPasskey(false);
    }
  };

  const handleReset = () => {
    setIsOpened(false);
    setEnvelopeId('');
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-antonio gradient-text mb-2">Open Gift Envelope</h1>
        <p className="text-brand-text/60">Enter the envelope ID to reveal your gift</p>
      </div>

      {!isOpened ? (
        <div className="space-y-8">
          {/* Input Section */}
          <div className="glass-card p-6 max-w-md mx-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Envelope ID</label>
                <input
                  type="text"
                  value={envelopeId}
                  onChange={(e) => setEnvelopeId(e.target.value)}
                  placeholder="Enter envelope ID or scan QR code"
                  className="input-base"
                />
              </div>

              <button
                onClick={handleOpen}
                disabled={isOpening || isOpeningPasskey || !envelopeId}
                className="w-full relative flex items-center justify-center gap-3 px-6 py-3 rounded-full font-medium transition-all duration-300 active:scale-95 transform overflow-hidden text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:animate-none"
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
                  backgroundSize: (isOpening || isOpeningPasskey || !envelopeId) ? '100% 100%' : '200% 200%',
                  animation: (isOpening || isOpeningPasskey || !envelopeId) ? 'none' : 'granite-shift 4s ease-in-out infinite',
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
                    <span>📬</span>
                    <span className="font-semibold tracking-wide">Open Now</span>
                  </>
                )}
              </button>

              {/* Passkey claim button - only show when enabled */}
              {isPasskeySupported() && (
                <button
                  onClick={handlePasskeyClaim}
                  disabled={isOpeningPasskey || isOpening || !envelopeId}
                  className="w-full btn-granite-secondary flex items-center justify-center gap-2"
                >
                  {isOpeningPasskey ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Claiming...</span>
                    </>
                  ) : (
                    <>
                      <span>🔑</span>
                      <span>Claim with Passkey (beta)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Sealed Envelope Preview */}
          <div className="flex flex-col items-center">
            <EnvelopeCard
              variant="sealed"
              skin={sealedSkin}
              usdCents={envelopeId ? undefined : 0}
              amount={envelopeId ? '???' : '0'}
              toLabel="GDEMO...WALLET"
              openingFx={isOpening}
              onOpenFxDone={() => {
                setIsOpening(false);
                setIsOpened(true);
                addToast('Unsealed. Funds delivered.', 'success');
                confetti({
                  particleCount: 90,
                  spread: 70,
                  origin: { y: 0.7 },
                });
              }}
            />
            <p className="text-sm text-brand-text/40 mt-4">
              {envelopeId ? 'Ready to reveal your gift!' : 'Enter an envelope ID above'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Opened Envelope */}
          <div className="flex flex-col items-center animate-fade-in">
            <EnvelopeCard
              variant="opened"
              skin={openedSkin}
              usdCents={parseInt(envelopeData.amount) * 100}
              fromLabel={envelopeData.sender}
              toLabel={envelopeData.recipient}
              animateAmount={true}
              className="animate-reveal"
            />

            <div className="mt-8 text-center space-y-4">
              <div className="glass-card p-6 max-w-md">
                <h2 className="text-2xl font-antonio mb-2">
                  <span className="gradient-text">Congratulations!</span>
                </h2>
                <p className="text-lg mb-4">You've received ${envelopeData.amount} USDC</p>
                <div className="text-sm text-brand-text/60 space-y-1">
                  <p>The funds have been transferred to your wallet</p>
                  <p className="font-mono text-xs">{envelopeData.recipient}</p>
                </div>
              </div>

              <button onClick={handleReset} className="btn-secondary text-sm">
                Open Another Envelope
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-12 glass-card p-4 max-w-md mx-auto">
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <span>💡</span>
          How to find your envelope ID
        </h3>
        <ul className="text-xs text-brand-text/60 space-y-1">
          <li>• Check the link or QR code shared with you</li>
          <li>• Look for the envelope ID in your email or message</li>
          <li>• Contact the sender if you can't find it</li>
        </ul>
      </div>
      </div>
    </AppShell>
  );
};
