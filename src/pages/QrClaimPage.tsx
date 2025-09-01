import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface QrCodeData {
  active: boolean;
  amount: string;
  assetCode: string;
  eventId: string;
  eventName: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  eventType: 'POOL' | 'ASSIGNED' | 'CHECKIN';
}

export function QrClaimPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  
  const [qrData, setQrData] = useState<QrCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!code) {
      setError('No QR code provided');
      setLoading(false);
      return;
    }

    fetchQrCodeData();
  }, [code]);

  const fetchQrCodeData = async () => {
    try {
      const response = await fetch(`/api/qr/${code}`);
      if (!response.ok) {
        throw new Error('QR code not found');
      }
      const data = await response.json();
      setQrData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!wallet || !code) return;

    setClaiming(true);
    try {
      const response = await fetch('/api/qr/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, wallet }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to claim');
      }

      setClaimed(true);
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim');
    } finally {
      setClaiming(false);
    }
  };

  const connectFreighter = async () => {
    try {
      // @ts-ignore - Freighter types not available
      if (window.freighterApi) {
        // @ts-ignore
        const publicKey = await window.freighterApi.getPublicKey();
        setWallet(publicKey);
      } else {
        window.open('https://freighter.app/', '_blank');
      }
    } catch (err) {
      setError('Failed to connect Freighter wallet');
    }
  };

  const handleQuickWallet = () => {
    // TODO: Implement Quick Wallet creation
    setError('Quick Wallet creation coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Oops!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
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

  if (!qrData?.active) {
    const statusMessages = {
      USED: 'This QR code has already been claimed',
      EXPIRED: 'This QR code has expired',
      ACTIVE: 'This event is not currently active'
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {qrData?.status === 'USED' ? 'Already Claimed' : 'Event Ended'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {statusMessages[qrData?.status || 'EXPIRED']}
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/')}
              className="block w-full px-6 py-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors"
            >
              Learn More About NovaGift
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Congratulations!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            You've successfully claimed
          </p>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-6">
            {qrData.amount} {qrData.assetCode}
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
              Follow NovaGift
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="max-w-md mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎁</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Claim Your Gift
          </h1>
          <div className="text-3xl font-bold text-sky-600 dark:text-sky-400 mt-2">
            {qrData.amount} {qrData.assetCode}
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            From {qrData.eventName}
          </p>
        </div>

        {!wallet ? (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-slate-600 dark:text-slate-400">
                Choose how you'd like to receive your gift:
              </p>
            </div>

            <button
              onClick={connectFreighter}
              className="w-full p-4 rounded-xl border-2 border-sky-200 dark:border-sky-800 hover:border-sky-300 dark:hover:border-sky-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center">
                  🔗
                </div>
                <div className="text-left">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    I have a wallet
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Freighter, Lobstr, Albedo, or paste address
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={handleQuickWallet}
              className="w-full p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  ⚡
                </div>
                <div className="text-left">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    Create Quick Wallet
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    No app needed. Ready in ~30 seconds
                  </div>
                </div>
              </div>
            </button>

            <div className="text-center">
              <input
                type="text"
                placeholder="Or paste your Stellar address (G...)"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-sky-50 dark:bg-sky-900/30 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400">Wallet:</div>
              <div className="font-mono text-sm text-slate-900 dark:text-slate-100 break-all">
                {wallet}
              </div>
            </div>

            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-3 px-4 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {claiming ? 'Claiming...' : `Claim ${qrData.amount} ${qrData.assetCode}`}
            </button>

            <button
              onClick={() => setWallet('')}
              className="w-full py-2 px-4 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-sm"
            >
              Use different wallet
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Powered by <span className="font-medium">NovaGift</span> on Stellar
          </p>
        </div>
      </div>
    </div>
  );
}
