import { config } from '../config';
import { prisma } from '../db/client';

interface SwapParams {
  payAsset: string;
  amount: string;
  toAsset: string;
  address: string;
}

interface SwapResponse {
  route: string;
  price: number;
  txId: string;
}

interface ReflectorApiQuote {
  route: {
    path: string[];
    protocols: string[];
  };
  priceImpact: number;
  estimatedOut: string;
  estimatedPrice: number;
}

interface ReflectorApiSwap {
  success: boolean;
  txId?: string;
  error?: string;
}

async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      if (response.status >= 500 && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error('Request timeout after 3 seconds');
      }
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries');
}

export async function quoteAndSwap({
  payAsset,
  amount,
  toAsset,
  address,
}: SwapParams): Promise<SwapResponse> {
  if (!config.enableReflector) {
    return {
      route: 'direct',
      price: Number(amount),
      txId: '',
    };
  }
  
  try {
    const quoteUrl = `${config.reflectorApiUrl}/v1/quote`;
    const quoteBody = {
      fromAsset: payAsset,
      toAsset: toAsset,
      amount: amount,
      slippageTolerance: 0.01,
    };
    
    const quoteResponse = await fetchWithRetry(
      quoteUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteBody),
      }
    );
    
    const quote: ReflectorApiQuote = await quoteResponse.json();
    
    const swapUrl = `${config.reflectorApiUrl}/v1/swap`;
    const swapBody = {
      fromAsset: payAsset,
      toAsset: toAsset,
      amount: amount,
      recipient: address,
      quote: quote,
    };
    
    const swapResponse = await fetchWithRetry(
      swapUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(swapBody),
      }
    );
    
    const swapResult: ReflectorApiSwap = await swapResponse.json();
    
    if (!swapResult.success || !swapResult.txId) {
      throw new Error(swapResult.error || 'Swap failed without error message');
    }
    
    const route = quote.route.path.join(' -> ');
    const price = quote.estimatedPrice;
    const txId = swapResult.txId;
    
    const swapReceipt = await prisma.swapReceipt.create({
      data: {
        envelopeId: address,
        route: route,
        price: price,
        txId: txId,
      },
    });
    
    console.log('Swap completed successfully:', {
      id: swapReceipt.id,
      route,
      price,
      txId,
    });
    
    return {
      route,
      price,
      txId,
    };
  } catch (error) {
    console.error('Reflector swap failed:', error);
    
    return {
      route: 'direct',
      price: Number(amount),
      txId: '',
    };
  }
}