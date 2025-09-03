import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { connect, disconnect, isFreighterInstalled } from '@/lib/wallet';
import { debugFreighterConnection } from '@/lib/wallet-debug';

import { UnifiedHeaderPill } from '@/components/ui/UnifiedHeaderPill';

// Function to get page title based on current route
const getPageTitle = (pathname: string): string => {
  // Handle exact matches first
  switch (pathname) {
    case '/':
      return 'Create Gift';
    case '/fund':
      return 'Fund Gift';
    case '/open':
      return 'Open Gift';
    case '/activity':
      return 'Activity';
    case '/studio':
      return 'Studio';
    case '/projects':
      return 'Projects';
    case '/contacts':
      return 'Contacts';
    case '/settings':
      return 'Settings';
    case '/studio/projects':
      return 'Studio Projects';
    case '/skins':
      return 'Skin Store';
    case '/kale-skins':
      return 'KALE Skins';
    default:
      // Handle dynamic routes
      if (pathname.startsWith('/projects/')) {
        return 'Project Details';
      }
      if (pathname.startsWith('/studio/projects/')) {
        return 'Project Details';
      }
      // Default fallback
      return 'Dashboard';
  }
};

export const Header = () => {
  const location = useLocation();
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
    <header className="fixed top-0 left-64 right-0 h-20 bg-brand-surface/30 backdrop-blur-lg px-6 flex items-center justify-between z-40">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-brand-text/80">{getPageTitle(location.pathname)}</h2>
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
