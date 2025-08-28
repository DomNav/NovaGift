import { useState, useEffect, useRef } from 'react';
import { connect, disconnect, formatAddress, isFreighterInstalled } from '@/lib/wallet';
import { debugFreighterConnection } from '@/lib/wallet-debug';

import AuraPointsChip from '@/components/ui/AuraPointsChip';
import WalletBalancePill from '@/components/ui/WalletBalancePill';
import { HeaderPriceTicker } from '@/components/PriceTicker';
import { NotificationButton } from '@/components/ui/NotificationButton';

export const Header = () => {
  const [wallet, setWallet] = useState<{ publicKey: string; connected: boolean } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDisconnectMenu, setShowDisconnectMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for stored connection on mount
    const storedAddress = localStorage.getItem('wallet_address');
    const storedConnected = localStorage.getItem('wallet_connected') === 'true';

    if (storedAddress && storedConnected && isFreighterInstalled()) {
      setWallet({ publicKey: storedAddress, connected: true });
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowDisconnectMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleConnect = async () => {
    console.log('🎯 Connect button clicked in Header');
    setIsConnecting(true);
    try {
      // First, run debug test
      console.log('🔧 Running debug test...');
      await debugFreighterConnection();

      // Then try normal connection
      const result = await connect();
      console.log('🔄 Connect result in Header:', result);

      if (result.connected && result.publicKey) {
        setWallet(result);
        localStorage.setItem('wallet_address', result.publicKey);
        localStorage.setItem('wallet_connected', 'true');
        console.log('✅ Wallet connected and stored in Header');
      } else {
        console.log('❌ Wallet not connected - connection failed or user rejected');
        console.log('📊 Result details:', result);
        setWallet(null);

        // Clear any stored data
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('wallet_connected');
      }
    } catch (error) {
      console.error('💥 Failed to connect wallet in Header:', error);
      setWallet(null);

      // Clear any stored data
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_connected');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const success = await disconnect();
      if (success) {
        setWallet(null);
        setShowDisconnectMenu(false);
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  return (
    <header className="h-16 bg-brand-surface/30 backdrop-blur-lg px-6 flex items-center justify-between border-b border-brand-text/10 dark:border-white/10">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-brand-text/80">Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        <HeaderPriceTicker />
        <AuraPointsChip />
        <WalletBalancePill account={wallet?.publicKey || null} />
        <NotificationButton />

        {wallet && wallet.connected && wallet.publicKey ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowDisconnectMenu(!showDisconnectMenu)}
              className="glass-card px-4 py-2 flex items-center gap-2 hover:bg-brand-text/5 transition-colors max-w-[160px] min-w-[120px]"
            >
              <div className="w-2 h-2 bg-brand-positive rounded-full animate-pulse flex-shrink-0" />
              <span className="text-sm font-mono truncate">{formatAddress(wallet.publicKey)}</span>
              <svg
                className={`w-4 h-4 text-brand-text/50 transition-transform ${showDisconnectMenu ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showDisconnectMenu && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-brand-surface border border-brand-text/10 dark:border-white/10 rounded-lg shadow-lg backdrop-blur-lg z-50">
                <div className="p-1">
                  <button
                    onClick={handleDisconnect}
                    className="w-full text-left px-3 py-2 text-sm text-brand-text/70 hover:bg-brand-text/5 rounded-md transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Disconnect Wallet
                  </button>
                  <div className="px-3 py-2 text-xs border-t border-brand-text/10 dark:border-white/10">
                    <div className="text-brand-text/70 mb-1 font-medium">Wallet Address:</div>
                    <div className="text-brand-text/50 font-mono break-all">{wallet.publicKey}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-4 py-2 rounded-full text-xs font-medium text-white bg-gradient-to-r from-gray-600/80 to-blue-500 hover:from-gray-500/90 hover:to-blue-400 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
};
