import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/config/stellar';

type Asset = 'XLM' | 'AQUA' | 'EURC' | 'USDC';
type Venue = 'best' | 'dex' | 'amm';
type Side = 'exactIn' | 'exactOut';

interface QuoteResponse {
  venue: string;
  inAmount: string;
  outAmount: string;
  price: string;
  feePct: string;
  oracleMaxNoSlippage?: string;
}

interface UseSwapQuoteProps {
  from: Asset;
  to: Asset;
  amount: string;
  side: Side;
  venue: Venue;
  enabled?: boolean;
}

interface UseSwapQuoteReturn {
  quote: QuoteResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useSwapQuote = ({
  from,
  to,
  amount,
  side,
  venue,
  enabled = true,
}: UseSwapQuoteProps): UseSwapQuoteReturn => {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    // Skip if disabled or no amount
    if (!enabled || !amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    // If same asset, no conversion needed
    if (from === to) {
      setQuote({
        venue: 'Direct',
        inAmount: amount,
        outAmount: amount,
        price: '1.0000',
        feePct: '0.0',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/swap/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          side: 'exactOut',
          from,
          to,
          amount,
          venue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.code);
      }

      const quoteData: QuoteResponse = await response.json();
      setQuote(quoteData);
    } catch (err) {
      const errorCode = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
      setQuote(null);
      
      switch (errorCode) {
        case 'NO_ROUTE':
          setError('No liquidity now—try another asset or venue.');
          break;
        case 'ORACLE_UNAVAILABLE':
          setError('Price oracle offline. Please try later.');
          break;
        default:
          setError('Something went wrong, try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [from, to, amount, side, venue, enabled]);

  // Fetch quote when dependencies change
  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  return {
    quote,
    isLoading,
    error,
    refetch: fetchQuote,
  };
};
