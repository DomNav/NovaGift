import {
  TransactionBuilder,
  Transaction,
  Networks,
  FeeBumpTransaction,
  Keypair,
  Operation,
  Account,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import crypto from 'crypto';

const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const CONTRACT_ID = process.env.NOVAGIFT_CONTRACT_ID || '';

// Initialize Soroban server when needed
let sorobanServerInstance: SorobanServer | null = null;

function getSorobanServer(): SorobanServer {
  if (!sorobanServerInstance) {
    sorobanServerInstance = new SorobanServer(SOROBAN_RPC_URL);
  }
  return sorobanServerInstance;
}

/**
 * Convert a decimal string amount to i128 for Soroban
 * TODO: Query token metadata from contract to get precise decimals
 * For MVP, assuming 7 decimals for all tokens
 */
export function toI128(amountStr: string, decimals: number = 7): bigint {
  const [whole, fractional = ''] = amountStr.split('.');
  const paddedFractional = fractional.padEnd(decimals, '0').slice(0, decimals);
  const scaledAmount = whole + paddedFractional;
  return BigInt(scaledAmount);
}

/**
 * Convert i128 back to decimal string
 */
export function fromI128(amount: bigint, decimals: number = 7): string {
  const str = amount.toString();
  if (str.length <= decimals) {
    return '0.' + str.padStart(decimals, '0');
  }
  const whole = str.slice(0, -decimals);
  const fractional = str.slice(-decimals);
  return whole + '.' + fractional;
}

/**
 * Generate a new random ID for envelopes
 */
export function newId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate SHA256 hash of a preimage
 */
export function sha256Hex(preimage: string): string {
  return crypto.createHash('sha256').update(preimage).digest('hex');
}

/**
 * Build unsigned XDR for create_envelope
 */
export async function buildCreateXDR(params: {
  sender: string;
  assetContract: string;
  amount: string;
  decimals?: number;
  hash: string;
  expiryTs: number;
  id: string;
}): Promise<string> {
  const { sender, assetContract, amount, decimals = 7, hash, expiryTs, id } = params;
  
  const account = await getSorobanServer().getAccount(sender);
  const amountI128 = toI128(amount, decimals);
  
  // Build the contract call
  const contractAddress = Address.fromString(CONTRACT_ID);
  const operation = Operation.invokeContractFunction({
    contract: CONTRACT_ID,
    function: 'create_envelope',
    args: [
      nativeToScVal(Buffer.from(id, 'hex'), { type: 'bytes' }), // id as BytesN<32>
      new Address(sender).toScVal(), // sender
      new Address(assetContract).toScVal(), // asset
      nativeToScVal(amountI128, { type: 'i128' }), // amount
      nativeToScVal(Buffer.from(hash, 'hex'), { type: 'bytes' }), // hash as BytesN<32>
      nativeToScVal(expiryTs, { type: 'u64' }), // expiry_ts
    ],
  });

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(180)
    .build();

  // Prepare and simulate the transaction
  const preparedTx = await getSorobanServer().prepareTransaction(transaction);
  
  return preparedTx.toXDR();
}

/**
 * Build claim transaction (will be fee-bumped)
 */
export async function buildClaimTx(params: {
  id: string;
  preimage: string;
  recipient: string;
}): Promise<Transaction> {
  const { id, preimage, recipient } = params;
  
  const account = await getSorobanServer().getAccount(recipient);
  
  const operation = Operation.invokeContractFunction({
    contract: CONTRACT_ID,
    function: 'claim',
    args: [
      nativeToScVal(Buffer.from(id, 'hex'), { type: 'bytes' }), // id as BytesN<32>
      nativeToScVal(Buffer.from(preimage, 'hex'), { type: 'bytes' }), // preimage as BytesN<32>
      new Address(recipient).toScVal(), // recipient
    ],
  });

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(180)
    .build();

  // Prepare and simulate
  const preparedTx = await getSorobanServer().prepareTransaction(transaction);
  
  return preparedTx as Transaction;
}

/**
 * Build cancel XDR
 */
export async function buildCancelXDR(params: {
  id: string;
  sender: string;
}): Promise<string> {
  const { id, sender } = params;
  
  const account = await getSorobanServer().getAccount(sender);
  
  const operation = Operation.invokeContractFunction({
    contract: CONTRACT_ID,
    function: 'cancel',
    args: [
      nativeToScVal(Buffer.from(id, 'hex'), { type: 'bytes' }), // id as BytesN<32>
    ],
  });

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(180)
    .build();

  const preparedTx = await getSorobanServer().prepareTransaction(transaction);
  
  return preparedTx.toXDR();
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTx(txId: string, maxAttempts: number = 10): Promise<{
  success: boolean;
  resultXdr?: string;
  error?: string;
}> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await getSorobanServer().getTransaction(txId);
      
      if (response.status === 'SUCCESS') {
        return {
          success: true,
          resultXdr: response.resultXdr?.toXDR('base64'),
        };
      } else if (response.status === 'FAILED') {
        return {
          success: false,
          error: 'Transaction failed',
        };
      }
      
      // Still pending, wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      // Transaction not found yet, keep trying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return {
    success: false,
    error: 'Transaction timeout',
  };
}

/**
 * Create a fee-bumped transaction
 */
export function createFeeBumpTx(
  innerTx: Transaction,
  sponsorSecret: string
): FeeBumpTransaction {
  const sponsor = Keypair.fromSecret(sponsorSecret);
  
  // Sign the inner transaction with a dummy signature
  // (recipient will sign it properly later)
  innerTx.sign(Keypair.random());
  
  const feeBump = TransactionBuilder.buildFeeBumpTransaction(
    sponsor,
    '200000', // 0.02 XLM fee
    innerTx,
    NETWORK_PASSPHRASE
  );
  
  feeBump.sign(sponsor);
  
  return feeBump;
}

/**
 * Parse contract events from result XDR
 */
export function parseContractEvents(resultXdr: string): any[] {
  try {
    // For now, return empty array - proper event parsing requires transaction meta, not result
    // This would need to be refactored to accept transaction meta XDR
    return [];
  } catch (error) {
    console.error('Error parsing events:', error);
    return [];
  }
}