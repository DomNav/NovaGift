import { Transaction, Networks } from '@stellar/stellar-sdk';
import { Server, Api } from '@stellar/stellar-sdk/rpc';

interface WaitForTxOptions {
  rpcUrl: string;
  timeoutMs?: number;
  retries?: number;
}

interface TransactionStatus {
  success: boolean;
  status: string;
  ledger?: number;
  createdAt?: string;
  applicationOrder?: number;
  error?: string;
}

/**
 * Wait for a transaction to be confirmed on the network
 * @param txId Transaction ID/hash to wait for
 * @param options Configuration options
 * @returns Transaction status and details
 */
export async function waitForTx(
  txId: string,
  options: WaitForTxOptions
): Promise<TransactionStatus> {
  const { 
    rpcUrl, 
    timeoutMs = 30000, 
    retries = 3 
  } = options;

  const server = new Server(rpcUrl);
  const startTime = Date.now();
  let attempt = 0;

  while (attempt < retries) {
    try {
      // Check if timeout has been exceeded
      if (Date.now() - startTime > timeoutMs) {
        return {
          success: false,
          status: 'TIMEOUT',
          error: `Transaction verification timed out after ${timeoutMs}ms`
        };
      }

      // Get transaction status from RPC
      const response = await server.getTransaction(txId);
      
      // Check transaction status
      switch (response.status) {
        case Api.GetTransactionStatus.SUCCESS:
          return {
            success: true,
            status: 'SUCCESS',
            ledger: response.ledger,
            createdAt: response.createdAt ? String(response.createdAt) : undefined,
            applicationOrder: response.applicationOrder ?? undefined
          };
          
        case Api.GetTransactionStatus.FAILED:
          return {
            success: false,
            status: 'FAILED',
            error: 'Transaction failed on the network'
          };
          
        case Api.GetTransactionStatus.NOT_FOUND:
          // Transaction not found yet, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempt++;
          continue;
          
        default:
          // Unknown status, treat as pending
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempt++;
          continue;
      }
    } catch (error) {
      console.error(`Error checking transaction ${txId}:`, error);
      
      // If this is the last retry, throw the error
      if (attempt === retries - 1) {
        return {
          success: false,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempt++;
    }
  }

  return {
    success: false,
    status: 'NOT_FOUND',
    error: `Transaction ${txId} not found after ${retries} attempts`
  };
}

/**
 * Submit a signed transaction to the network
 * @param signedXDR The signed transaction XDR
 * @param rpcUrl The RPC server URL
 * @returns Transaction ID if successful
 */
export async function submitTransaction(
  signedXDR: string,
  rpcUrl: string
): Promise<{ success: boolean; txId?: string; error?: string }> {
  try {
    const server = new Server(rpcUrl);
    
    // Submit the transaction
    const response = await server.sendTransaction(
      new Transaction(signedXDR, Networks.TESTNET)
    );
    
    if (response.status === 'PENDING') {
      return {
        success: true,
        txId: response.hash
      };
    }
    
    return {
      success: false,
      error: `Transaction submission failed with status: ${response.status}`
    };
  } catch (error) {
    console.error('Failed to submit transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit transaction'
    };
  }
}