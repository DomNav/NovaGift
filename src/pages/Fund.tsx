import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { QRCard } from '@/components/ui/QRCard';
import { FundWithSwap } from '@/components/fund/FundWithSwap';
import { useToast } from '@/hooks/useToast';
import { notifyRecipient } from '@/lib/notify';
// import { makeEnvelopeFundLink } from '@/lib/stellarPayLink';
import { API_BASE_URL, NOVAGIFT_CONTRACT_ID } from '@/config/stellar';
import { AppShell } from '@/components/layout/AppShell';

interface EnvelopeDetails {
  id: string;
  status: 'CREATED' | 'FUNDED' | 'OPENED' | 'CANCELED';
  asset: 'XLM' | 'USDC';
  amount: string;
  decimals: number;
  sender: string;
  recipient: string | null;
  expiryTs: number;
  memo: string;
}

export const Fund = () => {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [envelope, setEnvelope] = useState<EnvelopeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recipientEmail = 'recipient@example.com'; // This would come from envelope metadata
  const skinId = 'default'; // This would come from envelope metadata

  useEffect(() => {
    const fetchEnvelope = async () => {
      if (!id) {
        setError('No envelope ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/envelope/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Envelope not found');
          }
          throw new Error(`Failed to fetch envelope: ${response.status}`);
        }

        const data: EnvelopeDetails = await response.json();
        
        // Check if envelope is in valid state for funding
        if (data.status !== 'CREATED' && data.status !== 'FUNDED') {
          setError(`Envelope cannot be funded. Status: ${data.status}`);
        }
        
        setEnvelope(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load envelope');
        addToast('Failed to load envelope details', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchEnvelope();
  }, [id, addToast]);

  const handleSwapSuccess = async (_txHash: string) => {
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1D2BFF', '#4A5FFF', '#7B8CFF', '#2ECC71'],
    });

    // Show toast - updated to match spec format
    addToast(`Funded via Best route; locked at $${envelope?.amount || '0'} ${envelope?.asset || 'USDC'}`, 'success');

    // Send email notification if recipient email exists
    if (recipientEmail && envelope) {
      await notifyRecipient({
        envelopeId: envelope.id,
        email: recipientEmail,
        amountUsd: parseFloat(envelope.amount),
        skinId,
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-brand-text/60">Loading envelope details...</div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Error state or invalid status
  if (error || !envelope) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto">
          <div className="glass-card p-8 text-center">
            <div className="text-red-400 mb-4">⚠️</div>
            <h2 className="text-xl font-medium mb-2">Unable to Fund Envelope</h2>
            <p className="text-brand-text/60">{error || 'Envelope not found'}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // Generate payment link for QR code (currently unused but will be used for deep linking)
  // const paymentLink = makeEnvelopeFundLink(
  //   NOVAGIFT_CONTRACT_ID || envelope.sender, // Fallback to sender if no contract ID
  //   envelope.amount,
  //   envelope.asset,
  //   envelope.id
  // );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED': return 'text-yellow-400';
      case 'FUNDED': return 'text-green-400';
      case 'OPENED': return 'text-blue-400';
      case 'CANCELED': return 'text-red-400';
      default: return 'text-brand-text/60';
    }
  };

  const formatExpiryTime = (expiryTs: number) => {
    const now = Date.now() / 1000;
    const diff = expiryTs - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} days`;
    return `${hours} hours`;
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-antonio gradient-text mb-2">Fund Envelope</h1>
        <p className="text-brand-text/60">Add funds to an existing gift envelope</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
        {/* QR Code Section */}
        <div className="min-w-0 flex flex-col items-center">
          <QRCard 
            address={NOVAGIFT_CONTRACT_ID || envelope.sender} 
            amount={envelope.amount} 
            memo={envelope.memo}
          />

          <div className="mt-6 glass-card p-4 max-w-sm w-full">
            <h3 className="text-sm font-medium mb-2">Envelope Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-brand-text/60">ID:</span>
                <span className="font-mono">#{envelope.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text/60">Asset:</span>
                <span>{envelope.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text/60">Amount:</span>
                <span>{envelope.amount} {envelope.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text/60">Expires in:</span>
                <span>{formatExpiryTime(envelope.expiryTs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text/60">Status:</span>
                <span className={getStatusColor(envelope.status)}>{envelope.status}</span>
              </div>
            </div>
          </div>

          {/* Build & Sign Swap button (stubbed) */}
          <button 
            className="mt-4 w-full max-w-sm glass-card p-3 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
            disabled
          >
            Build & Sign Swap (Coming Soon)
          </button>
        </div>

        {/* Funding Section */}
        <div className="min-w-0 space-y-6">
          <FundWithSwap
            targetUsd={envelope.amount}
            defaultFrom="XLM"
            onSuccess={handleSwapSuccess}
          />

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
    </AppShell>
  );
};
