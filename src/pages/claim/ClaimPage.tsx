import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { useWallet } from '../../hooks/useWallet';
import { useToast } from '../../hooks/useToast';
import { 
  fetchEnvelope, 
  buildClaimTx, 
  formatEnvelopeAmount, 
  shortenAddress,

  type EnvelopeStatus 
} from '../../store/claim';

interface ClaimPageProps {}

export function ClaimPage({}: ClaimPageProps) {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  // Get invite token from query params
  const inviteToken = searchParams.get('t');
  
  // Wallet state
  const { publicKey, connected, connecting, connect, signAndSend } = useWallet();
  
  // Local state
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Fetch envelope data
  const {
    data: envelope,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['envelope', id],
    queryFn: () => fetchEnvelope(id!),
    enabled: !!id,
    retry: 2,
    refetchInterval: claimed ? false : 30000, // Poll every 30s unless claimed
  });

  // Handle claim process
  const handleClaim = async () => {
    if (!envelope || !connected || !publicKey) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (envelope.status !== 'FUNDED') {
      addToast('This envelope cannot be claimed', 'error');
      return;
    }

    setClaiming(true);
    
    try {
      addToast('Building transaction...', 'info');
      
      // Build the claim transaction
      const xdr = await buildClaimTx({
        id: envelope.id,
        recipient: publicKey,
        invite: inviteToken || undefined,
      });

      addToast('Please sign the transaction in your wallet...', 'info');
      
      // Sign and send the transaction
      await signAndSend(xdr);
      
      // Success!
      setClaimed(true);
      addToast('Gift claimed successfully! 🎉', 'success');
      
      // Trigger confetti effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6'],
      });

      // Refetch envelope data to update status
      setTimeout(() => {
        refetch();
      }, 2000);
      
    } catch (error) {
      console.error('Claim error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim gift';
      addToast(errorMessage, 'error');
    } finally {
      setClaiming(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-sky-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading gift...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (fetchError || !envelope) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-red-50 to-orange-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Gift Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {fetchError instanceof Error ? fetchError.message : 'This gift could not be found or may have expired.'}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Handle different envelope statuses
  const renderStatusContent = (status: EnvelopeStatus) => {
    switch (status) {
      case 'OPENED':
        return (
          <div className="text-center max-w-md mx-4">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Already Claimed
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This gift has already been claimed by someone else.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
            >
              Create Your Own Gift
            </button>
          </div>
        );
        
      case 'CANCELED':
        return (
          <div className="text-center max-w-md mx-4">
            <div className="text-6xl mb-4">⏰</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Gift Expired
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This gift has expired and can no longer be claimed.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
            >
              Create Your Own Gift
            </button>
          </div>
        );
        
      case 'CREATED':
        return (
          <div className="text-center max-w-md mx-4">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Gift Not Ready
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This gift hasn't been funded yet. Please check back later.
            </p>
            <button 
              onClick={() => refetch()}
              className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              Refresh
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Show status-specific content for non-funded envelopes
  if (envelope.status !== 'FUNDED') {
    const bgColorClass = {
      OPENED: 'from-emerald-50 to-teal-100',
      CANCELED: 'from-orange-50 to-red-100',
      CREATED: 'from-blue-50 to-indigo-100',
    }[envelope.status] || 'from-gray-50 to-gray-100';

    return (
      <div className={`min-h-dvh bg-gradient-to-br ${bgColorClass} dark:from-slate-900 dark:to-slate-800 flex items-center justify-center`}>
        {renderStatusContent(envelope.status)}
      </div>
    );
  }

  // Show success state if already claimed
  if (claimed) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Congratulations!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            You've successfully claimed your gift!
          </p>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-6">
            {formatEnvelopeAmount(envelope.amount, envelope.assetCode)}
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => window.open('https://stellar.expert', '_blank')}
              className="block w-full px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
            >
              View on Stellar Explorer
            </button>
            <button 
              onClick={() => navigate('/')}
              className="block w-full px-6 py-2 border border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              Create Your Own Gift
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main claim interface for funded envelopes
  return (
    <div className="min-h-dvh bg-gradient-to-br from-sky-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="max-w-md mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎁</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            You've Got a Gift!
          </h1>
          <div className="text-3xl font-bold text-sky-600 dark:text-sky-400 mt-2">
            {formatEnvelopeAmount(envelope.amount, envelope.assetCode)}
          </div>
          {envelope.senderMessage && (
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 italic">
              "{envelope.senderMessage}"
            </p>
          )}
          {envelope.senderName && (
            <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
              From {envelope.senderName}
            </p>
          )}
        </div>

        {/* Wallet Connection */}
        {!connected ? (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Connect your wallet to claim this gift
              </p>
            </div>

            <button
              onClick={connect}
              disabled={connecting}
              className="w-full p-4 rounded-xl border-2 border-sky-200 dark:border-sky-800 hover:border-sky-300 dark:hover:border-sky-700 transition-colors group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center">
                  🔗
                </div>
                <div className="text-left">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {connecting ? 'Connecting...' : 'Connect Wallet'}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Freighter, Albedo, or other Stellar wallet
                  </div>
                </div>
              </div>
            </button>

            {/* Permission note */}
            <div className="text-center text-xs text-slate-500 dark:text-slate-500 mt-4">
              We only read your public address and ask you to sign transactions.
              Nothing moves without your approval.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected wallet display */}
            <div className="p-3 bg-sky-50 dark:bg-sky-900/30 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">Connected wallet:</div>
              <div className="font-mono text-sm text-slate-900 dark:text-slate-100">
                {shortenAddress(publicKey)}
              </div>
            </div>

            {/* Claim button */}
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-3 px-4 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {claiming ? 'Opening Gift...' : 'Open Gift 🎁'}
            </button>

            {/* Disconnect option */}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-sm"
            >
              Use different wallet
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Powered by <span className="font-medium">NovaGift</span> on Stellar
          </p>
        </div>
      </div>
    </div>
  );
}
