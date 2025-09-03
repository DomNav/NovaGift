import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  isConnected, 
  requestAccess,
  signTransaction 
} from '@stellar/freighter-api';
import { Transaction } from '@stellar/stellar-sdk';
import { useToast } from './useToast';
import { 
  API_BASE_URL, 
  NETWORK_PASSPHRASE, 
  NETWORK_TIMEOUT_MS, 
  NETWORK_RETRY_COUNT 
} from '@/config/stellar';

interface CreateEnvelopeParams {
  asset: 'XLM' | 'USDC';
  amount: string;
  message?: string;
  expiresInMinutes?: number;
}

interface CreateEnvelopeResponse {
  id: string;
  unsignedXDR: string;
  openUrl: string;
  preimage: string;
  expiresAt: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryFetch<T>(
  fn: () => Promise<Response>,
  retries = NETWORK_RETRY_COUNT
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
      
      const response = await fn();
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        await sleep(1000 * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

export function useCreateEnvelope() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const createEnvelope = useCallback(async (params: CreateEnvelopeParams) => {
    setIsCreating(true);
    setError(null);

    try {
      // Step 1: Check Freighter connection
      const connectionResult = await isConnected();
      if (connectionResult.error || !connectionResult.isConnected) {
        throw new Error('Please connect your Freighter wallet');
      }

      // Step 2: Get public key
      const accessResult = await requestAccess();
      if (accessResult.error) {
        throw new Error(accessResult.error || 'Failed to get wallet public key');
      }
      const publicKey = accessResult.address;
      if (!publicKey) {
        throw new Error('Failed to get wallet public key');
      }

      // Step 3: POST to create endpoint
      const createResponse = await retryFetch<CreateEnvelopeResponse>(
        () => fetch(`${API_BASE_URL}/api/envelope/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: publicKey,
            asset: params.asset,
            amount: params.amount,
            message: params.message || '',
            expiresInMinutes: params.expiresInMinutes || 60,
          }),
        })
      );

      // Step 4: Sign the transaction with Freighter
      const signedResult = await signTransaction(
        createResponse.unsignedXDR,
        {
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      );

      if (signedResult.error) {
        throw new Error(signedResult.error || 'Failed to sign transaction');
      }

      // Step 5: Submit the signed transaction
      const signedXDR = signedResult.signedTxXdr;
      const tx = new Transaction(signedXDR, NETWORK_PASSPHRASE);
      
      // Here you would normally submit to Stellar network
      // For now, we'll use the fund endpoint to mark as funded
      await retryFetch<{ id: string; status: string }>(
        () => fetch(`${API_BASE_URL}/api/envelope/fund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: createResponse.id,
            txId: tx.hash().toString('hex'),
          }),
        })
      );

      // Step 6: Navigate to fund page
      addToast('Envelope created successfully!', 'success');
      navigate(`/fund/${createResponse.id}`);

      return {
        success: true,
        envelopeId: createResponse.id,
        openUrl: createResponse.openUrl,
        preimage: createResponse.preimage,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create envelope';
      setError(errorMessage);
      addToast(errorMessage, 'error');
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsCreating(false);
    }
  }, [addToast, navigate]);

  return {
    createEnvelope,
    isCreating,
    error,
  };
}