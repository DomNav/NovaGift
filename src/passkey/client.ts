// Passkey-kit integration for NovaGift
// Reference: https://github.com/kalepail/passkey-kit

import { PasskeyKit } from 'passkey-kit';

// Only initialize if passkeys are enabled
const isPasskeyEnabled = import.meta.env.VITE_ENABLE_PASSKEYS === 'true';

export const pk = isPasskeyEnabled
  ? new PasskeyKit({
      rpcUrl: import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org',
      networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
      factoryContractId: import.meta.env.VITE_PASSKEY_FACTORY_ID || '',
    })
  : null;

export interface PasskeyWallet {
  keyId: string;
  address: string;
  contractId?: string;
}

export interface PasskeySignResult {
  signedTxXdr: string;
  success: boolean;
  error?: string;
}

/**
 * Ensure or create a passkey wallet for the current user
 * @returns Wallet details including keyId and Stellar address
 */
export async function ensurePasskeyWallet(): Promise<PasskeyWallet> {
  if (!pk) {
    throw new Error('Passkey support is not enabled');
  }

  try {
    // Connect to passkey (creates new or retrieves existing)
    const result = await pk.connect();
    
    return {
      keyId: result.keyId,
      address: result.address,
      contractId: result.contractId,
    };
  } catch (error) {
    console.error('Failed to ensure passkey wallet:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create/retrieve passkey wallet'
    );
  }
}

/**
 * Sign a transaction XDR with passkey
 * @param xdr - Transaction XDR to sign
 * @param keyId - Key ID from the passkey wallet
 * @returns Signed XDR
 */
export async function signWithPasskey(xdr: string, keyId: string): Promise<string> {
  if (!pk) {
    throw new Error('Passkey support is not enabled');
  }

  try {
    const result = await pk.signTx({ xdr, keyId });
    
    if (!result || !result.signedTxXdr) {
      throw new Error('Failed to sign transaction with passkey');
    }
    
    return result.signedTxXdr;
  } catch (error) {
    console.error('Failed to sign with passkey:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to sign transaction'
    );
  }
}

/**
 * Check if passkey support is enabled
 */
export function isPasskeySupported(): boolean {
  return isPasskeyEnabled && pk !== null;
}

/**
 * Helper to claim an envelope using passkey
 * @param envelopeXdr - The envelope claim transaction XDR
 * @returns Result of the claim operation
 */
export async function claimWithPasskey(envelopeXdr: string): Promise<PasskeySignResult> {
  if (!isPasskeySupported()) {
    return {
      signedTxXdr: '',
      success: false,
      error: 'Passkey support is not enabled',
    };
  }

  try {
    // Ensure wallet exists
    const wallet = await ensurePasskeyWallet();
    
    // Call backend to handle the claim
    const response = await fetch('/api/passkey/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xdr: envelopeXdr,
        keyId: wallet.keyId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        signedTxXdr: '',
        success: false,
        error: result.error || 'Failed to claim with passkey',
      };
    }

    return {
      signedTxXdr: result.signedXdr || '',
      success: true,
    };
  } catch (error) {
    console.error('Passkey claim failed:', error);
    return {
      signedTxXdr: '',
      success: false,
      error: error instanceof Error ? error.message : 'Passkey claim failed',
    };
  }
}