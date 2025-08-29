import { useState, useEffect } from 'react';
import { connect, disconnect, isFreighterInstalled } from '@/lib/wallet';
import { debugFreighterConnection } from '@/lib/wallet-debug';

import { UnifiedHeaderPill } from '@/components/ui/UnifiedHeaderPill';

export const Header = () => {
  const [wallet, setWallet] = useState<{ publicKey: string; connected: boolean } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);


  useEffect(() => {
    // Check for stored connection on mount
    const storedAddress = localStorage.getItem('wallet_address');
    const storedConnected = localStorage.getItem('wallet_connected') === 'true';

    if (storedAddress && storedConnected && isFreighterInstalled()) {
      setWallet({ publicKey: storedAddress, connected: true });
    }
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
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  return (
    <header className="h-16 bg-brand-surface/30 backdrop-blur-lg px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-brand-text/80">Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        <UnifiedHeaderPill 
          wallet={wallet}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      </div>
    </header>
  );
};
