import * as Freighter from "@stellar/freighter-api";

// Contract addresses (testnet)
export const ENVELOPE_CONTRACT = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHBCASH';
export const USDC_CONTRACT = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
export const WXLM_CONTRACT = 'CBP7NO6F7FRDHSOFQBT2L2UWYIZ2PU2ZOQOWDGDWX2LECTJGX2GQJRV2';

// Extend window interface for Freighter
declare global {
  interface Window {
    freighter?: any;
  }
}

// Check if Freighter is installed
export function isFreighterInstalled(): boolean {
  return typeof window !== 'undefined' && window.freighter !== undefined;
}

// Connect to Freighter wallet
export async function connect(): Promise<{ publicKey: string } | null> {
  try {
    if (!isFreighterInstalled()) {
      // Return mock wallet for demo mode
      return { publicKey: 'GDEMO...WALLET' };
    }
    
    const isConnected = await Freighter.isConnected();
    if (isConnected.isConnected) {
      const result = await Freighter.requestAccess();
      if (result.address) {
        return { publicKey: result.address };
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    return null;
  }
}

// Disconnect wallet
export async function disconnect(): Promise<boolean> {
  try {
    // In a real app, you would clear session/storage here
    return true;
  } catch (error) {
    console.error('Failed to disconnect:', error);
    return false;
  }
}

export async function ensureFreighter(): Promise<boolean> {
  const result = await Freighter.isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const result = await Freighter.requestAccess();
  return result.address;
}

export async function signXDR(xdr: string, networkPassphrase: string) {
  return await Freighter.signTransaction(xdr, { networkPassphrase });
}

export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

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

export async function openEnvelope(
  envelopeId: string,
  password: string
): Promise<boolean> {
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