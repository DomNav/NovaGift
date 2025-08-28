import { useState, useEffect, useCallback } from 'react';
import {
  connectWallet as kitConnect,
  disconnectWallet as kitDisconnect,
  signXdr,
  detectWallet,
  restoreConnection,
} from '../lib/wallet/kit';
import { useToast } from './useToast';

interface UseWalletReturn {
  publicKey: string;
  connected: boolean;
  isInstalled: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmit: (xdr: string, networkPassphrase?: string) => Promise<TransactionResult>;
}

interface TransactionResult {
  success: boolean;
  txId?: string;
  error?: string;
}

export function useWallet(): UseWalletReturn {
  const [publicKey, setPublicKey] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const { addToast } = useToast();

  useEffect(() => {
    const checkWallet = async () => {
      const installed = detectWallet();
      setIsInstalled(installed);

      if (installed) {
        const connection = await restoreConnection();
        if (connection.connected && connection.publicKey) {
          setPublicKey(connection.publicKey);
          setConnected(true);
        }
      }
    };

    checkWallet();

    const timeout = setTimeout(checkWallet, 1500);

    return () => clearTimeout(timeout);
  }, []);

  const connect = useCallback(async (): Promise<void> => {
    if (connecting) return;

    setConnecting(true);
    try {
      const connection = await kitConnect();

      if (connection.connected && connection.publicKey) {
        setPublicKey(connection.publicKey);
        setConnected(true);
        addToast('Wallet connected successfully', 'success');
      } else {
        const errorMessage = connection.error || 'Failed to connect wallet';
        addToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnected(false);
      setPublicKey('');

      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      addToast(errorMessage, 'error');
    } finally {
      setConnecting(false);
    }
  }, [connecting, addToast]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await kitDisconnect();
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
          error: 'Wallet not connected',
        };
      }

      try {
        addToast('Signing transaction...', 'info');
        
        const signedXDR = await signXdr(xdr, publicKey);

        addToast('Submitting transaction...', 'info');

        const response = await fetch('/api/stellar/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signedXDR,
            networkPassphrase: networkPassphrase || 'Test SDF Network ; September 2015',
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          const error = result.error || 'Failed to submit transaction';
          addToast(error, 'error');
          return {
            success: false,
            error,
          };
        }

        addToast('Transaction submitted successfully!', 'success');
        return {
          success: true,
          txId: result.txId,
        };
      } catch (error) {
        console.error('Transaction failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
        addToast(errorMessage, 'error');
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [connected, publicKey, addToast]
  );

  return {
    publicKey,
    connected,
    isInstalled,
    connecting,
    connect,
    disconnect,
    signAndSubmit,
  };
}

// Legacy export for compatibility
export const useFreighter = useWallet;