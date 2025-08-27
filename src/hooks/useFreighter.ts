import { useState, useEffect, useCallback } from 'react';
import { 
  detectFreighter, 
  connect as connectFreighter, 
  signAndSubmit as walletSignAndSubmit,
  disconnect as disconnectWallet,
  type WalletConnection,
  type TransactionResult 
} from '../lib/wallet';
import { useToast } from './useToast';

interface UseFreighterReturn {
  publicKey: string;
  connected: boolean;
  isInstalled: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmit: (xdr: string, networkPassphrase?: string) => Promise<TransactionResult>;
}

export function useFreighter(): UseFreighterReturn {
  const [publicKey, setPublicKey] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const { addToast } = useToast();

  // Check if Freighter is installed on mount
  useEffect(() => {
    const checkFreighter = () => {
      const installed = detectFreighter();
      setIsInstalled(installed);
      
      // Check for stored connection
      if (installed) {
        const storedAddress = localStorage.getItem('wallet_address');
        const storedConnected = localStorage.getItem('wallet_connected') === 'true';
        
        if (storedAddress && storedConnected) {
          setPublicKey(storedAddress);
          setConnected(true);
        }
      }
    };

    checkFreighter();
    
    // Check again after a short delay in case Freighter loads slowly
    const timeout = setTimeout(checkFreighter, 1500);
    
    return () => clearTimeout(timeout);
  }, []);

  const connect = useCallback(async (): Promise<void> => {
    if (connecting) return;
    
    setConnecting(true);
    try {
      const connection: WalletConnection = await connectFreighter();
      
      if (connection.connected && connection.publicKey) {
        setPublicKey(connection.publicKey);
        setConnected(true);
        
        // Persist connection
        localStorage.setItem('wallet_address', connection.publicKey);
        localStorage.setItem('wallet_connected', 'true');
        
        addToast('Wallet connected successfully', 'success');
      } else {
        const errorMessage = connection.error || 'Failed to connect wallet';
        addToast(errorMessage, 'error');
        
        // Clear any stored connection data
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('wallet_connected');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnected(false);
      setPublicKey('');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      addToast(errorMessage, 'error');
      
      // Clear any stored connection data
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_connected');
    } finally {
      setConnecting(false);
    }
  }, [connecting, addToast]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await disconnectWallet();
      setPublicKey('');
      setConnected(false);
      addToast('Wallet disconnected', 'info');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      addToast('Failed to disconnect wallet', 'error');
    }
  }, [addToast]);

  const signAndSubmit = useCallback(
    async (xdr: string, networkPassphrase?: string): Promise<TransactionResult> => {
      if (!connected) {
        addToast('Please connect your wallet first', 'error');
        return {
          success: false,
          error: 'Wallet not connected'
        };
      }

      return walletSignAndSubmit(
        xdr, 
        networkPassphrase,
        (message, type) => addToast(message, type)
      );
    },
    [connected, addToast]
  );

  return {
    publicKey,
    connected,
    isInstalled,
    connecting,
    connect,
    disconnect,
    signAndSubmit
  };
}