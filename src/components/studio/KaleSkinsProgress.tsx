import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';

interface KaleSkinsProgressProps {
  className?: string;
}

export default function KaleSkinsProgress({ className = '' }: KaleSkinsProgressProps) {
  const { connected, publicKey, connect, connecting } = useWallet();
  const [kaleBalance, setKaleBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const KALE_UNLOCK_THRESHOLD = 2000;

  useEffect(() => {
    if (connected && publicKey) {
      fetchKaleBalance();
    } else {
      setKaleBalance(null);
      setError(null);
    }
  }, [connected, publicKey]);

  const fetchKaleBalance = async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const response = await fetch(`${apiBase}/api/kale-public/balance/${publicKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setKaleBalance(data.holdings || 0);
      } else {
        // Fallback to mock data for development
        setKaleBalance(Math.floor(Math.random() * 3000)); // Mock balance 0-3000
      }
    } catch (err) {
      console.error('Failed to fetch KALE balance:', err);
      // Fallback to mock data for development
      setKaleBalance(Math.floor(Math.random() * 3000)); // Mock balance 0-3000
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  if (!connected) {
    return (
      <div className={`rounded-xl bg-black/5 dark:bg-white/5 p-4 ${className}`}>
        <div className="text-xs text-brand-text/70 mb-1">KALE Skins Progress</div>
        <div className="text-sm text-brand-text/60 mb-3">
          Connect your wallet to check KALE Skins progress
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="btn-primary text-sm w-full"
        >
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`rounded-xl bg-black/5 dark:bg-white/5 p-4 ${className}`}>
        <div className="text-xs text-brand-text/70 mb-1">KALE Skins Progress</div>
        <div className="text-sm text-brand-text/60 mb-2">Loading KALE balance...</div>
        <div className="h-2 w-full bg-black/20 dark:bg-white/20 rounded overflow-hidden">
          <div
            className="h-2 bg-gradient-to-r from-brand-primary to-brand-accent animate-pulse"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl bg-black/5 dark:bg-white/5 p-4 ${className}`}>
        <div className="text-xs text-brand-text/70 mb-1">KALE Skins Progress</div>
        <div className="text-sm text-red-500 mb-2">Error loading balance</div>
        <button onClick={fetchKaleBalance} className="btn-secondary text-sm w-full">
          Retry
        </button>
      </div>
    );
  }

  const isUnlocked = kaleBalance !== null && kaleBalance >= KALE_UNLOCK_THRESHOLD;
  const progress = kaleBalance !== null ? Math.min(1, kaleBalance / KALE_UNLOCK_THRESHOLD) : 0;
  const remaining =
    kaleBalance !== null ? Math.max(0, KALE_UNLOCK_THRESHOLD - kaleBalance) : KALE_UNLOCK_THRESHOLD;

  return (
    <div className={`rounded-xl bg-black/5 dark:bg-white/5 p-4 ${className}`}>
      <div className="text-xs text-brand-text/70 mb-1">KALE Skins Progress</div>

      {isUnlocked ? (
        <>
          <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
            🎉 Special Edition KALE Skin Unlocked!
          </div>
          <div className="text-xs text-brand-text/60 mb-2">
            KALE Balance: {kaleBalance?.toLocaleString()} KALE
          </div>
          <div className="h-2 w-full bg-black/20 dark:bg-white/20 rounded overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"
              style={{ width: '100%' }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="text-sm font-medium mb-2">
            KALE Balance: {kaleBalance?.toLocaleString() || 0} KALE
          </div>
          <div className="text-xs text-brand-text/60 mb-2">
            KALE needed for special skin: {remaining.toLocaleString()} KALE
          </div>
          <div className="h-2 w-full bg-black/20 dark:bg-white/20 rounded mt-2 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-brand-primary to-brand-accent"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </>
      )}

      <div className="text-xs text-brand-text/60 mt-2">
        Special edition skin unlocks at 2,000 KALE
      </div>
    </div>
  );
}
