import * as Freighter from '@stellar/freighter-api';

// Contract addresses (testnet)
export const ENVELOPE_CONTRACT = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHBCASH';
export const USDC_CONTRACT = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
export const WXLM_CONTRACT = 'CBP7NO6F7FRDHSOFQBT2L2UWYIZ2PU2ZOQOWDGDWX2LECTJGX2GQJRV2';

// Network configuration
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const RPC_URL = 'https://soroban-testnet.stellar.org';

// Types
export interface WalletConnection {
  publicKey: string;
  connected: boolean;
  error?: string;
}

export interface TransactionResult {
  success: boolean;
  txId?: string;
  error?: string;
}

// Extend window interface for Freighter
declare global {
  interface Window {
    freighter?: any;
  }
}

// Check if Freighter is installed
export function detectFreighter(): boolean {
  if (typeof window === 'undefined') {
    console.log('Window is undefined (SSR)');
    return false;
  }

  try {
    // Check multiple ways Freighter might be available
    const hasFreighterWindow = 'freighter' in window && window.freighter !== undefined;
    const hasFreighterApi = typeof Freighter !== 'undefined';

    console.log('Freighter detection:', {
      windowFreighter: window.freighter,
      hasFreighterWindow,
      hasFreighterApi,
      freighterKeys: window.freighter ? Object.keys(window.freighter) : [],
      freighterApiKeys: Freighter ? Object.keys(Freighter) : [],
    });

    // Return true if either method detects Freighter
    return hasFreighterWindow || hasFreighterApi;
  } catch (error) {
    console.error('Error detecting Freighter:', error);
    return false;
  }
}

// Alias for compatibility
export const isFreighterInstalled = detectFreighter;

// Connect to Freighter wallet
export async function connect(): Promise<WalletConnection> {
  try {
    console.log('🔗 Attempting to connect wallet...');

    // Direct Freighter API check and call
    console.log('🔍 Direct API test:', {
      freighterImported: !!Freighter,
      requestAccessExists: typeof Freighter?.requestAccess === 'function',
    });

    if (!Freighter || typeof Freighter.requestAccess !== 'function') {
      console.log('❌ Freighter API not available');
      throw new Error(
        'Freighter wallet extension not found. Please install Freighter and refresh the page.'
      );
    }

    console.log('✅ Calling Freighter.requestAccess() directly...');
    const result = await Freighter.requestAccess();
    console.log('📋 Raw Freighter response:', JSON.stringify(result, null, 2));

    // Handle different response formats
    if (result?.address) {
      console.log('🎉 Successfully connected with address:', result.address);
      return { publicKey: result.address, connected: true };
    }

    if (result?.error) {
      console.log('⚠️ Freighter returned error:', result.error);
      throw new Error(`Freighter error: ${result.error}`);
    }

    // Handle case where result is empty or user cancelled
    console.log('❌ No address received - user likely cancelled or Freighter is locked');
    throw new Error('Connection cancelled. Please unlock Freighter and try again.');
  } catch (error) {
    console.error('💥 Failed to connect wallet:', error);

    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('User rejected')) {
        return { publicKey: '', connected: false, error: 'Connection rejected by user' };
      }
      if (error.message.includes('not found') || error.message.includes('undefined')) {
        return { publicKey: '', connected: false, error: 'Freighter wallet not installed' };
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
    return {
      publicKey: '',
      connected: false,
      error: errorMessage,
    };
  }
}

// Sign and submit transaction with toast notifications
export async function signAndSubmit(
  xdr: string,
  networkPassphrase: string = NETWORK_PASSPHRASE,
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<TransactionResult> {
  try {
    if (!detectFreighter()) {
      const error = 'Freighter wallet not installed';
      showToast?.(error, 'error');
      return {
        success: false,
        error,
      };
    }

    showToast?.('Signing transaction...', 'info');

    // Sign the transaction
    const signedXDR = await Freighter.signTransaction(xdr, {
      networkPassphrase,
      address: undefined, // Let Freighter use the connected account
    });

    if (!signedXDR || signedXDR.error) {
      const error = signedXDR?.error || 'Failed to sign transaction';
      showToast?.(error, 'error');
      return {
        success: false,
        error,
      };
    }

    showToast?.('Submitting transaction...', 'info');

    // Submit to network via backend
    const response = await fetch('/api/stellar/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signedXDR: signedXDR.signedTxXdr,
        networkPassphrase,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const error = result.error || 'Failed to submit transaction';
      showToast?.(error, 'error');
      return {
        success: false,
        error,
      };
    }

    showToast?.('Transaction submitted successfully!', 'success');
    return {
      success: true,
      txId: result.txId,
    };
  } catch (error) {
    console.error('Transaction failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
    showToast?.(errorMessage, 'error');
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Disconnect wallet
export async function disconnect(): Promise<boolean> {
  try {
    // Clear stored wallet data
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_connected');
    return true;
  } catch (error) {
    console.error('Failed to disconnect:', error);
    return false;
  }
}

// Legacy functions for compatibility
export async function ensureFreighter(): Promise<boolean> {
  const result = await Freighter.isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connection = await connect();
  return connection.publicKey;
}

export async function signXDR(xdr: string, networkPassphrase: string) {
  return await Freighter.signTransaction(xdr, { networkPassphrase });
}

export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Envelope-related functions
export async function createEnvelope(
  recipientAddress: string,
  amount: string,
  tokenContract: string,
  expiryDate?: Date
): Promise<string> {
  // This would integrate with the Soroban contract
  console.log('Creating envelope:', { recipientAddress, amount, tokenContract, expiryDate });
  // Return mock transaction ID for demo
  return 'mock-tx-id-' + Date.now();
}

export async function openEnvelope(envelopeId: string, password: string): Promise<boolean> {
  // This would integrate with the Soroban contract
  console.log('Opening envelope:', { envelopeId, password });
  // Return success for demo
  return true;
}

export async function approveToken(
  tokenContract: string,
  spenderContract: string,
  amount: string
): Promise<string> {
  // This would integrate with the token contract
  console.log('Approving token:', { tokenContract, spenderContract, amount });
  // Return mock transaction ID for demo
  return 'mock-approval-tx-' + Date.now();
}
