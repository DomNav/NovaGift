import { useState } from 'react';
import confetti from 'canvas-confetti';
import { QRCard } from '@/components/ui/QRCard';
import { PriceBox } from '@/components/ui/PriceBox';
import { useToast } from '@/hooks/useToast';
import { notifyRecipient } from '@/lib/notify';

export const Fund = () => {
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'USDC' | 'XLM'>('USDC');

  const envelopeAddress = 'GDEMO...ENVELOPE';
  const amount = '100';
  const envelopeId = '001';
  const recipientEmail = 'recipient@example.com'; // This would come from envelope metadata
  const skinId = 'default'; // This would come from envelope metadata

  const handleSend = async () => {
    setIsProcessing(true);

    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsProcessing(false);
    setIsSuccess(true);

    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1D2BFF', '#4A5FFF', '#7B8CFF', '#2ECC71'],
    });

    // Show toast
    addToast(`Successfully sent ${amount} ${paymentMethod}!`, 'success');

    // Send email notification if recipient email exists
    if (recipientEmail) {
      await notifyRecipient({
        envelopeId,
        email: recipientEmail,
        amountUsd: parseFloat(amount),
        skinId,
      });
    }

    // Reset button after delay
    setTimeout(() => {
      setIsSuccess(false);
    }, 3000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-antonio gradient-text mb-2">Fund Envelope</h1>
        <p className="text-brand-text/60">Add funds to an existing gift envelope</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code Section */}
        <div className="flex flex-col items-center">
          <QRCard address={envelopeAddress} amount={amount} memo="NovaGift Gift #001" />

          <div className="mt-6 glass-card p-4 max-w-sm w-full">
            <h3 className="text-sm font-medium mb-2">Envelope Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-brand-text/60">ID:</span>
                <span className="font-mono">#001</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text/60">Created:</span>
                <span>2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text/60">Status:</span>
                <span className="text-yellow-400">Awaiting Funds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="space-y-6">
          <PriceBox amount={amount} onPaymentMethodChange={setPaymentMethod} />

          <button
            onClick={handleSend}
            disabled={isProcessing || isSuccess}
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
              backgroundSize: (isProcessing || isSuccess) ? '100% 100%' : '200% 200%',
              animation: (isProcessing || isSuccess) ? 'none' : 'granite-shift 4s ease-in-out infinite',
              boxShadow: `
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                0 4px 12px rgba(29, 43, 255, 0.3),
                0 2px 4px rgba(0, 0, 0, 0.2)
              `
            }}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="font-semibold tracking-wide">Processing...</span>
              </>
            ) : isSuccess ? (
              <>
                <span>✓</span>
                <span className="font-semibold tracking-wide">Success!</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span className="font-semibold tracking-wide">
                  Send {amount} {paymentMethod}
                </span>
              </>
            )}
          </button>

          <div className="glass-card p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span>🔒</span>
              Security Note
            </h3>
            <p className="text-xs text-brand-text/60">
              Funds are secured by smart contract escrow and can only be claimed by the designated
              recipient. If unclaimed before expiry, funds are automatically returned.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
